import { useState, useEffect, useRef, useCallback } from "react";
import { Section, Toggle, ActionButton } from "@/components/ui/section";
import { SliderRow } from "@/components/ui/slider-row";
import { EFFECT_DEFAULTS, GLOBAL_DEFAULTS, PROCESSING_DEFAULTS, POST_DEFAULTS } from "./effectsDefaults";
import { applyGlobalAdjustments, applyProcessing, applyPostProcessing } from "./adjustments";
import { exportEffect } from "./exportEffects";

import * as ascii from "./effects/ascii";
import * as dithering from "./effects/dithering";
import * as halftone from "./effects/halftone";
import * as matrixRain from "./effects/matrixRain";
import * as dots from "./effects/dots";
import * as contour from "./effects/contour";
import * as pixelSort from "./effects/pixelSort";
import * as blockify from "./effects/blockify";
import * as threshold from "./effects/threshold";
import * as edgeDetection from "./effects/edgeDetection";
import * as crosshatch from "./effects/crosshatch";
import * as waveLines from "./effects/waveLines";
import * as noiseField from "./effects/noiseField";
import * as voronoi from "./effects/voronoi";
import * as vhs from "./effects/vhs";

// Effects dictionary mapping to render functions
const EFFECTS = {
  ASCII: ascii.render,
  DITHERING: dithering.render,
  HALFTONE: halftone.render,
  MATRIX_RAIN: matrixRain.render,
  DOTS: dots.render,
  CONTOUR: contour.render,
  PIXEL_SORT: pixelSort.render,
  BLOCKIFY: blockify.render,
  THRESHOLD: threshold.render,
  EDGE_DETECTION: edgeDetection.render,
  CROSSHATCH: crosshatch.render,
  WAVE_LINES: waveLines.render,
  NOISE_FIELD: noiseField.render,
  VORONOI: voronoi.render,
  VHS: vhs.render
};

type EffectType = keyof typeof EFFECTS;

const EFFECT_LIST: EffectType[] = [
  "ASCII",
  "DITHERING",
  "HALFTONE",
  "MATRIX_RAIN",
  "DOTS",
  "CONTOUR",
  "PIXEL_SORT",
  "BLOCKIFY",
  "THRESHOLD",
  "EDGE_DETECTION",
  "CROSSHATCH",
  "WAVE_LINES",
  "NOISE_FIELD",
  "VORONOI",
  "VHS"
];

// Color picker row component helper
export function ColorPickerRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-6 h-6 border border-border cursor-pointer relative flex-shrink-0"
          style={{ backgroundColor: value }}
        >
          <input
            ref={inputRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </button>
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value;
            if (val.startsWith("#") && val.length <= 7) {
              onChange(val);
            } else if (!val.startsWith("#") && val.length <= 6) {
              onChange("#" + val);
            }
          }}
          className="w-20 bg-control border border-border px-1.5 py-0.5 text-center text-xs font-mono text-foreground outline-none uppercase"
        />
      </div>
    </div>
  );
}

// Full Width Pill Group helper
export function FullWidthPillGroup<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex w-full border border-border">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 py-2 text-[10px] uppercase tracking-[0.15em] font-mono transition-colors text-center ${
            value === o.id
              ? "bg-foreground text-background border-foreground"
              : "bg-surface-2 text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Segmented Button helper
