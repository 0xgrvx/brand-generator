import { hexToRgb, seededRandom } from "../utils";

export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any
) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  const rng = seededRandom(cfg.seed || 0);

  // 1. Generate seeds
  let seeds: { x: number; y: number }[] = [];
  const cellCount = cfg.cellCount || 100;
  const placement = cfg.placement || "RANDOM";

  if (placement === "GRID") {
    const cols = Math.ceil(Math.sqrt(cellCount));
    const rows = Math.ceil(cellCount / cols);
    const cellW = W / cols;
    const cellH = H / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (seeds.length >= cellCount) break;
        // Seed in the middle of grid cell with some random jitter
        const x = (c + 0.2 + rng() * 0.6) * cellW;
        const y = (r + 0.2 + rng() * 0.6) * cellH;
        seeds.push({ x: Math.floor(x), y: Math.floor(y) });
      }
    }
  } else if (placement === "WEIGHTED") {
    // Rejection sample toward darker areas (lower luminance = higher probability)
    let imgData: ImageData;
    try {
      imgData = sCtx.getImageData(0, 0, W, H);
    } catch (e) {
      return;
    }
    const data = imgData.data;
    
    for (let i = 0; i < cellCount; i++) {
      let x = 0, y = 0, found = false;
      for (let attempts = 0; attempts < 50; attempts++) {
        x = Math.floor(rng() * W);
        y = Math.floor(rng() * H);
        const idx = (y * W + x) * 4;
        const lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
        if (rng() > lum) {
          found = true;
          break;
        }
      }
      if (!found) {
        x = Math.floor(rng() * W);
        y = Math.floor(rng() * H);
      }
      seeds.push({ x, y });
    }
  } else if (placement === "POISSON") {
    // Simplified Poisson-disc sampling: Grid-based exclusion check
    const minDist = Math.sqrt((W * H) / cellCount) * 0.8;
    for (let attempts = 0; attempts < cellCount * 10; attempts++) {
      if (seeds.length >= cellCount) break;
      const x = Math.floor(rng() * W);
      const y = Math.floor(rng() * H);
      
      let ok = true;
      for (const s of seeds) {
        const dx = s.x - x;
        const dy = s.y - y;
        if (dx * dx + dy * dy < minDist * minDist) {
          ok = false;
          break;
        }
      }
      if (ok) {
        seeds.push({ x, y });
      }
    }
    // Fallback if not enough points found
    while (seeds.length < cellCount) {
      seeds.push({ x: Math.floor(rng() * W), y: Math.floor(rng() * H) });
    }
  } else {
    // RANDOM
    for (let i = 0; i < cellCount; i++) {
      seeds.push({ x: Math.floor(rng() * W), y: Math.floor(rng() * H) });
    }
  }

  // 2. Apply Lloyd's relaxation
  const relaxation = cfg.relaxation !== undefined ? cfg.relaxation : 0;
  if (relaxation > 0) {
    // Run relaxation iterations. To keep this fast, we use a downsampled grid (e.g. step = 4)
    // to calculate Voronoi regions and find centroids.
    const step = 4;
    const subW = Math.ceil(W / step);
    const subH = Math.ceil(H / step);

    for (let iter = 0; iter < relaxation; iter++) {
      const sumX = new Float32Array(cellCount);
      const sumY = new Float32Array(cellCount);
      const count = new Int32Array(cellCount);

      for (let sy = 0; sy < subH; sy++) {
        for (let sx = 0; sx < subW; sx++) {
          const x = sx * step;
          const y = sy * step;
          let minDist = Infinity;
          let closest = 0;
          for (let i = 0; i < cellCount; i++) {
            const dx = x - seeds[i].x;
            const dy = y - seeds[i].y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
              minDist = dist;
              closest = i;
            }
          }
          sumX[closest] += x;
          sumY[closest] += y;
          count[closest]++;
        }
      }

      for (let i = 0; i < cellCount; i++) {
        if (count[i] > 0) {
          seeds[i].x = Math.max(0, Math.min(W - 1, Math.round(sumX[i] / count[i])));
          seeds[i].y = Math.max(0, Math.min(H - 1, Math.round(sumY[i] / count[i])));
        }
      }
    }
  }

  // 3. Get seed colors
  let srcData: ImageData;
  try {
    srcData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }

  const colors: [number, number, number][] = seeds.map((s) => {
    if (cfg.colorSource === "MONO") {
      return hexToRgb(cfg.monoColor || "#ffffff");
    }

    const pxX = Math.max(0, Math.min(W - 1, s.x));
    const pxY = Math.max(0, Math.min(H - 1, s.y));
    
    if (cfg.colorSource === "SEED PIXEL") {
      const idx = (pxY * W + pxX) * 4;
      return [srcData.data[idx], srcData.data[idx + 1], srcData.data[idx + 2]];
    }

    // AVERAGE color source
    // Compute average color in a small region around the seed
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    const radius = 10;
    for (let dy = -radius; dy <= radius; dy += 2) {
      for (let dx = -radius; dx <= radius; dx += 2) {
        const tx = pxX + dx;
        const ty = pxY + dy;
        if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
          const idx = (ty * W + tx) * 4;
          rSum += srcData.data[idx];
          gSum += srcData.data[idx + 1];
          bSum += srcData.data[idx + 2];
          count++;
        }
      }
    }
    return [
      Math.round(rSum / (count || 1)),
      Math.round(gSum / (count || 1)),
      Math.round(bSum / (count || 1))
    ];
  });

  // 4. Fill cells
  // To render this fast (at 60fps), we compute nearest neighbors over a downsampled grid (step = 2)
  // and upscale, or brute-force if dimensions are small.
  // Downsampling by 2 matches high resolution screens nicely while saving 4x computation.
  const renderStep = W > 800 ? 3 : 2;
  
  const img = outputCtx.createImageData(W, H);
  const outData = img.data;

  // Pre-calculate nearest seeds for the downsampled grid, then fill pixels
  for (let y = 0; y < H; y += renderStep) {
    for (let x = 0; x < W; x += renderStep) {
      let minD = Infinity;
      let closest = 0;
      for (let i = 0; i < cellCount; i++) {
        const dx = x - seeds[i].x;
        const dy = y - seeds[i].y;
        const dist = dx * dx + dy * dy;
        if (dist < minD) {
          minD = dist;
          closest = i;
        }
      }

      const [cr, cg, cb] = colors[closest];

      // Fill a small block of size renderStep x renderStep
      for (let dy = 0; dy < renderStep && y + dy < H; dy++) {
        for (let dx = 0; dx < renderStep && x + dx < W; dx++) {
          const idx = ((y + dy) * W + (x + dx)) * 4;
          outData[idx] = cr;
          outData[idx + 1] = cg;
          outData[idx + 2] = cb;
          outData[idx + 3] = 255;
        }
      }
    }
  }

  outputCtx.putImageData(img, 0, 0);

  // 5. Draw borders if specified
  if (cfg.showBorders) {
    outputCtx.strokeStyle = cfg.borderColor || "#000000";
    outputCtx.lineWidth = cfg.borderWidth || 1;
    
    // Quick approximation of borders by drawing lines connecting neighboring cell seeds
    // Or doing a Delaunay/Voronoi edge drawing. Let's do a simple and elegant pixel-based border finder
    // on the canvas context or drawing Delaunay lines, or simpler: trace lines where Voronoi cell transitions.
    // For visual quality, we can scan the computed pixel buffer for transitions:
    // This is super fast because we only read the downsampled image data.
    const edges = outputCtx.getImageData(0, 0, W, H);
    const edgePixels = edges.data;
    const borderImg = outputCtx.createImageData(W, H);
    const borderData = borderImg.data;
    const bColor = hexToRgb(cfg.borderColor || "#000000");

    for (let y = 1; y < H - 1; y += 2) {
      for (let x = 1; x < W - 1; x += 2) {
        const idx = (y * W + x) * 4;
        
        // Compare with right and bottom neighbors
        const rIdx = idx + 4;
        const bIdx = idx + W * 4;
        
        const isDiffRight = 
          edgePixels[idx] !== edgePixels[rIdx] || 
          edgePixels[idx+1] !== edgePixels[rIdx+1] || 
          edgePixels[idx+2] !== edgePixels[rIdx+2];

        const isDiffBottom = 
          edgePixels[idx] !== edgePixels[bIdx] || 
          edgePixels[idx+1] !== edgePixels[bIdx+1] || 
          edgePixels[idx+2] !== edgePixels[bIdx+2];

        if (isDiffRight || isDiffBottom) {
          // Draw border pixel
          borderData[idx] = bColor[0];
          borderData[idx + 1] = bColor[1];
          borderData[idx + 2] = bColor[2];
          borderData[idx + 3] = 255;

          // Make borders slightly thicker if border width > 1
          if (cfg.borderWidth > 1) {
            borderData[rIdx] = bColor[0];
            borderData[rIdx + 1] = bColor[1];
            borderData[rIdx + 2] = bColor[2];
            borderData[rIdx + 3] = 255;
            
            borderData[bIdx] = bColor[0];
            borderData[bIdx + 1] = bColor[1];
            borderData[bIdx + 2] = bColor[2];
            borderData[bIdx + 3] = 255;
          }
        }
      }
    }
    
    // Draw borders overlay
    const tempCvs = document.createElement("canvas");
    tempCvs.width = W;
    tempCvs.height = H;
    const tempCtx = tempCvs.getContext("2d")!;
    tempCtx.putImageData(borderImg, 0, 0);
    outputCtx.drawImage(tempCvs, 0, 0);
  }

  // 6. Draw seeds if specified
  if (cfg.showSeeds) {
    seeds.forEach((s) => {
      outputCtx.beginPath();
      outputCtx.arc(s.x, s.y, cfg.seedSize || 3, 0, Math.PI * 2);
      outputCtx.fillStyle = "#ffffff";
      outputCtx.fill();
      outputCtx.strokeStyle = "#000000";
      outputCtx.lineWidth = 1;
      outputCtx.stroke();
    });
  }
}
