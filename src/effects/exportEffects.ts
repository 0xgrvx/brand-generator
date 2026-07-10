import { hexToRgb } from "./utils";
import { Muxer, ArrayBufferTarget } from "webm-muxer";
import { applyGlobalAdjustments, applyProcessing, applyPostProcessing } from "./adjustments";

import * as ascii from "./effects/ascii";
import * as dithering from "./effects/dithering";
import * as halftone from "./effects/halftone";
import * as matrixRain from "./effects/matrixRain";
import * as dots from "./effects/dots";
import * as contour from "./effects/contour";
import * as pixelSort from "./effects/pixelSort";
import * as blockify from "./effects/blockify";
import * as threshold from "./effects/threshold";
import * as edgeDetection from "./effects/edgeDetection";
import * as crosshatch from "./effects/crosshatch";
import * as waveLines from "./effects/waveLines";
import * as noiseField from "./effects/noiseField";
import * as voronoi from "./effects/voronoi";
import * as vhs from "./effects/vhs";

const EFFECTS: Record<string, Function> = {
  ASCII: ascii.render,
  DITHERING: dithering.render,
  HALFTONE: halftone.render,
  MATRIX_RAIN: matrixRain.render,
  DOTS: dots.render,
  CONTOUR: contour.render,
  PIXEL_SORT: pixelSort.render,
  BLOCKIFY: blockify.render,
  THRESHOLD: threshold.render,
  EDGE_DETECTION: edgeDetection.render,
  CROSSHATCH: crosshatch.render,
  WAVE_LINES: waveLines.render,
  NOISE_FIELD: noiseField.render,
  VORONOI: voronoi.render,
  VHS: vhs.render
};


// Helper to dynamically load external scripts from CDN (e.g. gifshot)
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

// Download blob helper
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Re-render ASCII code specifically for plain text export
function exportTXT(sourceCanvas: HTMLCanvasElement, cfg: any): string {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return "";

  const charSets = {
    STANDARD: [" ", ".", "'", "\"", "~", "-", ":", ";", "=", "+", "x", "X", "$", "&", "#", "@"],
    BLOCKS: [" ", "░", "▒", "▓", "█"],
    BINARY: ["0", "1"],
    NUMBERS: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    SYMBOLS: ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"]
  };

  const chars =
    cfg.charSet === "CUSTOM"
      ? [...(cfg.customChars || " .:-=+*#%@")]
      : charSets[cfg.charSet as keyof typeof charSets] || charSets.STANDARD;

  if (chars.length === 0) return "";

  const charWidth = cfg.charWidth || Math.floor(W / cfg.cellSize);
  const cellSize = W / charWidth;
  const charHeight = Math.floor(H / cellSize);

  let text = "";
  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return "";
  }
  const data = imgData.data;

  for (let y = 0; y < charHeight; y++) {
    for (let x = 0; x < charWidth; x++) {
      const pxX = Math.min(W - 1, Math.floor(x * cellSize + cellSize / 2));
      const pxY = Math.min(H - 1, Math.floor(y * cellSize + cellSize / 2));
      const i = (pxY * W + pxX) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      const idx = cfg.invertChars
        ? Math.floor((1 - lum) * (chars.length - 1))
        : Math.floor(lum * (chars.length - 1));

      text += chars[Math.max(0, Math.min(chars.length - 1, idx))];
    }
    text += "\n";
  }
  return text;
}

