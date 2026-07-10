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
  
  outputCtx.strokeStyle = cfg.lineColor || "#000000";
  outputCtx.lineCap = "round";

  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }
  const data = imgData.data;

  // Pre-calculate a fast luminance map to avoid calling getImageData repeatedly
  const lumMap = new Float32Array(W * H);
  for (let i = 0; i < data.length; i += 4) {
    lumMap[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  const layerAngles = [
    cfg.angle || 45,
    (cfg.angle || 45) + 90,
    (cfg.angle || 45) + 45,
    (cfg.angle || 45) + 135
  ];

  const diag = Math.sqrt(W * W + H * H);
  const maxLayers = cfg.layers || 2;
  const spacing = cfg.lineSpacing || 8;
  const baseWidth = cfg.lineWidth || 1;
  const thresh = cfg.densityThreshold !== undefined ? cfg.densityThreshold : 200;

  for (let l = 0; l < maxLayers; l++) {
    const rad = layerAngles[l] * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Scan lines across the canvas bounding box
    for (let d = -diag; d < diag; d += spacing) {
      if (!cfg.varyThickness) {
        outputCtx.beginPath();
      }
      let pathActive = false;
      let prevX = -1;
      let prevY = -1;
      const step = 3;
      const tMax = diag * 2;

      for (let t = 0; t < tMax; t += step) {
        // Rotated path calculation
        const x = Math.floor(d * cos - t * sin + W / 2);
        const y = Math.floor(d * sin + t * cos + H / 2);

        if (x < 0 || x >= W || y < 0 || y >= H) {
          pathActive = false;
          continue;
        }

        const lum = lumMap[y * W + x];
        if (lum > thresh) {
          pathActive = false;
          continue;
        }

        // Adjust line width according to luminance (darker = thicker)
        let currentWidth = baseWidth;
        if (cfg.varyThickness) {
          currentWidth = Math.max(0.2, baseWidth * (1 - lum / 255) * 2);
        }

        if (!pathActive) {
          if (!cfg.varyThickness) {
            outputCtx.moveTo(x, y);
          }
          prevX = x;
          prevY = y;
          pathActive = true;
        } else {
          if (cfg.varyThickness) {
            outputCtx.lineWidth = currentWidth;
            outputCtx.beginPath();
            outputCtx.moveTo(prevX, prevY);
            outputCtx.lineTo(x, y);
            outputCtx.stroke();
          } else {
            outputCtx.lineTo(x, y);
          }
          prevX = x;
          prevY = y;
        }
      }
      if (!cfg.varyThickness) {
        outputCtx.stroke();
      }
    }
  }
}
