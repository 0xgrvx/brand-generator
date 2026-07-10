import { hexToRgb } from "../utils";

// Custom box blur for edge pre-smoothing
function boxBlurLuminance(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const d = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / d;
      const add = src[row + Math.min(w - 1, x + r + 1)];
      const sub = src[row + Math.max(0, x - r)];
      sum += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
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
  const out = new Uint8ClampedArray(data.length);
  const edge = hexToRgb(cfg.edgeColor || "#ffffff");
  const bg = hexToRgb(cfg.bgColor || "#000000");
  const threshLow = cfg.threshLow !== undefined ? cfg.threshLow : 50;
  const threshHigh = cfg.threshHigh !== undefined ? cfg.threshHigh : 150;
  const strength = cfg.strength || 1.0;
  const invert = cfg.invert;

  // 1. Calculate luminance map
  let lum = new Float32Array(W * H);
  for (let i = 0; i < data.length; i += 4) {
    lum[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  // 2. Pre-blur for noise removal
  const preBlur = cfg.preBlur !== undefined ? Math.round(cfg.preBlur) : 1;
  if (preBlur > 0) {
    lum = boxBlurLuminance(lum, W, H, preBlur);
  }

  // Kernels
  const SOBEL_X = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  const SOBEL_Y = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  const PREWITT_X = [
    [-1, 0, 1],
    [-1, 0, 1],
    [-1, 0, 1]
  ];
  const PREWITT_Y = [
    [-1, -1, -1],
    [0, 0, 0],
    [1, 1, 1]
  ];

  const LAPLACIAN = [
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0]
  ];

  const alg = cfg.algorithm || "SOBEL";

  // Magnitudes and directions array for Canny
  const magArray = new Float32Array(W * H);
  const dirArray = new Float32Array(W * H);

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx = (y * W + x) * 4;
      let gx = 0, gy = 0;
      let val = 0;

      if (alg === "SOBEL" || alg === "CANNY") {
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pLum = lum[(y + ky) * W + (x + kx)];
            gx += pLum * SOBEL_X[ky + 1][kx + 1];
            gy += pLum * SOBEL_Y[ky + 1][kx + 1];
          }
        }
        val = Math.sqrt(gx * gx + gy * gy) * strength;
        if (alg === "CANNY") {
          magArray[y * W + x] = val;
          // Calculate gradient direction angle
          dirArray[y * W + x] = Math.atan2(gy, gx);
        }
      } else if (alg === "PREWITT") {
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pLum = lum[(y + ky) * W + (x + kx)];
            gx += pLum * PREWITT_X[ky + 1][kx + 1];
            gy += pLum * PREWITT_Y[ky + 1][kx + 1];
          }
        }
        val = Math.sqrt(gx * gx + gy * gy) * strength;
      } else if (alg === "LAPLACIAN") {
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pLum = lum[(y + ky) * W + (x + kx)];
            val += pLum * LAPLACIAN[ky + 1][kx + 1];
          }
        }
        val = Math.abs(val) * strength;
      }

      if (alg !== "CANNY") {
        const isEdge = val > threshLow;
        const [r, g, b] = invert ? (isEdge ? bg : edge) : (isEdge ? edge : bg);
        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = 255;
      }
    }
  }

  if (alg === "CANNY") {
    // 1. Non-maximum suppression
    const nms = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = y * W + x;
        const mag = magArray[idx];
        if (mag < threshLow) continue;

        let angle = dirArray[idx] * (180 / Math.PI);
        if (angle < 0) angle += 180;

        let mag1 = 0, mag2 = 0;

        if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
          // Horizontal direction
          mag1 = magArray[idx - 1];
          mag2 = magArray[idx + 1];
        } else if (angle >= 22.5 && angle < 67.5) {
          // Diagonal direction /
          mag1 = magArray[idx - W + 1];
          mag2 = magArray[idx + W - 1];
        } else if (angle >= 67.5 && angle < 112.5) {
          // Vertical direction
          mag1 = magArray[idx - W];
          mag2 = magArray[idx + W];
        } else {
          // Diagonal direction \
          mag1 = magArray[idx - W - 1];
          mag2 = magArray[idx + W + 1];
        }

        if (mag >= mag1 && mag >= mag2) {
          nms[idx] = mag;
        }
      }
    }

    // 2. Hysteresis Thresholding
    const edgeMap = new Uint8Array(W * H);
    const stack: number[] = [];

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = y * W + x;
        if (nms[idx] >= threshHigh) {
          edgeMap[idx] = 1; // Strong edge
          stack.push(idx);
        }
      }
    }

    // Connect weak edges (connected to strong edges)
    while (stack.length > 0) {
      const idx = stack.pop()!;
      const x = idx % W;
      const y = Math.floor(idx / W);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nidx = (y + dy) * W + (x + dx);
          if (
            x + dx >= 0 &&
            x + dx < W &&
            y + dy >= 0 &&
            y + dy < H &&
            edgeMap[nidx] === 0 &&
            nms[nidx] >= threshLow
          ) {
            edgeMap[nidx] = 1;
            stack.push(nidx);
          }
        }
      }
    }

    // Draw final Canny output
    for (let i = 0; i < out.length; i += 4) {
      const idx = i / 4;
      const isEdge = edgeMap[idx] === 1;
      const [r, g, b] = invert ? (isEdge ? bg : edge) : (isEdge ? edge : bg);
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }

  // Handle edges (black pixels on border)
  for (let x = 0; x < W; x++) {
    const topIdx = x * 4;
    const botIdx = ((H - 1) * W + x) * 4;
    out[topIdx] = bg[0]; out[topIdx + 1] = bg[1]; out[topIdx + 2] = bg[2]; out[topIdx + 3] = 255;
    out[botIdx] = bg[0]; out[botIdx + 1] = bg[1]; out[botIdx + 2] = bg[2]; out[botIdx + 3] = 255;
  }
  for (let y = 0; y < H; y++) {
    const leftIdx = y * W * 4;
    const rightIdx = (y * W + W - 1) * 4;
    out[leftIdx] = bg[0]; out[leftIdx + 1] = bg[1]; out[leftIdx + 2] = bg[2]; out[leftIdx + 3] = 255;
    out[rightIdx] = bg[0]; out[rightIdx + 1] = bg[1]; out[rightIdx + 2] = bg[2]; out[rightIdx + 3] = 255;
  }

  return new ImageData(out, W, H);
}
