import { useEffect, useRef, useState, useCallback } from "react";

export type DetectionMode = "combined" | "contrast" | "bright" | "dark";
export type ShapeMode = "circle" | "square";
export type Tool = "pixelate" | "brush" | "eraser" | "line" | "rect" | "circle";
export type GeoPattern = "detection" | "radial" | "concentric" | "isometric" | "spiral" | "grid-dots";
export type HeroLayout = "centered" | "off-axis-left" | "off-axis-right" | "stacked-bottom" | "split";
export type ImageBlend = "normal" | "multiply" | "screen" | "difference" | "overlay";

export interface Palette {
  id: string;
  label: string;
  bg: string;
  ink: string;
  accent: string;
  preview: string[];
}

export const PALETTES: Palette[] = [
  { id: "wob", label: "White on Black", bg: "#0a0a0a", ink: "#ffffff", accent: "#ff3b30", preview: ["#000000", "#ffffff"] },
  { id: "bow", label: "Black on White", bg: "#f3f1ec", ink: "#0a0a0a", accent: "#ff3b30", preview: ["#ffffff", "#000000"] },
  { id: "gold", label: "Gold on Dark", bg: "#0a0a0a", ink: "#d4a83a", accent: "#ffffff", preview: ["#000000", "#d4a83a"] },
  { id: "green", label: "Green on Dark", bg: "#0a0a0a", ink: "#3ad48a", accent: "#ffffff", preview: ["#000000", "#3ad48a"] },
  { id: "cyan", label: "Cyan on Navy", bg: "#0a1530", ink: "#5ad8ff", accent: "#ff3b81", preview: ["#0a1530", "#5ad8ff"] },
  { id: "cream", label: "Ink on Cream", bg: "#ece4d2", ink: "#1a1410", accent: "#b03020", preview: ["#ece4d2", "#1a1410"] },
];

export interface SizePreset { id: string; label: string; w: number; h: number }
export const SIZE_PRESETS: SizePreset[] = [
  { id: "p34_1200", label: "Portrait 3:4 (1200×1600)", w: 1200, h: 1600 },
  { id: "p34_1400", label: "Portrait 3:4 (1400×2000)", w: 1400, h: 2000 },
  { id: "story", label: "Instagram Story (1080×1920)", w: 1080, h: 1920 },
  { id: "sq", label: "Square (1080×1080)", w: 1080, h: 1080 },
  { id: "land", label: "Landscape 16:9 (1920×1080)", w: 1920, h: 1080 },
  { id: "poster", label: "Poster A3 (1240×1754)", w: 1240, h: 1754 },
];

export interface Stroke {
  tool: "brush" | "eraser" | "line" | "rect" | "circle";
  color: "ink" | "bg" | "accent";
  size: number;
  pts: { x: number; y: number }[];
  brushStyle?: "standard" | "gothic" | "pen" | "spray" | "fly" | "wash" | "marker" | "spray-paint" | "dry-brush" | "spray-dots" | "flat-brush" | "deckle-edge";
  physicsSpring?: number;
  physicsFriction?: number;
  bristles?: number;
  bristleSpread?: number;
  bleedAmount?: number;
  flowMode?: "none" | "wave" | "vortex" | "turbulence";
  flowSpeed?: number;
  customColor?: string;
  drawBlendMode?: string;
  pathRotation?: number;
  inkEffectMode?: "none" | "water" | "charcoal" | "watercolor" | "salt" | "bleed" | "fiber";
}

export interface Zone { x: number; y: number; size: number }

export interface BrandState {
  imageSrc: string | null;
  imageOpacity: number;
  imageInvert: boolean;
  imageGrayscale: boolean;
  imageBlend: ImageBlend;
  imageScale: number;
  pixelSize: number;
  zoneSize: number;
  strokeOn: boolean;
  frameText: string;
  frameTextSize: number;
  frameOn: boolean;
  frameSizePct: number;
  dashPattern: number;
  frameStroke: number;
  starSize: number;
  starPoints: number;
  showCrosshair: boolean;
  crosshairOpacity: number;
  chainOn: boolean;
  chainCount: number;
  chainAngle: number;
  baseRadius: number;
  sizeRatio: number;
  intersectionsOn: boolean;
  markerSize: number;
  detectionOn: boolean;
  detectionMode: DetectionMode;
  blockSize: number;
  threshold: number;
  maxCircles: number;
  minDistance: number;
  shapeMode: ShapeMode;
  minRadius: number;
  maxRadius: number;
  shapeStroke: number;
  sizeSeed: number;
  labelSize: number;
  overlayOpacity: number;
  showLabels: boolean;
  maxDistance: number;
  lineWeight: number;
  paletteId: string;
  sizeId: string;
  textureSrc: string | null;
  textureOpacity: number;
  // grid
  gridOn: boolean;
  gridSize: number;
  gridOpacity: number;
  // rings (concentric guides)
  ringsOn: boolean;
  ringsCount: number;
  ringsSpacing: number;
  // geo
  geoPattern: GeoPattern;
  geoDensity: number;
  geoRotation: number;
  // hero
  heroLayout: HeroLayout;
  heroTitle: string;
  heroSubtitle: string;
  heroTitleSize: number;
  heroBarOn: boolean;
  // drawing tool config
  tool: Tool;
  brushSize: number;
  brushColor: "ink" | "bg" | "accent";
  brushStyle: "standard" | "gothic" | "pen" | "spray" | "fly" | "wash" | "marker" | "spray-paint" | "dry-brush" | "spray-dots" | "flat-brush" | "deckle-edge";
  physicsSpring: number;
  physicsFriction: number;
  bristles: number;
  bristleSpread: number;
  showArtLog: boolean;
  gridSnapping: boolean;
  bleedAmount: number;
  flowMode: "none" | "wave" | "vortex" | "turbulence";
  flowSpeed: number;
  customBrushColorHex: string;
  drawBlendMode: string;
  pathRotation: number;
  inkEffectMode: "none" | "water" | "charcoal" | "watercolor" | "salt" | "bleed" | "fiber";
  canvasEffectGrain: number;
  canvasEffectWhiteDots: number;
  canvasEffectMetallic: "none" | "gold" | "silver" | "copper" | "rose" | "black-gold" | "diamond";
  mode: string;
}

export const defaultBrandState: BrandState = {
  imageSrc: null,
  imageOpacity: 0.85,
  imageInvert: false,
  imageGrayscale: false,
  imageBlend: "normal",
  imageScale: 1,
  pixelSize: 16,
  zoneSize: 100,
  strokeOn: true,
  frameText: "Design & Strategy",
  frameTextSize: 14,
  frameOn: true,
  frameSizePct: 60,
  dashPattern: 8,
  frameStroke: 1,
  starSize: 40,
  starPoints: 4,
  showCrosshair: true,
  crosshairOpacity: 0.5,
  chainOn: true,
  chainCount: 11,
  chainAngle: 45,
  baseRadius: 220,
  sizeRatio: 0.85,
  intersectionsOn: true,
  markerSize: 5,
  detectionOn: false,
  detectionMode: "combined",
  blockSize: 16,
  threshold: 30,
  maxCircles: 80,
  minDistance: 40,
  shapeMode: "circle",
  minRadius: 4,
  maxRadius: 24,
  shapeStroke: 1,
  sizeSeed: 42,
  labelSize: 8,
  overlayOpacity: 1,
  showLabels: true,
  maxDistance: 150,
  lineWeight: 0.8,
  paletteId: "wob",
  sizeId: "p34_1200",
  textureSrc: null,
  textureOpacity: 0.5,
  gridOn: false,
  gridSize: 60,
  gridOpacity: 0.18,
  ringsOn: false,
  ringsCount: 8,
  ringsSpacing: 80,
  geoPattern: "detection",
  geoDensity: 24,
  geoRotation: 0,
  heroLayout: "centered",
  heroTitle: "STUDIO",
  heroSubtitle: "Brand · System · 2026",
  heroTitleSize: 120,
  heroBarOn: true,
  tool: "pixelate",
  brushSize: 18,
  brushColor: "ink",
  brushStyle: "standard",
  physicsSpring: 0.4,
  physicsFriction: 0.4,
  bristles: 8,
  bristleSpread: 12,
  showArtLog: false,
  gridSnapping: false,
  bleedAmount: 0,
  flowMode: "none",
  flowSpeed: 10,
  customBrushColorHex: "#1A1A1A",
  drawBlendMode: "source-over",
  pathRotation: 0,
  inkEffectMode: "none",
  canvasEffectGrain: 0,
  canvasEffectWhiteDots: 0,
  canvasEffectMetallic: "none",
  mode: "circle-mapping",
};

