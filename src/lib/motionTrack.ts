// BabyTrack Blob Tracking Engine for Brand Generator
// Implemented in TypeScript for robustness and integration

export interface TrackedBlob {
  x: number;
  y: number;
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  id: number | null;
  history: { x: number; y: number }[];
  ttl?: number;
}

export interface Point {
  x: number;
  y: number;
}

let frameCount = 0;
let prevBlobs: TrackedBlob[] = [];
let animFrameId: number | null = null;
let lastTime = performance.now();
let currentFps = 60;
let nextBlobId = 1;
let prevGray: Uint8ClampedArray | null = null;
export let currentAnimTime = 0;

// Optimized Grain noise canvas
let noiseCanvas: HTMLCanvasElement | null = null;
function getNoiseCanvas(size = 256): HTMLCanvasElement {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = size;
  noiseCanvas.height = size;
  const ctx = noiseCanvas.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return noiseCanvas;
}

/**
 * Starts the frame tracking loop
 */
export function startTrackingLoop(
  videoEl: HTMLVideoElement,
  overlayCanvas: HTMLCanvasElement,
  getConfig: () => any
) {
  const ctx = overlayCanvas.getContext("2d");
  if (!ctx) return;

  nextBlobId = 1;
  prevGray = null;

  function processFrame() {
    animFrameId = requestAnimationFrame(processFrame);

    const now = performance.now();
    const delta = now - lastTime;
    if (delta > 0) {
      const fps = 1000 / delta;
      currentFps = Math.round(currentFps * 0.9 + fps * 0.1);
    }
    lastTime = now;

    const config = getConfig();

    // Sync canvas size to aspect ratio to prevent stretching/squishing
    let targetW = 1280;
    let targetH = 720;
    if (config.aspectRatio === "1:1") {
      targetW = 800;
      targetH = 800;
    } else if (config.aspectRatio === "4:3") {
      targetW = 1067;
      targetH = 800;
    }

    if (overlayCanvas.width !== targetW || overlayCanvas.height !== targetH) {
      overlayCanvas.width = targetW;
      overlayCanvas.height = targetH;
    }

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    frameCount++;
    const shouldDetect = !config.frameSkip || frameCount % 2 === 0;

    let blobs = prevBlobs;
    if (shouldDetect && videoEl.readyState >= 2) {
      blobs = detectBlobs(videoEl, overlayCanvas, config);
      blobs = matchBlobs(blobs, prevBlobs, config.motionSmooth, config.persistence || 0);
      prevBlobs = blobs;
    }

    renderOverlays(ctx, overlayCanvas, videoEl, blobs, config, currentFps);
  }

  // Ensure fresh state
  stopTrackingLoop();
  processFrame();
}

/**
 * Stops the frame tracking loop
 */
export function stopTrackingLoop() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  prevBlobs = [];
  frameCount = 0;
}

export function getTrackedBlobs(): TrackedBlob[] {
  return prevBlobs;
}

/**
 * Draw an image/video covering the destination rectangle (cover crop)
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLVideoElement | HTMLImageElement,
  w: number,
  h: number,
  flipH: boolean
) {
  ctx.save();
  if (flipH) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  const imgW = (img as HTMLVideoElement).videoWidth || img.width;
  const imgH = (img as HTMLVideoElement).videoHeight || img.height;
  if (imgW === 0 || imgH === 0) {
    ctx.restore();
    return;
  }

  const aspectCanvas = w / h;
  const aspectImg = imgW / imgH;

  let sx = 0,
    sy = 0,
    sw = imgW,
    sh = imgH;
  if (aspectImg > aspectCanvas) {
    sw = imgH * aspectCanvas;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / aspectCanvas;
    sy = (imgH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
}

/**
 * Detect blobs using thresholding and connected components flood-fill
 */
function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  if (r <= 0) return src;
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);
  const d = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = (sum / d) | 0;
      const add = src[row + Math.min(w - 1, x + r + 1)];
      const sub = src[row + Math.max(0, x - r)];
      sum += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = (sum / d) | 0;
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x];
      const sub = tmp[Math.max(0, y - r) * w + x];
      sum += add - sub;
    }
  }
  return out;
}

function dilate(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (src[i]) {
        out[i] = 1;
        continue;
      }
      if (
        (x > 0 && src[i - 1]) ||
        (x < w - 1 && src[i + 1]) ||
        (y > 0 && src[i - w]) ||
        (y < h - 1 && src[i + w])
      ) {
        out[i] = 1;
      }
    }
  }
  return out;
}

export function detectBlobs(
  videoEl: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  config: any
): TrackedBlob[] {
  const scale = config.resolution;
  const pw = Math.floor(canvas.width * scale);
  const ph = Math.floor(canvas.height * scale);
  if (pw <= 0 || ph <= 0) return [];

  // Draw video frame to processing canvas at reduced resolution
  const tmp = document.createElement("canvas");
  tmp.width = pw;
  tmp.height = ph;
  const tctx = tmp.getContext("2d");
  if (!tctx) return [];

  // Use the same cover fit and flip as main rendering so coordinates map 1:1
  drawImageCover(tctx, videoEl, pw, ph, config.flipH && config.sourceMode === "WEBCAM");

  let imageData;
  try {
    imageData = tctx.getImageData(0, 0, pw, ph);
  } catch (e) {
    // Return empty if canvas is tainted or inaccessible
    return [];
  }

  const data = imageData.data;
  const gray = new Uint8ClampedArray(pw * ph);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }

  let g = gray;
  if (config.blur && config.blur > 0) {
    g = boxBlur(g, pw, ph, Math.round(config.blur));
  }

  let binary = new Uint8Array(pw * ph);
  if (config.diffMode && prevGray && prevGray.length === g.length) {
    for (let i = 0; i < g.length; i++) {
      const d = Math.abs(g[i] - prevGray[i]);
      binary[i] = (config.invertMask ? d < config.threshold : d > config.threshold) ? 1 : 0;
    }
  } else {
    for (let i = 0; i < g.length; i++) {
      binary[i] = (config.invertMask ? g[i] < config.threshold : g[i] > config.threshold) ? 1 : 0;
    }
  }

  // Update previous gray frame buffer
  prevGray = new Uint8ClampedArray(g);

  // Dilate binary mask
  for (let k = 0; k < (config.dilate || 0); k++) {
    binary = dilate(binary, pw, ph);
  }

  // Flood fill to find connected regions
  const labels = new Int32Array(pw * ph);
  const blobs: TrackedBlob[] = [];

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = y * pw + x;
      if (binary[idx] === 1 && labels[idx] === 0) {
        const blob = floodFill(
          binary,
          labels,
          pw,
          ph,
          x,
          y,
          blobs.length + 1
        );
        if (blob.area >= config.minArea && blob.area <= config.maxArea) {
          blobs.push(blob);
        }
      }
    }
  }

  // Sort largest first, cap count
  blobs.sort((a, b) => b.area - a.area);
  const result = blobs.slice(0, config.maxBlobs);

  // Upscale coordinates back to display resolution
  const invScale = 1 / scale;
  result.forEach((b) => {
    b.x *= invScale;
    b.y *= invScale;
    b.minX *= invScale;
    b.maxX *= invScale;
    b.minY *= invScale;
    b.maxY *= invScale;
    b.width = b.maxX - b.minX;
    b.height = b.maxY - b.minY;
  });

  return result;
}

