export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any,
  state: { wavePhase: number }
) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  outputCtx.fillStyle = cfg.bgColor || "#ffffff";
  outputCtx.fillRect(0, 0, W, H);

  outputCtx.lineWidth = cfg.lineWidth || 1;
  outputCtx.lineCap = "round";
  outputCtx.lineJoin = "round";

  if (state.wavePhase === undefined) {
    state.wavePhase = 0;
  }
  if (cfg.animate) {
    state.wavePhase += cfg.animSpeed || 0.02;
  }

  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }
  const data = imgData.data;

  const spacing = cfg.lineSpacing || 8;
  const amp = cfg.amplitude || 16;
  const freq = cfg.frequency || 0.01;
  const phase = cfg.phase || 0;
  const currentPhase = phase + state.wavePhase;
  const isMono = cfg.colorMode === "MONO";
  const lineColor = cfg.lineColor || "#000000";

  // Draw Horizontal Waves
  if (cfg.direction === "HORIZONTAL" || cfg.direction === "BOTH") {
    for (let y = 0; y < H; y += spacing) {
      outputCtx.beginPath();
      let first = true;

      for (let x = 0; x < W; x += 2) {
        const pxX = Math.min(W - 1, Math.floor(x));
        const pxY = Math.min(H - 1, Math.floor(y));
        const idx = (pxY * W + pxX) * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        const dy = lum * amp * Math.sin(x * freq + currentPhase);
        const wy = Math.max(0, Math.min(H - 1, y + dy));

        if (!isMono) {
          // If coloring by source, we draw small segments to change color along the line,
          // or we can draw path segments. Drawing segments is slower, so we can draw lines of 10px,
          // or stroke the entire line with the current color. To stay fast, if color mode is SOURCE,
          // we can draw the path with source color at the start or a segment-by-segment approach.
          // Let's do segment-by-segment drawing for color accuracy, stepping x by 4 instead of 1.
          if (first) {
            outputCtx.moveTo(x, wy);
            first = false;
          } else {
            outputCtx.lineTo(x, wy);
            outputCtx.strokeStyle = `rgb(${r},${g},${b})`;
            outputCtx.stroke();
            outputCtx.beginPath();
            outputCtx.moveTo(x, wy);
          }
        } else {
          if (first) {
            outputCtx.moveTo(x, wy);
            first = false;
          } else {
            outputCtx.lineTo(x, wy);
          }
        }
      }

      if (isMono) {
        outputCtx.strokeStyle = lineColor;
        outputCtx.stroke();
      }
    }
  }

  // Draw Vertical Waves
  if (cfg.direction === "VERTICAL" || cfg.direction === "BOTH") {
    for (let x = 0; x < W; x += spacing) {
      outputCtx.beginPath();
      let first = true;

      for (let y = 0; y < H; y += 2) {
        const pxX = Math.min(W - 1, Math.floor(x));
        const pxY = Math.min(H - 1, Math.floor(y));
        const idx = (pxY * W + pxX) * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        const dx = lum * amp * Math.sin(y * freq + currentPhase);
        const wx = Math.max(0, Math.min(W - 1, x + dx));

        if (!isMono) {
          if (first) {
            outputCtx.moveTo(wx, y);
            first = false;
          } else {
            outputCtx.lineTo(wx, y);
            outputCtx.strokeStyle = `rgb(${r},${g},${b})`;
            outputCtx.stroke();
            outputCtx.beginPath();
            outputCtx.moveTo(wx, y);
          }
        } else {
          if (first) {
            outputCtx.moveTo(wx, y);
            first = false;
          } else {
            outputCtx.lineTo(wx, y);
          }
        }
      }

      if (isMono) {
        outputCtx.strokeStyle = lineColor;
        outputCtx.stroke();
      }
    }
  }
}