interface Props {
  state: BrandState;
  zones: Zone[];
  strokes: Stroke[];
  onAddZone: (z: Zone) => void;
  onStrokeStart: (s: Stroke) => void;
  onStrokeExtend: (pt: { x: number; y: number }) => void;
  onStrokeCommit: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  playbackActive?: boolean;
  onPlaybackComplete?: () => void;
  zoom?: number;
  pan?: { x: number; y: number };
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function darkenColor(hex: string, percent: number): string {
  if (!hex.startsWith("#")) return hex;
  const clean = hex.replace("#", "");
  let R = 0, G = 0, B = 0;
  if (clean.length === 3) {
    R = parseInt(clean[0] + clean[0], 16);
    G = parseInt(clean[1] + clean[1], 16);
    B = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    R = parseInt(clean.slice(0, 2), 16);
    G = parseInt(clean.slice(2, 4), 16);
    B = parseInt(clean.slice(4, 6), 16);
  }
  const amt = Math.round(2.55 * percent);
  R = Math.max(0, R - amt);
  G = Math.max(0, G - amt);
  B = Math.max(0, B - amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function drawWhiteDots(ctx: CanvasRenderingContext2D, W: number, H: number, density: number, seed: number) {
  if (density <= 0) return;
  const rng = mulberry32(seed || 42);
  const totalDots = Math.floor(density * 120);
  
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  
  for (let i = 0; i < totalDots; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const rVal = rng();
    
    if (rVal < 0.6) {
      // Pinholes (small punctures, 1px to 3px)
      const r = 1 + rng() * 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (rVal < 0.9) {
      // Medium spots (5px to 15px)
      const r = 3 + rng() * 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Large elliptical scratches (20px to 60px)
      const length = 15 + rng() * 30;
      const thickness = 0.8 + rng() * 1.5;
      const angle = rng() * Math.PI * 2;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillRect(-length / 2, -thickness / 2, length, thickness);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    }
  }
  ctx.restore();
}

let grainCanvasCache: HTMLCanvasElement | null = null;
let grainCacheOpacity = -1;

function drawFilmGrain(ctx: CanvasRenderingContext2D, W: number, H: number, opacity: number, seed: number) {
  if (opacity <= 0) return;
  
  if (!grainCanvasCache || grainCacheOpacity !== opacity) {
    grainCanvasCache = document.createElement("canvas");
    grainCanvasCache.width = 128;
    grainCanvasCache.height = 128;
    const gCtx = grainCanvasCache.getContext("2d")!;
    const gImg = gCtx.createImageData(128, 128);
    const data = gImg.data;
    const rng = mulberry32(seed || 42);
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = rng();
      const val = Math.floor(noise * 255);
      data[i] = val;     // R
      data[i+1] = val;   // G
      data[i+2] = val;   // B
      data[i+3] = Math.floor(noise * opacity * 160); // Max grain opacity mapping
    }
    gCtx.putImageData(gImg, 0, 0);
    grainCacheOpacity = opacity;
  }
  
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  const pattern = ctx.createPattern(grainCanvasCache, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function applyMetallicShader(
  canvas: HTMLCanvasElement,
  state: BrandState,
  pal: Palette
) {
  const mode = state.canvasEffectMetallic;
  if (!mode || mode === "none") return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  // Create an offscreen canvas at 1/2 resolution for high-performance and smooth reflections
  const scale = 0.5;
  const w = Math.floor(W * scale);
  const h = Math.floor(H * scale);

  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const oCtx = offscreen.getContext("2d")!;
  
  oCtx.drawImage(canvas, 0, 0, W, H, 0, 0, w, h);
  
  const imgData = oCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Background color RGB
  const parseHex = (hex: string) => {
    const clean = hex.replace("#", "");
    if (clean.length === 3) {
      return {
        r: parseInt(clean[0] + clean[0], 16),
        g: parseInt(clean[1] + clean[1], 16),
        b: parseInt(clean[2] + clean[2], 16)
      };
    }
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  };
  const bg = parseHex(pal.bg);

  const getMaskAt = (x: number, y: number): number => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    const idx = (cy * w + cx) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
    return Math.min(1.0, diff / 120.0);
  };

  const newData = new Uint8ClampedArray(data.length);

  // Metal colors
  let metalR = 212, metalG = 168, metalB = 58; // Gold
  if (mode === "silver") {
    metalR = 190; metalG = 190; metalB = 190;
  } else if (mode === "copper") {
    metalR = 184; metalG = 115; metalB = 51;
  } else if (mode === "rose") {
    metalR = 224; metalG = 165; metalB = 180;
  } else if (mode === "black-gold") {
    metalR = 35; metalG = 32; metalB = 28;
  }

  // Light vector normalized
  const lx = -0.577, ly = -0.577, lz = 0.577;
  const hx = -0.325, hy = -0.325, hz = 0.888;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const mask = getMaskAt(x, y);

      if (mask === 0) {
        newData[idx] = data[idx];
        newData[idx + 1] = data[idx + 1];
        newData[idx + 2] = data[idx + 2];
        newData[idx + 3] = data[idx + 3];
        continue;
      }

      // Sobel gradient
      const m00 = getMaskAt(x - 1, y - 1);
      const m10 = getMaskAt(x, y - 1);
      const m20 = getMaskAt(x + 1, y - 1);
      const m01 = getMaskAt(x - 1, y);
      const m21 = getMaskAt(x + 1, y);
      const m02 = getMaskAt(x - 1, y + 1);
      const m12 = getMaskAt(x, y + 1);
      const m22 = getMaskAt(x + 1, y + 1);

      const dx = (m20 + 2 * m21 + m22) - (m00 + 2 * m01 + m02);
      const dy = (m02 + 2 * m12 + m22) - (m00 + 2 * m10 + m20);

      const normalLen = Math.hypot(dx, dy, 1.0);
      const nx = dx / normalLen;
      const ny = dy / normalLen;
      const nz = 1.0 / normalLen;

      // Diffuse & Specular
      const dotNL = nx * lx + ny * ly + nz * lz;
      const diffuse = Math.max(0.0, dotNL);
      const dotNH = nx * hx + ny * hy + nz * hz;
      const specular = Math.pow(Math.max(0.0, dotNH), 15.0);

      let finalR, finalG, finalB;

      if (mode === "diamond") {
        // Diamond Dispersion: offset sampling channels
        const offset = Math.round(nx * 2);
        const maskR = getMaskAt(x + offset, y + Math.round(ny * 2));
        const maskG = mask;
        const maskB = getMaskAt(x - offset, y - Math.round(ny * 2));

        const highlightVal = diffuse * 0.35 + specular * 0.8;
        const specColor = specular * 200;

        finalR = Math.max(0, Math.min(255, (230 * highlightVal + specColor) * maskR + bg.r * (1.0 - maskR)));
        finalG = Math.max(0, Math.min(255, (255 * highlightVal + specColor) * maskG + bg.g * (1.0 - maskG)));
        finalB = Math.max(0, Math.min(255, (235 * highlightVal + specColor) * maskB + bg.b * (1.0 - maskB)));
      } else {
        let curMetalR = metalR;
        let curMetalG = metalG;
        let curMetalB = metalB;

        if (mode === "black-gold") {
          const rust = Math.max(0.0, Math.sin(x * 0.1) * Math.cos(y * 0.1));
          if (rust > 0.6) {
            curMetalR = 150; curMetalG = 75; curMetalB = 30;
          }
        }

        const highlightVal = diffuse * 0.45 + specular * 0.75;
        const specColor = specular * 180;

        const outR = curMetalR * (0.4 + highlightVal * 0.6) + specColor;
        const outG = curMetalG * (0.4 + highlightVal * 0.6) + specColor;
        const outB = curMetalB * (0.4 + highlightVal * 0.6) + specColor;

        finalR = Math.max(0, Math.min(255, outR * mask + bg.r * (1.0 - mask)));
        finalG = Math.max(0, Math.min(255, outG * mask + bg.g * (1.0 - mask)));
        finalB = Math.max(0, Math.min(255, outB * mask + bg.b * (1.0 - mask)));
      }

      newData[idx] = finalR;
      newData[idx + 1] = finalG;
      newData[idx + 2] = finalB;
      newData[idx + 3] = data[idx + 3];
    }
  }

  imgData.data.set(newData);
  oCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.drawImage(offscreen, 0, 0, w, h, 0, 0, W, H);
  ctx.restore();
}

interface Detected { x: number; y: number; score: number; r: number }

function detectCircles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: BrandState,
): Detected[] {
  const { blockSize, threshold, maxCircles, minDistance, detectionMode, minRadius, maxRadius, sizeSeed } = state;
  let img: ImageData;
  try { img = ctx.getImageData(0, 0, w, h); } catch { return []; }
  const data = img.data;
  const cols = Math.floor(w / blockSize);
  const rows = Math.floor(h / blockSize);
  const scores: { x: number; y: number; score: number }[] = [];
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let sum = 0, sum2 = 0, count = 0;
      for (let y = 0; y < blockSize; y += 2) {
        for (let x = 0; x < blockSize; x += 2) {
          const px = bx * blockSize + x;
          const py = by * blockSize + y;
          const i = (py * w + px) * 4;
          const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
          sum += l; sum2 += l * l; count++;
        }
      }
      const mean = sum / count;
      const variance = sum2 / count - mean * mean;
      const contrast = Math.sqrt(Math.max(0, variance));
      let score = 0;
      if (detectionMode === "bright") score = mean / 2.55;
      else if (detectionMode === "dark") score = (255 - mean) / 2.55;
      else if (detectionMode === "contrast") score = contrast;
      else score = contrast * 0.6 + Math.abs(mean - 128) / 2.55 * 0.4;
      if (score >= threshold) scores.push({ x: bx * blockSize + blockSize / 2, y: by * blockSize + blockSize / 2, score });
    }
  }
  scores.sort((a, b) => b.score - a.score);
  const picked: Detected[] = [];
  const rng = mulberry32(sizeSeed);
  for (const c of scores) {
    if (picked.length >= maxCircles) break;
    let ok = true;
    for (const p of picked) {
      const dx = p.x - c.x, dy = p.y - c.y;
      if (dx * dx + dy * dy < minDistance * minDistance) { ok = false; break; }
    }
    if (ok) {
      const t = Math.min(1, c.score / 100);
      const r = minRadius + (maxRadius - minRadius) * (t * 0.5 + rng() * 0.5);
      picked.push({ ...c, r });
    }
  }
  return picked;
}