/**
 * Connected components flood fill
 */
function floodFill(
  binary: Uint8Array,
  labels: Int32Array,
  w: number,
  h: number,
  startX: number,
  startY: number,
  label: number
): TrackedBlob {
  const stack: [number, number][] = [[startX, startY]];
  let area = 0,
    sumX = 0,
    sumY = 0;
  let minX = startX,
    maxX = startX,
    minY = startY,
    maxY = startY;

  while (stack.length > 0) {
    const p = stack.pop();
    if (!p) continue;
    const [x, y] = p;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const idx = y * w + x;
    if (binary[idx] !== 1 || labels[idx] !== 0) continue;

    labels[idx] = label;
    area++;
    sumX += x;
    sumY += y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return {
    x: sumX / area,
    y: sumY / area,
    area,
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    vx: 0,
    vy: 0,
    id: null,
    history: [],
  };
}

/**
 * Matches blobs across frames and smoothes their coordinates
 */
export function matchBlobs(
  current: TrackedBlob[],
  previous: TrackedBlob[],
  smoothing: number,
  persistence = 0
): TrackedBlob[] {
  if (!previous.length) {
    return current.map((b) => {
      const id = nextBlobId++;
      return {
        ...b,
        id,
        vx: 0,
        vy: 0,
        history: [{ x: b.x, y: b.y }],
        ttl: persistence,
      };
    });
  }

  const alpha = smoothing; // 0.0-1.0; higher = responsive, lower = smooth
  const maxDist = 120; // px limit for matching
  const usedPrev = new Set<number>();
  const usedCurr = new Set<number>();
  const updated: TrackedBlob[] = [];

  // Greedy Euclidean matching
  const pairs: { currIdx: number; prevIdx: number; dist: number }[] = [];
  for (let c = 0; c < current.length; c++) {
    const curr = current[c];
    for (let p = 0; p < previous.length; p++) {
      const prev = previous[p];
      const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      if (d < maxDist) {
        pairs.push({ currIdx: c, prevIdx: p, dist: d });
      }
    }
  }

  pairs.sort((a, b) => a.dist - b.dist);

  for (const pair of pairs) {
    if (usedCurr.has(pair.currIdx) || usedPrev.has(pair.prevIdx)) continue;
    usedCurr.add(pair.currIdx);
    usedPrev.add(pair.prevIdx);

    const curr = current[pair.currIdx];
    const prev = previous[pair.prevIdx];

    const nx = alpha * curr.x + (1 - alpha) * prev.x;
    const ny = alpha * curr.y + (1 - alpha) * prev.y;
    const nminX = alpha * curr.minX + (1 - alpha) * prev.minX;
    const nmaxX = alpha * curr.maxX + (1 - alpha) * prev.maxX;
    const nminY = alpha * curr.minY + (1 - alpha) * prev.minY;
    const nmaxY = alpha * curr.maxY + (1 - alpha) * prev.maxY;
    const nwidth = nmaxX - nminX;
    const nheight = nmaxY - nminY;

    const history = [...(prev.history || []), { x: nx, y: ny }].slice(-120);

    updated.push({
      ...curr,
      x: nx,
      y: ny,
      minX: nminX,
      maxX: nmaxX,
      minY: nminY,
      maxY: nmaxY,
      width: nwidth,
      height: nheight,
      vx: nx - prev.x,
      vy: ny - prev.y,
      id: prev.id,
      history,
      ttl: persistence,
    });
  }

  // New tracks for unmatched current blobs
  for (let c = 0; c < current.length; c++) {
    if (usedCurr.has(c)) continue;
    const curr = current[c];
    const id = nextBlobId++;
    updated.push({
      ...curr,
      id,
      vx: 0,
      vy: 0,
      history: [{ x: curr.x, y: curr.y }],
      ttl: persistence,
    });
  }

  // Decay for unmatched previous tracks
  for (let p = 0; p < previous.length; p++) {
    if (usedPrev.has(p)) continue;
    const prev = previous[p];
    const ttl = prev.ttl !== undefined ? prev.ttl : 0;
    if (ttl > 0) {
      updated.push({
        ...prev,
        ttl: ttl - 1,
        vx: prev.vx * 0.9,
        vy: prev.vy * 0.9,
      });
    }
  }

  return updated;
}

/**
 * Master render function
 */
export function renderOverlays(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  videoEl: HTMLVideoElement,
  blobs: TrackedBlob[],
  config: any,
  fps: number
) {
  const W = canvas.width;
  const H = canvas.height;
  if (W <= 0 || H <= 0) return;

  currentAnimTime = config.frameCount !== undefined
    ? (config.frameCount * 1000) / fps
    : (videoEl && videoEl.currentTime ? videoEl.currentTime * 1000 : Date.now());

  // 0. Background Color (BabyTrack style)
  if (config.bgColor) {
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  // 0.5. Source Video (BabyTrack showSource / videoOpacity)
  const showSource = config.showSource === undefined ? true : config.showSource;
  if (showSource) {
    ctx.save();
    ctx.globalAlpha = config.videoOpacity / 100;
    drawImageCover(ctx, videoEl, W, H, config.flipH && config.sourceMode === "WEBCAM");
    ctx.restore();
  }

  // 0.7. Apply Filters (BabyTrack filters)
  if (config.filters && config.filters.length > 0) {
    applyFilters(ctx, W, H, config, blobs);
  }

  // 1. Grain
  if (config.grainEnabled) {
    drawGrain(ctx, W, H, config);
  }

  // 2. Vignette
  if (config.vignetteEnabled) {
    drawVignette(ctx, W, H, config);
  }

  // 3. Scan lines
  if (config.scanEnabled) {
    drawScanLines(ctx, W, H, config);
  }

  // 4. Grid
  if (config.gridEnabled) {
    drawGrid(ctx, W, H, config);
  }

  // 5. Circle chains
  if (config.circlesEnabled) {
    const anchors =
      config.circleAnchor === "CANVAS CENTER"
        ? [{ x: W / 2, y: H / 2 }]
        : blobs.map((b) =>
            config.circleAnchor === "BOX CENTER"
              ? { x: b.minX + b.width / 2, y: b.minY + b.height / 2 }
              : { x: b.x, y: b.y }
          );
    anchors.forEach((a) => drawCircleChain(ctx, a.x, a.y, config));
  }

  // 6. Connection lines
  if ((config.linesOn || config.connectionsEnabled) && blobs.length > 0) {
    drawConnections(ctx, blobs, W, H, config);
  }

  // 7. Trail
  if (config.trailEnabled && blobs.length >= 1) {
    drawTrail(ctx, blobs, config);
  }

  // Draw regionStyles if defined!
  const hasRegionStyles = config.regionStyles !== undefined && config.regionStyles !== null;
  if (hasRegionStyles) {
    // Sinusoidal blink alpha (using currentAnimTime for smooth rendering)
    const blinkAlpha = config.blinkOn ? 0.5 + 0.5 * Math.sin((config.frameCount || currentAnimTime / 150) * 0.3) : 1;

    blobs.forEach((blob, idx) => {
      const x = blob.minX;
      const y = blob.minY;
      const tw = blob.width;
      const th = blob.height;
      const cx = blob.x;
      const cy = blob.y;
      const color = colorForTrack(config, idx, "#ffffff");

      const styles =
        config.random && config.regionStyles.length > 0
          ? [config.regionStyles[(blob.id || idx) % config.regionStyles.length]]
          : config.regionStyles;

      ctx.save();
      ctx.globalAlpha = blinkAlpha;

      // Backdrop first
      if (styles.includes("backdrop")) {
        ctx.fillStyle = hexToRgba(color === "rainbow" ? "#ffffff" : color, 0.15);
        drawShape(ctx, config.shape || "square", x, y, tw, th, "fill");
      }
      if (styles.includes("glow")) {
        ctx.shadowColor = color === "rainbow" ? "#fff" : color;
        ctx.shadowBlur = 24;
      }

      ctx.strokeStyle = color === "rainbow" ? hexToRgba("rainbow", 1) : color;
      ctx.lineWidth = config.strokeWidth !== undefined ? config.strokeWidth : 1.5;

      for (const st of styles) {
        switch (st) {
          case "basic":
            ctx.setLineDash([]);
            drawShape(ctx, config.shape || "square", x, y, tw, th, "stroke");
            break;
          case "dash":
            ctx.setLineDash([6, 4]);
            drawShape(ctx, config.shape || "square", x, y, tw, th, "stroke");
            ctx.setLineDash([]);
            break;
          case "cross":
            ctx.beginPath();
            ctx.moveTo(cx - tw / 4, cy);
            ctx.lineTo(cx + tw / 4, cy);
            ctx.moveTo(cx, cy - th / 4);
            ctx.lineTo(cx, cy + th / 4);
            ctx.stroke();
            break;
          case "frame": {
            drawShape(ctx, config.shape || "square", x, y, tw, th, "stroke");
            // corner handles
            const s2 = 6;
            ctx.fillStyle = color === "rainbow" ? "#fff" : color;
            [
              [x, y],
              [x + tw, y],
              [x, y + th],
              [x + tw, y + th],
              [x + tw / 2, y],
              [x + tw / 2, y + th],
              [x, y + th / 2],
              [x + tw, y + th / 2],
            ].forEach(([px, py]) =>
              ctx.fillRect(px - s2 / 2, py - s2 / 2, s2, s2),
            );
            break;
          }
          case "lframe": {
            const L = Math.min(tw, th) * 0.25;
            ctx.beginPath();
            ctx.moveTo(x, y + L);
            ctx.lineTo(x, y);
            ctx.lineTo(x + L, y);
            ctx.moveTo(x + tw - L, y);
            ctx.lineTo(x + tw, y);
            ctx.lineTo(x + tw, y + L);
            ctx.moveTo(x + tw, y + th - L);
            ctx.lineTo(x + tw, y + th);
            ctx.lineTo(x + tw - L, y + th);
            ctx.moveTo(x + L, y + th);
            ctx.lineTo(x, y + th);
            ctx.lineTo(x, y + th - L);
            ctx.stroke();
            break;
          }
          case "xframe":
            drawShape(ctx, config.shape || "square", x, y, tw, th, "stroke");
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + tw, y + th);
            ctx.moveTo(x + tw, y);
            ctx.lineTo(x, y + th);
            ctx.stroke();
            break;
          case "grid": {
            drawShape(ctx, config.shape || "square", x, y, tw, th, "stroke");
            const step = 8;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, tw, th);
            ctx.clip();
            ctx.beginPath();
            for (let yy = y; yy < y + th; yy += step) {
              ctx.moveTo(x, yy);
              ctx.lineTo(x + tw, yy);
            }
            ctx.stroke();
            ctx.restore();
            break;
          }
          case "particle":
            ctx.fillStyle = color === "rainbow" ? hexToRgba("rainbow", 1) : color;
            for (let i = 0; i < 8; i++) {
              const px = x + Math.random() * tw;
              const py = y + Math.random() * th;
              ctx.fillRect(px, py, 2, 2);
            }
            break;
          case "scope": {
            drawShape(ctx, config.shape || "square", x, y, tw, th, "stroke");
            const r = Math.min(tw, th) * 0.25;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - r * 1.4, cy);
            ctx.lineTo(cx + r * 1.4, cy);
            ctx.moveTo(cx, cy - r * 1.4);
            ctx.lineTo(cx, cy + r * 1.4);
            ctx.stroke();
            break;
          }
          case "win2k": {
            const titleH = 18;
            ctx.fillStyle = "rgba(0,0,128,0.85)";
            ctx.fillRect(x, y - titleH, tw, titleH);
            ctx.fillStyle = "#fff";
            ctx.font = `bold 11px ui-monospace, monospace`;
            ctx.textBaseline = "top";
            ctx.fillText(`Object ${blob.id !== null ? blob.id : idx}`, x + 4, y - titleH + 3);
            ctx.strokeStyle = "#fff";
            drawShape(ctx, "square", x, y, tw, th, "stroke");
            break;
          }
          case "label2": {
            const txt = `Object ${blob.id !== null ? blob.id : idx}`;
            ctx.font = `bold ${Math.max(config.fontSize || 12, 14)}px ui-monospace, monospace`;
            const tm = ctx.measureText(txt);
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(x, y - (config.fontSize || 12) - 6, tm.width + 8, (config.fontSize || 12) + 6);
            ctx.fillStyle = color === "rainbow" ? "#fff" : color;
            ctx.textBaseline = "top";
            ctx.fillText(txt, x + 4, y - (config.fontSize || 12) - 3);
            ctx.strokeStyle = color === "rainbow" ? "#fff" : color;
            drawShape(ctx, config.shape || "square", x, y, tw, th, "stroke");
            break;
          }
          case "label": {
            if (config.textOn) {
              const txt = labelText(config, blob);
              ctx.font = `${config.fontSize || 12}px ui-monospace, monospace`;
              ctx.fillStyle = color === "rainbow" ? "#fff" : color;
              const ty =
                config.textPos === "top"
                  ? y - 4
                  : config.textPos === "bottom"
                    ? y + th + (config.fontSize || 12)
                    : cy;
              ctx.textBaseline = config.textPos === "center" ? "middle" : "bottom";
              ctx.textAlign = "center";
              ctx.fillText(txt, cx, ty);
              ctx.textAlign = "left";
              ctx.textBaseline = "alphabetic";
            }
            break;
          }
        }
      }

      // Standalone text (if not using label region but textOn is true)
      if (config.textOn && !styles.includes("label") && !styles.includes("label2")) {
        const txt = labelText(config, blob);
        ctx.font = `${config.fontSize || 12}px ui-monospace, monospace`;
        ctx.fillStyle = color === "rainbow" ? "#fff" : color;
        const ty =
          config.textPos === "top" ? y - 4 : config.textPos === "bottom" ? y + th + (config.fontSize || 12) : cy;
        ctx.textBaseline = config.textPos === "center" ? "middle" : "bottom";
        ctx.textAlign = "center";
        ctx.fillText(txt, cx, ty);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    });
  } else {
    // 8. Bounding boxes / brackets (original config)
    if (config.boxEnabled) {
      drawBoxes(ctx, blobs, config);
    }

    // 9. Per-blob crosshair markers (original config)
    if (config.markerEnabled) {
      drawMarkers(ctx, blobs, config);
    }

    // 13. Labels per blob (original config)
    if (config.labelsEnabled) {
      drawLabels(ctx, blobs, W, H, config);
    }
  }

  // 10. Frame crosshair (full canvas)
  if (config.frameEnabled && config.crosshairEnabled) {
    drawFrameCrosshair(ctx, W, H, config);
  }

  // 11. Frame border
  if (config.frameEnabled && config.borderEnabled) {
    drawFrameBorder(ctx, W, H, config);
  }

  // 12. Frame text
  if (config.frameEnabled && config.frameTextEnabled) {
    drawFrameText(ctx, W, H, config);
  }

  // 14. Status / metrics
  drawStatusAndMetrics(ctx, blobs, config, W, H, fps);

  // 15. Debug HUD
  if (config.debugHud) {
    drawDebugHud(ctx, W, H, config, blobs, fps);
  }
}