export function SegButton<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono border ${
            value === o.id
              ? "bg-foreground text-background border-foreground"
              : "bg-control text-foreground border-border hover:bg-control-hover"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface EffectsTabState {
  activeEffect: EffectType;
  effectConfig: any;
  adjust: typeof GLOBAL_DEFAULTS;
  processing: typeof PROCESSING_DEFAULTS;
  post: typeof POST_DEFAULTS;
  exportFormat: string;
  exportQuality: number;
  exportMultiplier: number;
  // GIF parameters
  gifFps: number;
  gifLoop: boolean;
  gifDither: boolean;
  // MP4 parameters
  mp4Fps: number;
  mp4Quality: number;
  // Text parameters
  charWidth: number;
  // ThreeJS parameters
  threePlaneSize: number;
  threeBgColor: string;
  threeAutoRotate: boolean;
}

const initialEffectsState: EffectsTabState = {
  activeEffect: "ASCII",
  effectConfig: JSON.parse(JSON.stringify(EFFECT_DEFAULTS)),
  adjust: { ...GLOBAL_DEFAULTS },
  processing: { ...PROCESSING_DEFAULTS },
  post: { ...POST_DEFAULTS },
  exportFormat: "PNG",
  exportQuality: 92,
  exportMultiplier: 1,
  gifFps: 15,
  gifLoop: true,
  gifDither: true,
  mp4Fps: 30,
  mp4Quality: 7,
  charWidth: 80,
  threePlaneSize: 5,
  threeBgColor: "#000000",
  threeAutoRotate: false
};

interface EffectsTabProps {
  isActive: boolean;
}

export function EffectsTab({ isActive }: EffectsTabProps) {
  const [s, setS] = useState<EffectsTabState>(initialEffectsState);
  
  // File & Video source states
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"image" | "video" | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  
  // Exporter state
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  // Video playback states
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const togglePlay = () => {
    const video = sourceVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = sourceVideoRef.current;
    if (!video) return;
    const time = Number(e.target.value);
    video.currentTime = time;
    setVideoCurrentTime(time);
  };

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return "00:00";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Refs for rendering pipeline
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const preCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan / Zoom view state
  const [zoom, setZoom] = useState(1.0);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const zoomRef = useRef(1.0);

  // Persistent effect-specific states (e.g. matrix rain falling positions, vhs phase)
  const effectStateRef = useRef<any>({});

  // Reset view function
  const resetView = useCallback(() => {
    panXRef.current = 0;
    panYRef.current = 0;
    zoomRef.current = 1.0;
    setZoom(1.0);
    triggerRedraw();
  }, []);

  // Update specific sub-configurations
  const updateEffectConfig = (eff: EffectType, key: string, value: any) => {
    setS((prev) => {
      const nextConf = { ...prev.effectConfig };
      nextConf[eff] = { ...nextConf[eff], [key]: value };
      return { ...prev, effectConfig: nextConf };
    });
  };

  const updateAdjust = (key: keyof typeof GLOBAL_DEFAULTS, value: any) => {
    setS((prev) => ({ ...prev, adjust: { ...prev.adjust, [key]: value } }));
  };

  const updateProcessing = (key: keyof typeof PROCESSING_DEFAULTS, value: any) => {
    setS((prev) => ({ ...prev, processing: { ...prev.processing, [key]: value } }));
  };

  const updatePost = (key: keyof typeof POST_DEFAULTS, value: any) => {
    setS((prev) => ({ ...prev, post: { ...prev.post, [key]: value } }));
  };

  // Reset individual ADJUST configs
  const resetAdjustVal = (key: keyof typeof GLOBAL_DEFAULTS) => {
    updateAdjust(key, GLOBAL_DEFAULTS[key]);
  };

  const resetAllAdjust = () => {
    setS((prev) => ({ ...prev, adjust: { ...GLOBAL_DEFAULTS } }));
  };

  // Switch effect selector row
  const switchEffect = (eff: EffectType) => {
    // Reset effect persistence state when switching
    effectStateRef.current = {};
    setS((prev) => ({ ...prev, activeEffect: eff }));
  };

  // Handle source uploading
  const handleSourceUpload = (file: File) => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);

    const type = file.type.startsWith("video/") ? "video" : "image";
    const url = URL.createObjectURL(file);
    
    setSourceFile(file);
    setSourceUrl(url);
    setSourceType(type);
    setDimensions(null);
    resetView();
  };

  const removeSource = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl(null);
    setSourceType(null);
    setDimensions(null);
    resetView();
  };

  // Redraw of processed output with current pan/zoom transform onto the display canvas
  const triggerRedraw = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    const processedCanvas = processedCanvasRef.current;
    if (!displayCanvas || !processedCanvas) return;

    const displayCtx = displayCanvas.getContext("2d");
    if (!displayCtx) return;

    displayCtx.save();
    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    
    // Centering the image drawing
    const cx = displayCanvas.width / 2;
    const cy = displayCanvas.height / 2;
    displayCtx.translate(cx + panXRef.current, cy + panYRef.current);
    displayCtx.scale(zoomRef.current, zoomRef.current);
    
    // Draw centered processed canvas
    displayCtx.drawImage(
      processedCanvas,
      -processedCanvas.width / 2,
      -processedCanvas.height / 2
    );
    displayCtx.restore();
  }, []);

  // Main rendering pipeline
  const runRenderPipeline = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    // Check if source elements are loaded and have dimensions
    let sourceEl: HTMLImageElement | HTMLVideoElement | null = null;
    let originalW = 0;
    let originalH = 0;

    if (sourceType === "image" && sourceImageRef.current?.complete && sourceImageRef.current?.naturalWidth) {
      sourceEl = sourceImageRef.current;
      originalW = sourceImageRef.current.naturalWidth;
      originalH = sourceImageRef.current.naturalHeight;
    } else if (sourceType === "video" && sourceVideoRef.current && sourceVideoRef.current.readyState >= 2) {
      sourceEl = sourceVideoRef.current;
      originalW = sourceVideoRef.current.videoWidth;
      originalH = sourceVideoRef.current.videoHeight;
    }

    if (!sourceEl || originalW === 0 || originalH === 0) return;

    // Initialize dimensions if not set
    if (!dimensions || dimensions.w !== originalW || dimensions.h !== originalH) {
      setDimensions({ w: originalW, h: originalH });
    }

    // Set up or resize intermediate canvases
    if (!preCanvasRef.current) preCanvasRef.current = document.createElement("canvas");
    if (!processedCanvasRef.current) processedCanvasRef.current = document.createElement("canvas");

    const preCanvas = preCanvasRef.current;
    const processedCanvas = processedCanvasRef.current;

    // 1. Draw source to intermediate canvas
    preCanvas.width = originalW;
    preCanvas.height = originalH;
    const preCtx = preCanvas.getContext("2d")!;
    preCtx.drawImage(sourceEl, 0, 0, originalW, originalH);

    // 2. Apply global adjustments (brightness, contrast, saturation, hue, sharpness, gamma)
    applyGlobalAdjustments(preCtx, originalW, originalH, s.adjust);

    // 3. Apply Processing (invert, scale, flip, rotate, edge padding) - resizes preCanvas
    applyProcessing(preCanvas, s.processing);

    const W = preCanvas.width;
    const H = preCanvas.height;

    // Ensure processedCanvas has matching dimensions
    if (processedCanvas.width !== W || processedCanvas.height !== H) {
      processedCanvas.width = W;
      processedCanvas.height = H;
    }
    const outputCtx = processedCanvas.getContext("2d")!;

    // 4. Apply active effect
    const activeEffect = s.activeEffect;
    const effectConfig = s.effectConfig[activeEffect];
    
    // Inject global duotone colors to active effect config if needed (e.g. for custom palette rendering)
    if (s.adjust.colorMode === "DUOTONE") {
      effectConfig.shadowColor = s.adjust.shadowColor;
      effectConfig.highlightColor = s.adjust.highlightColor;
    }

    const result = EFFECTS[activeEffect](preCanvas, outputCtx, effectConfig, effectStateRef.current);
    if (result instanceof ImageData) {
      outputCtx.putImageData(result, 0, 0);
    }

    // 5. Apply Post-Processing (blur, vignette, grain, scanlines, chroma aberration, pixelate)
    applyPostProcessing(outputCtx, W, H, s.post);

    // Apply canvas CSS blend modes onto output context if needed
    if (s.post.blendMode !== "Normal") {
      outputCtx.save();
      outputCtx.globalCompositeOperation = 
        s.post.blendMode === "Multiply" ? "multiply" :
        s.post.blendMode === "Screen" ? "screen" :
        s.post.blendMode === "Overlay" ? "overlay" :
        s.post.blendMode === "Add" ? "screen" : // mapping Add to screen or hard-light
        s.post.blendMode === "Difference" ? "difference" : "source-over";
      outputCtx.restore();
    }

    // 6. Draw to display canvas
    triggerRedraw();
  }, [sourceType, dimensions, s.adjust, s.processing, s.activeEffect, s.effectConfig, s.post, triggerRedraw]);

  // Sync canvas dimensions with parent layout container size
  const resizeDisplayCanvas = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      triggerRedraw();
    }
  }, [triggerRedraw]);

  // Animation render loop
  useEffect(() => {
    if (!isActive) return;

    let animId: number;
    const renderLoop = () => {
      runRenderPipeline();
      animId = requestAnimationFrame(renderLoop);
    };

    // Run animation frame loop
    renderLoop();

    // Setup window resize listener
    window.addEventListener("resize", resizeDisplayCanvas);
    resizeDisplayCanvas();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeDisplayCanvas);
    };
  }, [isActive, runRenderPipeline, resizeDisplayCanvas]);

  // Gestures mapping: Scroll to Pan, Alt+Drag to Pan, Cmd+Scroll to Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const isZoom = e.ctrlKey || e.metaKey;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;

    if (isZoom) {
      // Zoom toward cursor
      const canvas = displayCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Adjust pan coordinates to anchor zoom to mouse position
      panXRef.current = mx - (mx - panXRef.current) * factor;
      panYRef.current = my - (my - panYRef.current) * factor;

      const nextZoom = Math.max(0.1, Math.min(10, zoomRef.current * factor));
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    } else {
      // Normal scroll → Pan
      panXRef.current -= e.deltaX;
      panYRef.current -= e.deltaY;
    }
    triggerRedraw();
  };

  // Alt+Drag to Pan variables
  const isPanningRef = useRef(false);
  const startPanXRef = useRef(0);
  const startPanYRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!e.altKey) return;
    isPanningRef.current = true;
    startPanXRef.current = e.clientX - panXRef.current;
    startPanYRef.current = e.clientY - panYRef.current;
    
    const canvas = displayCanvasRef.current;
    if (canvas) canvas.style.cursor = "grabbing";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      panXRef.current = e.clientX - startPanXRef.current;
      panYRef.current = e.clientY - startPanYRef.current;
      triggerRedraw();
    };

    const handleMouseUp = () => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      const canvas = displayCanvasRef.current;
      if (canvas) canvas.style.cursor = "crosshair";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [triggerRedraw]);

  // Export action
  const handleExport = async () => {
    if (!processedCanvasRef.current || !preCanvasRef.current) return;
    setExporting(true);
    try {
      // Compile config bundle for exporter
      const exportConfig = {
        activeEffect: s.activeEffect,
        effectConfig: s.effectConfig,
        exportMultiplier: s.exportMultiplier,
        jpegQuality: s.exportQuality,
        gifFps: s.gifFps,
        gifLoop: s.gifLoop,
        gifDither: s.gifDither,
        mp4Fps: s.mp4Fps,
        mp4Quality: s.mp4Quality,
        threePlaneSize: s.threePlaneSize,
        threeBgColor: s.threeBgColor,
        threeAutoRotate: s.threeAutoRotate,
        adjust: s.adjust,
        processing: s.processing,
        post: s.post
      };
      await exportEffect(
        s.exportFormat,
        processedCanvasRef.current,
        preCanvasRef.current,
        exportConfig,
        (rec, prog) => setExportProgress(rec ? prog : ""),
        sourceType || undefined,
        sourceVideoRef.current || undefined
      );
    } catch (e: any) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  // Clean elements if active is disabled
  useEffect(() => {
    if (!isActive) {
      if (sourceUrl && sourceUrl.startsWith("blob:")) {
        URL.revokeObjectURL(sourceUrl);
      }
      setSourceFile(null);
      setSourceUrl(null);
      setSourceType(null);
      setDimensions(null);
    }
  }, [isActive]);

  return (
    <div className="contents">
      {/* ── Left Sidebar (Effect Selector & Per-effect settings) ── */}
      <aside className="w-[320px] shrink-0 border-r border-border bg-surface flex flex-col h-full min-h-0">
        {/* 3A. Effect Selector (Top ~40%, fixed) */}
        <div className="flex-shrink-0 h-[40%] border-b border-border flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">Effects</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {EFFECT_LIST.map((eff) => {
              const active = s.activeEffect === eff;
              return (
                <button
                  key={eff}
                  onClick={() => switchEffect(eff)}
                  className={`w-full flex items-center gap-3 px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono text-left transition-colors border-l-2 ${
                    active
                      ? "text-foreground border-foreground bg-surface-2"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-surface-2/50"
                  }`}
                >
                  <span className={active ? "text-accent" : "text-muted-foreground/30"}>
                    {active ? "●" : "○"}
                  </span>
                  <span>{eff.replace("_", " ")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3B. Per-Effect Controls (Bottom ~60%, scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
              {s.activeEffect.replace("_", " ")} Settings
            </span>
          </div>
          <div className="p-4 space-y-5">
            {/* Dynamic parameters depending on activeEffect */}
            {s.activeEffect === "ASCII" && (
              <>
                <SliderRow
                  label="Cell Size"
                  value={s.effectConfig.ASCII.cellSize}
                  min={4}
                  max={32}
                  onChange={(v) => updateEffectConfig("ASCII", "cellSize", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Character Set</label>
                  <SegButton
                    value={s.effectConfig.ASCII.charSet}
                    options={[
                      { id: "STANDARD", label: "Std" },
                      { id: "BLOCKS", label: "Blks" },
                      { id: "BINARY", label: "Bin" },
                      { id: "NUMBERS", label: "Num" },
                      { id: "SYMBOLS:STANDARD", label: "Sym" }, // Map standard names
                      { id: "CUSTOM", label: "Cust" }
                    ]}
                    onChange={(v) => updateEffectConfig("ASCII", "charSet", v === "Sym" ? "SYMBOLS" : v)}
                  />
                </div>
                {s.effectConfig.ASCII.charSet === "CUSTOM" && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">Custom Chars</label>
                    <input
                      type="text"
                      placeholder="enter characters dark→light"
                      value={s.effectConfig.ASCII.customChars}
                      onChange={(e) => updateEffectConfig("ASCII", "customChars", e.target.value)}
                      className="w-full bg-control border border-border px-3 py-2 text-[9px] font-mono outline-none text-foreground"
                    />
                  </div>
                )}
                <Toggle
                  label="Invert Chars"
                  value={s.effectConfig.ASCII.invertChars}
                  onChange={(v) => updateEffectConfig("ASCII", "invertChars", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Mode</label>
                  <SegButton
                    value={s.effectConfig.ASCII.colorMode}
                    options={[
                      { id: "SOURCE", label: "Source" },
                      { id: "MONO", label: "Mono" },
                      { id: "CUSTOM", label: "Custom" }
                    ]}
                    onChange={(v) => updateEffectConfig("ASCII", "colorMode", v)}
                  />
                </div>
                {(s.effectConfig.ASCII.colorMode === "MONO" || s.effectConfig.ASCII.colorMode === "CUSTOM") && (
                  <ColorPickerRow
                    label="Foreground"
                    value={s.effectConfig.ASCII.fgColor}
                    onChange={(v) => updateEffectConfig("ASCII", "fgColor", v)}
                  />
                )}
                {s.effectConfig.ASCII.colorMode === "CUSTOM" && (
                  <ColorPickerRow
                    label="Background"
                    value={s.effectConfig.ASCII.bgColor}
                    onChange={(v) => updateEffectConfig("ASCII", "bgColor", v)}
                  />
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Font</label>
                  <SegButton
                    value={s.effectConfig.ASCII.font}
                    options={[
                      { id: "MONO", label: "Mono" },
                      { id: "COURIER", label: "Courier" },
                      { id: "SPACE MONO", label: "Space" }
                    ]}
                    onChange={(v) => updateEffectConfig("ASCII", "font", v)}
                  />
                </div>
                <Toggle
                  label="Bold"
                  value={s.effectConfig.ASCII.bold}
                  onChange={(v) => updateEffectConfig("ASCII", "bold", v)}
                />
              </>
            )}

            {s.activeEffect === "DITHERING" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Algorithm</label>
                  <SegButton
                    value={s.effectConfig.DITHERING.algorithm}
                    options={[
                      { id: "BAYER", label: "Bayer" },
                      { id: "FLOYD-STEINBERG", label: "Floyd" },
                      { id: "ATKINSON", label: "Atkin" },
                      { id: "ORDERED", label: "Order" }
                    ]}
                    onChange={(v) => updateEffectConfig("DITHERING", "algorithm", v)}
                  />
                </div>
                {(s.effectConfig.DITHERING.algorithm === "BAYER" || s.effectConfig.DITHERING.algorithm === "ORDERED") && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Matrix Size</label>
                    <SegButton
                      value={s.effectConfig.DITHERING.matrixSize}
                      options={[
                        { id: "2x2", label: "2×2" },
                        { id: "4x4", label: "4×4" },
                        { id: "8x8", label: "8×8" },
                        { id: "16x16", label: "16×16" }
                      ]}
                      onChange={(v) => updateEffectConfig("DITHERING", "matrixSize", v)}
                    />
                  </div>
                )}
                <SliderRow
                  label="Levels"
                  value={s.effectConfig.DITHERING.levels}
                  min={2}
                  max={16}
                  onChange={(v) => updateEffectConfig("DITHERING", "levels", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Palette</label>
                  <SegButton
                    value={s.effectConfig.DITHERING.palette}
                    options={[
                      { id: "MONO", label: "Mono" },
                      { id: "CMYK", label: "CMYK" },
                      { id: "GAME BOY", label: "Gboy" },
                      { id: "RGB", label: "RGB" },
                      { id: "CUSTOM", label: "Cust" }
                    ]}
                    onChange={(v) => updateEffectConfig("DITHERING", "palette", v)}
                  />
                </div>
                <SliderRow
                  label="Spread"
                  value={s.effectConfig.DITHERING.spread}
                  min={0.0}
                  max={2.0}
                  step={0.1}
                  onChange={(v) => updateEffectConfig("DITHERING", "spread", v)}
                />
                {(s.effectConfig.DITHERING.algorithm === "FLOYD-STEINBERG" || s.effectConfig.DITHERING.algorithm === "ATKINSON") && (
                  <Toggle
                    label="Serpentine"
                    value={s.effectConfig.DITHERING.serpentine}
                    onChange={(v) => updateEffectConfig("DITHERING", "serpentine", v)}
                  />
                )}
              </>
            )}

            {s.activeEffect === "HALFTONE" && (
              <>
                <SliderRow
                  label="Dot Size"
                  value={s.effectConfig.HALFTONE.dotSize}
                  min={4}
                  max={40}
                  onChange={(v) => updateEffectConfig("HALFTONE", "dotSize", v)}
                />
                <SliderRow
                  label="Spacing"
                  value={s.effectConfig.HALFTONE.spacing}
                  min={4}
                  max={60}
                  onChange={(v) => updateEffectConfig("HALFTONE", "spacing", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Shape</label>
                  <SegButton
                    value={s.effectConfig.HALFTONE.shape}
                    options={[
                      { id: "CIRCLE", label: "Circle" },
                      { id: "SQUARE", label: "Square" },
                      { id: "DIAMOND", label: "Diamond" },
                      { id: "LINE", label: "Line" }
                    ]}
                    onChange={(v) => updateEffectConfig("HALFTONE", "shape", v)}
                  />
                </div>
                <SliderRow
                  label="Angle"
                  value={s.effectConfig.HALFTONE.angle}
                  min={0}
                  max={90}
                  format={(v) => `${v}°`}
                  onChange={(v) => updateEffectConfig("HALFTONE", "angle", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Mode</label>
                  <SegButton
                    value={s.effectConfig.HALFTONE.colorMode}
                    options={[
                      { id: "MONO", label: "Mono" },
                      { id: "CMYK", label: "CMYK" },
                      { id: "SOURCE", label: "Source" }
                    ]}
                    onChange={(v) => updateEffectConfig("HALFTONE", "colorMode", v)}
                  />
                </div>
                {s.effectConfig.HALFTONE.colorMode === "MONO" && (
                  <ColorPickerRow
                    label="Dot Color"
                    value={s.effectConfig.HALFTONE.dotColor}
                    onChange={(v) => updateEffectConfig("HALFTONE", "dotColor", v)}
                  />
                )}
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.HALFTONE.bgColor}
                  onChange={(v) => updateEffectConfig("HALFTONE", "bgColor", v)}
                />
                <Toggle
                  label="Invert"
                  value={s.effectConfig.HALFTONE.invert}
                  onChange={(v) => updateEffectConfig("HALFTONE", "invert", v)}
                />
              </>
            )}

            {s.activeEffect === "MATRIX_RAIN" && (
              <>
                <SliderRow
                  label="Col Width"
                  value={s.effectConfig.MATRIX_RAIN.colWidth}
                  min={8}
                  max={32}
                  onChange={(v) => updateEffectConfig("MATRIX_RAIN", "colWidth", v)}
                />
                <SliderRow
                  label="Speed"
                  value={s.effectConfig.MATRIX_RAIN.speed}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  onChange={(v) => updateEffectConfig("MATRIX_RAIN", "speed", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Char Set</label>
                  <SegButton
                    value={s.effectConfig.MATRIX_RAIN.charSet}
                    options={[
                      { id: "KATAKANA", label: "Kana" },
                      { id: "BINARY", label: "Bin" },
                      { id: "NUMBERS", label: "Num" },
                      { id: "LATIN", label: "Latin" }
                    ]}
                    onChange={(v) => updateEffectConfig("MATRIX_RAIN", "charSet", v)}
                  />
                </div>
                <SliderRow
                  label="Trail Length"
                  value={s.effectConfig.MATRIX_RAIN.trailLength}
                  min={5}
                  max={60}
                  onChange={(v) => updateEffectConfig("MATRIX_RAIN", "trailLength", v)}
                />
                <ColorPickerRow
                  label="Foreground"
                  value={s.effectConfig.MATRIX_RAIN.fgColor}
                  onChange={(v) => updateEffectConfig("MATRIX_RAIN", "fgColor", v)}
                />
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.MATRIX_RAIN.bgColor}
                  onChange={(v) => updateEffectConfig("MATRIX_RAIN", "bgColor", v)}
                />
                <SliderRow
                  label="Source Blend"
                  value={s.effectConfig.MATRIX_RAIN.sourceBlend}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("MATRIX_RAIN", "sourceBlend", v)}
                />
                <SliderRow
                  label="Font Size"
                  value={s.effectConfig.MATRIX_RAIN.fontSize}
                  min={8}
                  max={32}
                  onChange={(v) => updateEffectConfig("MATRIX_RAIN", "fontSize", v)}
                />
              </>
            )}

            {s.activeEffect === "DOTS" && (
              <>
                <SliderRow
                  label="Dot Size"
                  value={s.effectConfig.DOTS.dotSize}
                  min={2}
                  max={30}
                  onChange={(v) => updateEffectConfig("DOTS", "dotSize", v)}
                />
                <SliderRow
                  label="Spacing"
                  value={s.effectConfig.DOTS.spacing}
                  min={4}
                  max={40}
                  onChange={(v) => updateEffectConfig("DOTS", "spacing", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Size By</label>
                  <SegButton
                    value={s.effectConfig.DOTS.sizeBy}
                    options={[
                      { id: "BRIGHTNESS", label: "Bright" },
                      { id: "INVERSE", label: "Inverse" },
                      { id: "FIXED", label: "Fixed" }
                    ]}
                    onChange={(v) => updateEffectConfig("DOTS", "sizeBy", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Mode</label>
                  <SegButton
                    value={s.effectConfig.DOTS.colorMode}
                    options={[
                      { id: "SOURCE", label: "Source" },
                      { id: "FOREGROUND", label: "Fg" },
                      { id: "GRADIENT", label: "Grad" }
                    ]}
                    onChange={(v) => updateEffectConfig("DOTS", "colorMode", v)}
                  />
                </div>
                {s.effectConfig.DOTS.colorMode === "FOREGROUND" && (
                  <ColorPickerRow
                    label="Foreground"
                    value={s.effectConfig.DOTS.fgColor}
                    onChange={(v) => updateEffectConfig("DOTS", "fgColor", v)}
                  />
                )}
                {s.effectConfig.DOTS.colorMode === "GRADIENT" && (
                  <>
                    <ColorPickerRow
                      label="Grad Start"
                      value={s.effectConfig.DOTS.gradStart}
                      onChange={(v) => updateEffectConfig("DOTS", "gradStart", v)}
                    />
                    <ColorPickerRow
                      label="Grad End"
                      value={s.effectConfig.DOTS.gradEnd}
                      onChange={(v) => updateEffectConfig("DOTS", "gradEnd", v)}
                    />
                  </>
                )}
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.DOTS.bgColor}
                  onChange={(v) => updateEffectConfig("DOTS", "bgColor", v)}
                />
                <SliderRow
                  label="Min Radius"
                  value={s.effectConfig.DOTS.minRadius}
                  min={0}
                  max={10}
                  onChange={(v) => updateEffectConfig("DOTS", "minRadius", v)}
                />
              </>
            )}

            {s.activeEffect === "CONTOUR" && (
              <>
                <SliderRow
                  label="Levels"
                  value={s.effectConfig.CONTOUR.levels}
                  min={2}
                  max={32}
                  onChange={(v) => updateEffectConfig("CONTOUR", "levels", v)}
                />
                <SliderRow
                  label="Line Width"
                  value={s.effectConfig.CONTOUR.lineWidth}
                  min={0.5}
                  max={6.0}
                  step={0.5}
                  onChange={(v) => updateEffectConfig("CONTOUR", "lineWidth", v)}
                />
                <SliderRow
                  label="Smoothing"
                  value={s.effectConfig.CONTOUR.smoothing}
                  min={0}
                  max={10}
                  onChange={(v) => updateEffectConfig("CONTOUR", "smoothing", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Mode</label>
                  <SegButton
                    value={s.effectConfig.CONTOUR.colorMode}
                    options={[
                      { id: "MONO", label: "Mono" },
                      { id: "RAINBOW", label: "Rainbow" },
                      { id: "SOURCE", label: "Source" }
                    ]}
                    onChange={(v) => updateEffectConfig("CONTOUR", "colorMode", v)}
                  />
                </div>
                {s.effectConfig.CONTOUR.colorMode === "MONO" && (
                  <ColorPickerRow
                    label="Line Color"
                    value={s.effectConfig.CONTOUR.lineColor}
                    onChange={(v) => updateEffectConfig("CONTOUR", "lineColor", v)}
                  />
                )}
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.CONTOUR.bgColor}
                  onChange={(v) => updateEffectConfig("CONTOUR", "bgColor", v)}
                />
              </>
            )}

            {s.activeEffect === "PIXEL_SORT" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Direction</label>
                  <SegButton
                    value={s.effectConfig.PIXEL_SORT.direction}
                    options={[
                      { id: "HORIZONTAL", label: "Horiz" },
                      { id: "VERTICAL", label: "Vert" },
                      { id: "DIAGONAL", label: "Diag" }
                    ]}
                    onChange={(v) => updateEffectConfig("PIXEL_SORT", "direction", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Sort By</label>
                  <SegButton
                    value={s.effectConfig.PIXEL_SORT.sortBy}
                    options={[
                      { id: "BRIGHTNESS", label: "Bright" },
                      { id: "HUE", label: "Hue" },
                      { id: "RED", label: "Red" },
                      { id: "GREEN", label: "Green" },
                      { id: "BLUE", label: "Blue" }
                    ]}
                    onChange={(v) => updateEffectConfig("PIXEL_SORT", "sortBy", v)}
                  />
                </div>
                <SliderRow
                  label="Threshold Low"
                  value={s.effectConfig.PIXEL_SORT.threshLow}
                  min={0}
                  max={255}
                  onChange={(v) => updateEffectConfig("PIXEL_SORT", "threshLow", v)}
                />
                <SliderRow
                  label="Threshold High"
                  value={s.effectConfig.PIXEL_SORT.threshHigh}
                  min={0}
                  max={255}
                  onChange={(v) => updateEffectConfig("PIXEL_SORT", "threshHigh", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Sort Order</label>
                  <SegButton
                    value={s.effectConfig.PIXEL_SORT.sortOrder}
                    options={[
                      { id: "ASCENDING", label: "Asc" },
                      { id: "DESCENDING", label: "Desc" }
                    ]}
                    onChange={(v) => updateEffectConfig("PIXEL_SORT", "sortOrder", v)}
                  />
                </div>
                <SliderRow
                  label="Span"
                  value={s.effectConfig.PIXEL_SORT.span}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("PIXEL_SORT", "span", v)}
                />
              </>
            )}

            {s.activeEffect === "BLOCKIFY" && (
              <>
                <SliderRow
                  label="Block W"
                  value={s.effectConfig.BLOCKIFY.blockW}
                  min={4}
                  max={128}
                  onChange={(v) => updateEffectConfig("BLOCKIFY", "blockW", v)}
                />
                {!s.effectConfig.BLOCKIFY.linkWH && (
                  <SliderRow
                    label="Block H"
                    value={s.effectConfig.BLOCKIFY.blockH}
                    min={4}
                    max={128}
                    onChange={(v) => updateEffectConfig("BLOCKIFY", "blockH", v)}
                  />
                )}
                <Toggle
                  label="Link W/H"
                  value={s.effectConfig.BLOCKIFY.linkWH}
                  onChange={(v) => updateEffectConfig("BLOCKIFY", "linkWH", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Shape</label>
                  <SegButton
                    value={s.effectConfig.BLOCKIFY.shape}
                    options={[
                      { id: "RECTANGLE", label: "Rect" },
                      { id: "CIRCLE", label: "Circle" },
                      { id: "DIAMOND", label: "Diam" },
                      { id: "HEXAGON", label: "Hex" }
                    ]}
                    onChange={(v) => updateEffectConfig("BLOCKIFY", "shape", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Method</label>
                  <SegButton
                    value={s.effectConfig.BLOCKIFY.colorMethod}
                    options={[
                      { id: "AVERAGE", label: "Avg" },
                      { id: "CENTER PIXEL", label: "Ctr" },
                      { id: "DOMINANT", label: "Dom" }
                    ]}
                    onChange={(v) => updateEffectConfig("BLOCKIFY", "colorMethod", v)}
                  />
                </div>
                {s.effectConfig.BLOCKIFY.shape !== "RECTANGLE" && (
                  <ColorPickerRow
                    label="Background"
                    value={s.effectConfig.BLOCKIFY.bgColor}
                    onChange={(v) => updateEffectConfig("BLOCKIFY", "bgColor", v)}
                  />
                )}
                <Toggle
                  label="Outline"
                  value={s.effectConfig.BLOCKIFY.outline}
                  onChange={(v) => updateEffectConfig("BLOCKIFY", "outline", v)}
                />
                {s.effectConfig.BLOCKIFY.outline && (
                  <ColorPickerRow
                    label="Outline Color"
                    value={s.effectConfig.BLOCKIFY.outlineColor}
                    onChange={(v) => updateEffectConfig("BLOCKIFY", "outlineColor", v)}
                  />
                )}
              </>
            )}

            {s.activeEffect === "THRESHOLD" && (
              <>
                <SliderRow
                  label="Threshold"
                  value={s.effectConfig.THRESHOLD.threshold}
                  min={0}
                  max={255}
                  onChange={(v) => updateEffectConfig("THRESHOLD", "threshold", v)}
                />
                <SliderRow
                  label="Levels"
                  value={s.effectConfig.THRESHOLD.levels}
                  min={2}
                  max={8}
                  onChange={(v) => updateEffectConfig("THRESHOLD", "levels", v)}
                />
                <ColorPickerRow
                  label="Light Color"
                  value={s.effectConfig.THRESHOLD.lightColor}
                  onChange={(v) => updateEffectConfig("THRESHOLD", "lightColor", v)}
                />
                <ColorPickerRow
                  label="Dark Color"
                  value={s.effectConfig.THRESHOLD.darkColor}
                  onChange={(v) => updateEffectConfig("THRESHOLD", "darkColor", v)}
                />
                <SliderRow
                  label="Smoothing"
                  value={s.effectConfig.THRESHOLD.smoothing}
                  min={0}
                  max={10}
                  onChange={(v) => updateEffectConfig("THRESHOLD", "smoothing", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Channel</label>
                  <SegButton
                    value={s.effectConfig.THRESHOLD.channel}
                    options={[
                      { id: "LUMINANCE", label: "Lum" },
                      { id: "RED", label: "Red" },
                      { id: "GREEN", label: "Green" },
                      { id: "BLUE", label: "Blue" }
                    ]}
                    onChange={(v) => updateEffectConfig("THRESHOLD", "channel", v)}
                  />
                </div>
                <Toggle
                  label="Anti-Alias"
                  value={s.effectConfig.THRESHOLD.antiAlias}
                  onChange={(v) => updateEffectConfig("THRESHOLD", "antiAlias", v)}
                />
              </>
            )}

            {s.activeEffect === "EDGE_DETECTION" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Algorithm</label>
                  <SegButton
                    value={s.effectConfig.EDGE_DETECTION.algorithm}
                    options={[
                      { id: "SOBEL", label: "Sobel" },
                      { id: "CANNY", label: "Canny" },
                      { id: "LAPLACIAN", label: "Laplace" },
                      { id: "PREWITT", label: "Prewitt" }
                    ]}
                    onChange={(v) => updateEffectConfig("EDGE_DETECTION", "algorithm", v)}
                  />
                </div>
                <SliderRow
                  label="Threshold Low"
                  value={s.effectConfig.EDGE_DETECTION.threshLow}
                  min={0}
                  max={255}
                  onChange={(v) => updateEffectConfig("EDGE_DETECTION", "threshLow", v)}
                />
                {s.effectConfig.EDGE_DETECTION.algorithm === "CANNY" && (
                  <SliderRow
                    label="Threshold High"
                    value={s.effectConfig.EDGE_DETECTION.threshHigh}
                    min={0}
                    max={255}
                    onChange={(v) => updateEffectConfig("EDGE_DETECTION", "threshHigh", v)}
                  />
                )}
                <SliderRow
                  label="Pre-Blur"
                  value={s.effectConfig.EDGE_DETECTION.preBlur}
                  min={0}
                  max={10}
                  onChange={(v) => updateEffectConfig("EDGE_DETECTION", "preBlur", v)}
                />
                <SliderRow
                  label="Strength"
                  value={s.effectConfig.EDGE_DETECTION.strength}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  onChange={(v) => updateEffectConfig("EDGE_DETECTION", "strength", v)}
                />
                <ColorPickerRow
                  label="Edge Color"
                  value={s.effectConfig.EDGE_DETECTION.edgeColor}
                  onChange={(v) => updateEffectConfig("EDGE_DETECTION", "edgeColor", v)}
                />
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.EDGE_DETECTION.bgColor}
                  onChange={(v) => updateEffectConfig("EDGE_DETECTION", "bgColor", v)}
                />
                <Toggle
                  label="Invert"
                  value={s.effectConfig.EDGE_DETECTION.invert}
                  onChange={(v) => updateEffectConfig("EDGE_DETECTION", "invert", v)}
                />
              </>
            )}

            {s.activeEffect === "CROSSHATCH" && (
              <>
                <SliderRow
                  label="Line Spacing"
                  value={s.effectConfig.CROSSHATCH.lineSpacing}
                  min={4}
                  max={40}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "lineSpacing", v)}
                />
                <SliderRow
                  label="Line Width"
                  value={s.effectConfig.CROSSHATCH.lineWidth}
                  min={0.5}
                  max={4.0}
                  step={0.1}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "lineWidth", v)}
                />
                <SliderRow
                  label="Layers"
                  value={s.effectConfig.CROSSHATCH.layers}
                  min={1}
                  max={4}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "layers", v)}
                />
                <SliderRow
                  label="Density Thresh"
                  value={s.effectConfig.CROSSHATCH.densityThreshold}
                  min={0}
                  max={255}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "densityThreshold", v)}
                />
                <ColorPickerRow
                  label="Line Color"
                  value={s.effectConfig.CROSSHATCH.lineColor}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "lineColor", v)}
                />
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.CROSSHATCH.bgColor}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "bgColor", v)}
                />
                <SliderRow
                  label="Angle"
                  value={s.effectConfig.CROSSHATCH.angle}
                  min={0}
                  max={180}
                  format={(v) => `${v}°`}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "angle", v)}
                />
                <Toggle
                  label="Vary Thickness"
                  value={s.effectConfig.CROSSHATCH.varyThickness}
                  onChange={(v) => updateEffectConfig("CROSSHATCH", "varyThickness", v)}
                />
              </>
            )}

            {s.activeEffect === "WAVE_LINES" && (
              <>
                <SliderRow
                  label="Line Spacing"
                  value={s.effectConfig.WAVE_LINES.lineSpacing}
                  min={2}
                  max={40}
                  onChange={(v) => updateEffectConfig("WAVE_LINES", "lineSpacing", v)}
                />
                <SliderRow
                  label="Amplitude"
                  value={s.effectConfig.WAVE_LINES.amplitude}
                  min={0}
                  max={60}
                  onChange={(v) => updateEffectConfig("WAVE_LINES", "amplitude", v)}
                />
                <SliderRow
                  label="Frequency"
                  value={s.effectConfig.WAVE_LINES.frequency}
                  min={0.001}
                  max={0.05}
                  step={0.001}
                  onChange={(v) => updateEffectConfig("WAVE_LINES", "frequency", v)}
                />
                <SliderRow
                  label="Phase"
                  value={s.effectConfig.WAVE_LINES.phase}
                  min={0}
                  max={6.28}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("WAVE_LINES", "phase", v)}
                />
                <Toggle
                  label="Animate"
                  value={s.effectConfig.WAVE_LINES.animate}
                  onChange={(v) => updateEffectConfig("WAVE_LINES", "animate", v)}
                />
                {s.effectConfig.WAVE_LINES.animate && (
                  <SliderRow
                    label="Anim Speed"
                    value={s.effectConfig.WAVE_LINES.animSpeed}
                    min={0.001}
                    max={0.1}
                    step={0.005}
                    onChange={(v) => updateEffectConfig("WAVE_LINES", "animSpeed", v)}
                  />
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Direction</label>
                  <SegButton
                    value={s.effectConfig.WAVE_LINES.direction}
                    options={[
                      { id: "HORIZONTAL", label: "Horiz" },
                      { id: "VERTICAL", label: "Vert" },
                      { id: "BOTH", label: "Both" }
                    ]}
                    onChange={(v) => updateEffectConfig("WAVE_LINES", "direction", v)}
                  />
                </div>
                <SliderRow
                  label="Line Width"
                  value={s.effectConfig.WAVE_LINES.lineWidth}
                  min={0.5}
                  max={4.0}
                  step={0.1}
                  onChange={(v) => updateEffectConfig("WAVE_LINES", "lineWidth", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Mode</label>
                  <SegButton
                    value={s.effectConfig.WAVE_LINES.colorMode}
                    options={[
                      { id: "MONO", label: "Mono" },
                      { id: "SOURCE", label: "Source" }
                    ]}
                    onChange={(v) => updateEffectConfig("WAVE_LINES", "colorMode", v)}
                  />
                </div>
                {s.effectConfig.WAVE_LINES.colorMode === "MONO" && (
                  <ColorPickerRow
                    label="Line Color"
                    value={s.effectConfig.WAVE_LINES.lineColor}
                    onChange={(v) => updateEffectConfig("WAVE_LINES", "lineColor", v)}
                  />
                )}
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.WAVE_LINES.bgColor}
                  onChange={(v) => updateEffectConfig("WAVE_LINES", "bgColor", v)}
                />
              </>
            )}

            {s.activeEffect === "NOISE_FIELD" && (
              <>
                <SliderRow
                  label="Scale"
                  value={s.effectConfig.NOISE_FIELD.scale}
                  min={0.001}
                  max={0.05}
                  step={0.001}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "scale", v)}
                />
                <SliderRow
                  label="Octaves"
                  value={s.effectConfig.NOISE_FIELD.octaves}
                  min={1}
                  max={8}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "octaves", v)}
                />
                <SliderRow
                  label="Persistence"
                  value={s.effectConfig.NOISE_FIELD.persistence}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "persistence", v)}
                />
                <SliderRow
                  label="Step Size"
                  value={s.effectConfig.NOISE_FIELD.stepSize}
                  min={1}
                  max={10}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "stepSize", v)}
                />
                <SliderRow
                  label="Line Length"
                  value={s.effectConfig.NOISE_FIELD.lineLength}
                  min={10}
                  max={500}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "lineLength", v)}
                />
                <SliderRow
                  label="Line Count"
                  value={s.effectConfig.NOISE_FIELD.lineCount}
                  min={100}
                  max={5000}
                  step={100}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "lineCount", v)}
                />
                <SliderRow
                  label="Line Width"
                  value={s.effectConfig.NOISE_FIELD.lineWidth}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "lineWidth", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Mode</label>
                  <SegButton
                    value={s.effectConfig.NOISE_FIELD.colorMode}
                    options={[
                      { id: "SOURCE", label: "Source" },
                      { id: "MONO", label: "Mono" }
                    ]}
                    onChange={(v) => updateEffectConfig("NOISE_FIELD", "colorMode", v)}
                  />
                </div>
                {s.effectConfig.NOISE_FIELD.colorMode === "MONO" && (
                  <ColorPickerRow
                    label="Line Color"
                    value={s.effectConfig.NOISE_FIELD.lineColor}
                    onChange={(v) => updateEffectConfig("NOISE_FIELD", "lineColor", v)}
                  />
                )}
                <ColorPickerRow
                  label="Background"
                  value={s.effectConfig.NOISE_FIELD.bgColor}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "bgColor", v)}
                />
                <SliderRow
                  label="Seed"
                  value={s.effectConfig.NOISE_FIELD.seed}
                  min={0}
                  max={999}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "seed", v)}
                />
                <SliderRow
                  label="Opacity"
                  value={s.effectConfig.NOISE_FIELD.opacity}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("NOISE_FIELD", "opacity", v)}
                />
              </>
            )}

            {s.activeEffect === "VORONOI" && (
              <>
                <SliderRow
                  label="Cell Count"
                  value={s.effectConfig.VORONOI.cellCount}
                  min={10}
                  max={500}
                  onChange={(v) => updateEffectConfig("VORONOI", "cellCount", v)}
                />
                <SliderRow
                  label="Seed"
                  value={s.effectConfig.VORONOI.seed}
                  min={0}
                  max={9999}
                  onChange={(v) => updateEffectConfig("VORONOI", "seed", v)}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Placement</label>
                  <SegButton
                    value={s.effectConfig.VORONOI.placement}
                    options={[
                      { id: "RANDOM", label: "Rand" },
                      { id: "WEIGHTED", label: "Weight" },
                      { id: "GRID", label: "Grid" },
                      { id: "POISSON", label: "Poisson" }
                    ]}
                    onChange={(v) => updateEffectConfig("VORONOI", "placement", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Color Source</label>
                  <SegButton
                    value={s.effectConfig.VORONOI.colorSource}
                    options={[
                      { id: "SEED PIXEL", label: "Seed" },
                      { id: "AVERAGE", label: "Avg" },
                      { id: "MONO", label: "Mono" }
                    ]}
                    onChange={(v) => updateEffectConfig("VORONOI", "colorSource", v)}
                  />
                </div>
                {s.effectConfig.VORONOI.colorSource === "MONO" && (
                  <ColorPickerRow
                    label="Mono Color"
                    value={s.effectConfig.VORONOI.monoColor}
                    onChange={(v) => updateEffectConfig("VORONOI", "monoColor", v)}
                  />
                )}
                <Toggle
                  label="Show Seeds"
                  value={s.effectConfig.VORONOI.showSeeds}
                  onChange={(v) => updateEffectConfig("VORONOI", "showSeeds", v)}
                />
                {s.effectConfig.VORONOI.showSeeds && (
                  <SliderRow
                    label="Seed Size"
                    value={s.effectConfig.VORONOI.seedSize}
                    min={1}
                    max={10}
                    onChange={(v) => updateEffectConfig("VORONOI", "seedSize", v)}
                  />
                )}
                <Toggle
                  label="Show Borders"
                  value={s.effectConfig.VORONOI.showBorders}
                  onChange={(v) => updateEffectConfig("VORONOI", "showBorders", v)}
                />
                {s.effectConfig.VORONOI.showBorders && (
                  <>
                    <ColorPickerRow
                      label="Border Color"
                      value={s.effectConfig.VORONOI.borderColor}
                      onChange={(v) => updateEffectConfig("VORONOI", "borderColor", v)}
                    />
                    <SliderRow
                      label="Border Width"
                      value={s.effectConfig.VORONOI.borderWidth}
                      min={0.5}
                      max={4.0}
                      step={0.5}
                      onChange={(v) => updateEffectConfig("VORONOI", "borderWidth", v)}
                    />
                  </>
                )}
                <SliderRow
                  label="Relaxation"
                  value={s.effectConfig.VORONOI.relaxation}
                  min={0}
                  max={5}
                  onChange={(v) => updateEffectConfig("VORONOI", "relaxation", v)}
                />
              </>
            )}

            {s.activeEffect === "VHS" && (
              <>
                <SliderRow
                  label="Tracking Noise"
                  value={s.effectConfig.VHS.trackingNoise}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("VHS", "trackingNoise", v)}
                />
                <SliderRow
                  label="Noise Bands"
                  value={s.effectConfig.VHS.noiseBands}
                  min={1}
                  max={20}
                  onChange={(v) => updateEffectConfig("VHS", "noiseBands", v)}
                />
                <SliderRow
                  label="Color Bleed"
                  value={s.effectConfig.VHS.colorBleed}
                  min={0}
                  max={30}
                  onChange={(v) => updateEffectConfig("VHS", "colorBleed", v)}
                />
                <SliderRow
                  label="Scanlines"
                  value={s.effectConfig.VHS.scanlines}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("VHS", "scanlines", v)}
                />
                <SliderRow
                  label="Jitter"
                  value={s.effectConfig.VHS.jitter}
                  min={0.0}
                  max={20.0}
                  step={0.5}
                  onChange={(v) => updateEffectConfig("VHS", "jitter", v)}
                />
                <SliderRow
                  label="Vert Sync"
                  value={s.effectConfig.VHS.vertSync}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("VHS", "vertSync", v)}
                />
                <SliderRow
                  label="Grain"
                  value={s.effectConfig.VHS.noiseGrain}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("VHS", "noiseGrain", v)}
                />
                <SliderRow
                  label="Sat Bleed"
                  value={s.effectConfig.VHS.satBleed}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("VHS", "satBleed", v)}
                />
                <SliderRow
                  label="Edge Distort"
                  value={s.effectConfig.VHS.edgeDistort}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateEffectConfig("VHS", "edgeDistort", v)}
                />
                <Toggle
                  label="Animate"
                  value={s.effectConfig.VHS.animate}
                  onChange={(v) => updateEffectConfig("VHS", "animate", v)}
                />
                {s.effectConfig.VHS.animate && (
                  <SliderRow
                    label="Speed"
                    value={s.effectConfig.VHS.speed}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    onChange={(v) => updateEffectConfig("VHS", "speed", v)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Canvas Panel View ── */}
      <main className="flex-1 min-w-0 bg-background flex flex-col items-center justify-between overflow-hidden relative">
        {/* Source image / video buffer targets (hidden from user) */}
        {sourceUrl && (
          <div style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none", overflow: "hidden" }}>
            {sourceType === "image" && (
              <img
                ref={sourceImageRef}
                src={sourceUrl}
                alt="source"
                crossOrigin="anonymous"
                onLoad={runRenderPipeline}
              />
            )}
            {sourceType === "video" && (
              <video
                ref={sourceVideoRef}
                src={sourceUrl}
                autoPlay
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onDurationChange={(e) => setVideoDuration(e.currentTarget.duration)}
                onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                onLoadedData={runRenderPipeline}
              />
            )}
          </div>
        )}

        {/* Source Info Strip (when file loaded) */}
        {sourceUrl && dimensions ? (
          <div className="w-full flex items-center justify-between bg-surface border-b border-border px-5 py-2 text-[10px] uppercase font-mono text-muted-foreground shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="text-foreground truncate max-w-[150px]">
                {sourceFile?.name ? (sourceFile.name.length > 20 ? sourceFile.name.slice(0, 17) + "..." : sourceFile.name) : "video_source"}
              </span>
              <span>·</span>
              <span>{dimensions.w} × {dimensions.h} px</span>
              <span>·</span>
              <span className="bg-control px-1.5 py-0.5 rounded-[2px] text-foreground text-[8px] font-bold">
                {sourceFile?.type?.split("/")[1]?.toUpperCase() || (sourceType === "video" ? "MP4" : "PNG")}
              </span>
            </div>
            <button
              onClick={removeSource}
              className="text-muted-foreground hover:text-foreground cursor-pointer hover:bg-control rounded px-1.5 py-0.5 border border-border"
            >
              [ × ] Remove
            </button>
          </div>
        ) : null}

        {/* Canvas Display Viewport Wrapper */}
        <div
          ref={containerRef}
          className="flex-1 w-full min-h-0 relative flex items-center justify-center bg-[#0d0d0d] overflow-hidden"
        >
          {sourceUrl ? (
            <canvas
              ref={displayCanvasRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onDoubleClick={resetView}
              className="cursor-crosshair w-full h-full block touch-none"
            />
          ) : (
            /* Drop Zone when no file is loaded */
            <div className="w-full h-full flex items-center justify-center p-8 select-none">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleSourceUpload(file);
                }}
                className="w-full max-w-lg aspect-[4/3] flex flex-col items-center justify-center border border-dashed border-border hover:border-accent hover:bg-control/25 transition-all cursor-pointer rounded-[2px]"
              >
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.mp4,.webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSourceUpload(file);
                  }}
                />
                <span className="text-xs uppercase font-mono tracking-[0.2em] text-muted-foreground mb-1.5">
                  Drop File To Apply Effects
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest text-muted-foreground/60">
                  PNG · JPG · GIF · MP4 · WebM
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Bottom Navigation Hint Bar (Fixed 28px) */}
        <div className="w-full h-7 shrink-0 flex items-center justify-between border-t border-border bg-surface-2 px-5 text-[9px] font-mono text-muted-foreground select-none">
          <span>Scroll to pan  ·  Cmd+Scroll to zoom  ·  Alt+Drag to pan</span>
          <span className="zoom-label font-bold text-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </main>

      {/* ── Right Sidebar (Global Adjustments & Exports) ── */}
      <aside className="w-[320px] shrink-0 border-l border-border bg-surface flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          
          {sourceType === "video" && (
            <Section title="Video Playback" defaultOpen={true}>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Progress</span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                  </span>
                </div>
                <input
                  type="range"
                  className="bg-slider w-full"
                  min={0}
                  max={videoDuration || 100}
                  step={0.01}
                  value={videoCurrentTime}
                  onChange={handleSeek}
                />
                
                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => {
                      if (sourceVideoRef.current) sourceVideoRef.current.currentTime = 0;
                    }}
                    className="flex-1 py-1 text-[9px] font-mono border border-border bg-control hover:bg-control-hover"
                  >
                    ◀◀
                  </button>
                  <button
                    onClick={togglePlay}
                    className="flex-1 py-1 text-[9px] font-mono border border-border bg-control hover:bg-control-hover"
                  >
                    {videoPlaying ? "⏸ Pause" : "▶ Play"}
                  </button>
                  <button
                    onClick={() => {
                      if (sourceVideoRef.current && videoDuration) {
                        sourceVideoRef.current.currentTime = videoDuration;
                      }
                    }}
                    className="flex-1 py-1 text-[9px] font-mono border border-border bg-control hover:bg-control-hover"
                  >
                    ▶▶
                  </button>
                </div>

                <div className="flex gap-1 justify-between mt-2">
                  {([0.25, 0.5, 1.0, 1.5, 2.0] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        if (sourceVideoRef.current) {
                          sourceVideoRef.current.playbackRate = r;
                          setPlaybackRate(r);
                        }
                      }}
                      className={`flex-1 py-0.5 text-[8px] font-mono border transition-all ${
                        playbackRate === r
                          ? "bg-foreground text-background border-foreground"
                          : "bg-control text-foreground border-border hover:bg-control-hover"
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Section: ADJUST */}
          <Section title="Adjust" defaultOpen={true}>
            <div className="space-y-4">
              <div className="space-y-1">
                <SliderRow
                  label="Brightness"
                  value={s.adjust.brightness}
                  min={-1.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateAdjust("brightness", v)}
                />
                <button
                  onClick={() => resetAdjustVal("brightness")}
                  style={{ opacity: s.adjust.brightness !== 0 ? 1 : 0 }}
                  className="text-[8px] font-mono text-muted-foreground hover:text-foreground float-right transition-all mr-1"
                >
                  [ reset ]
                </button>
              </div>

              <div className="space-y-1">
                <SliderRow
                  label="Contrast"
                  value={s.adjust.contrast}
                  min={-1.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateAdjust("contrast", v)}
                />
                <button
                  onClick={() => resetAdjustVal("contrast")}
                  style={{ opacity: s.adjust.contrast !== 0 ? 1 : 0 }}
                  className="text-[8px] font-mono text-muted-foreground hover:text-foreground float-right transition-all mr-1"
                >
                  [ reset ]
                </button>
              </div>

              <div className="space-y-1">
                <SliderRow
                  label="Saturation"
                  value={s.adjust.saturation}
                  min={-1.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateAdjust("saturation", v)}
                />
                <button
                  onClick={() => resetAdjustVal("saturation")}
                  style={{ opacity: s.adjust.saturation !== 0 ? 1 : 0 }}
                  className="text-[8px] font-mono text-muted-foreground hover:text-foreground float-right transition-all mr-1"
                >
                  [ reset ]
                </button>
              </div>

              <div className="space-y-1">
                <SliderRow
                  label="Hue"
                  value={s.adjust.hue}
                  min={0}
                  max={360}
                  format={(v) => `${v}°`}
                  onChange={(v) => updateAdjust("hue", v)}
                />
                <button
                  onClick={() => resetAdjustVal("hue")}
                  style={{ opacity: s.adjust.hue !== 0 ? 1 : 0 }}
                  className="text-[8px] font-mono text-muted-foreground hover:text-foreground float-right transition-all mr-1"
                >
                  [ reset ]
                </button>
              </div>

              <div className="space-y-1">
                <SliderRow
                  label="Sharpness"
                  value={s.adjust.sharpness}
                  min={0.0}
                  max={2.0}
                  step={0.1}
                  onChange={(v) => updateAdjust("sharpness", v)}
                />
                <button
                  onClick={() => resetAdjustVal("sharpness")}
                  style={{ opacity: s.adjust.sharpness !== 0 ? 1 : 0 }}
                  className="text-[8px] font-mono text-muted-foreground hover:text-foreground float-right transition-all mr-1"
                >
                  [ reset ]
                </button>
              </div>

              <div className="space-y-1">
                <SliderRow
                  label="Gamma"
                  value={s.adjust.gamma}
                  min={0.1}
                  max={3.0}
                  step={0.05}
                  onChange={(v) => updateAdjust("gamma", v)}
                />
                <button
                  onClick={() => resetAdjustVal("gamma")}
                  style={{ opacity: s.adjust.gamma !== 1.0 ? 1 : 0 }}
                  className="text-[8px] font-mono text-muted-foreground hover:text-foreground float-right transition-all mr-1"
                >
                  [ reset ]
                </button>
              </div>

              <hr className="border-border/30 my-2 clear-both" />

              <div className="space-y-2.5">
                <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">Color</label>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-mono block">Mode</label>
                  <SegButton
                    value={s.adjust.colorMode}
                    options={[
                      { id: "ORIGINAL", label: "Orig" },
                      { id: "MONO", label: "Mono" },
                      { id: "DUOTONE", label: "Duo" }
                    ]}
                    onChange={(v) => updateAdjust("colorMode", v)}
                  />
                </div>

                {s.adjust.colorMode === "DUOTONE" && (
                  <>
                    <ColorPickerRow
                      label="Shadow Color"
                      value={s.adjust.shadowColor}
                      onChange={(v) => updateAdjust("shadowColor", v)}
                    />
                    <ColorPickerRow
                      label="Highlight Color"
                      value={s.adjust.highlightColor}
                      onChange={(v) => updateAdjust("highlightColor", v)}
                    />
                  </>
                )}

                <ColorPickerRow
                  label="Background"
                  value={s.adjust.bgColor}
                  onChange={(v) => updateAdjust("bgColor", v)}
                />

                <SliderRow
                  label="Intensity"
                  value={s.adjust.intensity}
                  min={0.0}
                  max={2.0}
                  step={0.05}
                  onChange={(v) => updateAdjust("intensity", v)}
                />
              </div>

              <ActionButton variant="ghost" onClick={resetAllAdjust}>
                Reset All Adjustments
              </ActionButton>
            </div>
          </Section>

          {/* Section: PROCESSING */}
          <Section title="Processing" defaultOpen={false}>
            <div className="space-y-4">
              <Toggle
                label="Invert"
                value={s.processing.invert}
                onChange={(v) => updateProcessing("invert", v)}
              />
              <SliderRow
                label="Scale"
                value={s.processing.scale}
                min={0.25}
                max={2.0}
                step={0.05}
                onChange={(v) => updateProcessing("scale", v)}
              />
              <Toggle
                label="Flip H"
                value={s.processing.flipH}
                onChange={(v) => updateProcessing("flipH", v)}
              />
              <Toggle
                label="Flip V"
                value={s.processing.flipV}
                onChange={(v) => updateProcessing("flipV", v)}
              />
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Rotate</label>
                <SegButton
                  value={s.processing.rotate}
                  options={[
                    { id: "0°", label: "0°" },
                    { id: "90°", label: "90°" },
                    { id: "180°", label: "180°" },
                    { id: "270°", label: "270°" }
                  ]}
                  onChange={(v) => updateProcessing("rotate", v)}
                />
              </div>
              <SliderRow
                label="Edge Pad"
                value={s.processing.edgePad}
                min={0}
                max={64}
                format={(v) => `${v}px`}
                onChange={(v) => updateProcessing("edgePad", v)}
              />
            </div>
          </Section>

          {/* Section: POST-PROCESS */}
          <Section title="Post-Process" defaultOpen={false}>
            <div className="space-y-4">
              <SliderRow
                label="Blur"
                value={s.post.blur}
                min={0}
                max={20}
                format={(v) => `${v}px`}
                onChange={(v) => updatePost("blur", v)}
              />
              <SliderRow
                label="Vignette"
                value={s.post.vignette}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={(v) => updatePost("vignette", v)}
              />
              <SliderRow
                label="Grain"
                value={s.post.grain}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={(v) => updatePost("grain", v)}
              />
              <SliderRow
                label="Scanlines"
                value={s.post.scanlines}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={(v) => updatePost("scanlines", v)}
              />
              <SliderRow
                label="Chroma AB"
                value={s.post.chromaAb}
                min={0}
                max={20}
                format={(v) => `${v}px`}
                onChange={(v) => updatePost("chromaAb", v)}
              />
              <SliderRow
                label="Pixelate"
                value={s.post.pixelate}
                min={1}
                max={64}
                format={(v) => `${v}px`}
                onChange={(v) => updatePost("pixelate", v)}
              />
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Blend Mode</label>
                <select
                  value={s.post.blendMode}
                  onChange={(e) => updatePost("blendMode", e.target.value as any)}
                  className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground"
                >
                  <option value="Normal">Normal</option>
                  <option value="Screen">Screen</option>
                  <option value="Multiply">Multiply</option>
                  <option value="Overlay">Overlay</option>
                  <option value="Add">Add</option>
                  <option value="Difference">Difference</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Section: EXPORT */}
          <Section title="Export" defaultOpen={true}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">Format</label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex w-full gap-1">
                    {(["PNG", "JPEG", "GIF", "MP4"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setS((prev) => ({ ...prev, exportFormat: f }))}
                        className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-mono border text-center transition-all ${
                          s.exportFormat === f
                            ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                            : "bg-control text-foreground border-border hover:bg-control-hover"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="flex w-full gap-1">
                    {(["SVG", "TXT", "THREE.JS"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setS((prev) => ({ ...prev, exportFormat: f }))}
                        className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-mono border text-center transition-all ${
                          s.exportFormat === f
                            ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                            : "bg-control text-foreground border-border hover:bg-control-hover"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Format-specific controls */}
              {s.exportFormat === "JPEG" && (
                <SliderRow
                  label="Quality"
                  value={s.exportQuality}
                  min={10}
                  max={100}
                  onChange={(v) => setS((p) => ({ ...p, exportQuality: v }))}
                />
              )}

              {s.exportFormat === "GIF" && (
                <>
                  <SliderRow
                    label="GIF FPS"
                    value={s.gifFps}
                    min={1}
                    max={30}
                    onChange={(v) => setS((p) => ({ ...p, gifFps: v }))}
                  />
                  <Toggle
                    label="Loop"
                    value={s.gifLoop}
                    onChange={(v) => setS((p) => ({ ...p, gifLoop: v }))}
                  />
                  <Toggle
                    label="Dither"
                    value={s.gifDither}
                    onChange={(v) => setS((p) => ({ ...p, gifDither: v }))}
                  />
                </>
              )}

              {s.exportFormat === "MP4" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">FPS</label>
                    <SegButton
                      value={String(s.mp4Fps)}
                      options={[
                        { id: "24", label: "24" },
                        { id: "30", label: "30" },
                        { id: "60", label: "60" }
                      ]}
                      onChange={(v) => setS((p) => ({ ...p, mp4Fps: Number(v) }))}
                    />
                  </div>
                  <SliderRow
                    label="Quality"
                    value={s.mp4Quality}
                    min={1}
                    max={10}
                    onChange={(v) => setS((p) => ({ ...p, mp4Quality: v }))}
                  />
                </>
              )}

              {s.exportFormat === "TXT" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Char Width</label>
                  <input
                    type="number"
                    value={s.charWidth}
                    onChange={(e) => setS((p) => ({ ...p, charWidth: Math.max(10, Math.min(500, Number(e.target.value) || 80)) }))}
                    className="w-full bg-control border border-border px-3 py-2 text-xs font-mono text-foreground outline-none text-right"
                  />
                </div>
              )}

              {s.exportFormat === "THREE.JS" && (
                <>
                  <SliderRow
                    label="Plane Size"
                    value={s.threePlaneSize}
                    min={1}
                    max={20}
                    onChange={(v) => setS((p) => ({ ...p, threePlaneSize: v }))}
                  />
                  <ColorPickerRow
                    label="BG Color"
                    value={s.threeBgColor}
                    onChange={(v) => setS((p) => ({ ...p, threeBgColor: v }))}
                  />
                  <Toggle
                    label="Auto Rotate"
                    value={s.threeAutoRotate}
                    onChange={(v) => setS((p) => ({ ...p, threeAutoRotate: v }))}
                  />
                </>
              )}

              {/* Resolution Multiplexer */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Resolution</label>
                <SegButton
                  value={String(s.exportMultiplier)}
                  options={[
                    { id: "1", label: "1×" },
                    { id: "2", label: "2×" },
                    { id: "3", label: "3×" }
                  ]}
                  onChange={(v) => setS((p) => ({ ...p, exportMultiplier: Number(v) }))}
                />
              </div>

              {/* Export Trigger Button */}
              <ActionButton variant="primary" onClick={handleExport}>
                {exporting ? (exportProgress || "Exporting...") : `Export ${s.exportFormat}`}
              </ActionButton>
            </div>
          </Section>

        </div>
      </aside>
    </div>
  );
}
