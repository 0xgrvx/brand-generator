import { hexToRgb } from "../utils";

// Procedural Bayer value generator for any power of two size
function getBayerValue(x: number, y: number, size: number): number {
  let val = 0;
  let mask = size >> 1;
  let step = 0;
  while (mask > 0) {
    const xc = (x & mask) ? 1 : 0;
    const yc = (y & mask) ? 1 : 0;
    val += (((xc ^ yc) ? 2 : 0) + (yc ? 1 : 0)) << (step * 2);
    mask >>= 1;
    step++;
  }
  return val;
}

const PALETTES = {
  MONO: [
    [0, 0, 0],
    [255, 255, 255]
  ],
  CMYK: [
    [0, 255, 255],   // Cyan
    [255, 0, 255],   // Magenta
    [255, 255, 0],   // Yellow
    [0, 0, 0],       // Black
    [255, 255, 255]  // White
  ],
  "GAME BOY": [
    [15, 56, 15],     // Darkest
    [48, 98, 48],
    [139, 172, 15],
    [155, 188, 15]    // Lightest
  ],
  RGB: [
    [0, 0, 0],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [0, 255, 255],
    [255, 0, 255],
    [255, 255, 0],
    [255, 255, 255]
  ],
  CUSTOM: [] as number[][]
};

// Helper to find closest color in a palette
function findClosestColor(r: number, g: number, b: number, palette: number[][], levels: number): [number, number, number] {
  if (palette.length === 0) {
    // If no palette, quantize grayscale or RGB color based on levels
    const step = 255 / (levels - 1);
    const rq = Math.round(r / step) * step;
    const gq = Math.round(g / step) * step;
    const bq = Math.round(b / step) * step;
    return [
      Math.max(0, Math.min(255, rq)),
      Math.max(0, Math.min(255, gq)),
      Math.max(0, Math.min(255, bq))
    ];
  }

  let minDist = Infinity;
  let closest = palette[0];
  for (const color of palette) {
    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }
  return [closest[0], closest[1], closest[2]];
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
  const alg = cfg.algorithm;
  const levels = cfg.levels || 4;
  const spread = cfg.spread !== undefined ? cfg.spread : 1.0;
  
  // Custom colors resolved if duotone/custom modes
  let palColors: number[][] = [];
  if (cfg.palette === "CUSTOM") {
    // Check if user has global adjustments duotone shadow/highlight, or draw default custom
    const shad = cfg.shadowColor || "#000000";
    const hig = cfg.highlightColor || "#ffffff";
    palColors = [hexToRgb(shad), hexToRgb(hig)];
  } else {
    palColors = PALETTES[cfg.palette as keyof typeof PALETTES] || [];
  }

  if (alg === "BAYER" || alg === "ORDERED") {
    const mKey = cfg.matrixSize || "4x4";
    const mSize = parseInt(mKey.split("x")[0], 10) || 4;
    const step = 255 / (levels - 1);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Bayer thresholding
        const threshold = getBayerValue(x, y, mSize) / (mSize * mSize) - 0.5;
        const noise = threshold * step * spread;

        // Apply noise & quantize
        const nr = Math.max(0, Math.min(255, r + noise));
        const ng = Math.max(0, Math.min(255, g + noise));
        const nb = Math.max(0, Math.min(255, b + noise));

        const [cr, cg, cb] = findClosestColor(nr, ng, nb, palColors, levels);
        data[i] = cr;
        data[i + 1] = cg;
        data[i + 2] = cb;
      }
    }
    return imgData;
  }

  // Floyd-Steinberg or Atkinson error diffusion
  // To avoid boundary checks and speed up, we work on a mutable float array representing RGB errors
  const errors = new Float32Array(W * H * 3);
  for (let i = 0; i < data.length; i += 4) {
    errors[Math.floor(i / 4) * 3] = data[i];
    errors[Math.floor(i / 4) * 3 + 1] = data[i + 1];
    errors[Math.floor(i / 4) * 3 + 2] = data[i + 2];
  }

  const serpentine = cfg.serpentine;

  for (let y = 0; y < H; y++) {
    const isLeftToRight = !serpentine || y % 2 === 0;
    const startX = isLeftToRight ? 0 : W - 1;
    const endX = isLeftToRight ? W : -1;
    const stepX = isLeftToRight ? 1 : -1;

    for (let x = startX; x !== endX; x += stepX) {
      const idx = (y * W + x) * 3;
      const r = errors[idx];
      const g = errors[idx + 1];
      const b = errors[idx + 2];

      const [cr, cg, cb] = findClosestColor(r, g, b, palColors, levels);

      // Write output back to image data
      const outIdx = (y * W + x) * 4;
      data[outIdx] = cr;
      data[outIdx + 1] = cg;
      data[outIdx + 2] = cb;
      data[outIdx + 3] = 255;

      // Diffuse error
      const er = (r - cr) * spread;
      const eg = (g - cg) * spread;
      const eb = (b - cb) * spread;

      const distribute = (dx: number, dy: number, fraction: number) => {
        const tx = x + dx;
        const ty = y + dy;
        if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
          const tidx = (ty * W + tx) * 3;
          errors[tidx] += er * fraction;
          errors[tidx + 1] += eg * fraction;
          errors[tidx + 2] += eb * fraction;
        }
      };

      if (alg === "FLOYD-STEINBERG") {
        if (isLeftToRight) {
          distribute(1, 0, 7 / 16);
          distribute(-1, 1, 3 / 16);
          distribute(0, 1, 5 / 16);
          distribute(1, 1, 1 / 16);
        } else {
          distribute(-1, 0, 7 / 16);
          distribute(1, 1, 3 / 16);
          distribute(0, 1, 5 / 16);
          distribute(-1, 1, 1 / 16);
        }
      } else if (alg === "ATKINSON") {
        // Atkinson spreads the error to 6 neighbors:
        // (x+1, y), (x+2, y), (x-1, y+1), (x, y+1), (x+1, y+1), (x, y+2)
        const factor = 1 / 8;
        if (isLeftToRight) {
          distribute(1, 0, factor);
          distribute(2, 0, factor);
          distribute(-1, 1, factor);
          distribute(0, 1, factor);
          distribute(1, 1, factor);
          distribute(0, 2, factor);
        } else {
          distribute(-1, 0, factor);
          distribute(-2, 0, factor);
          distribute(1, 1, factor);
          distribute(0, 1, factor);
          distribute(-1, 1, factor);
          distribute(0, 2, factor);
        }
      }
    }
  }

  return imgData;
}