/**
 * Key drawing functions
 */

export function drawBoxes(
  ctx: CanvasRenderingContext2D,
  blobs: TrackedBlob[],
  config: any
) {
  blobs.forEach((blob) => {
    const pad = config.boxPadding;
    const x = blob.minX - pad;
    const y = blob.minY - pad;
    const w = blob.width + pad * 2;
    const h = blob.height + pad * 2;

    ctx.save();
    let opacity = config.boxOpacity / 100;
    if (blob.ttl !== undefined && config.persistence > 0 && blob.ttl < config.persistence) {
      opacity *= (blob.ttl / config.persistence);
    }
    ctx.strokeStyle = hexToRgba(config.boxColor, opacity);
    ctx.lineWidth = config.lineWidth || config.boxWidth || 2;

    if (config.boxStyle === "FULL") {
      ctx.strokeRect(x, y, w, h);
    } else if (config.boxStyle === "DASHED") {
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
    } else if (config.boxStyle === "XFRAME") {
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y);
      ctx.lineTo(x, y + h);
      ctx.stroke();
    } else if (config.boxStyle === "GRID") {
      ctx.strokeRect(x, y, w, h);
      ctx.save();
      ctx.strokeStyle = hexToRgba(config.boxColor, opacity * 0.35);
      const cols = 4;
      const rows = 4;
      for (let i = 1; i < cols; i++) {
        const gx = x + (w / cols) * i;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
      }
      for (let i = 1; i < rows; i++) {
        const gy = y + (h / rows) * i;
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy);
        ctx.stroke();
      }
      ctx.restore();
    } else if (config.boxStyle === "PARTICLE") {
      ctx.strokeRect(x, y, w, h);
      ctx.save();
      ctx.fillStyle = hexToRgba(config.boxColor, opacity * 0.7);
      const particleCount = Math.min(30, Math.floor((w * h) / 100) + 5);
      for (let i = 0; i < particleCount; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        ctx.fillRect(px, py, 2, 2);
      }
      ctx.restore();
    } else if (config.boxStyle === "SCOPE") {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.hypot(w, h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.1, cy);
      ctx.lineTo(cx - r * 0.3, cy);
      ctx.moveTo(cx + r * 0.3, cy);
      ctx.lineTo(cx + r * 1.1, cy);
      ctx.moveTo(cx, cy - r * 1.1);
      ctx.lineTo(cx, cy - r * 0.3);
      ctx.moveTo(cx, cy + r * 0.3);
      ctx.lineTo(cx, cy + r * 1.1);
      ctx.stroke();
    } else if (config.boxStyle === "WIN2K") {
      // Windows 2000 titlebar window frame design
      const gray = "#d4d0c8";
      const darkGray = "#808080";
      const black = "#000000";
      const white = "#ffffff";
      const titleBlue = "#000080";
      const titleBlueLight = "#1084d0";

      ctx.save();
      ctx.globalAlpha = opacity;

      // Draw background
      ctx.fillStyle = gray;
      ctx.fillRect(x, y, w, h);

      // Bevel borders
      ctx.strokeStyle = white;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();

      ctx.strokeStyle = darkGray;
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.stroke();

      ctx.strokeStyle = black;
      ctx.beginPath();
      ctx.moveTo(x + w - 1, y + 1);
      ctx.lineTo(x + w - 1, y + h - 1);
      ctx.lineTo(x + 1, y + h - 1);
      ctx.stroke();

      // Title bar
      const titleHeight = 18;
      const ty = y + 2;
      const tx = x + 2;
      const tw = w - 4;

      if (tw > 20 && h > 22) {
        const grad = ctx.createLinearGradient(tx, ty, tx + tw, ty);
        grad.addColorStop(0, titleBlue);
        grad.addColorStop(1, titleBlueLight);
        ctx.fillStyle = grad;
        ctx.fillRect(tx, ty, tw, titleHeight);

        ctx.fillStyle = white;
        ctx.font = "bold 9px 'Tahoma', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const objName = `Object ${blob.id !== null ? blob.id : "?"}`;
        ctx.fillText(objName, tx + 4, ty + titleHeight / 2);

        // Close button [X]
        const btnSize = 12;
        const bx = tx + tw - btnSize - 2;
        const by = ty + (titleHeight - btnSize) / 2;
        if (bx > tx + 20) {
          ctx.fillStyle = gray;
          ctx.fillRect(bx, by, btnSize, btnSize);

          ctx.strokeStyle = white;
          ctx.beginPath();
          ctx.moveTo(bx, by + btnSize);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx + btnSize, by);
          ctx.stroke();
          
          ctx.strokeStyle = darkGray;
          ctx.beginPath();
          ctx.moveTo(bx + btnSize, by);
          ctx.lineTo(bx + btnSize, by + btnSize);
          ctx.lineTo(bx, by + btnSize);
          ctx.stroke();

          ctx.strokeStyle = black;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx + 3, by + 3);
          ctx.lineTo(bx + btnSize - 3, by + btnSize - 3);
          ctx.moveTo(bx + btnSize - 3, by + 3);
          ctx.lineTo(bx + 3, by + btnSize - 3);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else {
      // BRACKET
      const arm = Math.min(w, h) * 0.3;
      // top-left
      ctx.beginPath();
      ctx.moveTo(x, y + arm);
      ctx.lineTo(x, y);
      ctx.lineTo(x + arm, y);
      ctx.stroke();
      // top-right
      ctx.beginPath();
      ctx.moveTo(x + w - arm, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + arm);
      ctx.stroke();
      // bottom-left
      ctx.beginPath();
      ctx.moveTo(x, y + h - arm);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + arm, y + h);
      ctx.stroke();
      // bottom-right
      ctx.beginPath();
      ctx.moveTo(x + w - arm, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - arm);
      ctx.stroke();
    }
    ctx.restore();
  });
}

