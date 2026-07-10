import { hexToRgb } from "../utils";

// Simple 1D box blur helper for smoothing color channels
function boxBlurRGBA(data: Uint8ClampedArray, w: number, h: number, r: number) {
  if (r <= 0) return;
  const temp = new Uint8ClampedArray(data.length);
  const size = r * 2 + 1;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let rSum = 0, gSum = 0, bSum = 0;

    for (let x = -r; x <= r; x++) {
      const pxX = Math.min(w - 1, Math.max(0, x));
      const idx = (row + pxX) * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
    }

    for (let x = 0; x < w; x++) {
      const idx = (row + x) * 4;
      temp[idx] = rSum / size;
      temp[idx + 1] = gSum / size;
      temp[idx + 2] = bSum / size;

      const nextX = Math.min(w - 1, x + r + 1);
      const prevX = Math.max(0, x - r);
      const nextIdx = (row + nextX) * 4;
      const prevIdx = (row + prevX) * 4;

      rSum += data[nextIdx] - data[prevIdx];
      gSum += data[nextIdx + 1] - data[prevIdx + 1];
      bSum += data[nextIdx + 2] - data[prevIdx + 2];
    }
  }

  for (let x = 0; x < w; x++) {
    let rSum = 0, gSum = 0, bSum = 0;

    for (let y = -r; y <= r; y++) {
      const pxY = Math.min(h - 1, Math.max(0, y));
      const idx = (pxY * w + x) * 4;
      rSum += temp[idx];
      gSum += temp[idx + 1];
      bSum += temp[idx + 2];
    }

    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      data[idx] = rSum / size;
      data[idx + 1] = gSum / size;
      data[idx + 2] = bSum / size;

      const nextY = Math.min(h - 1, y + r + 1);
      const prevY = Math.max(0, y - r);
      const nextIdx = (nextY * w + x) * 4;
      const prevIdx = (prevY * w + x) * 4;

      rSum += temp[nextIdx] - temp[prevIdx];
      gSum += temp[nextIdx + 1] - temp[prevIdx + 1];
      bSum += temp[nextIdx + 2] - temp[prevIdx + 2];
    }
  }
}

export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any
): ImageData | undefined {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }

  const data = imgData.data;

  // 1. Apply pre-smoothing if specified
  const smoothing = cfg.smoothing !== undefined ? Math.round(cfg.smoothing) : 0;
  if (smoothing > 0) {
    boxBlurRGBA(data, W, H, smoothing);
  }

  const light = hexToRgb(cfg.lightColor || "#ffffff");
  const dark = hexToRgb(cfg.darkColor || "#000000");
  const levels = cfg.levels || 2;
  const step = 255 / (levels - 1);

  for (let i = 0; i < data.length; i += 4) {
    const ch =
      cfg.channel === "LUMINANCE"
        ? data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        : cfg.channel === "RED"
        ? data[i]
        : cfg.channel === "GREEN"
        ? data[i + 1]
        : data[i + 2];

    const quantized = Math.round(ch / step) * step;
    const diff = quantized - cfg.threshold;

    let r = 0, g = 0, b = 0;
    if (cfg.antiAlias) {
      // 12 value margin for anti-aliasing interpolation
      const margin = 10;
      if (diff > margin) {
        [r, g, b] = light;
      } else if (diff < -margin) {
        [r, g, b] = dark;
      } else {
        const t = (diff + margin) / (margin * 2);
        r = Math.round(dark[0] + (light[0] - dark[0]) * t);
        g = Math.round(dark[1] + (light[1] - dark[1]) * t);
        b = Math.round(dark[2] + (light[2] - dark[2]) * t);
      }
    } else {
      [r, g, b] = quantized > cfg.threshold ? light : dark;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }

  return imgData;
}