function colorFor(c: "ink" | "bg" | "accent", pal: Palette): string {
  return c === "ink" ? pal.ink : c === "bg" ? pal.bg : pal.accent;
}

function getPhysicsPoints(
  pts: { x: number; y: number }[],
  spring: number,
  friction: number,
  flowMode?: "none" | "wave" | "vortex" | "turbulence",
  flowSpeed?: number,
  w?: number,
  h?: number,
  pathRotation?: number,
  brushStyle?: string
) {
  if (pts.length === 0) return [];
  const result: { x: number; y: number; vx: number; vy: number; speed: number }[] = [];
  
  // Set spring/friction coefficients based on the selected brush style
  let actualSpring = spring;
  let actualFriction = friction;
  if (brushStyle === "marker") {
    actualSpring = 0.3;
    actualFriction = 0.5;
  } else if (
    brushStyle === "standard" ||
    brushStyle === "dry-brush" ||
    brushStyle === "flat-brush" ||
    brushStyle === "deckle-edge" ||
    brushStyle === "gothic" ||
    brushStyle === "pen" ||
    brushStyle === "spray" ||
    brushStyle === "fly" ||
    brushStyle === "wash"
  ) {
    actualSpring = 0.6;
    actualFriction = 0.5;
  }

  let px = pts[0].x;
  let py = pts[0].y;
  let vx = 0;
  let vy = 0;
  result.push({ x: px, y: py, vx, vy, speed: 0 });

  for (let i = 1; i < pts.length; i++) {
    const target = pts[i];
    
    let wx = 0;
    let wy = 0;
    if (flowMode && flowMode !== "none" && flowSpeed && flowSpeed > 0) {
      if (flowMode === "wave") {
        wx = Math.sin(py * 0.015) * flowSpeed;
        wy = Math.cos(px * 0.015) * flowSpeed;
      } else if (flowMode === "vortex") {
        const cx = (w || 1200) / 2;
        const cy = (h || 1600) / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          wx = (-dy / dist) * flowSpeed * 1.5;
          wy = (dx / dist) * flowSpeed * 1.5;
        }
      } else if (flowMode === "turbulence") {
        wx = Math.sin(py * 0.03 + px * 0.01) * flowSpeed;
        wy = Math.cos(px * 0.03 - py * 0.02) * flowSpeed;
      }
    }

    const ax = (target.x - px) * actualSpring;
    const ay = (target.y - py) * actualSpring;
    vx += ax + wx * 0.05;
    vy += ay + wy * 0.05;
    vx *= (1 - actualFriction);
    vy *= (1 - actualFriction);
    px += vx;
    py += vy;

    // Apply path rotation wobble perpendicular-like displacement
    if (pathRotation && pathRotation > 0) {
      const angleOffset = Math.sin(i * 0.25) * (pathRotation * Math.PI / 180);
      px += Math.cos(angleOffset) * 1.5;
      py += Math.sin(angleOffset) * 1.5;
    }

    const speed = Math.hypot(vx, vy);
    result.push({ x: px, y: py, vx, vy, speed });
  }

  // Catch up steps to reach the cursor's final point
  const lastTarget = pts[pts.length - 1];
  let dist = Math.hypot(lastTarget.x - px, lastTarget.y - py);
  let catchUpCount = 0;
  while (dist > 0.5 && catchUpCount < 20) {
    let wx = 0;
    let wy = 0;
    if (flowMode && flowMode !== "none" && flowSpeed && flowSpeed > 0) {
      if (flowMode === "wave") {
        wx = Math.sin(py * 0.015) * flowSpeed;
        wy = Math.cos(px * 0.015) * flowSpeed;
      } else if (flowMode === "vortex") {
        const cx = (w || 1200) / 2;
        const cy = (h || 1600) / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dDist = Math.hypot(dx, dy);
        if (dDist > 5) {
          wx = (-dy / dDist) * flowSpeed * 1.5;
          wy = (dx / dDist) * flowSpeed * 1.5;
        }
      } else if (flowMode === "turbulence") {
        wx = Math.sin(py * 0.03 + px * 0.01) * flowSpeed;
        wy = Math.cos(px * 0.03 - py * 0.02) * flowSpeed;
      }
    }

    const ax = (lastTarget.x - px) * actualSpring;
    const ay = (lastTarget.y - py) * actualSpring;
    vx += ax + wx * 0.05;
    vy += ay + wy * 0.05;
    vx *= (1 - actualFriction);
    vy *= (1 - actualFriction);
    px += vx;
    py += vy;

    if (pathRotation && pathRotation > 0) {
      const idx = pts.length + catchUpCount;
      const angleOffset = Math.sin(idx * 0.25) * (pathRotation * Math.PI / 180);
      px += Math.cos(angleOffset) * 1.5;
      py += Math.sin(angleOffset) * 1.5;
    }

    dist = Math.hypot(lastTarget.x - px, lastTarget.y - py);
    const speed = Math.hypot(vx, vy);
    result.push({ x: px, y: py, vx, vy, speed });
    catchUpCount++;
  }
  return result;
}

