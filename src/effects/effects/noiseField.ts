import { PerlinNoise, seededRandom } from "../perlin";
import { hexToRgb } from "../utils";

export function render(
  sourceCanvas: HTMLCanvasElement,
  outputCtx: CanvasRenderingContext2D,
  cfg: any
) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return;

  outputCtx.fillStyle = cfg.bgColor || "#000000";
  outputCtx.fillRect(0, 0, W, H);

  outputCtx.lineWidth = cfg.lineWidth || 0.5;
  outputCtx.lineCap = "round";

  const rng = seededRandom(cfg.seed || 42);
  const noise = new PerlinNoise(cfg.seed || 42);

  const scale = cfg.scale || 0.005;
  const octaves = cfg.octaves || 4;
  const persistence = cfg.persistence || 0.5;
  const stepSize = cfg.stepSize || 3;
  const lineLength = cfg.lineLength || 100;
  const lineCount = cfg.lineCount || 1000;
  const isMono = cfg.colorMode === "MONO";
  const lineColor = cfg.lineColor || "#ffffff";
  const opacity = cfg.opacity !== undefined ? cfg.opacity : 0.6;

  let imgData: ImageData | null = null;
  if (!isMono) {
    try {
      imgData = sCtx.getImageData(0, 0, W, H);
    } catch (e) {
      // ignore
    }
  }

  for (let i = 0; i < lineCount; i++) {
    // 1. Pick a random starting point
    let px = rng() * W;
    let py = rng() * H;

    // 2. Sample color at starting point
    if (!isMono && imgData) {
      const sampleX = Math.max(0, Math.min(W - 1, Math.floor(px)));
      const sampleY = Math.max(0, Math.min(H - 1, Math.floor(py)));
      const idx = (sampleY * W + sampleX) * 4;
      const r = imgData.data[idx];
      const g = imgData.data[idx + 1];
      const b = imgData.data[idx + 2];
      outputCtx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
    } else {
      const rgb = hexToRgb(lineColor);
      outputCtx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacity})`;
    }

    outputCtx.beginPath();
    outputCtx.moveTo(px, py);

    // 3. Trace line through Perlin noise vector field
    for (let step = 0; step < lineLength; step++) {
      // Get noise angle in [-Math.PI * 2, Math.PI * 2] range
      const angle = noise.fbm2D(px * scale, py * scale, octaves, persistence) * Math.PI * 2;
      px += Math.cos(angle) * stepSize;
      py += Math.sin(angle) * stepSize;

      // Break if we go off-canvas
      if (px < 0 || px >= W || py < 0 || py >= H) {
        break;
      }

      outputCtx.lineTo(px, py);
    }
    outputCtx.stroke();
  }
}