// Master exporter function
// Master exporter function
export async function exportEffect(
  format: string,
  processedCanvas: HTMLCanvasElement,
  preCanvas: HTMLCanvasElement, // source with adjustments applied
  config: any,
  setRecordingState?: (recording: boolean, progress: string) => void,
  sourceType?: "image" | "video",
  video?: HTMLVideoElement
) {
  const mult = config.exportMultiplier || 1;
  const W = processedCanvas.width;
  const H = processedCanvas.height;

  // For static image exports, render at Nx multiplier on an offscreen canvas
  const renderOffscreen = () => {
    const tmpCvs = document.createElement("canvas");
    tmpCvs.width = W * mult;
    tmpCvs.height = H * mult;
    const tmpCtx = tmpCvs.getContext("2d")!;
    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.scale(mult, mult);
    tmpCtx.drawImage(processedCanvas, 0, 0);
    return tmpCvs;
  };

  if (format === "PNG") {
    const tmp = renderOffscreen();
    tmp.toBlob((blob) => {
      if (blob) downloadBlob(blob, `brand-effect-${Date.now()}.png`);
    }, "image/png");
    return;
  }

  if (format === "JPEG") {
    const tmp = renderOffscreen();
    const quality = (config.jpegQuality || 92) / 100;
    tmp.toBlob((blob) => {
      if (blob) downloadBlob(blob, `brand-effect-${Date.now()}.jpg`);
    }, "image/jpeg", quality);
    return;
  }

  if (format === "WEBP" || format === "WebP") {
    const tmp = renderOffscreen();
    tmp.toBlob((blob) => {
      if (blob) downloadBlob(blob, `brand-effect-${Date.now()}.webp`);
    }, "image/webp", 0.92);
    return;
  }

  if (format === "SVG") {
    const dataUrl = processedCanvas.toDataURL("image/png");
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><image href="${dataUrl}" width="${W}" height="${H}"/></svg>`;
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    downloadBlob(blob, `brand-effect-${Date.now()}.svg`);
    return;
  }

  if (format === "TXT") {
    // Only meaningful for ASCII effect, otherwise shows warning
    if (config.activeEffect !== "ASCII") {
      alert("Text export is only available for the ASCII effect.");
      return;
    }
    const txt = exportTXT(preCanvas, config.effectConfig.ASCII);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `brand-effect-${Date.now()}.txt`);
    return;
  }

  if (format === "THREE.JS") {
    const dataUrl = processedCanvas.toDataURL("image/png");
    const aspect = W / H;
    const planeSize = config.threePlaneSize || 5;
    const bgColor = config.threeBgColor || "#000000";
    const autoRotate = config.threeAutoRotate ? "true" : "false";

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Three.js Effect Export</title>
  <style>
    body { margin: 0; overflow: hidden; background: #000000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("${bgColor}");
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    // Load embedded texture
    const texture = new THREE.TextureLoader().load("${dataUrl}");
    
    const aspect = ${aspect};
    const planeW = ${planeSize};
    const planeH = planeW / aspect;
    
    const geometry = new THREE.PlaneGeometry(planeW, planeH);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    camera.position.z = planeW * 1.2;

    const autoRotate = ${autoRotate};

    function animate() {
      requestAnimationFrame(animate);
      if (autoRotate) {
        plane.rotation.y += 0.01;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `brand-three-${Date.now()}.html`);
    return;
  }

  // GIF Export (capturing dynamic canvas sequence)
  if (format === "GIF") {
    if (setRecordingState) setRecordingState(true, "0%");
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js");
      const frames: string[] = [];
      const totalFrames = 30; // Capture 30 frames for a nice loop
      const fps = config.gifFps || 15;
      const interval = 1 / fps;
      
      const captureFrame = () => {
        frames.push(processedCanvas.toDataURL("image/jpeg", 0.85));
        if (setRecordingState) {
          setRecordingState(true, `${Math.round((frames.length / totalFrames) * 100)}%`);
        }
        if (frames.length < totalFrames) {
          setTimeout(captureFrame, interval * 1000);
        } else {
          // Render GIF
          if (setRecordingState) setRecordingState(true, "Compiling...");
          (window as any).gifshot.createGIF(
            {
              images: frames,
              gifWidth: W,
              gifHeight: H,
              interval: interval,
              numFrames: totalFrames,
              loop: config.gifLoop,
              dither: config.gifDither
            },
            (obj: any) => {
              if (setRecordingState) setRecordingState(false, "");
              if (!obj.error) {
                const a = document.createElement("a");
                a.href = obj.image;
                a.download = `brand-effect-${Date.now()}.gif`;
                a.click();
              } else {
                alert("GIF rendering failed: " + obj.error);
              }
            }
          );
        }
      };
      
      captureFrame();
    } catch (e: any) {
      if (setRecordingState) setRecordingState(false, "");
      alert("Failed to load GIF encoder: " + e.message);
    }
    return;
  }

  // MP4 Export (offline frame-by-frame WebCodecs if video source, otherwise real-time canvas recording fallback)
  if (format === "MP4") {
    if (sourceType === "video" && video) {
      if (setRecordingState) setRecordingState(true, "0%");
      if (!("VideoEncoder" in window)) {
        if (setRecordingState) setRecordingState(false, "");
        alert("WebCodecs VideoEncoder is not available in this browser. Please use Chrome 94+.");
        return;
      }

      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        if (setRecordingState) setRecordingState(false, "");
        alert("Video has no duration. Make sure a video is loaded.");
        return;
      }

      const fps = config.mp4Fps || 30;
      const bitrate = (config.mp4Quality || 7) * 1_000_000;

      const videoW = video.videoWidth;
      const videoH = video.videoHeight;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = videoW;
      exportCanvas.height = videoH;
      const exportCtx = exportCanvas.getContext("2d")!;

      const preCanvasTmp = document.createElement("canvas");
      const processedCanvasTmp = document.createElement("canvas");

      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: {
          codec: "V_VP9",
          width: videoW,
          height: videoH,
          frameRate: fps,
        },
        fastStart: "in-memory",
      });

      let encError: Error | null = null;
      const encoder = new (window as any).VideoEncoder({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (e: Error) => { encError = e; },
      });

      encoder.configure({
        codec: "vp09.00.10.08",
        width: videoW,
        height: videoH,
        bitrate,
        framerate: fps,
        latencyMode: "quality",
      });

      const frameStep = 1 / fps;
      const totalFrames = Math.floor(duration * fps);
      let frameIndex = 0;

      const wasPlaying = !video.paused;
      const origLoop = video.loop;
      video.pause();
      video.loop = false;

      const effectState = {};

      try {
        for (let t = 0; t < duration - frameStep * 0.5; t += frameStep) {
          if (encError) throw encError;

          video.currentTime = t;
          await new Promise<void>((resolve) => {
            const handler = () => {
              video.removeEventListener("seeked", handler);
              resolve();
            };
            video.addEventListener("seeked", handler);
          });

          preCanvasTmp.width = videoW;
          preCanvasTmp.height = videoH;
          const preCtx = preCanvasTmp.getContext("2d")!;
          preCtx.drawImage(video, 0, 0, videoW, videoH);

          applyGlobalAdjustments(preCtx, videoW, videoH, config.adjust || {});
          applyProcessing(preCanvasTmp, config.processing || {});

          const currentW = preCanvasTmp.width;
          const currentH = preCanvasTmp.height;
          processedCanvasTmp.width = currentW;
          processedCanvasTmp.height = currentH;
          const outputCtx = processedCanvasTmp.getContext("2d")!;

          const activeEffect = config.activeEffect;
          if (activeEffect && EFFECTS[activeEffect]) {
            const effConfig = config.effectConfig?.[activeEffect] || {};
            if (config.adjust?.colorMode === "DUOTONE") {
              effConfig.shadowColor = config.adjust.shadowColor;
              effConfig.highlightColor = config.adjust.highlightColor;
            }
            const result = EFFECTS[activeEffect](preCanvasTmp, outputCtx, effConfig, effectState);
            if (result instanceof ImageData) {
              outputCtx.putImageData(result, 0, 0);
            }
          } else {
            outputCtx.drawImage(preCanvasTmp, 0, 0);
          }

          applyPostProcessing(outputCtx, currentW, currentH, config.post || {});

          exportCanvas.width = currentW;
          exportCanvas.height = currentH;
          exportCtx.clearRect(0, 0, currentW, currentH);
          exportCtx.drawImage(processedCanvasTmp, 0, 0);

          const timestampUs = Math.round(t * 1_000_000);
          const frame = new (window as any).VideoFrame(exportCanvas, { timestamp: timestampUs });
          const isKeyFrame = frameIndex % (fps * 2) === 0;
          encoder.encode(frame, { keyFrame: isKeyFrame });
          frame.close();

          frameIndex++;
          if (setRecordingState) {
            setRecordingState(true, `${Math.round((frameIndex / totalFrames) * 100)}%`);
          }
        }

        await encoder.flush();
        muxer.finalize();

        const buffer = target.buffer;
        const blob = new Blob([buffer], { type: "video/webm" });
        downloadBlob(blob, `brand-effect-${Date.now()}.webm`);
      } catch (err: any) {
        alert("Export failed: " + err.message);
      } finally {
        video.loop = origLoop;
        if (wasPlaying) video.play().catch(() => {});
        encoder.close();
        exportCanvas.remove();
        preCanvasTmp.remove();
        processedCanvasTmp.remove();
        if (setRecordingState) setRecordingState(false, "");
      }
      return;
    }

    // Fallback real-time canvas stream capture (e.g. for image source or webcam)
    if (setRecordingState) setRecordingState(true, "Recording...");
    const recordedChunks: Blob[] = [];
    const recordFPS = config.mp4Fps || 30;
    
    // Capture canvas video stream
    const stream = (processedCanvas as any).captureStream
      ? (processedCanvas as any).captureStream(recordFPS)
      : (processedCanvas as any).mozCaptureStream?.(recordFPS);

    if (!stream) {
      if (setRecordingState) setRecordingState(false, "");
      alert("Canvas recording is not supported in this browser.");
      return;
    }

    const options = {
      mimeType: "video/webm; codecs=vp9",
      videoBitsPerSecond: (config.mp4Quality || 7) * 1000000
    };

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      } catch (e2) {
        if (setRecordingState) setRecordingState(false, "");
        alert("MediaRecorder format not supported.");
        return;
      }
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (setRecordingState) setRecordingState(false, "");
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      downloadBlob(blob, `brand-effect-${Date.now()}.mp4`);
    };

    mediaRecorder.start();
    let secondsLeft = 4;
    const timer = setInterval(() => {
      secondsLeft--;
      if (setRecordingState) setRecordingState(true, `Recording (${secondsLeft}s)...`);
      if (secondsLeft <= 0) {
        clearInterval(timer);
        mediaRecorder.stop();
      }
    }, 1000);
  }
}
