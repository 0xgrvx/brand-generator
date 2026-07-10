function getHue(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    case b: h = (r - g) / d + 4; break;
  }
  return h * 60;
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

  const getValue = (i: number) => {
    if (cfg.sortBy === "BRIGHTNESS") {
      return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    if (cfg.sortBy === "RED") return data[i];
    if (cfg.sortBy === "GREEN") return data[i + 1];
    if (cfg.sortBy === "BLUE") return data[i + 2];
    if (cfg.sortBy === "HUE") return getHue(data[i], data[i + 1], data[i + 2]);
    return 0;
  };

  const direction = cfg.direction || "HORIZONTAL";
  const threshLow = cfg.threshLow !== undefined ? cfg.threshLow : 80;
  const threshHigh = cfg.threshHigh !== undefined ? cfg.threshHigh : 200;
  const sortOrder = cfg.sortOrder || "ASCENDING";
  const span = cfg.span !== undefined ? cfg.span : 1.0;

  if (direction === "HORIZONTAL") {
    for (let y = 0; y < H; y++) {
      let start: number | null = null;
      const maxX = Math.floor(W * span);

      for (let x = 0; x <= maxX; x++) {
        const i = (y * W + x) * 4;
        const val = x < W ? getValue(i) : -1;
        const inRange = val >= threshLow && val <= threshHigh;

        if (inRange && start === null) {
          start = x;
        } else if (!inRange && start !== null) {
          // Extract run segment
          const seg: number[][] = [];
          for (let sx = start; sx < x; sx++) {
            const si = (y * W + sx) * 4;
            seg.push([data[si], data[si + 1], data[si + 2], data[si + 3], getValue(si)]);
          }

          // Sort segment
          seg.sort((a, b) => a[4] - b[4]);
          if (sortOrder === "DESCENDING") seg.reverse();

          // Write back
          seg.forEach(([r, g, b, a], idx) => {
            const di = (y * W + (start as number) + idx) * 4;
            data[di] = r;
            data[di + 1] = g;
            data[di + 2] = b;
            data[di + 3] = a;
          });
          start = null;
        }
      }
    }
  } else if (direction === "VERTICAL") {
    for (let x = 0; x < W; x++) {
      let start: number | null = null;
      const maxY = Math.floor(H * span);

      for (let y = 0; y <= maxY; y++) {
        const i = (y * W + x) * 4;
        const val = y < H ? getValue(i) : -1;
        const inRange = val >= threshLow && val <= threshHigh;

        if (inRange && start === null) {
          start = y;
        } else if (!inRange && start !== null) {
          const seg: number[][] = [];
          for (let sy = start; sy < y; sy++) {
            const si = (sy * W + x) * 4;
            seg.push([data[si], data[si + 1], data[si + 2], data[si + 3], getValue(si)]);
          }

          seg.sort((a, b) => a[4] - b[4]);
          if (sortOrder === "DESCENDING") seg.reverse();

          seg.forEach(([r, g, b, a], idx) => {
            const di = (((start as number) + idx) * W + x) * 4;
            data[di] = r;
            data[di + 1] = g;
            data[di + 2] = b;
            data[di + 3] = a;
          });
          start = null;
        }
      }
    }
  } else if (direction === "DIAGONAL") {
    // Diagonal sort loops diagonally (x + y is constant or x - y is constant)
    // We sort along diagonals going from top-left to bottom-right: x - y = constant
    // The range of constants: x - y from -(H-1) to (W-1)
    const minConst = -(H - 1);
    const maxConst = W - 1;

    for (let k = minConst; k <= maxConst; k++) {
      // Find starting point on canvas for this diagonal path
      // x - y = k  =>  x = y + k
      let startDiagY = k < 0 ? -k : 0;
      let startDiagX = k < 0 ? 0 : k;
      
      const diagLen = Math.min(W - startDiagX, H - startDiagY);
      const maxLen = Math.floor(diagLen * span);

      let start: number | null = null;

      for (let d = 0; d <= maxLen; d++) {
        const tx = startDiagX + d;
        const ty = startDiagY + d;
        const i = (ty * W + tx) * 4;
        const val = d < diagLen ? getValue(i) : -1;
        const inRange = val >= threshLow && val <= threshHigh;

        if (inRange && start === null) {
          start = d;
        } else if (!inRange && start !== null) {
          const seg: number[][] = [];
          for (let sd = start; sd < d; sd++) {
            const sx = startDiagX + sd;
            const sy = startDiagY + sd;
            const si = (sy * W + sx) * 4;
            seg.push([data[si], data[si + 1], data[si + 2], data[si + 3], getValue(si)]);
          }

          seg.sort((a, b) => a[4] - b[4]);
          if (sortOrder === "DESCENDING") seg.reverse();

          seg.forEach(([r, g, b, a], idx) => {
            const sx = startDiagX + (start as number) + idx;
            const sy = startDiagY + (start as number) + idx;
            const di = (sy * W + sx) * 4;
            data[di] = r;
            data[di + 1] = g;
            data[di + 2] = b;
            data[di + 3] = a;
          });
          start = null;
        }
      }
    }
  }

  return imgData;
}
