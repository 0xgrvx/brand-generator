import { hexToRgb } from "../utils";

export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any,
  state: { matrixDrops: number[]; matrixCols: number }
) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  const expectedCols = Math.floor(W / cfg.colWidth);
  if (!state.matrixDrops || state.matrixCols !== expectedCols) {
    state.matrixCols = expectedCols;
    state.matrixDrops = new Array(expectedCols).fill(0).map(() => Math.random() * (H / cfg.fontSize));
  }

  // Draw semi-transparent background to create trails
  const trailFactor = Math.max(5, Math.min(60, cfg.trailLength || 20));
  const opacity = 1.0 / trailFactor;
  const rgb = hexToRgb(cfg.bgColor || "#000000");
  outputCtx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacity})`;
  outputCtx.fillRect(0, 0, W, H);

  outputCtx.font = `${cfg.fontSize}px monospace`;
  outputCtx.textAlign = "left";
  outputCtx.textBaseline = "top";

  const charSets = {
    KATAKANA: "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
    BINARY: "01",
    NUMBERS: "0123456789",
    LATIN: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  };
  const set = charSets[cfg.charSet as keyof typeof charSets] || charSets.KATAKANA;

  // Read source canvas image data for blending colors
  let imgData: ImageData | null = null;
  if (cfg.sourceBlend > 0) {
    try {
      imgData = sCtx.getImageData(0, 0, W, H);
    } catch (e) {
      // ignore
    }
  }

  for (let i = 0; i < state.matrixCols; i++) {
    const ch = set[Math.floor(Math.random() * set.length)];
    const x = i * cfg.colWidth;
    const y = state.matrixDrops[i] * cfg.fontSize;

    if (x < W && y < H && y >= 0) {
      if (cfg.sourceBlend > 0 && imgData) {
        const pxX = Math.min(W - 1, Math.floor(x));
        const pxY = Math.min(H - 1, Math.floor(y));
        const idx = (pxY * W + pxX) * 4;
        const rVal = imgData.data[idx];
        const gVal = imgData.data[idx + 1];
        const bVal = imgData.data[idx + 2];

        const blend = cfg.sourceBlend;
        const fg = hexToRgb(cfg.fgColor || "#00ff00");
        const r = Math.round(rVal * blend + fg[0] * (1 - blend));
        const g = Math.round(gVal * blend + fg[1] * (1 - blend));
        const b = Math.round(bVal * blend + fg[2] * (1 - blend));
        outputCtx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        outputCtx.fillStyle = cfg.fgColor || "#00ff00";
      }

      outputCtx.fillText(ch, x, y);
    }

    if (y > H && Math.random() > 0.975) {
      state.matrixDrops[i] = 0;
    } else {
      state.matrixDrops[i] += cfg.speed || 1.0;
    }
  }
}
