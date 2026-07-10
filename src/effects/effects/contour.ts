import { hexToRgb } from "../utils";

// Custom box blur for smoothing raw images before contouring
function blurLuminance(data: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return data;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const d = r * 2 + 1;
  
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) {
      sum += data[row + Math.min(w - 1, Math.max(0, x))];
    }
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / d;
      const add = data[row + Math.min(w - 1, x + r + 1)];
      const sub = data[row + Math.max(0, x - r)];
      sum += add - sub;
    }
  }
  
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) {
      sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    }
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / d;
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x];
      const sub = tmp[Math.max(0, y - r) * w + x];
      sum += add - sub;
    }
  }
  return out;
}

export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any
) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  outputCtx.fillStyle = cfg.bgColor || "#ffffff";
  outputCtx.fillRect(0, 0, W, H);

  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }

  const rawData = imgData.data;
  
  // 1. Create a grayscale luminance map
  let lumMap = new Float32Array(W * H);
  for (let i = 0; i < rawData.length; i += 4) {
    lumMap[i / 4] = (rawData[i] * 0.299 + rawData[i + 1] * 0.587 + rawData[i + 2] * 0.114) / 255;
  }

  // 2. Pre-blur for smoothing contours
  const smoothing = cfg.smoothing !== undefined ? Math.round(cfg.smoothing) : 2;
  if (smoothing > 0) {
    lumMap = blurLuminance(lumMap, W, H, smoothing);
  }

  // 3. Set line properties
  outputCtx.lineWidth = cfg.lineWidth || 1;
  outputCtx.lineCap = "round";
  outputCtx.lineJoin = "round";

  // 4. Run marching squares
  // Define marching grid step
  const step = 6;
  const cols = Math.floor(W / step);
  const rows = Math.floor(H / step);
  
  const levelsCount = cfg.levels || 10;
  
  // March through each threshold level
  for (let l = 1; l <= levelsCount; l++) {
    const threshold = l / (levelsCount + 1);

    // Color code setting per level
    if (cfg.colorMode === "MONO") {
      outputCtx.strokeStyle = cfg.lineColor || "#000000";
      outputCtx.fillStyle = cfg.lineColor || "#000000";
    } else if (cfg.colorMode === "RAINBOW") {
      const hue = (l / levelsCount) * 360;
      outputCtx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
      outputCtx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    }

    if (cfg.colorMode !== "SOURCE") {
      outputCtx.beginPath();
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const x = c * step;
        const y = r * step;

        const val0 = lumMap[Math.min(H - 1, y) * W + Math.min(W - 1, x)];
        const val1 = lumMap[Math.min(H - 1, y) * W + Math.min(W - 1, x + step)];
        const val2 = lumMap[Math.min(H - 1, y + step) * W + Math.min(W - 1, x + step)];
        const val3 = lumMap[Math.min(H - 1, y + step) * W + Math.min(W - 1, x)];

        let caseIndex = 0;
        if (val0 >= threshold) caseIndex |= 8;
        if (val1 >= threshold) caseIndex |= 4;
        if (val2 >= threshold) caseIndex |= 2;
        if (val3 >= threshold) caseIndex |= 1;

        if (caseIndex === 0 || caseIndex === 15) continue;

        // Line helper to sample original color if SOURCE mode
        const setStrokeColorAt = (sampleX: number, sampleY: number) => {
          if (cfg.colorMode === "SOURCE") {
            const pxX = Math.min(W - 1, Math.max(0, Math.floor(sampleX)));
            const pxY = Math.min(H - 1, Math.max(0, Math.floor(sampleY)));
            const i = (pxY * W + pxX) * 4;
            outputCtx.strokeStyle = `rgb(${rawData[i]},${rawData[i + 1]},${rawData[i + 2]})`;
          }
        };

        // Linear interpolation factor for exact positions on edges
        const lerpFactor = (vStart: number, vEnd: number) => {
          if (Math.abs(vStart - vEnd) < 0.0001) return 0.5;
          return (threshold - vStart) / (vEnd - vStart);
        };

        // Midpoints/interpolated positions of cell edges
        // Top edge
        const tTop = lerpFactor(val0, val1);
        const pTop = { x: x + step * tTop, y: y };

        // Right edge
        const tRight = lerpFactor(val1, val2);
        const pRight = { x: x + step, y: y + step * tRight };

        // Bottom edge
        const tBottom = lerpFactor(val3, val2);
        const pBottom = { x: x + step * tBottom, y: y + step };

        // Left edge
        const tLeft = lerpFactor(val0, val3);
        const pLeft = { x: x, y: y + step * tLeft };

        const drawSegment = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
          if (cfg.colorMode === "SOURCE") {
            setStrokeColorAt((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            outputCtx.beginPath();
            outputCtx.moveTo(p1.x, p1.y);
            outputCtx.lineTo(p2.x, p2.y);
            outputCtx.stroke();
          } else {
            outputCtx.moveTo(p1.x, p1.y);
            outputCtx.lineTo(p2.x, p2.y);
          }
        };

        switch (caseIndex) {
          case 1: drawSegment(pLeft, pBottom); break;
          case 2: drawSegment(pBottom, pRight); break;
          case 3: drawSegment(pLeft, pRight); break;
          case 4: drawSegment(pTop, pRight); break;
          case 5:
            drawSegment(pLeft, pTop);
            drawSegment(pBottom, pRight);
            break;
          case 6: drawSegment(pTop, pBottom); break;
          case 7: drawSegment(pLeft, pTop); break;
          case 8: drawSegment(pLeft, pTop); break;
          case 9: drawSegment(pTop, pBottom); break;
          case 10:
            drawSegment(pLeft, pBottom);
            drawSegment(pTop, pRight);
            break;
          case 11: drawSegment(pTop, pRight); break;
          case 12: drawSegment(pLeft, pRight); break;
          case 13: drawSegment(pBottom, pRight); break;
          case 14: drawSegment(pLeft, pBottom); break;
        }
      }
    }

    if (cfg.colorMode !== "SOURCE") {
      outputCtx.stroke();
    }
  }
}