export function drawConnections(
  ctx: CanvasRenderingContext2D,
  blobs: TrackedBlob[],
  W: number,
  H: number,
  config: any
) {
  // If baby-track linesOn is active, use baby-track connection logic:
  if (config.linesOn) {
    const lineColor = config.lineColor || "#ffffff";
    const lineOpacity = config.lineOpacity !== undefined ? config.lineOpacity : 70;
    const lineWidth = config.lineWidth !== undefined ? config.lineWidth : 1;
    ctx.save();
    ctx.strokeStyle = hexToRgba(lineColor, lineOpacity / 100);
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(config.lineDashed ? [6, 4] : []);

    const centers = blobs.map((b) => ({ x: b.x, y: b.y }));

    const shouldDraw = (i: number, j: number) => {
      const rate = config.connectionRate !== undefined ? config.connectionRate : 0.25;
      if (rate >= 1) return true;
      const seed = ((i * 73856093) ^ (j * 19349663)) >>> 0;
      return (seed % 1000) / 1000 < rate;
    };

    const drawLine = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      ctx.beginPath();
      const style = config.lineStyle || "straight";
      if (style === "straight" || style === "STRAIGHT") {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      } else if (style === "curve" || style === "CURVED") {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.2;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
      } else if (style === "step") {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, a.y);
        ctx.lineTo(b.x, b.y);
      } else {
        // wave
        const steps = 16;
        ctx.moveTo(a.x, a.y);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const nx = -dy / (len || 1);
        const ny = dx / (len || 1);
        for (let k = 1; k <= steps; k++) {
          const tt = k / steps;
          const px = a.x + dx * tt;
          const py = a.y + dy * tt;
          const offset = Math.sin(tt * Math.PI * 4) * 6;
          ctx.lineTo(px + nx * offset, py + ny * offset);
        }
      }
      ctx.stroke();
    };

    const maxDist = config.maxDist !== undefined ? config.maxDist : 600;
    const mode = config.lineMode || "all";

    if (config.centerHub || mode === "hub" || mode === "HUB CENTER") {
      const hub = { x: W / 2, y: H / 2 };
      centers.forEach((c, i) => {
        if (shouldDraw(i, -1)) drawLine(hub, c);
      });
    } else if (mode === "all" || mode === "ALL PAIRS") {
      for (let i = 0; i < centers.length; i++) {
        for (let j = i + 1; j < centers.length; j++) {
          const d = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
          if (d <= maxDist && shouldDraw(i, j)) drawLine(centers[i], centers[j]);
        }
      }
    } else if (mode === "nearest" || mode === "NEAREST") {
      for (let i = 0; i < centers.length; i++) {
        let best = -1;
        let bd = maxDist;
        for (let j = 0; j < centers.length; j++) {
          if (i === j) continue;
          const d = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
          if (d < bd) {
            bd = d;
            best = j;
          }
        }
        if (best >= 0 && shouldDraw(i, best)) drawLine(centers[i], centers[best]);
      }
    } else if (mode === "chain" || mode === "CHAIN") {
      const ordered = centers.slice().sort((a, b) => a.x - b.x);
      for (let i = 0; i < ordered.length - 1; i++) {
        if (shouldDraw(i, i + 1)) drawLine(ordered[i], ordered[i + 1]);
      }
    }
    ctx.restore();
    return;
  }

  // Fallback to original main project connections drawing logic:
  const avgArea =
    blobs.reduce((s, b) => s + b.area, 0) / blobs.length;
  const autoDist = Math.sqrt(avgArea) * 3;
  const maxDist =
    config.connectionMaxDist === "auto" || !config.connectionMaxDist
      ? autoDist
      : Number(config.connectionMaxDist);

  ctx.save();
  ctx.strokeStyle = hexToRgba(
    config.connectionColor,
    config.connectionOpacity / 100
  );
  ctx.lineWidth = config.connectionWidth || 1;

  const drawLine = (ax: number, ay: number, bx: number, by: number) => {
    ctx.save();
    if (config.lineStyle === "DASHED" || config.animateLines) {
      ctx.setLineDash([4, 4]);
      if (config.animateLines) {
        ctx.lineDashOffset =
          -((currentAnimTime / 20) * (config.animateSpeed || 1)) % 8;
      }
    }
    ctx.beginPath();
    if (config.lineStyle === "CURVED") {
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const t = config.curveTension;
      const cpx = mx + (by - ay) * t;
      const cpy = my - (bx - ax) * t;
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cpx, cpy, bx, by);
    } else {
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.restore();
  };

  const hub = {
    x: (config.hubX / 100) * W,
    y: (config.hubY / 100) * H,
  };

  switch (config.connectionMode) {
    case "ALL PAIRS":
      for (let i = 0; i < blobs.length; i++) {
        for (let j = i + 1; j < blobs.length; j++) {
          if (
            Math.hypot(blobs[i].x - blobs[j].x, blobs[i].y - blobs[j].y) <
            maxDist
          ) {
            drawLine(blobs[i].x, blobs[i].y, blobs[j].x, blobs[j].y);
          }
        }
      }
      break;

    case "NEAREST":
      blobs.forEach((b, i) => {
        let closest: TrackedBlob | null = null;
        let minD = Infinity;
        blobs.forEach((b2, j) => {
          if (i === j) return;
          const d = Math.hypot(b.x - b2.x, b.y - b2.y);
          if (d < minD) {
            minD = d;
            closest = b2;
          }
        });
        if (closest) drawLine(b.x, b.y, closest.x, closest.y);
      });
      break;

    case "CHAIN":
      for (let i = 0; i < blobs.length - 1; i++) {
        drawLine(blobs[i].x, blobs[i].y, blobs[i + 1].x, blobs[i + 1].y);
      }
      break;

    case "HUB CENTER":
      blobs.forEach((b) => drawLine(hub.x, hub.y, b.x, b.y));
      // draw hub crosshair marker
      ctx.beginPath();
      ctx.moveTo(hub.x - 8, hub.y);
      ctx.lineTo(hub.x + 8, hub.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y - 8);
      ctx.lineTo(hub.x, hub.y + 8);
      ctx.stroke();
      break;

    case "RADIAL":
      blobs.forEach((b, i) => {
        let closest: TrackedBlob | null = null;
        let minD = Infinity;
        blobs.forEach((b2, j) => {
          if (i === j) return;
          const d = Math.hypot(b.x - b2.x, b.y - b2.y);
          if (d < minD) {
            minD = d;
            closest = b2;
          }
        });
        if (closest) drawLine(b.x, b.y, closest.x, closest.y);
        drawLine(hub.x, hub.y, b.x, b.y);
      });
      break;
  }
  ctx.restore();
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  blobs: TrackedBlob[],
  config: any
) {
  ctx.save();
  ctx.strokeStyle = hexToRgba(config.trailColor, config.trailOpacity / 100);
  ctx.lineWidth = config.trailWidth || 1;

  if (config.trailMode === "SPATIAL") {
    // Catmull-Rom spline through all current blob centroids
    const pts = blobs.map((b) => ({ x: b.x, y: b.y }));
    if (pts.length < 2) {
      ctx.restore();
      return;
    }
    const interp =
      pts.length >= 4 ? catmullRom(pts, config.lineSmooth || 8) : pts;
    ctx.beginPath();
    ctx.moveTo(interp[0].x, interp[0].y);
    interp.forEach((p, i) => {
      if (i > 0) ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  } else {
    // TEMPORAL
    blobs.forEach((blob) => {
      if (!blob.history || blob.history.length < 2) return;
      // Truncate to trail length dynamically
      const activeHist = blob.history.slice(-config.trailLength);
      activeHist.forEach((pos, i) => {
        if (i === 0) return;
        const t = i / activeHist.length;
        const alpha =
          config.trailFade === "EXPONENTIAL"
            ? t * t
            : config.trailFade === "LINEAR"
              ? t
              : 1;
        ctx.save();
        ctx.strokeStyle = hexToRgba(
          config.trailColor,
          (config.trailOpacity / 100) * alpha
        );
        ctx.beginPath();
        ctx.moveTo(activeHist[i - 1].x, activeHist[i - 1].y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
      });
    });
  }
  ctx.restore();
}

export function catmullRom(points: Point[], resolution = 8): Point[] {
  if (points.length < 4) return points;
  const result: Point[] = [];
  for (let i = 1; i < points.length - 2; i++) {
    const p = [points[i - 1], points[i], points[i + 1], points[i + 2]];
    for (let j = 0; j < resolution; j++) {
      const t = j / resolution;
      const t2 = t * t;
      const t3 = t2 * t;
      result.push({
        x:
          0.5 *
          ((-p[0].x + 3 * p[1].x - 3 * p[2].x + p[3].x) * t3 +
            (2 * p[0].x - 5 * p[1].x + 4 * p[2].x - p[3].x) * t2 +
            (-p[0].x + p[2].x) * t +
            2 * p[1].x),
        y:
          0.5 *
          ((-p[0].y + 3 * p[1].y - 3 * p[2].y + p[3].y) * t3 +
            (2 * p[0].y - 5 * p[1].y + 4 * p[2].y - p[3].y) * t2 +
            (-p[0].y + p[2].y) * t +
            2 * p[1].y),
      });
    }
  }
  // Include final points to finish path
  result.push(points[points.length - 2]);
  return result;
}

export function drawCircleChain(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  config: any
) {
  const angleRad = config.chainAngle * (Math.PI / 180);
  ctx.save();
  for (let i = 0; i < config.chainCount; i++) {
    const r = config.baseRadius * Math.pow(config.sizeRatio, i);
    const cx = anchorX + Math.cos(angleRad) * config.chainSpacing * i;
    const cy = anchorY + Math.sin(angleRad) * config.chainSpacing * i;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (config.circleFill) {
      ctx.fillStyle = hexToRgba(
        config.circleFillColor || "#ffffff",
        config.circleFillOpacity / 100
      );
      ctx.fill();
    }
    if (config.circleStroke) {
      ctx.strokeStyle = hexToRgba(
        config.circleStrokeColor || "#ffffff",
        config.circleStrokeOpacity / 100
      );
      ctx.lineWidth = config.circleStrokeWidth || 1;
      ctx.stroke();
    }
  }
  if (config.showCenterDot) {
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, config.centerDotRadius || 4, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(
      config.circleStrokeColor || "#ffffff",
      config.circleStrokeOpacity / 100
    );
    ctx.fill();
  }
  ctx.restore();
}

export function drawScanLines(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  config: any
) {
  ctx.save();
  ctx.globalAlpha = config.scanOpacity / 100;
  ctx.fillStyle = config.scanColor || "#000000";
  const offset = config.scanAnimate
    ? (currentAnimTime / 50) % config.scanDensity
    : 0;
  for (let y = offset; y < H; y += config.scanDensity) {
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  config: any
) {
  const sizeVal = config.vignetteSize ?? 70;
  const r = Math.max(W, H) * (sizeVal / 100);
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
  g.addColorStop(0, "transparent");
  g.addColorStop(
    1,
    hexToRgba(config.vignetteColor || "#000000", config.vignetteIntensity / 100)
  );
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function drawGrain(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  config: any
) {
  ctx.save();
  // scale visual opacity with grain Amount
  ctx.globalAlpha =
    (config.grainOpacity / 100) * (config.grainAmount / 100);
  try {
    const size = config.grainSize === 1 ? 256 : 128;
    const noise = getNoiseCanvas(size);
    const pattern = ctx.createPattern(noise, "repeat");
    if (pattern) {
      const offsetX = Math.floor(Math.random() * size);
      const offsetY = Math.floor(Math.random() * size);
      ctx.translate(offsetX, offsetY);
      ctx.fillStyle = pattern;
      ctx.fillRect(-offsetX, -offsetY, W, H);
    }
  } catch (e) {
    // fallback if createPattern fails
  }
  ctx.restore();
}

export function drawFrameCrosshair(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  config: any
) {
  ctx.save();
  ctx.strokeStyle = hexToRgba(
    config.crosshairColor || "#ffffff",
    config.crosshairOpacity / 100
  );
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();

  if (config.tickMarks) {
    for (let x = 0; x < W; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, H / 2 - 3);
      ctx.lineTo(x, H / 2 + 3);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 50) {
      ctx.beginPath();
      ctx.moveTo(W / 2 - 3, y);
      ctx.lineTo(W / 2 + 3, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawFrameBorder(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  config: any
) {
  const inset = 12;
  ctx.save();
  ctx.strokeStyle = hexToRgba(
    config.borderColor || "#ffffff",
    config.borderOpacity / 100
  );
  ctx.lineWidth = config.borderWidth || 1;
  if (config.borderStyle === "FULL") {
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  } else {
    // CORNERS
    const arm = 40;
    const x = inset,
      y = inset,
      w = W - inset * 2,
      h = H - inset * 2;
    ctx.beginPath();
    ctx.moveTo(x, y + arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + arm, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - arm, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + arm);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + h - arm);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + arm, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - arm, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - arm);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFrameText(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  config: any
) {
  ctx.save();
  ctx.font = `${config.frameTextSize || 11}px Space Mono, monospace`;
  ctx.fillStyle = hexToRgba(
    config.frameTextColor || "#ffffff",
    config.frameTextOpacity / 100
  );
  const pad = 20;
  const text = config.frameText || "";
  const metrics = ctx.measureText(text);
  let tx = pad;
  let ty = H - pad;
  switch (config.frameTextPosition) {
    case "TOP LEFT":
      tx = pad;
      ty = pad + (config.frameTextSize || 11);
      break;
    case "TOP RIGHT":
      tx = W - pad - metrics.width;
      ty = pad + (config.frameTextSize || 11);
      break;
    case "BOTTOM LEFT":
      tx = pad;
      ty = H - pad;
      break;
    case "BOTTOM RIGHT":
      tx = W - pad - metrics.width;
      ty = H - pad;
      break;
  }
  ctx.fillText(text, tx, ty);
  ctx.restore();
}

export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  blobs: TrackedBlob[],
  config: any
) {
  blobs.forEach((blob) => {
    const cx = blob.x;
    const cy = blob.y;
    const r = (config.markerSize || 24) / 2;
    ctx.save();
    let opacity = config.markerOpacity / 100;
    if (blob.ttl !== undefined && config.persistence > 0 && blob.ttl < config.persistence) {
      opacity *= (blob.ttl / config.persistence);
    }
    ctx.strokeStyle = hexToRgba(
      config.markerColor || "#ffffff",
      opacity
    );
    ctx.fillStyle = hexToRgba(
      config.markerColor || "#ffffff",
      opacity
    );
    ctx.lineWidth = config.lineWidth || config.boxWidth || 1;

    if (config.markerStyle === "CROSS") {
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.stroke();
    } else if (config.markerStyle === "RETICLE") {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx - r * 0.3, cy);
      ctx.moveTo(cx + r * 0.3, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy - r * 0.3);
      ctx.moveTo(cx, cy + r * 0.3);
      ctx.lineTo(cx, cy + r);
      ctx.stroke();
    } else if (config.markerStyle === "DOT") {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, r * 0.4), 0, Math.PI * 2);
      ctx.fill();
    } else if (config.markerStyle === "DIAMOND") {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  });
}

export function drawLabels(
  ctx: CanvasRenderingContext2D,
  blobs: TrackedBlob[],
  W: number,
  H: number,
  config: any
) {
  ctx.save();
  ctx.font = `${config.labelFontSize || 10}px Space Mono, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  blobs.forEach((blob, idx) => {
    let text = "";
    switch (config.labelContent) {
      case "INDEX":
        text = blob.id !== null ? `ID: ${blob.id}` : `IDX: ${idx}`;
        break;
      case "AREA":
        text = String(Math.round(blob.area));
        break;
      case "POSITION":
        text = `${(blob.x / W).toFixed(2)}, ${(blob.y / H).toFixed(2)}`;
        break;
      case "VELOCITY":
        const vel = Math.hypot(blob.vx || 0, blob.vy || 0);
        text = vel.toFixed(1);
        break;
      case "CUSTOM":
        text = config.labelText || "";
        break;
    }

    const pad = config.boxPadding || 0;
    const bx = blob.minX - pad;
    const by = blob.minY - pad;
    const bw = blob.width + pad * 2;
    const bh = blob.height + pad * 2;

    let tx = blob.x;
    let ty = blob.y;

    switch (config.labelPosition) {
      case "ABOVE BOX":
        tx = bx + bw / 2;
        ty = by - (config.labelFontSize || 10) / 2 - 4;
        break;
      case "INSIDE TOP":
        tx = bx + bw / 2;
        ty = by + (config.labelFontSize || 10) / 2 + 4;
        break;
      case "AT CENTROID":
        tx = blob.x;
        ty = blob.y;
        break;
      case "BELOW BOX":
        tx = bx + bw / 2;
        ty = by + bh + (config.labelFontSize || 10) / 2 + 4;
        break;
    }

    let opacity = 1.0;
    if (blob.ttl !== undefined && config.persistence > 0 && blob.ttl < config.persistence) {
      opacity *= (blob.ttl / config.persistence);
    }
    ctx.fillStyle = hexToRgba(config.labelColor || "#ffffff", opacity);

    ctx.fillText(text, tx, ty);
  });
  ctx.restore();
}

export function drawStatusAndMetrics(
  ctx: CanvasRenderingContext2D,
  blobs: TrackedBlob[],
  config: any,
  W: number,
  H: number,
  fps: number
) {
  if (config.statusEnabled) {
    ctx.save();
    ctx.font = `9px Space Mono, monospace`;
    ctx.fillStyle = `rgba(255, 255, 255, 0.45)`;
    ctx.textAlign = "left";
    ctx.fillText(`fps: ${fps} / blobs: ${blobs.length}`, 12, H - 12);
    ctx.restore();
  }

  if (config.metricsEnabled) {
    ctx.save();
    ctx.font = `9px Space Mono, monospace`;
    ctx.fillStyle = `rgba(255, 255, 255, 0.65)`;
    ctx.textAlign = "left";
    let y = 20;
    blobs.slice(0, 10).forEach((b, idx) => {
      const normX = (b.x / W).toFixed(2);
      const normY = (b.y / H).toFixed(2);
      const speed = Math.hypot(b.vx || 0, b.vy || 0).toFixed(1);
      ctx.fillText(
        `[${idx}] POS: ${normX},${normY} | SPD: ${speed} | AREA: ${Math.round(b.area)}`,
        12,
        y
      );
      y += 12;
    });
    ctx.restore();
  }
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  config: any
) {
  ctx.save();
  ctx.strokeStyle = hexToRgba(config.gridColor || "#ffffff", (config.gridOpacity || 30) / 100);
  ctx.lineWidth = 1;
  const size = config.gridSize || 40;
  for (let x = 0; x < W; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDebugHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: any,
  tracks: TrackedBlob[],
  fps: number
) {
  ctx.save();
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "bottom";
  for (const t of tracks) {
    const x = t.minX;
    const y = t.minY;
    const lbl = `#${t.id !== null ? t.id : "?"} a:${t.area | 0} ttl:${t.ttl || 0}`;
    const tw = ctx.measureText(lbl).width + 6;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(x, y - 14, tw, 14);
    ctx.fillStyle = "#00ff88";
    ctx.fillText(lbl, x + 3, y - 2);
    const cx = t.x;
    const cy = t.y;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();
  }

  const lines = [
    `FPS    ${fps.toFixed(1)}`,
    `BLOBS  ${tracks.length}`,
    `THR    ${s.threshold}${s.invertMask ? " (inv)" : ""}${s.diffMode ? " · diff" : ""}`,
    `BLUR ${s.blur}  DIL ${s.dilate}  MIN ${s.minArea}  TTL ${s.persistence}`,
  ];
  const padding = 8;
  const lh = 14;
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  const boxW = maxW + padding * 2;
  const boxH = lines.length * lh + padding * 2;
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(8, 8, boxW, boxH);
  ctx.strokeStyle = "rgba(0,255,136,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(8.5, 8.5, boxW, boxH);
  ctx.fillStyle = "#00ff88";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, 8 + padding, 8 + padding + i * lh));

  const tag = `OUT ${w}×${h}`;
  ctx.font = "10px ui-monospace, monospace";
  const ww = ctx.measureText(tag).width + 12;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(w - ww - 8, h - 22, ww, 16);
  ctx.fillStyle = "#fff";
  ctx.fillText(tag, w - ww - 2, h - 18);
  ctx.restore();
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: "square" | "circle" | "capsule",
  x: number,
  y: number,
  w: number,
  h: number,
  op: "stroke" | "fill"
) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape === "capsule") {
    const r = Math.min(w, h) / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
  op === "stroke" ? ctx.stroke() : ctx.fill();
}

export function labelText(s: any, t: any) {
  if (s.textContent === "position") return `(${Math.round(t.x)},${Math.round(t.y)})`;
  if (s.textContent === "count") return `#${t.id !== null ? t.id : "?"}`;
  return t.label ?? `#${t.id !== null ? t.id : "?"}`;
}

export function colorForTrack(s: any, idx: number, fallback: string): string {
  if (s.crazyColors) {
    return `hsl(${(idx * 47) % 360},85%,60%)`;
  }
  if (s.separateColors) {
    const list = [
      "#ffffff", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3",
      "#737373", "#525252", "#404040", "#262626", "#171717", "#000000"
    ];
    return list[idx % list.length];
  }
  return s.color === "rainbow"
    ? `hsl(${(currentAnimTime / 20 + idx * 30) % 360},90%,60%)`
    : s.color || fallback;
}

export function applyFilters(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: any,
  tracks: any[]
) {
  // If "mask" filter is on, clip to track regions
  let bounds: { x: number; y: number; w: number; h: number } | null = null;
  if (s.filters && s.filters.includes("mask") && tracks.length > 0) {
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    for (const t of tracks) {
      const x = t.minX;
      const y = t.minY;
      const tw = t.width;
      const th = t.height;
      xMin = Math.min(xMin, x);
      yMin = Math.min(yMin, y);
      xMax = Math.max(xMax, x + tw);
      yMax = Math.max(yMax, y + th);
    }
    bounds = {
      x: Math.max(0, xMin | 0),
      y: Math.max(0, yMin | 0),
      w: Math.min(w, (xMax - xMin) | 0),
      h: Math.min(h, (yMax - yMin) | 0),
    };
    if (bounds.w <= 0 || bounds.h <= 0) bounds = null;
  }

  const region = bounds ?? { x: 0, y: 0, w, h };
  if (region.w <= 0 || region.h <= 0) return;
  const img = ctx.getImageData(region.x, region.y, region.w, region.h);
  const d = img.data;

  if (s.filters) {
    for (const f of s.filters) {
      if (f === "mask") continue;
      switch (f) {
        case "inv":
          for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i];
            d[i + 1] = 255 - d[i + 1];
            d[i + 2] = 255 - d[i + 2];
          }
          break;
        case "thermal":
          for (let i = 0; i < d.length; i += 4) {
            const lum = (d[i] + d[i + 1] + d[i + 2]) / 3 / 255;
            const hue = (1 - lum) * 240; // blue cold to red hot
            const [r, g, b] = hslToRgb(hue / 360, 1, 0.5);
            d[i] = r;
            d[i + 1] = g;
            d[i + 2] = b;
          }
          break;
        case "tone":
          for (let i = 0; i < d.length; i += 4) {
            const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
            d[i] = v;
            d[i + 1] = v;
            d[i + 2] = v;
          }
          break;
        case "edge": {
          const copy = new Uint8ClampedArray(d);
          const W = region.w;
          for (let y = 1; y < region.h - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              const i = (y * W + x) * 4;
              const r = Math.abs(copy[i] - copy[i + 4]) + Math.abs(copy[i] - copy[i + W * 4]);
              d[i] = d[i + 1] = d[i + 2] = r > 30 ? 255 : 0;
            }
          }
          break;
        }
        case "dither":
          for (let y = 0; y < region.h; y++) {
            for (let x = 0; x < region.w; x++) {
              const i = (y * region.w + x) * 4;
              const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
              const bayer = ((x & 1) ^ (y & 1)) * 64;
              const out = v + bayer > 160 ? 255 : 0;
              d[i] = d[i + 1] = d[i + 2] = out;
            }
          }
          break;
        case "pixel": {
          const px = 8;
          for (let y = 0; y < region.h; y += px) {
            for (let x = 0; x < region.w; x += px) {
              const i = (y * region.w + x) * 4;
              const r = d[i],
                g = d[i + 1],
                b = d[i + 2];
              for (let dy = 0; dy < px && y + dy < region.h; dy++) {
                for (let dx = 0; dx < px && x + dx < region.w; dx++) {
                  const j = ((y + dy) * region.w + (x + dx)) * 4;
                  d[j] = r;
                  d[j + 1] = g;
                  d[j + 2] = b;
                }
              }
            }
          }
          break;
        }
        case "xray":
          for (let i = 0; i < d.length; i += 4) {
            const v = 255 - (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
            d[i] = v * 0.7;
            d[i + 1] = v * 0.9;
            d[i + 2] = v;
          }
          break;
        case "glitch": {
          const W = region.w;
          for (let y = 0; y < region.h; y++) {
            if (Math.random() < 0.05) {
              const shift = ((Math.random() - 0.5) * 30) | 0;
              for (let x = 0; x < W; x++) {
                const src = ((x + shift + W) % W) + y * W;
                const dst = x + y * W;
                d[dst * 4] = d[src * 4];
              }
            }
          }
          break;
        }
        case "blur": {
          const W = region.w;
          const copy = new Uint8ClampedArray(d);
          for (let y = 1; y < region.h - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              for (let c = 0; c < 3; c++) {
                const i = (y * W + x) * 4 + c;
                d[i] =
                  ((copy[i - 4] + copy[i + 4] + copy[i - W * 4] + copy[i + W * 4] + copy[i] * 4) /
                    8) |
                  0;
              }
            }
          }
          break;
        }
        case "zoom": {
          const cx = region.w / 2;
          const cy = region.h / 2;
          const copy = new Uint8ClampedArray(d);
          for (let y = 0; y < region.h; y++) {
            for (let x = 0; x < region.w; x++) {
              const dx = (x - cx) * 1.05 + cx;
              const dy = (y - cy) * 1.05 + cy;
              const sx2 = Math.max(0, Math.min(region.w - 1, dx | 0));
              const sy2 = Math.max(0, Math.min(region.h - 1, dy | 0));
              const i = (y * region.w + x) * 4;
              const j = (sy2 * region.w + sx2) * 4;
              d[i] = (d[i] + copy[j]) / 2;
              d[i + 1] = (d[i + 1] + copy[j + 1]) / 2;
              d[i + 2] = (d[i + 2] + copy[j + 2]) / 2;
            }
          }
          break;
        }
        case "water": {
          const copy = new Uint8ClampedArray(d);
          const W = region.w;
          const t = currentAnimTime / 200;
          for (let y = 0; y < region.h; y++) {
            const off = (Math.sin(y / 8 + t) * 4) | 0;
            for (let x = 0; x < W; x++) {
              const src = Math.max(0, Math.min(W - 1, x + off));
              const i = (y * W + x) * 4;
              const j = (y * W + src) * 4;
              d[i] = copy[j];
              d[i + 1] = copy[j + 1];
              d[i + 2] = copy[j + 2];
            }
          }
          break;
        }
        case "crt":
          for (let y = 0; y < region.h; y++) {
            if (y % 2 === 0) {
              for (let x = 0; x < region.w; x++) {
                const i = (y * region.w + x) * 4;
                d[i] *= 0.7;
                d[i + 1] *= 0.7;
                d[i + 2] *= 0.7;
              }
            }
          }
          break;
      }
    }
  }

  if (s.filterInvert) {
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
  }
  ctx.putImageData(img, region.x, region.y);
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [(r * 255) | 0, (g * 255) | 0, (b * 255) | 0];
}

/**
 * Utility: Converts a Hex color code into an RGBA color string
 */
export function hexToRgba(hex: string, alpha = 1): string {
  if (hex === "rainbow") {
    const t = (currentAnimTime / 20) % 360;
    return `hsla(${t},90%,55%,${alpha})`;
  }
  if (!hex) return `rgba(255,255,255,${alpha})`;
  const h = hex.replace("#", "");
  if (h.length < 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
