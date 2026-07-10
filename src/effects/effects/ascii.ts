export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any
) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  const charSets = {
    STANDARD: [" ", ".", "'", "\"", "~", "-", ":", ";", "=", "+", "x", "X", "$", "&", "#", "@"],
    BLOCKS: [" ", "░", "▒", "▓", "█"],
    BINARY: ["0", "1"],
    NUMBERS: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    SYMBOLS: ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
    CUSTOM: [] as string[]
  };

  const chars =
    cfg.charSet === "CUSTOM"
      ? [...(cfg.customChars || " .:-=+*#%@")]
      : charSets[cfg.charSet] || charSets.STANDARD;

  if (chars.length === 0) return;

  // Clear output canvas with background color
  outputCtx.fillStyle = cfg.bgColor || "#000000";
  outputCtx.fillRect(0, 0, W, H);

  // Set font properties
  outputCtx.font = `${cfg.bold ? "bold " : ""}${cfg.cellSize}px ${
    cfg.font === "SPACE MONO" ? "'Space Mono', monospace" : cfg.font === "COURIER" ? "Courier, monospace" : "monospace"
  }`;
  outputCtx.textAlign = "left";
  outputCtx.textBaseline = "top";

  const size = cfg.cellSize;
  // Get all pixel data from the source canvas in one go to make it super fast
  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }
  const data = imgData.data;

  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) {
      // Find pixel coordinates in source canvas
      const pxX = Math.min(W - 1, Math.floor(x + size / 2));
      const pxY = Math.min(H - 1, Math.floor(y + size / 2));
      const i = (pxY * W + pxX) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const idx = cfg.invertChars
        ? Math.floor((1 - lum) * (chars.length - 1))
        : Math.floor(lum * (chars.length - 1));
      
      const ch = chars[Math.max(0, Math.min(chars.length - 1, idx))];

      if (cfg.colorMode === "SOURCE") {
        outputCtx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        outputCtx.fillStyle = cfg.fgColor || "#00ff00";
      }

      outputCtx.fillText(ch, x, y);
    }
  }
}
