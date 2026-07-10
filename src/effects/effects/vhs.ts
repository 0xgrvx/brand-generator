export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any,
  state: { time: number }
): ImageData | undefined {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  if (state.time === undefined) {
    state.time = 0;
  }
  if (cfg.animate) {
    state.time += (cfg.speed || 1.0) * 0.05;
  }

  let imgData: ImageData;
  try {
    imgData = sCtx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }

  const src = new Uint8ClampedArray(imgData.data);
  const out = new Uint8ClampedArray(src.length);

  // Constants
  const colorBleed = Math.floor(cfg.colorBleed || 8);
  const jitter = cfg.jitter !== undefined ? cfg.jitter : 4;
  const trackingNoise = cfg.trackingNoise !== undefined ? cfg.trackingNoise : 0.4;
  const noiseBands = cfg.noiseBands !== undefined ? cfg.noiseBands : 5;
  const scanlines = cfg.scanlines !== undefined ? cfg.scanlines : 0.3;
  const noiseGrain = cfg.noiseGrain !== undefined ? cfg.noiseGrain : 0.2; // mapping default key name
  const vertSync = cfg.vertSync !== undefined ? cfg.vertSync : 0.1;
  const satBleed = cfg.satBleed !== undefined ? cfg.satBleed : 0.3;
  const edgeDistort = cfg.edgeDistort !== undefined ? cfg.edgeDistort : 0.2;

  // 1. Roll Vertical Sync Offset
  let syncOffset = 0;
  if (vertSync > 0) {
    // Generates a slow vertical rolling displacement based on time and sync speed
    syncOffset = Math.floor(state.time * vertSync * 30) % H;
  }

  // 2. Main Pixel Processing Loop: Color bleed, jitter, edge distortion
  for (let y = 0; y < H; y++) {
    // Roll y coordinate based on syncOffset
    const sourceY = (y + syncOffset) % H;

    // Apply horizontal jitter to rows occasionally
    let rowJitter = 0;
    // Base jitter + high amplitude glitch band
    if (Math.random() < 0.05 || (Math.sin(state.time + y * 0.05) > 0.95)) {
      rowJitter = (Math.sin(state.time * 10 + y * 0.1) * jitter * 2);
    } else {
      rowJitter = (Math.random() - 0.5) * jitter * 0.4;
    }

    // Edge waviness distortion
    if (edgeDistort > 0) {
      rowJitter += Math.sin(sourceY * 0.08 + state.time) * edgeDistort * 15;
    }

    const shiftX = Math.round(rowJitter);

    for (let x = 0; x < W; x++) {
      const targetIdx = (y * W + x) * 4;

      // Jitter offset source x
      const sx = Math.max(0, Math.min(W - 1, x + shiftX));
      
      // Color bleed: shift R right, B left
      const rx = Math.min(sx + colorBleed, W - 1);
      const bx = Math.max(sx - colorBleed, 0);

      const rIdx = (sourceY * W + rx) * 4;
      const gIdx = (sourceY * W + sx) * 4;
      const bIdx = (sourceY * W + bx) * 4;

      // Read channels
      let r = src[rIdx];
      let g = src[gIdx + 1];
      let b = src[bIdx + 2];

      // Saturation Bleed / Chrominance spread
      if (satBleed > 0) {
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        r = r + (gray - r) * -satBleed;
        g = g + (gray - g) * -satBleed;
        b = b + (gray - b) * -satBleed;
      }

      out[targetIdx] = r;
      out[targetIdx + 1] = g;
      out[targetIdx + 2] = b;
      out[targetIdx + 3] = 255;
    }
  }

  // 3. Tracking Noise Bands
  // Generate random tracking noise bands based on time
  const seedForBands = Math.floor(state.time * 2);
  const bandRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  for (let b = 0; b < noiseBands; b++) {
    const bandY = Math.floor(bandRandom(seedForBands + b) * H);
    const bandH = Math.floor(bandRandom(seedForBands + b * 17) * 12 + 4);
    
    for (let y = bandY; y < Math.min(bandY + bandH, H); y++) {
      const idxOffset = y * W * 4;
      // High-frequency jitter offset for this band
      const bandJitter = Math.round((bandRandom(y + state.time) - 0.5) * jitter * 5);

      for (let x = 0; x < W; x++) {
        const targetIdx = idxOffset + x * 4;
        const sx = Math.max(0, Math.min(W - 1, x + bandJitter));
        const sIdx = (y * W + sx) * 4;

        // Add static noise
        const staticNoise = (bandRandom(x + y * 13 + state.time) - 0.5) * trackingNoise * 150;
        
        out[targetIdx] = Math.max(0, Math.min(255, out[sIdx] + staticNoise));
        out[targetIdx + 1] = Math.max(0, Math.min(255, out[sIdx + 1] + staticNoise));
        out[targetIdx + 2] = Math.max(0, Math.min(255, out[sIdx + 2] + staticNoise));
      }
    }
  }

  // 4. Scanlines
  if (scanlines > 0) {
    for (let y = 0; y < H; y += 2) {
      const rowIdx = y * W * 4;
      const darken = scanlines * 60;
      for (let x = 0; x < W; x++) {
        const idx = rowIdx + x * 4;
        out[idx] = Math.max(0, out[idx] - darken);
        out[idx + 1] = Math.max(0, out[idx + 1] - darken);
        out[idx + 2] = Math.max(0, out[idx + 2] - darken);
      }
    }
  }

  // 5. Film Grain / Noise
  if (noiseGrain > 0) {
    for (let i = 0; i < out.length; i += 4) {
      // Procedural pseudo-random grain
      const grain = (Math.random() - 0.5) * noiseGrain * 120;
      out[i] = Math.max(0, Math.min(255, out[i] + grain));
      out[i + 1] = Math.max(0, Math.min(255, out[i + 1] + grain));
      out[i + 2] = Math.max(0, Math.min(255, out[i + 2] + grain));
    }
  }

  return new ImageData(out, W, H);
}
