import { interpolateGradient } from "../utils";

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
  const data = imgData.data;

  const spacing = cfg.spacing || 12;
  const maxRadius = (cfg.dotSize || 8) / 2;
  const minRadius = cfg.minRadius || 0;

  for (let y = spacing / 2; y < H; y += spacing) {
    for (let x = spacing / 2; x < W; x += spacing) {
      const pxX = Math.min(W - 1, Math.floor(x));
      const pxY = Math.min(H - 1, Math.floor(y));
      const idx = (pxY * W + pxX) * 4;

      const rVal = data[idx];
      const gVal = data[idx + 1];
      const bVal = data[idx + 2];

      const lum = (rVal * 0.299 + gVal * 0.587 + bVal * 0.114) / 255;
      
      let r = maxRadius;
      if (cfg.sizeBy === "BRIGHTNESS") {
        r = lum * maxRadius;
      } else if (cfg.sizeBy === "INVERSE") {
        r = (1 - lum) * maxRadius;
      }
      
      r = Math.max(minRadius, r);
      if (r < 0.3) continue;

      if (cfg.colorMode === "SOURCE") {
        outputCtx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
      } else if (cfg.colorMode === "FOREGROUND") {
        outputCtx.fillStyle = cfg.fgColor || "#000000";
      } else if (cfg.colorMode === "GRADIENT") {
        outputCtx.fillStyle = interpolateGradient(cfg.gradStart || "#000000", cfg.gradEnd || "#ffffff", lum);
      }

      outputCtx.beginPath();
      outputCtx.arc(x, y, r, 0, Math.PI * 2);
      outputCtx.fill();
    }
  }
}
