/**
 * Fast offline video export for Motion Track.
 *
 * Strategy:
 * - Seek through the video frame-by-frame (no real-time playback)
 * - For each frame: run detectBlobs → matchBlobs → renderOverlays on an
 *   OffscreenCanvas (or regular canvas)
 * - Encode each frame with the WebCodecs VideoEncoder API
 * - Mux into a proper WebM with duration metadata using webm-muxer
 * - Result: a seekable, playable WebM downloaded instantly after processing
 *
 * Browser requirement: Chrome/Edge 94+ (VideoEncoder / VideoFrame).
 * Falls back to a helpful error message on unsupported browsers.
 */

import { Muxer, ArrayBufferTarget } from "webm-muxer";
import {
  detectBlobs,
  matchBlobs,
  renderOverlays,
  type TrackedBlob,
} from "@/lib/motionTrack";

export interface ExportVideoOptions {
  video: HTMLVideoElement;
  config: any;
  fps?: number;
  bitrate?: number;
  onProgress?: (pct: number) => void;
}

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener("seeked", handler);
      resolve();
    };
    video.addEventListener("seeked", handler);
  });
}

export async function exportVideoFast({
  video,
  config,
  fps = 30,
  bitrate = 8_000_000,
  onProgress,
}: ExportVideoOptions): Promise<void> {
  // ── Browser support check ──────────────────────────────────────────────────
  if (!("VideoEncoder" in window)) {
    throw new Error(
      "WebCodecs VideoEncoder is not available in this browser.\n" +
      "Please use Chrome 94 or Edge 94 or newer."
    );
  }

  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) {
    throw new Error("Video has no duration. Make sure a video is loaded.");
  }

  // ── Canvas size from config ────────────────────────────────────────────────
  let W = 1280, H = 720;
  if (config.aspectRatio === "1:1") { W = 800; H = 800; }
  else if (config.aspectRatio === "4:3") { W = 1067; H = 800; }

  // ── Offline render canvas ──────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── webm-muxer setup ───────────────────────────────────────────────────────
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: "V_VP9",
      width: W,
      height: H,
      frameRate: fps,
    },
    fastStart: "in-memory",
  });

  // ── VideoEncoder setup ─────────────────────────────────────────────────────
  let encError: Error | null = null;
  const encoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: Error) => { encError = e; },
  });

  encoder.configure({
    codec: "vp09.00.10.08",
    width: W,
    height: H,
    bitrate,
    framerate: fps,
    latencyMode: "quality",
  });

  // ── Frame-by-frame processing ──────────────────────────────────────────────
  const frameStep = 1 / fps;
  const totalFrames = Math.floor(duration * fps);
  let prevBlobs: TrackedBlob[] = [];
  let frameIndex = 0;
  let nextBlobId = 1;

  // Pause the video and preserve original state
  const wasPlaying = !video.paused;
  const origLoop = video.loop;
  video.pause();
  video.loop = false;

  try {
    for (let t = 0; t < duration - frameStep * 0.5; t += frameStep) {
      if (encError) throw encError;

      // Seek to frame time
      video.currentTime = t;
      await waitForSeek(video);

      // Detect blobs on this frame
      const rawBlobs = detectBlobs(video, canvas, config);
      const blobs = matchBlobs(
        rawBlobs,
        prevBlobs,
        config.motionSmooth ?? 0.5,
        config.persistence ?? 0
      );
      // Update IDs for new blobs
      blobs.forEach((b) => {
        if (b.id === null) b.id = nextBlobId++;
      });
      prevBlobs = blobs;

      // Render composite frame (video + all overlays)
      ctx.clearRect(0, 0, W, H);
      renderOverlays(ctx, canvas, video, blobs, config, fps);

      // Encode the frame
      const timestampUs = Math.round(t * 1_000_000);
      const frame = new (window as any).VideoFrame(canvas, { timestamp: timestampUs });
      const isKeyFrame = frameIndex % (fps * 2) === 0; // keyframe every 2 s
      encoder.encode(frame, { keyFrame: isKeyFrame });
      frame.close();

      frameIndex++;
      onProgress?.(Math.round((frameIndex / totalFrames) * 100));
    }

    // Flush encoder and muxer
    await encoder.flush();
    muxer.finalize();

    // ── Download ─────────────────────────────────────────────────────────────
    const buffer = target.buffer;
    const blob = new Blob([buffer], { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brand-motion-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    // Restore video state
    video.loop = origLoop;
    if (wasPlaying) video.play().catch(() => {});
    encoder.close();
    canvas.remove();
  }
}
