export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any
) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  const bw = cfg.blockW || 16;
  const bh = cfg.linkWH ? bw : (cfg.blockH || 16);

  outputCtx.clearRect(0, 0, W, H);
  
  if (cfg.shape !== "RECTANGLE" && cfg.bgColor) {
    outputCtx.fillStyle = cfg.bgColor;
    outputCtx.fillRect(0, 0, W, H);
  }

  // Pre-fetch imageData of source canvas for fast sampling
  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }
  const data = imgData.data;

  for (let y = 0; y < H; y += bh) {
    for (let x = 0; x < W; x += bw) {
      const curW = Math.min(bw, W - x);
      const curH = Math.min(bh, H - y);

      let r = 0, g = 0, b = 0;

      if (cfg.colorMethod === "AVERAGE") {
        let count = 0;
        for (let dy = 0; dy < curH; dy += 2) {
          for (let dx = 0; dx < curW; dx += 2) {
            const pxX = x + dx;
            const pxY = y + dy;
            const idx = (pxY * W + pxX) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
        r = Math.round(r / (count || 1));
        g = Math.round(g / (count || 1));
        b = Math.round(b / (count || 1));
      } else if (cfg.colorMethod === "CENTER PIXEL") {
        const cx = Math.min(W - 1, Math.floor(x + curW / 2));
        const cy = Math.min(H - 1, Math.floor(y + curH / 2));
        const idx = (cy * W + cx) * 4;
        r = data[idx];
        g = data[idx + 1];
        b = data[idx + 2];
      } else if (cfg.colorMethod === "DOMINANT") {
        // Fast dominant color calculation by quantizing colors
        const counts: Record<string, number> = {};
        for (let dy = 0; dy < curH; dy += 2) {
          for (let dx = 0; dx < curW; dx += 2) {
            const pxX = x + dx;
            const pxY = y + dy;
            const idx = (pxY * W + pxX) * 4;
            // Quantize to 32 levels per channel (5 bits) to reduce noise
            const qr = Math.floor(data[idx] / 8) * 8;
            const qg = Math.floor(data[idx + 1] / 8) * 8;
            const qb = Math.floor(data[idx + 2] / 8) * 8;
            const key = `${qr},${qg},${qb}`;
            counts[key] = (counts[key] || 0) + 1;
          }
        }
        let maxCount = 0;
        let domKey = "0,0,0";
        for (const key in counts) {
          if (counts[key] > maxCount) {
            maxCount = counts[key];
            domKey = key;
          }
        }
        const rgb = domKey.split(",").map(Number);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
      }

      outputCtx.fillStyle = `rgb(${r},${g},${b})`;
      const cx = x + curW / 2;
      const cy = y + curH / 2;
      const rw = curW / 2;
      const rh = curH / 2;

      outputCtx.beginPath();
      if (cfg.shape === "RECTANGLE") {
        outputCtx.rect(x, y, curW, curH);
        outputCtx.fill();
      } else if (cfg.shape === "CIRCLE") {
        outputCtx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
        outputCtx.fill();
      } else if (cfg.shape === "DIAMOND") {
        outputCtx.moveTo(cx, y);
        outputCtx.lineTo(x + curW, cy);
        outputCtx.lineTo(cx, y + curH);
        outputCtx.lineTo(x, cy);
        outputCtx.closePath();
        outputCtx.fill();
      } else if (cfg.shape === "HEXAGON") {
        // Pointy-topped hexagon path
        outputCtx.moveTo(cx, y);
        outputCtx.lineTo(x + curW, y + curH * 0.25);
        outputCtx.lineTo(x + curW, y + curH * 0.75);
        outputCtx.lineTo(cx, y + curH);
        outputCtx.lineTo(x, y + curH * 0.75);
        outputCtx.lineTo(x, y + curH * 0.25);
        outputCtx.closePath();
        outputCtx.fill();
      }

      if (cfg.outline) {
        outputCtx.strokeStyle = cfg.outlineColor || "#000000";
        outputCtx.lineWidth = 1;
        outputCtx.stroke();
      }
    }
  }
}