export function BrandCanvas({
  state,
  zones,
  strokes,
  onAddZone,
  onStrokeStart,
  onStrokeExtend,
  onStrokeCommit,
  canvasRef,
  playbackActive = false,
  onPlaybackComplete,
  zoom = 1,
  pan = { x: 0, y: 0 },
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const texRef = useRef<HTMLImageElement | null>(null);
  const [tick, setTick] = useState(0);
  const drawingRef = useRef(false);

  // Playback state integration
  const [playbackProgress, setPlaybackProgress] = useState<{ strokeIndex: number; pointCount: number } | null>(null);

  useEffect(() => {
    if (!playbackActive) {
      setPlaybackProgress(null);
      return;
    }
    setPlaybackProgress({ strokeIndex: 0, pointCount: 1 });
  }, [playbackActive]);

  useEffect(() => {
    if (!playbackActive || !playbackProgress || strokes.length === 0) return;
    
    let frameId: number;
    const animate = () => {
      setPlaybackProgress((prev) => {
        if (!prev) return null;
        const currentStroke = strokes[prev.strokeIndex];
        if (!currentStroke) {
          if (onPlaybackComplete) {
            setTimeout(() => onPlaybackComplete(), 50);
          }
          return null;
        }

        const nextPointCount = prev.pointCount + 3;
        if (nextPointCount <= currentStroke.pts.length) {
          return { strokeIndex: prev.strokeIndex, pointCount: nextPointCount };
        } else {
          if (prev.strokeIndex + 1 < strokes.length) {
            return { strokeIndex: prev.strokeIndex + 1, pointCount: 1 };
          } else {
            if (onPlaybackComplete) {
              setTimeout(() => onPlaybackComplete(), 50);
            }
            return null;
          }
        }
      });
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [playbackActive, playbackProgress, strokes, onPlaybackComplete]);

  useEffect(() => {
    if (!state.imageSrc) { imgRef.current = null; setTick((n) => n + 1); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setTick((n) => n + 1); };
    img.onerror = () => { imgRef.current = null; setTick((n) => n + 1); };
    img.src = state.imageSrc;
  }, [state.imageSrc]);

  useEffect(() => {
    if (!state.textureSrc) { texRef.current = null; setTick((n) => n + 1); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { texRef.current = img; setTick((n) => n + 1); };
    img.onerror = () => { texRef.current = null; setTick((n) => n + 1); };
    img.src = state.textureSrc;
  }, [state.textureSrc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const preset = SIZE_PRESETS.find((p) => p.id === state.sizeId) ?? SIZE_PRESETS[0];
    const W = preset.w, H = preset.h;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const pal = PALETTES.find((p) => p.id === state.paletteId) ?? PALETTES[0];

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    // background image with filters + blend
    const img = imgRef.current;
    if (img && img.width > 0) {
      ctx.save();
      ctx.globalAlpha = state.imageOpacity;
      if (state.imageBlend !== "normal") ctx.globalCompositeOperation = state.imageBlend;
      const filters: string[] = [];
      if (state.imageGrayscale) filters.push("grayscale(1)");
      if (state.imageInvert) filters.push("invert(1)");
      ctx.filter = filters.length ? filters.join(" ") : "none";
      const scale = Math.max(W / img.width, H / img.height) * state.imageScale;
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      ctx.restore();
    }

    // grid
    if (state.gridOn) {
      ctx.save();
      ctx.globalAlpha = state.gridOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 0.5;
      const g = Math.max(8, state.gridSize);
      for (let x = 0; x <= W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    }

    // concentric rings
    if (state.ringsOn) {
      ctx.save();
      ctx.globalAlpha = state.crosshairOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = state.frameStroke;
      const cx = W / 2, cy = H / 2;
      for (let i = 1; i <= state.ringsCount; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, i * state.ringsSpacing, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // pixelation zones
    if (zones.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const z of zones) {
        const x = Math.max(0, z.x - z.size);
        const y = Math.max(0, z.y - z.size);
        const s = z.size * 2;
        try {
          const imgData = ctx.getImageData(x, y, s, s);
          const small = document.createElement("canvas");
          const block = Math.max(1, state.pixelSize);
          small.width = Math.max(1, Math.floor(s / block));
          small.height = Math.max(1, Math.floor(s / block));
          const sctx = small.getContext("2d")!;
          const tmp = document.createElement("canvas");
          tmp.width = s; tmp.height = s;
          tmp.getContext("2d")!.putImageData(imgData, 0, 0);
          sctx.imageSmoothingEnabled = false;
          sctx.drawImage(tmp, 0, 0, small.width, small.height);
          ctx.drawImage(small, 0, 0, small.width, small.height, x, y, s, s);
          if (state.strokeOn) {
            ctx.strokeStyle = pal.ink;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, s, s);
          }
        } catch { /* tainted */ }
      }
      ctx.restore();
    }

    // brush / shape strokes (drawing studio output)
    const strokesToRender = (playbackActive && playbackProgress)
      ? strokes.slice(0, playbackProgress.strokeIndex + 1).map((st, idx) => {
          if (idx === playbackProgress.strokeIndex) {
            return { ...st, pts: st.pts.slice(0, playbackProgress.pointCount) };
          }
          return st;
        })
      : strokes;

    if (strokesToRender.length > 0) {
      ctx.save();
      for (const st of strokesToRender) {
        const col = st.customColor || colorFor(st.color, pal);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = st.size;
        if (st.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = (st.drawBlendMode || "source-over") as any;
          ctx.strokeStyle = col;
          ctx.fillStyle = col;
        }

        if (st.tool === "brush" || st.tool === "eraser") {
          const spring = st.physicsSpring ?? 0.4;
          const friction = st.physicsFriction ?? 0.4;
          const bleed = st.bleedAmount ?? 0;
          const style = st.tool === "eraser" ? "standard" : (st.brushStyle ?? "standard");
          
          const p = getPhysicsPoints(st.pts, spring, friction, st.flowMode, st.flowSpeed, W, H, st.pathRotation, style);

          if (p.length > 0) {
            // Pass 1: Bleed Halo
            if (st.tool !== "eraser" && bleed > 0) {
              ctx.save();
              ctx.globalAlpha = 0.05 * bleed;
              ctx.filter = "blur(3px)";
              
              const bleedSize = st.size * 1.5;
              if (p.length < 2) {
                ctx.beginPath();
                ctx.arc(p[0].x, p[0].y, bleedSize / 2, 0, Math.PI * 2);
                ctx.fill();
              } else {
                if (
                  style === "standard" ||
                  style === "marker" ||
                  style === "dry-brush" ||
                  style === "spray-dots" ||
                  style === "deckle-edge"
                ) {
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                    const steps = Math.ceil(d / 2.0);
                    for (let s = 0; s <= steps; s++) {
                      const t = s / Math.max(1, steps);
                      const x = prev.x + (curr.x - prev.x) * t;
                      const y = prev.y + (curr.y - prev.y) * t;
                      const speed = prev.speed + (curr.speed - prev.speed) * t;
                      const speedFactor = bleedSize <= 4 ? 0.3 : bleedSize <= 12 ? 0.6 : bleedSize <= 24 ? 1.2 : 2.0;
                      const r = Math.max(1.0, bleedSize - speed * speedFactor) / 2;
                      ctx.beginPath();
                      ctx.arc(x, y, r, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }
                } else if (style === "gothic") {
                  const angle = Math.PI / 4;
                  const halfSize = bleedSize / 2;
                  const nx = Math.cos(angle) * halfSize;
                  const ny = Math.sin(angle) * halfSize;
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    ctx.beginPath();
                    ctx.moveTo(prev.x - nx, prev.y - ny);
                    ctx.lineTo(prev.x + nx, prev.y + ny);
                    ctx.lineTo(curr.x + nx, curr.y + ny);
                    ctx.lineTo(curr.x - nx, curr.y - ny);
                    ctx.closePath();
                    ctx.fill();
                  }
                } else if (style === "pen") {
                  ctx.lineWidth = Math.max(1.0, bleedSize * 0.15);
                  ctx.beginPath();
                  ctx.moveTo(p[0].x, p[0].y);
                  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
                  ctx.stroke();
                } else if (style === "spray" || style === "spray-paint") {
                  const count = Math.max(2, Math.floor(bleedSize / 4));
                  for (let i = 0; i < p.length; i += 2) {
                    const pt = p[i];
                    const currentRadius = bleedSize * (1.0 + pt.speed * 0.1);
                    for (let d = 0; d < count; d++) {
                      const r = Math.random() * currentRadius;
                      const theta = Math.random() * Math.PI * 2;
                      ctx.beginPath();
                      ctx.arc(pt.x + Math.cos(theta) * r, pt.y + Math.sin(theta) * r, Math.max(1, bleedSize * 0.08), 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }
                } else if (style === "fly" || style === "flat-brush") {
                  const numBristles = st.bristles ?? 8;
                  const spread = (st.bristleSpread ?? 12) * 1.3;
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    const dx = curr.x - prev.x;
                    const dy = curr.y - prev.y;
                    const len = Math.hypot(dx, dy);
                    if (len < 0.1) continue;
                    const nx = -dy / len;
                    const ny = dx / len;
                    for (let b = 0; b < numBristles; b++) {
                      const offset = (b / Math.max(1, numBristles - 1) - 0.5) * spread;
                      ctx.beginPath();
                      ctx.moveTo(prev.x + nx * offset, prev.y + ny * offset);
                      ctx.lineTo(curr.x + nx * offset, curr.y + ny * offset);
                      ctx.lineWidth = Math.max(0.6, bleedSize * 0.08);
                      ctx.stroke();
                    }
                  }
                } else if (style === "wash") {
                  let rgbColor = "0, 0, 0";
                  if (col.startsWith("#")) {
                    const hex = col.slice(1);
                    if (hex.length === 3) rgbColor = `${parseInt(hex[0]+hex[0],16)}, ${parseInt(hex[1]+hex[1],16)}, ${parseInt(hex[2]+hex[2],16)}`;
                    else if (hex.length === 6) rgbColor = `${parseInt(hex.slice(0,2),16)}, ${parseInt(hex.slice(2,4),16)}, ${parseInt(hex.slice(4,6),16)}`;
                  }
                  for (let i = 0; i < p.length; i += 2) {
                    const pt = p[i];
                    const gradRadius = bleedSize * 2.5;
                    const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, gradRadius);
                    grad.addColorStop(0, `rgba(${rgbColor}, 0.8)`);
                    grad.addColorStop(1, `rgba(${rgbColor}, 0)`);
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, gradRadius, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
              }
              ctx.restore();
            }

            // Pass 2: Main core stroke (using dual pass for watercolor/bleed ink effect)
            const isWatercolorEffect = st.tool !== "eraser" && (st.inkEffectMode === "watercolor" || st.inkEffectMode === "bleed");

            const renderMainStroke = (isOuterPass: boolean) => {
              ctx.save();
              
              let currentSize = isOuterPass ? st.size * 1.08 : st.size;
              let currentCol = col;
              
              if (isOuterPass) {
                currentCol = darkenColor(col, 20); // 20% darker
                ctx.globalAlpha = 0.35; // low opacity for edge deposition
                ctx.strokeStyle = currentCol;
                ctx.fillStyle = currentCol;
              }

              if (p.length < 2) {
                ctx.beginPath();
                ctx.arc(p[0].x, p[0].y, currentSize / 2, 0, Math.PI * 2);
                ctx.fill();
              } else {
                if (st.tool === "eraser" || style === "standard") {
                  if (st.tool === "eraser") {
                    ctx.beginPath();
                    ctx.moveTo(p[0].x, p[0].y);
                    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
                    ctx.stroke();
                  } else {
                    // Standard Ink: speed-responsive width with smooth circular interpolation + organic fuzz & speed-dependent skip
                    for (let i = 1; i < p.length; i++) {
                      const prev = p[i - 1];
                      const curr = p[i];
                      const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                      const steps = Math.ceil(d / 1.5);
                      
                      // Size decay: running out of ink
                      const sizeDecay = Math.max(1.0, currentSize - i * 0.05);

                      for (let s = 0; s <= steps; s++) {
                        const t = s / Math.max(1, steps);
                        const x = prev.x + (curr.x - prev.x) * t;
                        const y = prev.y + (curr.y - prev.y) * t;
                        const speed = prev.speed + (curr.speed - prev.speed) * t;
                        const speedFactor = sizeDecay <= 4 ? 0.3 : sizeDecay <= 12 ? 0.6 : sizeDecay <= 24 ? 1.2 : 2.0;
                        const r = Math.max(1.0, sizeDecay - speed * speedFactor) / 2;

                        // Speed-dependent dry-brush skipping (mimicking flying white)
                        if (speed > 4.0 && Math.sin(s * 0.5 + i * 2) > 1.3 - (speed - 4.0) * 0.15) {
                          continue;
                        }

                        // Draw a main circle and two smaller satellite circles with tiny offsets for fuzzy organic edge
                        ctx.beginPath();
                        ctx.arc(x, y, r, 0, Math.PI * 2);
                        ctx.fill();

                        if (r > 1.5) {
                          const fuzz = r * 0.08;
                          ctx.beginPath();
                          ctx.arc(x + (Math.sin(s * 1.7) * fuzz), y + (Math.cos(s * 2.3) * fuzz), r * 0.96, 0, Math.PI * 2);
                          ctx.fill();
                          
                          ctx.beginPath();
                          ctx.arc(x + (Math.cos(s * 3.1) * fuzz), y + (Math.sin(s * 1.1) * fuzz), r * 0.94, 0, Math.PI * 2);
                          ctx.fill();
                        }
                      }
                    }
                  }
                } else if (style === "marker") {
                  // Marker: flat calligraphy ribbon aligned with movement direction
                  let prevAngle = Math.atan2(p[0].vy, p[0].vx);
                  let prevSize = currentSize;
                  let pnx = Math.cos(prevAngle + Math.PI / 2) * (prevSize / 2);
                  let pny = Math.sin(prevAngle + Math.PI / 2) * (prevSize / 2);
                  
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    // Size decay
                    const sizeDecay = Math.max(1.0, currentSize - i * 0.05);
                    const angle = Math.atan2(curr.vy, curr.vx);
                    const nx = Math.cos(angle + Math.PI / 2) * (sizeDecay / 2);
                    const ny = Math.sin(angle + Math.PI / 2) * (sizeDecay / 2);
                    
                    ctx.beginPath();
                    ctx.moveTo(prev.x - pnx, prev.y - pny);
                    ctx.lineTo(prev.x + pnx, prev.y + pny);
                    ctx.lineTo(curr.x + nx, curr.y + ny);
                    ctx.lineTo(curr.x - nx, curr.y - ny);
                    ctx.closePath();
                    ctx.fill();
                    
                    pnx = nx;
                    pny = ny;
                  }
                } else if (style === "spray-paint") {
                  // Spray Paint: random spray dots in a fixed radius, velocity-independent, no size decay
                  const count = Math.max(4, Math.floor(currentSize / 2));
                  for (let i = 0; i < p.length; i++) {
                    const pt = p[i];
                    const radius = currentSize;
                    for (let d = 0; d < count; d++) {
                      const r = Math.random() * radius;
                      const theta = Math.random() * Math.PI * 2;
                      const dx = Math.cos(theta) * r;
                      const dy = Math.sin(theta) * r;
                      const dotR = Math.random() * Math.max(0.8, currentSize * 0.08);
                      ctx.beginPath();
                      ctx.arc(pt.x + dx, pt.y + dy, dotR, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }
                } else if (style === "dry-brush") {
                  // Dry Brush: fine sand-like points scattered inside a decaying radius
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                    const steps = Math.ceil(d / 1.0);
                    const sizeDecay = Math.max(1.0, currentSize - i * 0.05);
                    
                    for (let s = 0; s <= steps; s++) {
                      const t = s / Math.max(1, steps);
                      const x = prev.x + (curr.x - prev.x) * t;
                      const y = prev.y + (curr.y - prev.y) * t;
                      
                      const numPixels = Math.max(5, Math.floor(sizeDecay * 0.8));
                      for (let px = 0; px < numPixels; px++) {
                        const r = Math.random() * (sizeDecay / 2);
                        const theta = Math.random() * Math.PI * 2;
                        const dx = Math.cos(theta) * r;
                        const dy = Math.sin(theta) * r;
                        const sqSize = Math.max(1.0, Math.random() * 2.0);
                        ctx.fillRect(x + dx - sqSize / 2, y + dy - sqSize / 2, sqSize, sqSize);
                      }
                    }
                  }
                } else if (style === "spray-dots") {
                  // Spray Dots: neat circular dots sequenced along the stroke with decay
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                    const sizeDecay = Math.max(1.0, currentSize - i * 0.05);
                    const spacing = Math.max(4.0, sizeDecay * 0.6);
                    const steps = Math.ceil(d / spacing);
                    for (let s = 0; s <= steps; s++) {
                      const t = s / Math.max(1, steps);
                      const x = prev.x + (curr.x - prev.x) * t;
                      const y = prev.y + (curr.y - prev.y) * t;
                      ctx.beginPath();
                      ctx.arc(x, y, sizeDecay / 2, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }
                } else if (style === "flat-brush") {
                  // Flat Brush: 15-30 parallel bristles offset along normal, seed-derived
                  const seed = Math.floor(st.pts[0].x * 1000 + st.pts[0].y);
                  const rng = mulberry32(seed);
                  const numBristles = Math.floor(15 + rng() * 15);
                  const bristleOffsets: number[] = [];
                  const spread = currentSize * 0.8;
                  for (let b = 0; b < numBristles; b++) {
                    bristleOffsets.push((rng() - 0.5) * spread);
                  }
                  
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    const dx = curr.x - prev.x;
                    const dy = curr.y - prev.y;
                    const len = Math.hypot(dx, dy);
                    if (len < 0.1) continue;
                    const nx = -dy / len;
                    const ny = dx / len;
                    
                    const sizeDecay = Math.max(1.0, currentSize - i * 0.05);
                    const sizeRatio = sizeDecay / currentSize;
                    
                    for (let b = 0; b < numBristles; b++) {
                      const offset = bristleOffsets[b] * sizeRatio;
                      // Skip based on speed
                      if (curr.speed > 3.0 && Math.sin(b * 1.5 + i * 0.5) > 1.3 - (curr.speed - 3.0) * 0.15) {
                        continue;
                      }
                      ctx.beginPath();
                      ctx.moveTo(prev.x + nx * offset, prev.y + ny * offset);
                      ctx.lineTo(curr.x + nx * offset, curr.y + ny * offset);
                      ctx.lineWidth = Math.max(0.6, sizeDecay * 0.08);
                      ctx.stroke();
                    }
                  }
                } else if (style === "deckle-edge") {
                  // Deckle Edge: Gothic angled nib with random edge splatters and decay
                  const angle = Math.PI / 6; // 30 deg
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    const sizeDecay = Math.max(1.0, currentSize - i * 0.05);
                    const halfSize = sizeDecay / 2;
                    const nx = Math.cos(angle) * halfSize;
                    const ny = Math.sin(angle) * halfSize;
                    
                    ctx.beginPath();
                    ctx.moveTo(prev.x - nx, prev.y - ny);
                    ctx.lineTo(prev.x + nx, prev.y + ny);
                    ctx.lineTo(curr.x + nx, curr.y + ny);
                    ctx.lineTo(curr.x - nx, curr.y - ny);
                    ctx.closePath();
                    ctx.fill();
                    
                    if (Math.random() < 0.15) {
                      const splatterR = Math.random() * (sizeDecay * 0.4);
                      const splatterAngle = Math.random() * Math.PI * 2;
                      const sx = curr.x + Math.cos(splatterAngle) * (halfSize + splatterR);
                      const sy = curr.y + Math.sin(splatterAngle) * (halfSize + splatterR);
                      const dotSize = Math.random() * Math.max(1, sizeDecay * 0.15);
                      ctx.beginPath();
                      ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }
                } else if (style === "gothic") {
                  // Gothic Calligraphy (legacy)
                  const angle = Math.PI / 4;
                  const halfSize = currentSize / 2;
                  const nx = Math.cos(angle) * halfSize;
                  const ny = Math.sin(angle) * halfSize;
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    ctx.beginPath();
                    ctx.moveTo(prev.x - nx, prev.y - ny);
                    ctx.lineTo(prev.x + nx, prev.y + ny);
                    ctx.lineTo(curr.x + nx, curr.y + ny);
                    ctx.lineTo(curr.x - nx, curr.y - ny);
                    ctx.closePath();
                    ctx.fill();
                  }
                } else if (style === "pen") {
                  // Pen (legacy)
                  ctx.lineWidth = Math.max(1.0, currentSize * 0.15);
                  ctx.beginPath();
                  ctx.moveTo(p[0].x, p[0].y);
                  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
                  ctx.stroke();
                } else if (style === "spray") {
                  // Spray (legacy)
                  const count = Math.max(3, Math.floor(currentSize / 3));
                  for (let i = 0; i < p.length; i += 2) {
                    const pt = p[i];
                    const currentRadius = currentSize * (1.0 + pt.speed * 0.12);
                    for (let d = 0; d < count; d++) {
                      const r = Math.random() * currentRadius;
                      const theta = Math.random() * Math.PI * 2;
                      const dx = Math.cos(theta) * r;
                      const dy = Math.sin(theta) * r;
                      const dotR = Math.random() * Math.max(0.8, currentSize * 0.08);
                      ctx.beginPath();
                      ctx.arc(pt.x + dx, pt.y + dy, dotR, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }
                } else if (style === "fly") {
                  // Fly (legacy)
                  const numBristles = st.bristles ?? 8;
                  const spread = st.bristleSpread ?? 12;
                  for (let i = 1; i < p.length; i++) {
                    const prev = p[i - 1];
                    const curr = p[i];
                    const dx = curr.x - prev.x;
                    const dy = curr.y - prev.y;
                    const len = Math.hypot(dx, dy);
                    if (len < 0.1) continue;
                    const nx = -dy / len;
                    const ny = dx / len;
                    for (let b = 0; b < numBristles; b++) {
                      const offset = (b / Math.max(1, numBristles - 1) - 0.5) * spread;
                      ctx.beginPath();
                      ctx.moveTo(prev.x + nx * offset, prev.y + ny * offset);
                      ctx.lineTo(curr.x + nx * offset, curr.y + ny * offset);
                      ctx.lineWidth = Math.max(0.6, currentSize * 0.08);
                      ctx.stroke();
                    }
                  }
                } else if (style === "wash") {
                  // Wash (legacy)
                  ctx.globalAlpha = 0.04;
                  let rgbColor = "0, 0, 0";
                  if (col.startsWith("#")) {
                    const hex = col.slice(1);
                    if (hex.length === 3) rgbColor = `${parseInt(hex[0]+hex[0],16)}, ${parseInt(hex[1]+hex[1],16)}, ${parseInt(hex[2]+hex[2],16)}`;
                    else if (hex.length === 6) rgbColor = `${parseInt(hex.slice(0,2),16)}, ${parseInt(hex.slice(2,4),16)}, ${parseInt(hex.slice(4,6),16)}`;
                  }
                  for (let i = 0; i < p.length; i += 2) {
                    const pt = p[i];
                    const gradRadius = currentSize * 2.5;
                    const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, gradRadius);
                    grad.addColorStop(0, `rgba(${rgbColor}, 1)`);
                    grad.addColorStop(0.3, `rgba(${rgbColor}, 0.5)`);
                    grad.addColorStop(1, `rgba(${rgbColor}, 0)`);
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, gradRadius, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
              }
              ctx.restore();
            };

            if (isWatercolorEffect) {
              renderMainStroke(true);  // pass 1: outer bleed border (darker/wider)
              renderMainStroke(false); // pass 2: inner core stroke
            } else {
              renderMainStroke(false); // standard single pass
            }
          }
        } else if (st.tool === "line" && st.pts.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(st.pts[0].x, st.pts[0].y);
          ctx.lineTo(st.pts[st.pts.length - 1].x, st.pts[st.pts.length - 1].y);
          ctx.stroke();
        } else if (st.tool === "rect" && st.pts.length >= 2) {
          const a = st.pts[0], b = st.pts[st.pts.length - 1];
          ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        } else if (st.tool === "circle" && st.pts.length >= 2) {
          const a = st.pts[0], b = st.pts[st.pts.length - 1];
          ctx.beginPath();
          ctx.arc(a.x, a.y, Math.hypot(b.x - a.x, b.y - a.y), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Apply Canvas Post-Processing Shaders (Metallic normal reflection, White Dot paper flaws, Film Grain)
      if (state.canvasEffectMetallic && state.canvasEffectMetallic !== "none") {
        applyMetallicShader(canvas, state, pal);
      }
      if (state.canvasEffectWhiteDots > 0) {
        drawWhiteDots(ctx, W, H, state.canvasEffectWhiteDots, state.sizeSeed);
      }
      if (state.canvasEffectGrain > 0) {
        drawFilmGrain(ctx, W, H, state.canvasEffectGrain, state.sizeSeed);
      }
    }

    ctx.save();
    ctx.globalAlpha = state.overlayOpacity;
    ctx.strokeStyle = pal.ink;
    ctx.fillStyle = pal.ink;
    ctx.font = `${state.labelSize}px JetBrains Mono, monospace`;

    // chain circles
    if (state.chainOn) {
      const cx = W / 2, cy = H / 2;
      const ang = (state.chainAngle * Math.PI) / 180;
      const spacing = state.baseRadius * 0.7;
      ctx.lineWidth = state.shapeStroke;
      const centers: { x: number; y: number; r: number }[] = [];
      for (let i = 0; i < state.chainCount; i++) {
        const r = state.baseRadius * Math.pow(state.sizeRatio, i);
        const x = cx + Math.cos(ang) * spacing * i;
        const y = cy + Math.sin(ang) * spacing * i;
        centers.push({ x, y, r });
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        if (state.showLabels) ctx.fillText(`${Math.round(x)} · ${Math.round(y)}`, x + 6, y - 6);
      }
      if (state.intersectionsOn) {
        for (let i = 0; i < centers.length - 1; i++) {
          const a = centers[i], b = centers[i + 1];
          const d = Math.hypot(b.x - a.x, b.y - a.y);
          if (d > Math.abs(a.r - b.r) && d < a.r + b.r) {
            const aa = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
            const hh = Math.sqrt(Math.max(0, a.r * a.r - aa * aa));
            const px = a.x + (aa * (b.x - a.x)) / d;
            const py = a.y + (aa * (b.y - a.y)) / d;
            const rx = -(b.y - a.y) * (hh / d);
            const ry = (b.x - a.x) * (hh / d);
            ctx.beginPath(); ctx.arc(px + rx, py + ry, state.markerSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px - rx, py - ry, state.markerSize, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }

    // geo patterns
    if (state.geoPattern !== "detection") {
      ctx.save();
      ctx.lineWidth = state.shapeStroke;
      ctx.strokeStyle = pal.ink;
      ctx.fillStyle = pal.ink;
      const cx = W / 2, cy = H / 2;
      const rot = (state.geoRotation * Math.PI) / 180;
      const rng = mulberry32(state.sizeSeed);
      if (state.geoPattern === "radial") {
        const n = state.geoDensity;
        const R = Math.min(W, H) * 0.45;
        for (let i = 0; i < n; i++) {
          const a = rot + (Math.PI * 2 * i) / n;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (state.minRadius * 4), cy + Math.sin(a) * (state.minRadius * 4));
          ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.stroke();
          const rr = state.minRadius + rng() * (state.maxRadius - state.minRadius);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (state.geoPattern === "concentric") {
        for (let i = 1; i <= state.geoDensity; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, (i / state.geoDensity) * Math.min(W, H) * 0.48, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (state.geoPattern === "isometric") {
        const step = Math.max(20, 600 / state.geoDensity);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        for (let x = -W; x <= W; x += step) {
          ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x + H * 0.577, H); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x - H * 0.577, H); ctx.stroke();
        }
        for (let y = -H; y <= H; y += step) {
          ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.restore();
      } else if (state.geoPattern === "spiral") {
        const turns = state.geoDensity / 4;
        const steps = state.geoDensity * 40;
        ctx.beginPath();
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const a = rot + t * Math.PI * 2 * turns;
          const r = t * Math.min(W, H) * 0.48;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (state.geoPattern === "grid-dots") {
        const step = Math.max(20, 800 / state.geoDensity);
        for (let y = step; y < H; y += step) {
          for (let x = step; x < W; x += step) {
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, state.minRadius * 0.6), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // detection shapes + connections
    if (state.detectionOn) {
      const detected = detectCircles(ctx, W, H, state);
      ctx.lineWidth = state.shapeStroke;
      for (const d of detected) {
        ctx.beginPath();
        if (state.shapeMode === "circle") ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        else ctx.rect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
        ctx.stroke();
        if (state.showLabels) ctx.fillText(`${Math.round(d.x)},${Math.round(d.y)}`, d.x + d.r + 2, d.y);
      }
      if (state.maxDistance > 0) {
        ctx.lineWidth = state.lineWeight;
        const md = state.maxDistance;
        for (let i = 0; i < detected.length; i++) {
          for (let j = i + 1; j < detected.length; j++) {
            const dx = detected[i].x - detected[j].x, dy = detected[i].y - detected[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist <= md) {
              ctx.globalAlpha = state.overlayOpacity * (1 - dist / md) * 0.8;
              ctx.beginPath();
              ctx.moveTo(detected[i].x, detected[i].y);
              ctx.lineTo(detected[j].x, detected[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = state.overlayOpacity;
      }
    }

    // crosshair
    if (state.showCrosshair) {
      ctx.save();
      ctx.globalAlpha = state.crosshairOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = state.frameStroke;
      ctx.setLineDash([state.dashPattern, state.dashPattern]);
      ctx.beginPath();
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      if (state.starSize > 0) {
        const cx = W / 2, cy = H / 2, s = state.starSize / 2;
        for (let i = 0; i < state.starPoints; i++) {
          const a = (Math.PI * i) / state.starPoints;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
          ctx.lineTo(cx - Math.cos(a) * s, cy - Math.sin(a) * s);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (state.frameOn) {
      ctx.save();
      ctx.globalAlpha = state.crosshairOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = state.frameStroke;
      ctx.setLineDash([state.dashPattern, state.dashPattern]);
      const short = Math.min(W, H);
      const size = (short * state.frameSizePct) / 100;
      ctx.strokeRect((W - size) / 2, (H - size) / 2, size, size);
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();

    // frame text — corners
    if (state.frameText) {
      ctx.save();
      ctx.fillStyle = pal.ink;
      ctx.font = `${state.frameTextSize}px JetBrains Mono, monospace`;
      ctx.textAlign = "left";
      ctx.fillText(state.frameText, 60, 80);
      ctx.textAlign = "right";
      ctx.fillText("Gaurav Mandal", W - 60, 80);
      ctx.textAlign = "left";
      ctx.fillText("grvx.dev", 60, H - 60);
      ctx.textAlign = "right";
      ctx.fillText("Delhi, India", W - 60, H - 60);
      ctx.restore();
    }

    // hero title overlay
    if (state.heroTitle) {
      ctx.save();
      ctx.fillStyle = pal.ink;
      const ts = state.heroTitleSize;
      ctx.font = `900 ${ts}px JetBrains Mono, monospace`;
      let tx = W / 2, ty = H / 2, align: CanvasTextAlign = "center";
      if (state.heroLayout === "off-axis-left") { tx = W * 0.08; ty = H * 0.5; align = "left"; }
      else if (state.heroLayout === "off-axis-right") { tx = W * 0.92; ty = H * 0.5; align = "right"; }
      else if (state.heroLayout === "stacked-bottom") { tx = W / 2; ty = H * 0.85; align = "center"; }
      else if (state.heroLayout === "split") { tx = W * 0.08; ty = H * 0.85; align = "left"; }
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillText(state.heroTitle.toUpperCase(), tx, ty);
      if (state.heroSubtitle) {
        ctx.font = `${Math.max(10, ts * 0.18)}px JetBrains Mono, monospace`;
        ctx.fillText(state.heroSubtitle, tx, ty + ts * 0.65);
      }
      if (state.heroBarOn) {
        ctx.fillRect(40, H - 40, W - 80, 4);
        ctx.fillRect(40, 36, W - 80, 4);
      }
      ctx.restore();
    }

    // texture overlay
    const tex = texRef.current;
    if (tex && tex.width > 0) {
      ctx.save();
      ctx.globalAlpha = state.textureOpacity;
      ctx.globalCompositeOperation = "screen";
      const sc = Math.max(W / tex.width, H / tex.height);
      const tw = tex.width * sc, th = tex.height * sc;
      ctx.drawImage(tex, (W - tw) / 2, (H - th) / 2, tw, th);
      ctx.restore();
    }
    // Art System Log Overlay
    if (state.showArtLog) {
      ctx.save();
      // Draw background panel
      ctx.fillStyle = "rgba(10, 10, 10, 0.88)";
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1;
      const logX = 40;
      const logY = 120;
      const logW = 280;
      const logH = 220;
      ctx.fillRect(logX, logY, logW, logH);
      ctx.strokeRect(logX, logY, logW, logH);

      ctx.fillStyle = pal.ink;
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      const lines = [
        `[ART SYSTEM LOG]`,
        `Canvas: ${preset.w}x${preset.h} (${preset.label})`,
        `Active Tool: ${state.tool.toUpperCase()}`,
        `Brush Style: ${state.tool === "brush" ? state.brushStyle.toUpperCase() : "N/A"}`,
        `Spring: ${state.physicsSpring.toFixed(2)} | Friction: ${state.physicsFriction.toFixed(2)}`,
        `Flow Force: ${state.flowMode.toUpperCase()} (speed: ${state.flowSpeed})`,
        `Snapping: ${state.gridSnapping ? "GRID ACTIVE" : "OFF"}`,
        `Bleed Amount: ${state.bleedAmount.toFixed(1)}x`,
        `Strokes Count: ${strokes.length}`,
        `Total Zones: ${zones.length}`,
        `Palette: ${state.paletteId.toUpperCase()} (${pal.label})`,
        `Playback: ${playbackActive ? `PLAYING` : "IDLE"}`
      ];

      lines.forEach((line, index) => {
        ctx.fillText(line, logX + 12, logY + 12 + index * 16);
      });
      ctx.restore();
    }

    // Active Stroke Brush Line & Mouse Tracking HUD
    let activePts: { x: number; y: number }[] | null = null;
    if (drawingRef.current && strokes.length > 0) {
      activePts = strokes[strokes.length - 1].pts;
    } else if (playbackActive && playbackProgress && strokes[playbackProgress.strokeIndex]) {
      activePts = strokes[playbackProgress.strokeIndex].pts.slice(0, playbackProgress.pointCount);
    }

    if (activePts && activePts.length > 0) {
      ctx.save();
      
      // 1. Red Dashed Line Trail (max 30 points)
      const trackingPts = activePts.slice(-30);
      if (trackingPts.length > 1) {
        ctx.strokeStyle = "rgba(224, 36, 36, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(trackingPts[0].x, trackingPts[0].y);
        for (let i = 1; i < trackingPts.length; i++) {
          ctx.lineTo(trackingPts[i].x, trackingPts[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Red Target Crosshair at the Tip
      const tip = activePts[activePts.length - 1];
      ctx.strokeStyle = "rgba(224, 36, 36, 0.9)";
      ctx.fillStyle = "rgba(224, 36, 36, 0.9)";
      ctx.lineWidth = 1;

      // Draw outer circle
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Draw center dot
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw crosshair ticks
      ctx.beginPath();
      // Left tick
      ctx.moveTo(tip.x - 14, tip.y); ctx.lineTo(tip.x - 8, tip.y);
      // Right tick
      ctx.moveTo(tip.x + 8, tip.y); ctx.lineTo(tip.x + 14, tip.y);
      // Top tick
      ctx.moveTo(tip.x, tip.y - 14); ctx.lineTo(tip.x, tip.y - 8);
      // Bottom tick
      ctx.moveTo(tip.x, tip.y + 8); ctx.lineTo(tip.x, tip.y + 14);
      ctx.stroke();

      // 3. Direction Vector Line & HUD labels
      if (activePts.length > 1) {
        const pPrev = activePts[activePts.length - 2];
        const dx = tip.x - pPrev.x;
        const dy = tip.y - pPrev.y;
        const speed = Math.hypot(dx, dy);
        
        // Direction angle in radians and degrees
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = Math.round((angleRad * 180) / Math.PI);
        const angleNormalized = angleDeg < 0 ? angleDeg + 360 : angleDeg;

        // Draw direction vector arrow (length proportional to speed, min 20, max 60)
        const vecLen = Math.max(20, Math.min(60, speed * 2.5));
        const vecX = tip.x + Math.cos(angleRad) * vecLen;
        const vecY = tip.y + Math.sin(angleRad) * vecLen;

        ctx.strokeStyle = "rgba(224, 36, 36, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(vecX, vecY);
        ctx.stroke();

        // Arrowhead
        const arrowSize = 6;
        ctx.beginPath();
        ctx.moveTo(vecX, vecY);
        ctx.lineTo(
          vecX - arrowSize * Math.cos(angleRad - Math.PI / 6),
          vecY - arrowSize * Math.sin(angleRad - Math.PI / 6)
        );
        ctx.lineTo(
          vecX - arrowSize * Math.cos(angleRad + Math.PI / 6),
          vecY - arrowSize * Math.sin(angleRad + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Draw technical HUD labels next to the brush tip
        ctx.fillStyle = "rgba(224, 36, 36, 0.95)";
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        
        const labelX = tip.x + 18;
        const labelY = tip.y - 12;
        ctx.fillText(`DIR: ${angleNormalized}°`, labelX, labelY);
        ctx.fillText(`SPD: ${speed.toFixed(1)} px/f`, labelX, labelY + 10);
        ctx.fillText(`PTS: ${activePts.length}`, labelX, labelY + 20);
      }

      ctx.restore();
    }
  }, [state, zones, strokes, tick, canvasRef, playbackActive, playbackProgress])

  useEffect(() => { draw(); }, [draw]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (canvas.width / rect.width);
    let y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (state.gridSnapping) {
      const g = Math.max(8, state.gridSize);
      x = Math.round(x / g) * g;
      y = Math.round(y / g) * g;
    }
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.altKey) return;
    const pt = toCanvasCoords(e);
    if (state.tool === "pixelate") {
      onAddZone({ x: pt.x, y: pt.y, size: state.zoneSize });
      return;
    }
    drawingRef.current = true;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    onStrokeStart({
      tool: state.tool,
      color: state.brushColor,
      size: state.brushSize,
      pts: [pt],
      brushStyle: state.brushStyle,
      physicsSpring: state.physicsSpring,
      physicsFriction: state.physicsFriction,
      bristles: state.bristles,
      bristleSpread: state.bristleSpread,
      bleedAmount: state.bleedAmount,
      flowMode: state.flowMode,
      flowSpeed: state.flowSpeed,
      customColor: state.mode === "drawing-studio" ? state.customBrushColorHex : undefined,
      drawBlendMode: state.drawBlendMode,
      pathRotation: state.pathRotation,
      inkEffectMode: state.inkEffectMode,
    });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    onStrokeExtend(toCanvasCoords(e));
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onStrokeCommit();
  };

  const preset = SIZE_PRESETS.find((p) => p.id === state.sizeId) ?? SIZE_PRESETS[0];

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="relative h-full max-h-full flex items-center">
        <canvas
          ref={canvasRef}
          width={preset.w}
          height={preset.h}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="block h-auto max-h-full w-auto max-w-full cursor-crosshair border border-border touch-none"
          style={{
            aspectRatio: `${preset.w}/${preset.h}`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
}
