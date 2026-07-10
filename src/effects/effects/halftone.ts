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

  const rad = (cfg.angle || 45) * Math.PI / 180;
  const spacing = cfg.spacing || 16;
  const dotSize = cfg.dotSize || 12;

  // Pre-calculate cos/sin
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // We need to cover the entire bounding box of the canvas when it is rotated,
  // which spans roughly from -diagonal to +diagonal.
  const diag = Math.sqrt(W * W + H * H);

  // Loop through rotated coordinates
  for (let gy = -diag; gy < diag + spacing; gy += spacing) {
    for (let gx = -diag; gx < diag + spacing; gx += spacing) {
      // Map back to screen space coordinates
      const rx = gx * cos - gy * sin;
      const ry = gx * sin + gy * cos;

      // Check boundary
      if (rx < 0 || rx >= W || ry < 0 || ry >= H) continue;

      let px: Uint8ClampedArray;
      try {
        px = sCtx.getImageData(Math.floor(rx), Math.floor(ry), 1, 1).data;
      } catch (e) {
        continue;
      }

      const rVal = px[0];
      const gVal = px[1];
      const bVal = px[2];

      const lum = (rVal * 0.299 + gVal * 0.587 + bVal * 0.114) / 255;
      
      // Calculate dot radius based on luminance
      const fillFactor = cfg.invert ? lum : (1 - lum);
      const r = fillFactor * (dotSize / 2);
      if (r < 0.5) continue;

      if (cfg.colorMode === "SOURCE") {
        outputCtx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
      } else if (cfg.colorMode === "CMYK") {
        // CMYK mode is usually simulated or colored CMYK
        // Simple mock: color dots depending on position, or draw multiple offset screen layers
        // Let's do cyan/magenta/yellow overlay mock or a cool tri-color pattern based on coordinates
        const c = 1 - rVal / 255;
        const m = 1 - gVal / 255;
        const y = 1 - bVal / 255;
        // Draw circles offset to simulate a retro CMYK printing pattern
        outputCtx.fillStyle = `rgba(${c * 255}, ${m * 255}, ${y * 255}, 0.8)`;
      } else {
        outputCtx.fillStyle = cfg.dotColor || "#000000";
      }

      if (cfg.shape === "CIRCLE") {
        outputCtx.beginPath();
        outputCtx.arc(rx, ry, r, 0, Math.PI * 2);
        outputCtx.fill();
      } else if (cfg.shape === "SQUARE") {
        outputCtx.fillRect(rx - r, ry - r, r * 2, r * 2);
      } else if (cfg.shape === "DIAMOND") {
        outputCtx.beginPath();
        outputCtx.moveTo(rx, ry - r);
        outputCtx.lineTo(rx + r, ry);
        outputCtx.lineTo(rx, ry + r);
        outputCtx.lineTo(rx - r, ry);
        outputCtx.closePath();
        outputCtx.fill();
      } else if (cfg.shape === "LINE") {
        // Draw line oriented perpendicular to grid angle
        outputCtx.save();
        outputCtx.translate(rx, ry);
        outputCtx.rotate(rad);
        outputCtx.fillRect(-spacing / 2, -r / 2, spacing, r);
        outputCtx.restore();
      }
    }
  }
}
