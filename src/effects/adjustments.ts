import { hexToRgb } from "./utils";

// Custom convolution filter for sharpening
function convolve(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  weights: number[],
  mix = 1.0
) {
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const out = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      let r = 0, g = 0, b = 0;
      
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(H - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(W - 1, Math.max(0, x + cx - halfSide));
          const sidx = (scy * W + scx) * 4;
          const wt = weights[cy * side + cx];
          
          r += data[sidx] * wt;
          g += data[sidx + 1] * wt;
          b += data[sidx + 2] * wt;
        }
      }

      out[idx] = Math.max(0, Math.min(255, data[idx] + (r - data[idx]) * mix));
      out[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + (g - data[idx + 1]) * mix));
      out[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + (b - data[idx + 2]) * mix));
      out[idx + 3] = data[idx + 3];
    }
  }
  data.set(out);
}

// Global adjustments function
export function applyGlobalAdjustments(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cfg: any
) {
  // 1. CSS Filter properties: brightness, contrast, saturate, hue-rotate
  const filters: string[] = [];
  if (cfg.brightness !== 0) filters.push(`brightness(${1 + cfg.brightness})`);
  if (cfg.contrast !== 0) filters.push(`contrast(${1 + cfg.contrast})`);
  if (cfg.saturation !== 0) filters.push(`saturate(${1 + cfg.saturation})`);
  if (cfg.hue !== 0) filters.push(`hue-rotate(${cfg.hue}deg)`);

  if (filters.length > 0) {
    ctx.filter = filters.join(" ");
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = W;
    tempCanvas.height = H;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = "none";
  }

  // 2. Direct pixel adjustments: Gamma, Sharpness, Color modes
  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, W, H);
  } catch (e) {
    return;
  }

  const data = imgData.data;

  // Gamma correction
  if (cfg.gamma !== 1.0) {
    const invGamma = 1 / cfg.gamma;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.pow(data[i] / 255, invGamma) * 255);
      data[i + 1] = Math.round(Math.pow(data[i + 1] / 255, invGamma) * 255);
      data[i + 2] = Math.round(Math.pow(data[i + 2] / 255, invGamma) * 255);
    }
  }

  // Sharpness (using Laplacian/Sharpen filter kernel)
  if (cfg.sharpness > 0) {
    const sharpenKernel = [
      0, -1,  0,
     -1,  5, -1,
      0, -1,  0
    ];
    convolve(data, W, H, sharpenKernel, cfg.sharpness);
  }

  // Mono & Duotone & Intensity mapping
  const mode = cfg.colorMode || "ORIGINAL";
  const shad = hexToRgb(cfg.shadowColor || "#000000");
  const hig = hexToRgb(cfg.highlightColor || "#ffffff");

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    let targetR = r;
    let targetG = g;
    let targetB = b;

    if (mode === "MONO") {
      const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
      targetR = gray;
      targetG = gray;
      targetB = gray;
    } else if (mode === "DUOTONE") {
      const t = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      targetR = Math.round(shad[0] + (hig[0] - shad[0]) * t);
      targetG = Math.round(shad[1] + (hig[1] - shad[1]) * t);
      targetB = Math.round(shad[2] + (hig[2] - shad[2]) * t);
    }

    // Apply global intensity factor (mix of original vs adjusted)
    const intensity = cfg.intensity !== undefined ? cfg.intensity : 1.0;
    if (intensity !== 1.0) {
      data[i] = Math.max(0, Math.min(255, Math.round(r + (targetR - r) * intensity)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g + (targetG - g) * intensity)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b + (targetB - b) * intensity)));
    } else {
      data[i] = targetR;
      data[i + 1] = targetG;
      data[i + 2] = targetB;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Processing Transforms (Flip, Rotate, Scale, Padding)
export function applyProcessing(
  canvas: HTMLCanvasElement,
  cfg: any
): HTMLCanvasElement {
  const W = canvas.width;
  const H = canvas.height;

  const flipH = cfg.flipH;
  const flipV = cfg.flipV;
  const rotate = cfg.rotate || "0°";
  const scale = cfg.scale || 1.0;
  const edgePad = cfg.edgePad || 0;

  // 1. Calculate final dimensions
  let rotatedW = W * scale;
  let rotatedH = H * scale;

  if (rotate === "90°" || rotate === "270°") {
    rotatedW = H * scale;
    rotatedH = W * scale;
  }

  const finalW = rotatedW + edgePad * 2;
  const finalH = rotatedH + edgePad * 2;

  const temp = document.createElement("canvas");
  temp.width = finalW;
  temp.height = finalH;
  const tempCtx = temp.getContext("2d")!;

  // 2. Draw canvas with transforms
  tempCtx.save();
  tempCtx.translate(edgePad + rotatedW / 2, edgePad + rotatedH / 2);

  // Apply rotation
  if (rotate === "90°") {
    tempCtx.rotate(Math.PI / 2);
  } else if (rotate === "180°") {
    tempCtx.rotate(Math.PI);
  } else if (rotate === "270°") {
    tempCtx.rotate(-Math.PI / 2);
  }

  // Apply flip
  const scaleX = flipH ? -1 : 1;
  const scaleY = flipV ? -1 : 1;
  tempCtx.scale(scaleX * scale, scaleY * scale);

  // Draw source image centered
  tempCtx.drawImage(canvas, -W / 2, -H / 2);
  tempCtx.restore();

  // Resize canvas to final output size
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(temp, 0, 0);

  return canvas;
}

// Post-Processing Filters
export function applyPostProcessing(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cfg: any
) {
  // Vignette, blur, scanlines, chromatic aberration, grain, pixelate
  const blur = cfg.blur || 0;
  const vignette = cfg.vignette || 0;
  const grain = cfg.grain || 0;
  const scanlines = cfg.scanlines || 0;
  const chromaAb = cfg.chromaAb || 0;
  const pixelate = cfg.pixelate || 1;

  // 1. Blur
  if (blur > 0) {
    ctx.filter = `blur(${blur}px)`;
    const temp = document.createElement("canvas");
    temp.width = W;
    temp.height = H;
    const tempCtx = temp.getContext("2d")!;
    tempCtx.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(temp, 0, 0);
    ctx.filter = "none";
  }

  // 2. Pixelate (Mosaic Pass)
  if (pixelate > 1) {
    const temp = document.createElement("canvas");
    temp.width = Math.ceil(W / pixelate);
    temp.height = Math.ceil(H / pixelate);
    const tempCtx = temp.getContext("2d")!;
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, temp.width, temp.height);

    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, W, H);
  }

  // 3. Chromatic Aberration & Scanlines & Vignette & Grain (combined direct pixel shader)
  if (chromaAb > 0 || vignette > 0 || grain > 0 || scanlines > 0) {
    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, W, H);
    } catch (e) {
      return;
    }
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    const cx = W / 2;
    const cy = H / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;

        // Chromatic Aberration: shift R right, B left
        if (chromaAb > 0) {
          const rx = Math.min(W - 1, x + chromaAb);
          const bx = Math.max(0, x - chromaAb);
          data[i] = copy[(y * W + rx) * 4];         // R channel from offset
          data[i + 2] = copy[(y * W + bx) * 4 + 2]; // B channel from offset opposite
        }

        // Vignette
        if (vignette > 0) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const factor = Math.max(0, 1 - (dist / maxDist) * vignette);
          data[i] = Math.round(data[i] * factor);
          data[i + 1] = Math.round(data[i + 1] * factor);
          data[i + 2] = Math.round(data[i + 2] * factor);
        }

        // Grain
        if (grain > 0) {
          const noise = (Math.random() - 0.5) * grain * 100;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }

        // Scanlines
        if (scanlines > 0 && y % 2 === 0) {
          const darken = scanlines * 80;
          data[i] = Math.max(0, data[i] - darken);
          data[i + 1] = Math.max(0, data[i + 1] - darken);
          data[i + 2] = Math.max(0, data[i + 2] - darken);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
