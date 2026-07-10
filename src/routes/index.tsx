import { useRef, useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BrandCanvas,
  type BrandState,
  type Zone,
  type Stroke,
  type Tool,
  PALETTES,
  SIZE_PRESETS,
  defaultBrandState,
} from "@/components/brand-canvas";
import { Section, Toggle, ActionButton } from "@/components/ui/section";
import { SliderRow } from "@/components/ui/slider-row";
import {
  startTrackingLoop,
  stopTrackingLoop,
  renderOverlays,
  hexToRgba,
  getTrackedBlobs,
} from "@/lib/motionTrack";
import { EffectsTab } from "@/effects/effectsTab";
import { exportVideoFast } from "@/lib/exportVideo";
import { exportEffect } from "@/effects/exportEffects";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brand Assets Generator" },
      { name: "description", content: "Generate editorial brand imagery with chains, detection, drawing, hero layouts, and pixelation zones." },
      { property: "og:title", content: "Brand Assets Generator" },
      { property: "og:description", content: "Browser-based brand asset generator." },
    ],
  }),
  component: Index,
});

const TABS = ["Circle Mapping", "Drawing Studio", "Geo-Generator", "Hero Compositions", "Motion Track", "Effects"] as const;
type Tab = typeof TABS[number];

const PRESET_IMAGES: { url: string; label: string }[] = [
  { url: "/mj_image_02.webp", label: "Midnight Portrait" },
  { url: "/mj_image_03.webp", label: "Neon Abstract" },
  { url: "/mj_image_16.webp", label: "Glass Structure" },
  { url: "/mj_image_22.webp", label: "Minimalist Geometry" },
];

const PRESET_VIDEOS: { url: string; label: string }[] = [
  { url: "/elon.mp4", label: "Elon Musk" },
  { url: "/media1.mp4", label: "Dance Movement (Large)" },
  { url: "/media2.mp4", label: "Action Sequence 1" },
  { url: "/media3.mp4", label: "Action Sequence 2" },
  { url: "/media4.mp4", label: "Action Sequence 3" },
  { url: "/media5.mp4", label: "Crowd / Flow" },
];

const TAB_PRESETS: Record<Tab, Partial<BrandState>> = {
  "Circle Mapping": {
    mode: "circle-mapping",
    chainOn: true, detectionOn: false,
    geoPattern: "detection",
    imageSrc: PRESET_IMAGES[0].url,
    heroTitle: "", heroBarOn: false,
    tool: "pixelate",
  },
  "Drawing Studio": {
    mode: "drawing-studio",
    chainOn: false, detectionOn: false,
    geoPattern: "detection",
    frameOn: true, showCrosshair: true, gridOn: true,
    imageSrc: null,
    frameText: "Drawing Studio",
    paletteId: "bow",
    heroTitle: "", heroBarOn: false,
    tool: "brush", brushSize: 20, brushColor: "ink",
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
  },
  "Geo-Generator": {
    mode: "geo-generator",
    chainOn: false, detectionOn: true,
    geoPattern: "radial", geoDensity: 36, geoRotation: 0,
    blockSize: 14, threshold: 28, maxCircles: 120, minDistance: 30,
    minRadius: 3, maxRadius: 18, maxDistance: 170, lineWeight: 0.6,
    imageSrc: PRESET_IMAGES[1].url, paletteId: "gold",
    heroTitle: "", heroBarOn: false,
    tool: "pixelate",
  },
  "Hero Compositions": {
    mode: "hero-compositions",
    chainOn: true, detectionOn: true, intersectionsOn: true,
    chainCount: 9, baseRadius: 280, sizeRatio: 0.88,
    maxCircles: 60, blockSize: 18, threshold: 35,
    imageSrc: PRESET_IMAGES[2].url, paletteId: "wob",
    sizeId: "story",
    heroTitle: "STUDIO", heroSubtitle: "Brand · System · 2026",
    heroTitleSize: 140, heroLayout: "stacked-bottom", heroBarOn: true,
    tool: "pixelate",
  },
  "Motion Track": {
    mode: "motion-track",
  },
  "Effects": {
    mode: "effects",
  },
};

const motionTrackDefaults = {
  // Source
  sourceMode: "UPLOAD" as "WEBCAM" | "UPLOAD",
  flipH: false,
  loop: true,

  // Detection CV Settings
  threshold: 127,
  blur: 2,
  dilate: 1,
  persistence: 8,
  diffMode: false,
  invertMask: false,

  // Detection
  minArea: 10,
  maxArea: 500,
  maxBlobs: 50,
  resolution: 1.0,
  frameSkip: true,
  motionSmooth: 0.5,

  // Tracking overlays (Original)
  boxEnabled: true,
  boxStyle: "BRACKET" as "BRACKET" | "FULL" | "DASHED" | "XFRAME" | "GRID" | "PARTICLE" | "SCOPE" | "WIN2K",
  boxPadding: 0,
  boxWidth: 2,
  boxColor: "#ffffff",
  boxOpacity: 100,
  markerEnabled: false,
  markerStyle: "CROSS" as "CROSS" | "RETICLE" | "DOT" | "DIAMOND",
  markerSize: 24,
  markerColor: "#ffffff",
  markerOpacity: 100,

  // Connections (Original)
  connectionsEnabled: true,
  connectionMode: "ALL PAIRS" as "ALL PAIRS" | "NEAREST" | "CHAIN" | "HUB CENTER" | "RADIAL",
  connectionMaxDist: "auto" as string | number,
  lineStyle: "STRAIGHT" as "STRAIGHT" | "CURVED" | "DASHED",
  curveTension: 0.3,
  connectionWidth: 1,
  connectionColor: "#ffffff",
  connectionOpacity: 80,
  hubX: 50,
  hubY: 50,
  animateLines: false,
  animateSpeed: 1,

  // Trail
  trailEnabled: true,
  trailMode: "SPATIAL" as "SPATIAL" | "TEMPORAL",
  trailLength: 30,
  lineSmooth: 8,
  trailColor: "#ffffff",
  trailWidth: 1,
  trailOpacity: 70,
  trailFade: "LINEAR" as "LINEAR" | "EXPONENTIAL" | "NONE",

  // Circles
  circlesEnabled: false,
  circleAnchor: "CENTROID" as "CENTROID" | "BOX CENTER" | "CANVAS CENTER",
  chainCount: 3,
  chainAngle: 45,
  baseRadius: 80,
  sizeRatio: 0.7,
  chainSpacing: 60,
  circleStroke: true,
  circleStrokeWidth: 1,
  circleStrokeColor: "#ffffff",
  circleStrokeOpacity: 90,
  circleFill: false,
  circleFillColor: "#ffffff",
  circleFillOpacity: 15,
  showCenterDot: true,
  centerDotRadius: 4,

  // Frame
  frameEnabled: false,
  crosshairEnabled: false,
  crosshairOpacity: 60,
  crosshairColor: "#ffffff",
  tickMarks: false,
  borderEnabled: false,
  borderStyle: "CORNERS" as "FULL" | "CORNERS",
  borderWidth: 1,
  borderColor: "#ffffff",
  borderOpacity: 80,
  frameTextEnabled: false,
  frameText: "BRAND-001",
  frameTextPosition: "BOTTOM LEFT" as "TOP LEFT" | "TOP RIGHT" | "BOTTOM LEFT" | "BOTTOM RIGHT",
  frameTextSize: 11,
  frameTextColor: "#ffffff",
  frameTextOpacity: 70,

  // Effects
  scanEnabled: false,
  scanDensity: 4,
  scanOpacity: 20,
  scanColor: "#000000",
  scanAnimate: false,
  vignetteEnabled: false,
  vignetteIntensity: 40,
  vignetteColor: "#000000",
  vignetteSize: 70,
  grainEnabled: false,
  grainAmount: 25,
  grainSize: 1,
  grainOpacity: 20,

  // Labels
  labelsEnabled: false,
  labelContent: "INDEX" as "INDEX" | "AREA" | "POSITION" | "VELOCITY" | "CUSTOM",
  labelFontSize: 10,
  labelColor: "#ffffff",
  labelPosition: "ABOVE BOX" as "ABOVE BOX" | "INSIDE TOP" | "AT CENTROID" | "BELOW BOX",
  labelText: "BRAND-001",

  // Global
  videoOpacity: 100,
  gridEnabled: false,
  gridOpacity: 30,
  metricsEnabled: false,
  statusEnabled: true,

  // Export
  recordFPS: 30,
  recordBitrate: 8,
  exportMultiplier: 1,
  targetWidth: 1280,
  targetHeight: 720,

  // ─────────────────────────────────────────────────────────────
  // BabyTrack Extension Keys
  // ─────────────────────────────────────────────────────────────
  regionStyles: undefined as string[] | undefined,
  filters: [] as string[],
  filterInvert: false,
  crazyColors: false,
  separateColors: false,
  blinkOn: false,
  color: "#ffffff",
  linesOn: false,
  lineMode: "all" as "all" | "nearest" | "chain" | "hub",
  lineDashed: false,
  connectionRate: 0.25,
  centerHub: false,
  maxDist: 600,
  lineWidth: 1,
  lineColor: "#ffffff",
  lineOpacity: 70,
  textOn: true,
  textPos: "center" as "center" | "top" | "bottom",
  textContent: "count" as "random" | "position" | "count",
  fontSize: 12,
  shape: "square" as "square" | "circle" | "capsule",
  debugHud: false,
  bgColor: "",
  showSource: true,
};

const MOTION_TRACK_PRESETS: Record<string, Partial<typeof motionTrackDefaults>> = {
  Default: {
    threshold: 127,
    blur: 2,
    dilate: 1,
    persistence: 8,
    diffMode: false,
    invertMask: false,
    boxEnabled: true,
    boxStyle: "BRACKET",
    boxColor: "#ffffff",
    boxOpacity: 100,
    markerEnabled: false,
    connectionsEnabled: true,
    connectionMode: "ALL PAIRS",
    connectionColor: "#ffffff",
    trailEnabled: true,
    circlesEnabled: false,
    frameEnabled: false,
    scanEnabled: false,
    vignetteEnabled: false,
    grainEnabled: false,
    labelsEnabled: false,
    metricsEnabled: false,
    statusEnabled: true,
    videoOpacity: 100,
    regionStyles: undefined,
    filters: [],
    linesOn: false,
    bgColor: "",
    showSource: true,
  },
  Surveillance: {
    threshold: 130,
    blur: 3,
    dilate: 2,
    persistence: 12,
    diffMode: false,
    invertMask: false,
    boxEnabled: true,
    boxStyle: "BRACKET",
    boxColor: "#ff3333",
    boxOpacity: 100,
    markerEnabled: true,
    markerStyle: "RETICLE",
    markerColor: "#ff3333",
    markerOpacity: 90,
    crosshairEnabled: true,
    crosshairColor: "#ff3333",
    crosshairOpacity: 50,
    scanEnabled: true,
    scanDensity: 5,
    scanOpacity: 30,
    scanColor: "#000000",
    vignetteEnabled: true,
    vignetteIntensity: 70,
    vignetteColor: "#000000",
    grainEnabled: true,
    grainOpacity: 25,
    frameEnabled: true,
    borderEnabled: true,
    borderStyle: "CORNERS",
    borderColor: "#ff3333",
    frameTextEnabled: true,
    frameText: "REC - SURVEILLANCE CAM_04",
    frameTextColor: "#ff3333",
    labelsEnabled: true,
    labelContent: "POSITION",
    labelColor: "#ff3333",
    labelPosition: "ABOVE BOX",
    connectionsEnabled: false,
    videoOpacity: 80,
    regionStyles: undefined,
    filters: [],
    linesOn: false,
    bgColor: "",
    showSource: true,
  },
  Plexus: {
    threshold: 120,
    blur: 1,
    dilate: 1,
    persistence: 6,
    diffMode: false,
    invertMask: false,
    boxEnabled: false,
    markerEnabled: false,
    connectionsEnabled: true,
    connectionMode: "ALL PAIRS",
    connectionColor: "#00e5ff",
    connectionOpacity: 90,
    connectionWidth: 1,
    trailEnabled: true,
    trailColor: "#00e5ff",
    trailOpacity: 80,
    trailWidth: 1.5,
    videoOpacity: 35,
    labelsEnabled: false,
    frameEnabled: false,
    regionStyles: [],
    linesOn: true,
    lineMode: "all",
    color: "#ffffff",
    lineColor: "#ffffff",
    lineWidth: 1,
    lineOpacity: 70,
    filters: [],
    bgColor: "",
    showSource: true,
  },
  Hub: {
    threshold: 125,
    blur: 2,
    dilate: 1,
    persistence: 8,
    diffMode: false,
    invertMask: false,
    boxEnabled: true,
    boxStyle: "BRACKET",
    boxColor: "#ffea00",
    boxOpacity: 90,
    markerEnabled: true,
    markerStyle: "DOT",
    markerColor: "#ffea00",
    markerOpacity: 100,
    connectionsEnabled: true,
    connectionMode: "HUB CENTER",
    connectionColor: "#ffea00",
    connectionOpacity: 80,
    hubX: 50,
    hubY: 50,
    animateLines: true,
    animateSpeed: 1.2,
    videoOpacity: 50,
    labelsEnabled: false,
    regionStyles: ["basic"],
    linesOn: true,
    lineMode: "hub",
    centerHub: true,
    lineColor: "#ffffff",
    lineWidth: 1,
    lineOpacity: 70,
    color: "#ffffff",
    filters: [],
    bgColor: "",
    showSource: true,
  },
  Glitch: {
    threshold: 140,
    blur: 4,
    dilate: 2,
    persistence: 15,
    diffMode: false,
    invertMask: false,
    boxEnabled: true,
    boxStyle: "PARTICLE",
    boxColor: "#d500f9",
    boxOpacity: 90,
    trailEnabled: true,
    trailColor: "#d500f9",
    trailMode: "TEMPORAL",
    trailFade: "EXPONENTIAL",
    trailLength: 45,
    grainEnabled: true,
    grainOpacity: 40,
    grainAmount: 50,
    scanEnabled: true,
    scanDensity: 2,
    scanOpacity: 35,
    scanAnimate: true,
    videoOpacity: 100,
    filters: ["glitch", "inv"],
    regionStyles: ["label"],
    color: "#ffffff",
    lineColor: "#a3a3a3",
    connectionsEnabled: false,
    linesOn: false,
    bgColor: "",
    showSource: true,
  },
  Thermal: {
    threshold: 80,
    blur: 3,
    dilate: 1,
    persistence: 8,
    diffMode: true,
    invertMask: true,
    boxEnabled: true,
    boxStyle: "GRID",
    boxColor: "#ff6d00",
    boxOpacity: 75,
    connectionsEnabled: true,
    connectionMode: "NEAREST",
    connectionColor: "#ff3d00",
    vignetteEnabled: true,
    vignetteIntensity: 80,
    vignetteColor: "#00a22",
    scanEnabled: true,
    scanColor: "#ff3d00",
    scanOpacity: 15,
    videoOpacity: 100,
    filters: ["thermal"],
    regionStyles: ["frame"],
    color: "#ffffff",
    linesOn: false,
    bgColor: "",
    showSource: true,
  },
  Win2K: {
    threshold: 127,
    blur: 2,
    dilate: 1,
    persistence: 10,
    diffMode: false,
    invertMask: false,
    boxEnabled: true,
    boxStyle: "WIN2K",
    boxPadding: 4,
    resolution: 0.7,
    motionSmooth: 0.4,
    labelsEnabled: true,
    labelContent: "INDEX",
    labelColor: "#000000",
    labelPosition: "BELOW BOX",
    frameEnabled: true,
    borderEnabled: true,
    borderStyle: "FULL",
    borderColor: "#808080",
    frameTextEnabled: true,
    frameText: "Windows 2000 Pro [Active System Monitoring]",
    frameTextColor: "#ffffff",
    frameTextPosition: "TOP LEFT",
    statusEnabled: true,
    videoOpacity: 100,
    regionStyles: ["win2k", "label2"],
    color: "#ffffff",
    linesOn: false,
    bgColor: "",
    showSource: true,
  },
  "BabyTrack Default": {
    threshold: 127,
    blur: 2,
    dilate: 1,
    persistence: 8,
    diffMode: false,
    invertMask: false,
    boxEnabled: true,
    boxStyle: "BRACKET",
    boxColor: "#ffffff",
    boxOpacity: 100,
    markerEnabled: false,
    connectionsEnabled: false,
    trailEnabled: false,
    videoOpacity: 100,
    regionStyles: ["basic"],
    filters: [],
    linesOn: false,
    color: "#ffffff",
    textOn: true,
    textContent: "count",
    fontSize: 12,
    shape: "square",
    bgColor: "#000000",
    showSource: true,
  },
};

function makeStateForTab(tab: Tab): BrandState {
  return { ...defaultBrandState, ...TAB_PRESETS[tab] } as BrandState;
}

function ColorPickerRow({
  label,
  value,
  onChange,
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

function FullWidthPillGroup<T extends string>({
  value,
  options,
  onChange,
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

interface Snapshot { state: BrandState; zones: Zone[]; strokes: Stroke[] }

function SegButton<T extends string>({
  value, options, onChange,
}: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
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

function Index() {
  const [tab, setTab] = useState<Tab>("Circle Mapping");
  const [s, setS] = useState<BrandState>(() => makeStateForTab("Circle Mapping"));
  const [zones, setZones] = useState<Zone[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [playbackActive, setPlaybackActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Pan / zoom state ──────────────────────────────────────────────────────
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [mtZoom, setMtZoom] = useState(1);
  const [mtPan, setMtPan] = useState({ x: 0, y: 0 });

  const resetView = () => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); };
  const resetMtView = () => { setMtZoom(1); setMtPan({ x: 0, y: 0 }); };

  // Motion Track states
  const [mtConfig, setMtConfig] = useState(motionTrackDefaults);
  const isPresetActive = (name: string) => {
    const preset = MOTION_TRACK_PRESETS[name];
    if (!preset) return false;
    return Object.entries(preset).every(([key, val]) => (mtConfig as any)[key] === val);
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(() => ({ name: "elon.mp4", size: 0 } as File));
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>("/elon.mp4");
  const [presetVideoPath, setPresetVideoPath] = useState<string | null>("/elon.mp4");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1" | "4:3">("16:9");

  // MediaRecorder states
  const [isRecording, setIsRecording] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0); // 0-100
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Extended multi-format export states
  const [mtExportFormat, setMtExportFormat] = useState<"PNG" | "JPEG" | "WEBP" | "GIF" | "MP4">("PNG");
  const [mtIsExporting, setMtIsExporting] = useState(false);
  const [mtExportProgressLabel, setMtExportProgressLabel] = useState("");
  const [generalExporting, setGeneralExporting] = useState(false);
  const [generalExportProgress, setGeneralExportProgress] = useState("");

  const exportCanvasMedia = async (format: "GIF" | "MP4") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGeneralExporting(true);
    setGeneralExportProgress("Preparing...");
    try {
      await exportEffect(
        format,
        canvas,
        canvas,
        {
          gifFps: 15,
          gifLoop: true,
          gifDither: true,
          mp4Fps: 30,
          mp4Quality: 7,
        },
        (rec, prog) => setGeneralExportProgress(rec ? prog : "")
      );
    } catch (e: any) {
      alert("Export failed: " + e.message);
    } finally {
      setGeneralExporting(false);
      setGeneralExportProgress("");
    }
  };

  const handleMtExport = async () => {
    const src = overlayCanvasRef.current;
    if (!src) return;

    setMtIsExporting(true);
    setMtExportProgressLabel("Exporting...");

    try {
      if (mtExportFormat === "PNG") {
        exportMotionPNG(mtConfig.exportMultiplier);
      } else if (mtExportFormat === "JPEG") {
        exportJPEG(mtConfig.exportMultiplier);
      } else if (mtExportFormat === "WEBP") {
        exportWebP(mtConfig.exportMultiplier);
      } else if (mtExportFormat === "MP4") {
        if (mtConfig.sourceMode === "UPLOAD" && uploadedVideoUrl && videoRef.current) {
          await exportVideoFast({
            video: videoRef.current,
            config: { ...mtConfig, aspectRatio },
            fps: mtConfig.recordFPS || 30,
            bitrate: (mtConfig.recordBitrate || 8) * 1_000_000,
            onProgress: (pct) => setMtExportProgressLabel(`Exporting… ${pct}%`),
          });
        } else {
          await exportEffect(
            "MP4",
            src,
            src,
            {
              mp4Fps: mtConfig.recordFPS || 30,
              mp4Quality: mtConfig.recordBitrate || 7,
            },
            (rec, prog) => setMtExportProgressLabel(rec ? prog : "")
          );
        }
      } else if (mtExportFormat === "GIF") {
        await exportEffect(
          "GIF",
          src,
          src,
          {
            gifFps: 15,
            gifLoop: true,
            gifDither: true,
          },
          (rec, prog) => setMtExportProgressLabel(rec ? prog : "")
        );
      }
    } catch (err: any) {
      alert("Export failed: " + (err?.message ?? String(err)));
    } finally {
      setMtIsExporting(false);
      setMtExportProgressLabel("");
    }
  };

  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const updateMt = <K extends keyof typeof motionTrackDefaults>(
    k: K,
    v: typeof motionTrackDefaults[K]
  ) => {
    setMtConfig((prev) => ({ ...prev, [k]: v }));
  };

  const handleAspectRatioChange = (ratio: "16:9" | "1:1" | "4:3") => {
    setAspectRatio(ratio);
    if (ratio === "16:9") {
      updateMt("targetWidth", 1280);
      updateMt("targetHeight", 720);
    } else if (ratio === "1:1") {
      updateMt("targetWidth", 800);
      updateMt("targetHeight", 800);
    } else if (ratio === "4:3") {
      updateMt("targetWidth", 1067);
      updateMt("targetHeight", 800);
    }
  };

  const startWebcam = async () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      setWebcamStream(null);
      return;
    }
    try {
      setWebcamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      setWebcamStream(stream);
    } catch (err: any) {
      console.error(err);
      setWebcamError(err.message || "Failed to start camera");
    }
  };

  const handleVideoUpload = (file: File) => {
    if (uploadedVideoUrl && uploadedVideoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setPresetVideoPath(null);
    updateMt("sourceMode", "UPLOAD");
  };

  const handleSelectPresetVideo = (url: string) => {
    if (webcamStream) {
      stopWebcam();
    }
    if (uploadedVideoUrl && uploadedVideoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    setPresetVideoPath(url);
    setUploadedFile({ name: url.substring(1), size: 0 } as File);
    setUploadedVideoUrl(url);
    updateMt("sourceMode", "UPLOAD");
  };

  const removeVideo = () => {
    if (uploadedVideoUrl && uploadedVideoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    setUploadedFile(null);
    setUploadedVideoUrl(null);
    setPresetVideoPath(null);
    setVideoPlaying(false);
    setVideoDuration(0);
    setVideoCurrentTime(0);
  };

  const onVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrentTime(videoRef.current.currentTime);
    }
  };

  const onVideoDurationChange = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const onVideoPlay = () => setVideoPlaying(true);
  const onVideoPause = () => setVideoPlaying(false);

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const startRecording = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    recordedChunksRef.current = [];
    const fps = mtConfig.recordFPS || 30;
    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) : (canvas as any).mozCaptureStream?.(fps);
    
    if (!stream) {
      alert("Canvas stream capture not supported in this browser.");
      return;
    }

    const bps = (mtConfig.recordBitrate || 8) * 1000000;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp9",
        videoBitsPerSecond: bps
      });
    } catch (e) {
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: "video/webm",
          videoBitsPerSecond: bps
        });
      } catch (e2) {
        alert("MediaRecorder not supported or format not supported.");
        return;
      }
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brand-motion-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      recordedChunksRef.current = [];
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setRecordDuration(0);

    const startTime = Date.now();
    recordTimerRef.current = setInterval(() => {
      setRecordDuration((Date.now() - startTime) / 1000);
    }, 100);
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // One-click "Export Video" — frame-by-frame offline render (no real-time playback needed)
  const exportVideoAuto = async () => {
    const video = videoRef.current;
    if (!video || !uploadedVideoUrl) return;

    if (!('VideoEncoder' in window)) {
      alert(
        "Fast video export requires the WebCodecs API (Chrome 94+ / Edge 94+).\n" +
        "Your browser doesn't support it. Please use Chrome."
      );
      return;
    }

    setIsExportingVideo(true);
    setExportProgress(0);

    try {
      await exportVideoFast({
        video,
        config: { ...mtConfigRef.current, aspectRatio },
        fps: mtConfigRef.current.recordFPS || 30,
        bitrate: (mtConfigRef.current.recordBitrate || 8) * 1_000_000,
        onProgress: setExportProgress,
      });
    } catch (err: any) {
      alert("Export failed: " + (err?.message ?? String(err)));
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${ms}`;
  };

  const exportMotionPNG = (multiplier: number) => {
    const src = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!src || !video) return;

    const out = document.createElement("canvas");
    out.width = src.width * multiplier;
    out.height = src.height * multiplier;
    const outCtx = out.getContext("2d");
    if (!outCtx) return;

    outCtx.save();
    outCtx.scale(multiplier, multiplier);
    
    const activeBlobs = getTrackedBlobs();
    renderOverlays(outCtx, src, video, activeBlobs, mtConfig, 60); 
    outCtx.restore();

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brand-motion-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // Sync state for tab tracking loop and webcam management
  const mtConfigRef = useRef(mtConfig);
  mtConfigRef.current = mtConfig;

  const handleSourceModeChange = (mode: "WEBCAM" | "UPLOAD") => {
    updateMt("sourceMode", mode);
    if (mode === "UPLOAD") {
      if (webcamStream) {
        webcamStream.getTracks().forEach((t) => t.stop());
        setWebcamStream(null);
      }
    }
  };

  useEffect(() => {
    if (tab !== "Motion Track") {
      stopTrackingLoop();
      if (webcamStream) {
        webcamStream.getTracks().forEach((t) => t.stop());
        setWebcamStream(null);
      }
      return;
    }

    const videoEl = videoRef.current;
    const canvasEl = overlayCanvasRef.current;
    if (!videoEl || !canvasEl) return;

    if (mtConfig.sourceMode === "WEBCAM") {
      if (webcamStream) {
        if (videoEl.srcObject !== webcamStream) {
          videoEl.src = "";
          videoEl.srcObject = webcamStream;
          videoEl.play().catch(console.error);
        }
      } else {
        videoEl.srcObject = null;
        videoEl.src = "";
      }
    } else if (mtConfig.sourceMode === "UPLOAD") {
      if (uploadedVideoUrl) {
        if (videoEl.src !== uploadedVideoUrl) {
          videoEl.srcObject = null;
          videoEl.src = uploadedVideoUrl;
          if (videoPlaying) {
            videoEl.play().catch(console.error);
          }
        }
      } else {
        videoEl.src = "";
      }
    }

    const getConfig = () => ({
      ...mtConfigRef.current,
      aspectRatio,
    });
    startTrackingLoop(videoEl, canvasEl, getConfig);

    return () => {
      stopTrackingLoop();
    };
  }, [tab, webcamStream, mtConfig.sourceMode, uploadedVideoUrl, aspectRatio]);

  // Undo/redo history (covers state + zones + strokes)
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const skip = useRef(false);
  const drawingActive = useRef(false);

  const prevRef = useRef<Snapshot>({ state: s, zones, strokes });
  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      prevRef.current = { state: s, zones, strokes };
      return;
    }
    if (drawingActive.current) {
      // don't snapshot intermediate pen movements
      prevRef.current = { state: s, zones, strokes };
      return;
    }
    if (
      prevRef.current.state === s &&
      prevRef.current.zones === zones &&
      prevRef.current.strokes === strokes
    ) return;
    past.current.push(prevRef.current);
    if (past.current.length > 120) past.current.shift();
    future.current = [];
    prevRef.current = { state: s, zones, strokes };
  }, [s, zones, strokes]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ state: s, zones, strokes });
    skip.current = true;
    setS(prev.state); setZones(prev.zones); setStrokes(prev.strokes);
  }, [s, zones, strokes]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ state: s, zones, strokes });
    skip.current = true;
    setS(next.state); setZones(next.zones); setStrokes(next.strokes);
  }, [s, zones, strokes]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  const update = <K extends keyof BrandState>(k: K, v: BrandState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const switchTab = (t: Tab) => {
    setTab(t);
    setS(makeStateForTab(t));
    setZones([]);
    setStrokes([]);
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
    setMtZoom(1);
    setMtPan({ x: 0, y: 0 });
  };

  const clearCanvasAll = () => {
    setStrokes([]);
    setZones([]);
  };

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

  const randomizeAll = (withImage = false) => {
    setS((p) => ({
      ...p,
      imageOpacity: +rand(0.4, 1).toFixed(2),
      pixelSize: randInt(6, 32),
      zoneSize: randInt(50, 180),
      crosshairOpacity: +rand(0.2, 0.8).toFixed(2),
      chainCount: randInt(3, 12),
      chainAngle: randInt(0, 360),
      baseRadius: randInt(120, 320),
      sizeRatio: +rand(0.6, 0.95).toFixed(2),
      blockSize: randInt(10, 24),
      threshold: randInt(20, 50),
      maxCircles: randInt(40, 140),
      minDistance: randInt(20, 60),
      minRadius: randInt(3, 8),
      maxRadius: randInt(15, 40),
      sizeSeed: randInt(1, 999),
      maxDistance: randInt(80, 240),
      lineWeight: +rand(0.5, 1.4).toFixed(1),
      frameSizePct: randInt(40, 80),
      dashPattern: randInt(4, 14),
      starSize: randInt(0, 80),
      starPoints: randInt(2, 8),
      geoDensity: randInt(12, 48),
      geoRotation: randInt(0, 360),
      paletteId: PALETTES[randInt(0, PALETTES.length - 1)].id,
      imageSrc: withImage ? PRESET_IMAGES[randInt(0, PRESET_IMAGES.length - 1)].url : p.imageSrc,
    }));
  };

  const handleUpload = (file: File, key: "imageSrc" | "textureSrc") => {
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  const exportDrawingJSON = () => {
    const dataStr = JSON.stringify({
      version: "1.0",
      canvasSize: SIZE_PRESETS.find((p) => p.id === s.sizeId) ?? SIZE_PRESETS[0],
      palette: PALETTES.find((p) => p.id === s.paletteId) ?? PALETTES[0],
      strokes: strokes,
      zones: zones
    }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `drawing-studio-session-${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.strokes)) {
          setStrokes(parsed.strokes);
          if (parsed.zones) setZones(parsed.zones);
          if (parsed.canvasSize?.id) update("sizeId", parsed.canvasSize.id);
          if (parsed.palette?.id) update("paletteId", parsed.palette.id);
        } else {
          alert("Invalid drawing JSON file format.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    fileReader.readAsText(file);
  };

  const onStrokeStart = (st: Stroke) => {
    drawingActive.current = true;
    setStrokes((p) => [...p, st]);
  };
  const onStrokeExtend = (pt: { x: number; y: number }) => {
    setStrokes((p) => {
      if (p.length === 0) return p;
      const last = p[p.length - 1];
      return [...p.slice(0, -1), { ...last, pts: [...last.pts, pt] }];
    });
  };
  const onStrokeCommit = () => {
    drawingActive.current = false;
    // trigger a snapshot by replacing the strokes array reference
    setStrokes((p) => [...p]);
  };

  const exportPNG = (mult = 1) => {
    const src = tab === "Motion Track" ? overlayCanvasRef.current : canvasRef.current;
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = src.width * mult;
    out.height = src.height * mult;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = tab === "Motion Track" ? `brand-motion-${Date.now()}.png` : `brand-asset-${s.mode}-${Date.now()}.png`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const exportJPEG = (mult = 1, quality = 0.92) => {
    const src = tab === "Motion Track" ? overlayCanvasRef.current : canvasRef.current;
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = src.width * mult;
    out.height = src.height * mult;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = tab === "Motion Track" ? `brand-motion-${Date.now()}.jpg` : `brand-asset-${s.mode}-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/jpeg", quality);
  };

  const exportWebP = (mult = 1) => {
    const src = tab === "Motion Track" ? overlayCanvasRef.current : canvasRef.current;
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = src.width * mult;
    out.height = src.height * mult;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = tab === "Motion Track" ? `brand-motion-${Date.now()}.webp` : `brand-asset-${s.mode}-${Date.now()}.webp`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/webp", 0.92);
  };

  const exportSVGStub = () => {
    const src = canvasRef.current;
    if (!src) return;
    const data = src.toDataURL("image/png");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${src.width}" height="${src.height}"><image href="${data}" width="${src.width}" height="${src.height}"/></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `brand-asset-${s.mode}-${Date.now()}.svg`; a.click();
    URL.revokeObjectURL(url);
  };

  const preset = SIZE_PRESETS.find((p) => p.id === s.sizeId) ?? SIZE_PRESETS[0];
  const palette = PALETTES.find((p) => p.id === s.paletteId) ?? PALETTES[0];

  const setTool = (t: Tool) => update("tool", t);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground font-mono overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 h-12 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xs font-semibold tracking-[0.2em] uppercase">Brand Assets Generator</h1>
            <span className="text-[10px] text-muted-foreground">
              by <a href="https://grvx.dev" className="hover:text-foreground" target="_blank" rel="noreferrer">Gaurav Mandal</a>
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] border ${
                  tab === t ? "bg-foreground text-background border-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} title="Undo (⌘Z)" className="px-2 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Undo</button>
          <button onClick={redo} title="Redo (⌘⇧Z)" className="px-2 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Redo</button>
          <button onClick={() => exportPNG(1)} className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">PNG 1×</button>
          <button onClick={() => exportPNG(2)} className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">PNG 2×</button>
          <button onClick={exportSVGStub} className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">SVG</button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {tab === "Effects" && <EffectsTab isActive={tab === "Effects"} />}
        <div className={`contents ${tab === "Effects" ? "hidden" : ""}`}>
        <aside className="w-[320px] shrink-0 border-r border-border bg-surface overflow-y-auto">
          {tab === "Motion Track" ? (
            <div className="px-4 pt-4 pb-3 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tab}</p>
              
              {/* Presets Row */}
              <div className="space-y-1.5 border-t border-border pt-3">
                <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">Presets</label>
                <div className="grid grid-cols-4 gap-1">
                  {Object.keys(MOTION_TRACK_PRESETS).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const preset = MOTION_TRACK_PRESETS[p];
                        setMtConfig((prev) => ({ ...prev, ...preset }));
                      }}
                      className={`px-1 py-1 text-[9px] font-mono border text-center truncate uppercase tracking-wider rounded-[2px] transition-all ${
                        isPresetActive(p)
                          ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                          : "bg-control text-foreground border-border hover:bg-control-hover"
                      }`}
                      title={p}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-3 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tab}</p>
              {tab !== "Drawing Studio" && (
                <>
                  <ActionButton variant="primary" onClick={() => randomizeAll(false)}>Randomize All</ActionButton>
                  <ActionButton variant="primary" onClick={() => randomizeAll(true)}>Randomize All + Image</ActionButton>
                </>
              )}
            </div>
          )}

          {tab === "Motion Track" ? (
            <>
              <Section title="Source" defaultOpen={true}>
                <FullWidthPillGroup
                  value={mtConfig.sourceMode}
                  options={[
                    { id: "WEBCAM", label: "Webcam" },
                    { id: "UPLOAD", label: "Upload" },
                  ]}
                  onChange={handleSourceModeChange}
                />

                {mtConfig.sourceMode === "WEBCAM" && (
                  <div className="space-y-3 pt-2">
                    <ActionButton
                      variant={webcamStream ? "default" : "primary"}
                      onClick={startWebcam}
                    >
                      {webcamStream ? "■ Stop Camera" : "▶ Start Camera"}
                    </ActionButton>
                    {webcamError && (
                      <p className="text-[9px] text-red-500 font-mono">{webcamError}</p>
                    )}
                    <Toggle
                      label="Flip H"
                      value={mtConfig.flipH}
                      onChange={(v) => updateMt("flipH", v)}
                    />
                    <div className="text-[9px] text-muted-foreground font-mono">
                      Resolution: 1280 × 720
                    </div>
                  </div>
                )}

                {mtConfig.sourceMode === "UPLOAD" && (
                  <div className="space-y-3 pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp4,.webm,.mov"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file);
                      }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleVideoUpload(file);
                      }}
                      className="border border-dashed border-border rounded-[2px] p-5 text-center cursor-pointer hover:bg-control transition-colors"
                    >
                      <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider block">
                        {uploadedFile ? "Replace Video" : "DROP VIDEO / CLICK"}
                      </span>
                    </div>

                    <select
                      value={presetVideoPath ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          handleSelectPresetVideo(val);
                        } else {
                          removeVideo();
                        }
                      }}
                      className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground focus:outline-none"
                    >
                      <option value="">Select preset video…</option>
                      {PRESET_VIDEOS.map((v) => (
                        <option key={v.url} value={v.url}>
                          {v.label}
                        </option>
                      ))}
                    </select>

                    {uploadedFile && (
                      <div className="flex items-center justify-between px-2 py-1 bg-control text-[9px] font-mono border border-border">
                        <span className="truncate max-w-[180px]">{uploadedFile.name}</span>
                        <button
                          onClick={removeVideo}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          [×]
                        </button>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-baseline">
                        <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Scrubber</label>
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
                        disabled={!uploadedVideoUrl}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (videoRef.current) {
                            videoRef.current.currentTime = val;
                            setVideoCurrentTime(val);
                          }
                        }}
                      />
                      
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => {
                            if (videoRef.current) videoRef.current.currentTime = 0;
                          }}
                          disabled={!uploadedVideoUrl}
                          className="flex-1 py-1 text-[9px] font-mono border border-border bg-control hover:bg-control-hover disabled:opacity-50"
                        >
                          ◀◀
                        </button>
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              if (videoPlaying) videoRef.current.pause();
                              else videoRef.current.play().catch(console.error);
                            }
                          }}
                          disabled={!uploadedVideoUrl}
                          className="flex-1 py-1 text-[9px] font-mono border border-border bg-control hover:bg-control-hover disabled:opacity-50"
                        >
                          {videoPlaying ? "⏸" : "▶"}
                        </button>
                        <button
                          onClick={() => {
                            if (videoRef.current && videoDuration) videoRef.current.currentTime = videoDuration;
                          }}
                          disabled={!uploadedVideoUrl}
                          className="flex-1 py-1 text-[9px] font-mono border border-border bg-control hover:bg-control-hover disabled:opacity-50"
                        >
                          ▶▶
                        </button>
                      </div>

                      <div className="flex gap-1 justify-between mt-2">
                        {([0.25, 0.5, 1.0, 1.5, 2.0] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.playbackRate = r;
                                setPlaybackRate(r);
                              }
                            }}
                            className={`flex-1 py-1 text-[9px] font-mono border text-center ${
                              playbackRate === r
                                ? "bg-foreground text-background border-foreground"
                                : "bg-control text-foreground border-border hover:bg-control-hover"
                            }`}
                          >
                            {r}×
                          </button>
                        ))}
                      </div>

                      <Toggle
                        label="Loop"
                        value={mtConfig.loop}
                        onChange={(v) => updateMt("loop", v)}
                      />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Detection" defaultOpen={false}>
                <SliderRow
                  label="Threshold"
                  value={mtConfig.threshold}
                  min={0}
                  max={255}
                  onChange={(v) => updateMt("threshold", v)}
                />
                <SliderRow
                  label="Blur"
                  value={mtConfig.blur}
                  min={0}
                  max={10}
                  onChange={(v) => updateMt("blur", v)}
                />
                <SliderRow
                  label="Dilate"
                  value={mtConfig.dilate}
                  min={0}
                  max={6}
                  onChange={(v) => updateMt("dilate", v)}
                />
                <SliderRow
                  label="Persistence"
                  value={mtConfig.persistence}
                  min={0}
                  max={30}
                  onChange={(v) => updateMt("persistence", v)}
                />
                <Toggle
                  label="Diff Mode"
                  value={mtConfig.diffMode}
                  onChange={(v) => updateMt("diffMode", v)}
                />
                <Toggle
                  label="Invert Mask"
                  value={mtConfig.invertMask}
                  onChange={(v) => updateMt("invertMask", v)}
                />
                <hr className="border-border opacity-50" />
                <SliderRow
                  label="Min Area"
                  value={mtConfig.minArea}
                  min={1}
                  max={100}
                  onChange={(v) => updateMt("minArea", v)}
                />
                <SliderRow
                  label="Max Area"
                  value={mtConfig.maxArea}
                  min={100}
                  max={2000}
                  onChange={(v) => updateMt("maxArea", v)}
                />
                <SliderRow
                  label="Max Blobs"
                  value={mtConfig.maxBlobs}
                  min={1}
                  max={100}
                  onChange={(v) => updateMt("maxBlobs", v)}
                />
                <hr className="border-border opacity-50" />
                <SliderRow
                  label="Resolution"
                  value={mtConfig.resolution}
                  min={0.25}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateMt("resolution", v)}
                  format={(v) => `${v.toFixed(2)}x`}
                />
                <Toggle
                  label="Frame Skip"
                  value={mtConfig.frameSkip}
                  onChange={(v) => updateMt("frameSkip", v)}
                />
                <hr className="border-border opacity-50" />
                <SliderRow
                  label="Motion Smooth"
                  value={mtConfig.motionSmooth}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateMt("motionSmooth", v)}
                />
              </Section>

              <Section title="Tracking" defaultOpen={false}>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Box Style</label>
                  <SegButton
                    value={mtConfig.boxStyle}
                    options={[
                      { id: "BRACKET", label: "Bracket" },
                      { id: "FULL", label: "Full" },
                      { id: "DASHED", label: "Dashed" },
                      { id: "XFRAME", label: "X-Frame" },
                      { id: "GRID", label: "Grid" },
                      { id: "PARTICLE", label: "Particle" },
                      { id: "SCOPE", label: "Scope" },
                      { id: "WIN2K", label: "Win2K" },
                    ]}
                    onChange={(v) => updateMt("boxStyle", v)}
                  />
                </div>
                <Toggle
                  label="Box"
                  value={mtConfig.boxEnabled}
                  onChange={(v) => updateMt("boxEnabled", v)}
                />
                <SliderRow
                  label="Box Padding"
                  value={mtConfig.boxPadding}
                  min={-20}
                  max={60}
                  onChange={(v) => updateMt("boxPadding", v)}
                />
                <SliderRow
                  label="Line Width"
                  value={mtConfig.boxWidth}
                  min={0.5}
                  max={6}
                  step={0.1}
                  onChange={(v) => updateMt("boxWidth", v)}
                />
                <ColorPickerRow
                  label="Box Color"
                  value={mtConfig.boxColor}
                  onChange={(v) => updateMt("boxColor", v)}
                />
                <SliderRow
                  label="Box Opacity"
                  value={mtConfig.boxOpacity}
                  min={0}
                  max={100}
                  onChange={(v) => updateMt("boxOpacity", v)}
                />
                <hr className="border-border opacity-50" />
                <Toggle
                  label="Crosshair Marker"
                  value={mtConfig.markerEnabled}
                  onChange={(v) => updateMt("markerEnabled", v)}
                />
                {mtConfig.markerEnabled && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Marker Style</label>
                      <SegButton
                        value={mtConfig.markerStyle}
                        options={[
                          { id: "CROSS", label: "Cross" },
                          { id: "RETICLE", label: "Reticle" },
                          { id: "DOT", label: "Dot" },
                          { id: "DIAMOND", label: "Diamond" },
                        ]}
                        onChange={(v) => updateMt("markerStyle", v)}
                      />
                    </div>
                    <SliderRow
                      label="Marker Size"
                      value={mtConfig.markerSize}
                      min={10}
                      max={80}
                      onChange={(v) => updateMt("markerSize", v)}
                    />
                    <ColorPickerRow
                      label="Marker Color"
                      value={mtConfig.markerColor}
                      onChange={(v) => updateMt("markerColor", v)}
                    />
                    <SliderRow
                      label="Marker Opacity"
                      value={mtConfig.markerOpacity}
                      min={0}
                      max={100}
                      onChange={(v) => updateMt("markerOpacity", v)}
                    />
                  </div>
                )}
              </Section>

              <Section title="Connections" defaultOpen={false}>
                <Toggle
                  label="BabyTrack Lines"
                  value={mtConfig.linesOn}
                  onChange={(v) => updateMt("linesOn", v)}
                />
                {mtConfig.linesOn && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Mode</label>
                      <SegButton
                        value={mtConfig.lineMode}
                        options={[
                          { id: "all", label: "All" },
                          { id: "nearest", label: "Nearest" },
                          { id: "chain", label: "Chain" },
                          { id: "hub", label: "Hub" },
                        ]}
                        onChange={(v) => updateMt("lineMode", v)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Line Style</label>
                      <SegButton
                        value={mtConfig.lineStyle}
                        options={[
                          { id: "straight", label: "Straight" },
                          { id: "curve", label: "Curve" },
                          { id: "step", label: "Step" },
                          { id: "wave", label: "Wave" },
                        ]}
                        onChange={(v) => updateMt("lineStyle", v)}
                      />
                    </div>
                    <Toggle
                      label="Dashed Lines"
                      value={mtConfig.lineDashed}
                      onChange={(v) => updateMt("lineDashed", v)}
                    />
                    <SliderRow
                      label="Connection Rate"
                      value={mtConfig.connectionRate}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      onChange={(v) => updateMt("connectionRate", v)}
                    />
                    <SliderRow
                      label="Max Distance"
                      value={mtConfig.maxDist}
                      min={50}
                      max={1000}
                      onChange={(v) => updateMt("maxDist", v)}
                    />
                    <SliderRow
                      label="Line Width"
                      value={mtConfig.lineWidth}
                      min={0.5}
                      max={6}
                      step={0.1}
                      onChange={(v) => updateMt("lineWidth", v)}
                    />
                    <ColorPickerRow
                      label="Line Color"
                      value={mtConfig.lineColor}
                      onChange={(v) => updateMt("lineColor", v)}
                    />
                    <SliderRow
                      label="Line Opacity"
                      value={mtConfig.lineOpacity}
                      min={0}
                      max={100}
                      onChange={(v) => updateMt("lineOpacity", v)}
                    />
                  </div>
                )}
                <hr className="border-border opacity-50 my-2" />
                <Toggle
                  label="Original Connections"
                  value={mtConfig.connectionsEnabled}
                  onChange={(v) => updateMt("connectionsEnabled", v)}
                />
                {mtConfig.connectionsEnabled && !mtConfig.linesOn && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Mode</label>
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {["ALL PAIRS", "NEAREST", "CHAIN"].map((m) => (
                            <button
                              key={m}
                              onClick={() => updateMt("connectionMode", m as any)}
                              className={`flex-1 py-1.5 text-[9px] font-mono border uppercase tracking-[0.1em] text-center ${
                                mtConfig.connectionMode === m
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-control border-border hover:bg-control-hover"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {["HUB CENTER", "RADIAL"].map((m) => (
                            <button
                              key={m}
                              onClick={() => updateMt("connectionMode", m as any)}
                              className={`flex-1 py-1.5 text-[9px] font-mono border uppercase tracking-[0.1em] text-center ${
                                mtConfig.connectionMode === m
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-control border-border hover:bg-control-hover"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {(mtConfig.connectionMode === "HUB CENTER" || mtConfig.connectionMode === "RADIAL") && (
                      <div className="space-y-3 bg-control-hover/20 p-2 border border-border">
                        <SliderRow
                          label="Hub X"
                          value={mtConfig.hubX}
                          min={0}
                          max={100}
                          onChange={(v) => updateMt("hubX", v)}
                          format={(v) => `${v}%`}
                        />
                        <SliderRow
                          label="Hub Y"
                          value={mtConfig.hubY}
                          min={0}
                          max={100}
                          onChange={(v) => updateMt("hubY", v)}
                          format={(v) => `${v}%`}
                        />
                        <div className="text-[9px] text-muted-foreground font-mono uppercase text-center tracking-wider pt-1">
                          SHIFT + CLICK CANVAS TO SET HUB
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Line Style</label>
                      <SegButton
                        value={mtConfig.lineStyle}
                        options={[
                          { id: "STRAIGHT", label: "Straight" },
                          { id: "CURVED", label: "Curved" },
                          { id: "DASHED", label: "Dashed" },
                        ]}
                        onChange={(v) => updateMt("lineStyle", v)}
                      />
                    </div>

                    {mtConfig.lineStyle === "CURVED" && (
                      <SliderRow
                        label="Curve Tension"
                        value={mtConfig.curveTension}
                        min={-1.0}
                        max={1.0}
                        step={0.1}
                        onChange={(v) => updateMt("curveTension", v)}
                      />
                    )}

                    <SliderRow
                      label="Line Width"
                      value={mtConfig.connectionWidth}
                      min={0.5}
                      max={6}
                      step={0.1}
                      onChange={(v) => updateMt("connectionWidth", v)}
                    />

                    <ColorPickerRow
                      label="Line Color"
                      value={mtConfig.connectionColor}
                      onChange={(v) => updateMt("connectionColor", v)}
                    />

                    <SliderRow
                      label="Line Opacity"
                      value={mtConfig.connectionOpacity}
                      min={0}
                      max={100}
                      onChange={(v) => updateMt("connectionOpacity", v)}
                    />

                    <Toggle
                      label="Animate"
                      value={mtConfig.animateLines}
                      onChange={(v) => updateMt("animateLines", v)}
                    />

                    {mtConfig.animateLines && (
                      <SliderRow
                        label="Speed"
                        value={mtConfig.animateSpeed}
                        min={0.1}
                        max={5}
                        step={0.1}
                        onChange={(v) => updateMt("animateSpeed", v)}
                      />
                    )}
                  </div>
                )}
              </Section>

              <Section title="Region Styles & Shapes" defaultOpen={false}>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Shape</label>
                  <SegButton
                    value={mtConfig.shape}
                    options={[
                      { id: "square", label: "Square" },
                      { id: "circle", label: "Circle" },
                      { id: "capsule", label: "Capsule" },
                    ]}
                    onChange={(v) => updateMt("shape", v)}
                  />
                </div>
                <hr className="border-border opacity-50 my-2" />
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Region Styles</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      "basic", "cross", "label", "frame", "lframe", "xframe", "grid",
                      "particle", "dash", "scope", "win2k", "label2", "glow", "backdrop"
                    ].map((style) => {
                      const active = mtConfig.regionStyles?.includes(style) ?? false;
                      return (
                        <button
                          key={style}
                          onClick={() => {
                            const current = mtConfig.regionStyles || [];
                            const next = active
                              ? current.filter((x) => x !== style)
                              : [...current, style];
                            updateMt("regionStyles", next);
                          }}
                          className={`px-1 py-1 text-[8px] font-mono border text-center truncate uppercase tracking-wider rounded-[2px] transition-all ${
                            active
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-control text-foreground border-border hover:bg-control-hover"
                          }`}
                          title={style}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Toggle
                  label="Random Assignment"
                  value={mtConfig.random}
                  onChange={(v) => updateMt("random", v)}
                />
                <hr className="border-border opacity-50 my-2" />
                <div className="space-y-2">
                  <ColorPickerRow
                    label="Fill/Stroke Color"
                    value={mtConfig.color === "rainbow" ? "#ffffff" : mtConfig.color}
                    onChange={(v) => updateMt("color", v)}
                  />
                  <Toggle
                    label="Rainbow Colors"
                    value={mtConfig.color === "rainbow"}
                    onChange={(v) => updateMt("color", v ? "rainbow" : "#ffffff")}
                  />
                  <Toggle
                    label="Separate Colors"
                    value={mtConfig.separateColors}
                    onChange={(v) => updateMt("separateColors", v)}
                  />
                  <Toggle
                    label="Crazy Colors"
                    value={mtConfig.crazyColors}
                    onChange={(v) => updateMt("crazyColors", v)}
                  />
                  <Toggle
                    label="Blink Effect"
                    value={mtConfig.blinkOn}
                    onChange={(v) => updateMt("blinkOn", v)}
                  />
                </div>
              </Section>

              <Section title="Pixel Filters" defaultOpen={false}>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Active Filters</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      "inv", "glitch", "thermal", "pixel", "tone", "blur", "dither",
                      "zoom", "xray", "water", "mask", "crt", "edge"
                    ].map((f) => {
                      const active = mtConfig.filters?.includes(f) ?? false;
                      return (
                        <button
                          key={f}
                          onClick={() => {
                            const current = mtConfig.filters || [];
                            const next = active
                              ? current.filter((x) => x !== f)
                              : [...current, f];
                            updateMt("filters", next);
                          }}
                          className={`px-1 py-1 text-[8px] font-mono border text-center truncate uppercase tracking-wider rounded-[2px] transition-all ${
                            active
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-control text-foreground border-border hover:bg-control-hover"
                          }`}
                          title={f}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Toggle
                  label="Invert Filter Output"
                  value={mtConfig.filterInvert}
                  onChange={(v) => updateMt("filterInvert", v)}
                />
                <hr className="border-border opacity-50 my-2" />
                <div className="space-y-2">
                  <Toggle
                    label="Background Color"
                    value={!!mtConfig.bgColor}
                    onChange={(v) => updateMt("bgColor", v ? "#000000" : "")}
                  />
                  {!!mtConfig.bgColor && (
                    <ColorPickerRow
                      label="BG Color Value"
                      value={mtConfig.bgColor}
                      onChange={(v) => updateMt("bgColor", v)}
                    />
                  )}
                  <Toggle
                    label="Show Source Video"
                    value={mtConfig.showSource}
                    onChange={(v) => updateMt("showSource", v)}
                  />
                </div>
              </Section>

              <Section title="Text & HUD" defaultOpen={false}>
                <Toggle
                  label="Text / Label"
                  value={mtConfig.textOn}
                  onChange={(v) => updateMt("textOn", v)}
                />
                {mtConfig.textOn && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Text Content</label>
                      <SegButton
                        value={mtConfig.textContent}
                        options={[
                          { id: "count", label: "ID/Count" },
                          { id: "position", label: "Position" },
                          { id: "random", label: "Random" },
                        ]}
                        onChange={(v) => updateMt("textContent", v)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Text Position</label>
                      <SegButton
                        value={mtConfig.textPos}
                        options={[
                          { id: "top", label: "Top" },
                          { id: "center", label: "Center" },
                          { id: "bottom", label: "Bottom" },
                        ]}
                        onChange={(v) => updateMt("textPos", v)}
                      />
                    </div>
                    <SliderRow
                      label="Font Size"
                      value={mtConfig.fontSize}
                      min={8}
                      max={36}
                      onChange={(v) => updateMt("fontSize", v)}
                    />
                  </div>
                )}
                <hr className="border-border opacity-50 my-2" />
                <Toggle
                  label="Debug HUD"
                  value={mtConfig.debugHud}
                  onChange={(v) => updateMt("debugHud", v)}
                />
              </Section>
            </>
          ) : (
            <>
              {/* Tool section (clean and tab-specific) */}
              <Section title="Tool">
                <SegButton<Tool>
                  value={s.tool}
                  options={[
                    ...(tab !== "Drawing Studio" ? [{ id: "pixelate" as Tool, label: "Pixelate" }] : []),
                    { id: "brush", label: "Brush" },
                    { id: "eraser", label: "Eraser" },
                    { id: "line", label: "Line" },
                    { id: "rect", label: "Rect" },
                    { id: "circle", label: "Circle" },
                  ]}
                  onChange={setTool}
                />
                {s.tool !== "pixelate" && (
                  <>
                    <SliderRow label="Brush Size" value={s.brushSize} min={1} max={120} onChange={(v) => update("brushSize", v)} />
                    {tab !== "Drawing Studio" && (
                      <SegButton<"ink" | "bg" | "accent">
                        value={s.brushColor}
                        options={[
                          { id: "ink", label: "Ink" },
                          { id: "bg", label: "BG" },
                          { id: "accent", label: "Accent" },
                        ]}
                        onChange={(v) => update("brushColor", v)}
                      />
                    )}
                  </>
                )}
                {tab === "Drawing Studio" && s.tool === "brush" && (
                  <div className="space-y-3.5 border-t border-border pt-3.5 mt-3.5 font-mono">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground block">Brush Style</label>
                      <SegButton<BrandState["brushStyle"]>
                        value={s.brushStyle}
                        options={[
                          { id: "standard", label: "Ink Brush" },
                          { id: "marker", label: "Marker" },
                          { id: "spray-paint", label: "Spray" },
                          { id: "dry-brush", label: "Dry Brush" },
                          { id: "spray-dots", label: "Dots" },
                          { id: "flat-brush", label: "Flat Brush" },
                          { id: "deckle-edge", label: "Deckle nib" },
                          { id: "gothic", label: "Gothic" },
                          { id: "pen", label: "Pen" },
                          { id: "wash", label: "Wash" },
                        ]}
                        onChange={(v) => update("brushStyle", v)}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground block">Blend Mode</label>
                      <SegButton<string>
                        value={s.drawBlendMode}
                        options={[
                          { id: "source-over", label: "Normal" },
                          { id: "multiply", label: "Multiply" },
                          { id: "screen", label: "Screen" },
                          { id: "overlay", label: "Overlay" },
                          { id: "difference", label: "Difference" },
                        ]}
                        onChange={(v) => update("drawBlendMode", v)}
                      />
                    </div>

                    <div className="space-y-1 pt-1">
                      <SliderRow label="Path Rotation" value={s.pathRotation} min={0} max={180} step={5} onChange={(v) => update("pathRotation", v)} hint="Wavy snake trajectory wobbling" />
                    </div>
                    
                    <div className="space-y-1 border-t border-dashed border-border pt-2.5">
                      <SliderRow label="Spring" value={s.physicsSpring} min={0.05} max={1.0} step={0.05} onChange={(v) => update("physicsSpring", v)} hint="Spring stiffness" />
                      <SliderRow label="Friction" value={s.physicsFriction} min={0.05} max={0.95} step={0.05} onChange={(v) => update("physicsFriction", v)} hint="Frictional resistance" />
                    </div>

                    {(s.brushStyle === "fly" || s.brushStyle === "flat-brush") && (
                      <div className="space-y-1 border-t border-dashed border-border pt-2.5">
                        <SliderRow label="Bristles" value={s.bristles} min={1} max={30} step={1} onChange={(v) => update("bristles", v)} />
                        <SliderRow label="Spread" value={s.bristleSpread} min={0} max={40} step={1} onChange={(v) => update("bristleSpread", v)} />
                      </div>
                    )}

                    <div className="space-y-1.5 border-t border-dashed border-border pt-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-foreground block">Flow Force Field</label>
                        <SegButton<BrandState["flowMode"]>
                          value={s.flowMode}
                          options={[
                            { id: "none", label: "None" },
                            { id: "wave", label: "Wave" },
                            { id: "vortex", label: "Vortex" },
                            { id: "turbulence", label: "Turb" },
                          ]}
                          onChange={(v) => update("flowMode", v)}
                        />
                      </div>
                      {s.flowMode !== "none" && (
                        <SliderRow label="Flow Speed" value={s.flowSpeed} min={1} max={30} step={1} onChange={(v) => update("flowSpeed", v)} />
                      )}
                    </div>
                  </div>
                )}
                
                {tab === "Drawing Studio" && (
                  <>
                    <div className="space-y-1.5 border-t border-border pt-3.5 mt-3.5">
                      <Toggle label="Grid Snapping" value={s.gridSnapping} onChange={(v) => update("gridSnapping", v)} />
                      <Toggle label="Art System Log" value={s.showArtLog} onChange={(v) => update("showArtLog", v)} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-border pt-3.5 mt-3.5">
                      <ActionButton onClick={() => setStrokes((p) => p.slice(0, -1))}>Undo Stroke</ActionButton>
                      <ActionButton onClick={clearCanvasAll}>Clear Canvas</ActionButton>
                    </div>
                    
                    <div className="space-y-2 border-t border-border pt-3.5 mt-3.5">
                      <ActionButton variant={playbackActive ? "primary" : "secondary"} onClick={() => setPlaybackActive(!playbackActive)}>
                        {playbackActive ? "Stop Playback" : "Replay Painting"}
                      </ActionButton>
                      <div className="grid grid-cols-2 gap-2">
                        <ActionButton onClick={exportDrawingJSON}>Export JSON</ActionButton>
                        <div>
                          <input type="file" accept=".json" id="json-import" className="hidden" onChange={handleImportJSON} />
                          <label htmlFor="json-import" className="block w-full text-center bg-control border border-border py-2 text-[10px] uppercase tracking-[0.1em] cursor-pointer hover:bg-control-hover font-mono font-semibold">
                            Import JSON
                          </label>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1">{strokes.length} strokes</p>
                  </>
                )}
              </Section>

              {tab === "Drawing Studio" && (
                <Section title="Ink Palette" defaultOpen={true}>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { hex: "#1A1A1A", label: "Sumi-e Black" },
                      { hex: "#D02340", label: "Cinnabar Red" },
                      { hex: "#02426D", label: "Indigo Blue" },
                      { hex: "#3F4D18", label: "Jade Green" },
                      { hex: "#E9AF34", label: "Imperial Gold" },
                      { hex: "#AF8C59", label: "Sienna Ochre" },
                      { hex: "#F2F2F2", label: "Rice White" },
                      { hex: "#8C6AAC", label: "Plum Purple" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => update("customBrushColorHex", c.hex)}
                        className={`flex flex-col items-center justify-center border p-1 text-[8px] font-mono hover:bg-control ${
                          s.customBrushColorHex === c.hex ? "border-foreground" : "border-border"
                        }`}
                        title={c.label}
                      >
                        <span className="block h-6 w-full mb-1" style={{ background: c.hex }} />
                        <span className="truncate w-full text-center">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* Image Section */}
              <Section title="Image" defaultOpen={tab === "Drawing Studio" ? false : undefined}>
                <input type="file" accept="image/*" id="img-upload" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "imageSrc")} />
                <label htmlFor="img-upload" className="block w-full text-center bg-control border border-border px-3 py-2.5 text-[11px] uppercase tracking-[0.15em] cursor-pointer hover:bg-control-hover">
                  {s.imageSrc ? "Replace Image" : "Upload Image"}
                </label>
                <select value={s.imageSrc ?? ""} onChange={(e) => update("imageSrc", e.target.value || null)}
                  className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground mb-2">
                  <option value="">Select preset image…</option>
                  {PRESET_IMAGES.map((p) => <option key={p.url} value={p.url}>{p.label}</option>)}
                </select>
                {s.imageSrc && (
                  <div className="pb-2">
                    <ActionButton onClick={() => update("imageSrc", null)}>Remove Image</ActionButton>
                  </div>
                )}
                <SliderRow label="Image Opacity" value={s.imageOpacity} min={0} max={1} step={0.01} onChange={(v) => update("imageOpacity", v)} />
                <SliderRow label="Image Scale" hint="Zoom in/out of the background image" value={s.imageScale} min={0.5} max={3} step={0.05} onChange={(v) => update("imageScale", v)} />
                <Toggle label="Grayscale" value={s.imageGrayscale} onChange={(v) => update("imageGrayscale", v)} />
                <Toggle label="Invert" value={s.imageInvert} onChange={(v) => update("imageInvert", v)} />
                <SegButton<BrandState["imageBlend"]>
                  value={s.imageBlend}
                  options={[
                    { id: "normal", label: "Normal" },
                    { id: "multiply", label: "Multiply" },
                    { id: "screen", label: "Screen" },
                    { id: "difference", label: "Diff" },
                    { id: "overlay", label: "Overlay" },
                  ]}
                  onChange={(v) => update("imageBlend", v)}
                />
              </Section>

              {/* Pixelate Section: Hidden for Drawing Studio */}
              {tab !== "Drawing Studio" && (
                <Section title="Pixelate">
                  <p className="text-[10px] text-muted-foreground">Select Pixelate tool then click canvas</p>
                  <SliderRow label="Pixel Size" value={s.pixelSize} min={2} max={64} onChange={(v) => update("pixelSize", v)} />
                  <SliderRow label="Zone Size" value={s.zoneSize} min={20} max={300} onChange={(v) => update("zoneSize", v)} />
                  <Toggle label="Stroke" value={s.strokeOn} onChange={(v) => update("strokeOn", v)} />
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton onClick={() => setZones((z) => z.slice(0, -1))}>Undo Zone</ActionButton>
                    <ActionButton onClick={() => setZones([])}>Clear Zones</ActionButton>
                  </div>
                </Section>
              )}

              {/* Hero Composition Section: Only in Hero Compositions */}
              {tab === "Hero Compositions" && (
                <Section title="Hero Composition" defaultOpen={true}>
                  <input value={s.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} placeholder="Title"
                    className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono uppercase" />
                  <input value={s.heroSubtitle} onChange={(e) => update("heroSubtitle", e.target.value)} placeholder="Subtitle"
                    className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono" />
                  <SliderRow label="Title Size" value={s.heroTitleSize} min={20} max={320} onChange={(v) => update("heroTitleSize", v)} />
                  <SegButton<BrandState["heroLayout"]>
                    value={s.heroLayout}
                    options={[
                      { id: "centered", label: "Center" },
                      { id: "stacked-bottom", label: "Bottom" },
                      { id: "off-axis-left", label: "Left" },
                      { id: "off-axis-right", label: "Right" },
                    ]}
                    onChange={(v) => update("heroLayout", v)}
                  />
                  <Toggle label="Bars" value={s.heroBarOn} onChange={(v) => update("heroBarOn", v)} />
                </Section>
              )}

              {/* Geo-Generator Section: Only in Geo-Generator */}
              {tab === "Geo-Generator" && (
                <Section title="Geo-Generator" defaultOpen={true}>
                  <SegButton<BrandState["geoPattern"]>
                    value={s.geoPattern}
                    options={[
                      { id: "detection", label: "Detect" },
                      { id: "radial", label: "Radial" },
                      { id: "concentric", label: "Rings" },
                      { id: "isometric", label: "Iso" },
                      { id: "spiral", label: "Spiral" },
                      { id: "grid-dots", label: "Dots" },
                    ]}
                    onChange={(v) => update("geoPattern", v)}
                  />
                  <SliderRow label="Density" value={s.geoDensity} min={4} max={120} onChange={(v) => update("geoDensity", v)} />
                  <SliderRow label="Rotation" value={s.geoRotation} min={0} max={360} onChange={(v) => update("geoRotation", v)} format={(v) => `${v}°`} />
                </Section>
              )}

              {/* Grid & Rings Section */}
              <Section title="Grid & Rings" defaultOpen={false}>
                <Toggle label="Grid" value={s.gridOn} onChange={(v) => update("gridOn", v)} />
                <SliderRow label="Grid Size" value={s.gridSize} min={10} max={200} onChange={(v) => update("gridSize", v)} />
                <SliderRow label="Grid Opacity" value={s.gridOpacity} min={0} max={1} step={0.01} onChange={(v) => update("gridOpacity", v)} />
                <Toggle label="Rings" value={s.ringsOn} onChange={(v) => update("ringsOn", v)} />
                <SliderRow label="Rings Count" value={s.ringsCount} min={1} max={30} onChange={(v) => update("ringsCount", v)} />
                <SliderRow label="Rings Spacing" value={s.ringsSpacing} min={10} max={300} onChange={(v) => update("ringsSpacing", v)} />
              </Section>

              {/* Frame Text Section: Hidden in Drawing Studio */}
              {tab !== "Drawing Studio" && (
                <Section title="Frame Text" defaultOpen={false}>
                  <input value={s.frameText} onChange={(e) => update("frameText", e.target.value)} placeholder="Label text"
                    className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono" />
                  <SliderRow label="Text Size" value={s.frameTextSize} min={8} max={28} onChange={(v) => update("frameTextSize", v)} />
                </Section>
              )}

              {/* Crosshair Frame Section */}
              <Section title="Crosshair Frame" defaultOpen={false}>
                <Toggle label="Frame" value={s.frameOn} onChange={(v) => update("frameOn", v)} />
                <Toggle label="Crosshair" value={s.showCrosshair} onChange={(v) => update("showCrosshair", v)} />
                <SliderRow label="Frame Size" value={s.frameSizePct} min={20} max={95} onChange={(v) => update("frameSizePct", v)} format={(v) => `${v}%`} />
                <SliderRow label="Dash" value={s.dashPattern} min={0} max={24} onChange={(v) => update("dashPattern", v)} />
                <SliderRow label="Stroke" value={s.frameStroke} min={0.5} max={4} step={0.1} onChange={(v) => update("frameStroke", v)} />
                <SliderRow label="Opacity" value={s.crosshairOpacity} min={0} max={1} step={0.01} onChange={(v) => update("crosshairOpacity", v)} />
                <SliderRow label="Star Size" value={s.starSize} min={0} max={120} onChange={(v) => update("starSize", v)} />
                <SliderRow label="Star Points" value={s.starPoints} min={2} max={10} onChange={(v) => update("starPoints", v)} />
              </Section>
            </>
          )}
        </aside>

        <main
          className="flex-1 min-w-0 bg-background flex flex-col items-center justify-center p-6 overflow-hidden select-none"
          onWheel={(e) => {
            e.preventDefault();
            const isZoom = e.ctrlKey || e.metaKey;
            if (isZoom) {
              const delta = -e.deltaY * 0.001;
              if (tab === "Motion Track") {
                setMtZoom((z) => Math.min(8, Math.max(0.2, z + delta * z)));
              } else {
                setCanvasZoom((z) => Math.min(8, Math.max(0.2, z + delta * z)));
              }
            } else {
              if (tab === "Motion Track") {
                setMtPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
              } else {
                setCanvasPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
              }
            }
          }}
          onPointerDown={(e) => {
            // Alt+drag to pan
            if (!e.altKey) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            let lastX = e.clientX;
            let lastY = e.clientY;
            const isMotion = tab === "Motion Track";
            const target = e.currentTarget as HTMLElement;
            const onMove = (me: PointerEvent) => {
              const dx = me.clientX - lastX;
              const dy = me.clientY - lastY;
              lastX = me.clientX;
              lastY = me.clientY;
              if (isMotion) {
                setMtPan((p) => ({ x: p.x + dx, y: p.y + dy }));
              } else {
                setCanvasPan((p) => ({ x: p.x + dx, y: p.y + dy }));
              }
            };
            const cleanup = () => {
              target.removeEventListener("pointermove", onMove as any);
              target.removeEventListener("pointerup", cleanup);
              target.removeEventListener("pointercancel", cleanup);
            };
            target.addEventListener("pointermove", onMove as any);
            target.addEventListener("pointerup", cleanup);
            target.addEventListener("pointercancel", cleanup);
          }}
          style={{ touchAction: "none" }}
        >
          {tab === "Motion Track" ? (
            <div className="flex flex-col items-center max-h-full max-w-full">
              {/* Aspect Ratio Selector */}
              <div className="flex gap-1 mb-4 justify-center">
                {(["16:9", "1:1", "4:3"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleAspectRatioChange(r)}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono border ${
                      aspectRatio === r
                        ? "bg-foreground text-background border-foreground"
                        : "bg-control text-foreground border-border hover:bg-control-hover"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={resetMtView}
                  title="Reset view (1:1)"
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono border border-border bg-control text-muted-foreground hover:text-foreground hover:bg-control-hover"
                >
                  {mtZoom !== 1 || mtPan.x !== 0 || mtPan.y !== 0 ? `${Math.round(mtZoom * 100)}%` : "View"}
                </button>
              </div>

              {/* Canvas Wrapper with pan/zoom transform */}
              <div
                className="motion-track-canvas-wrapper relative border border-border overflow-hidden bg-canvas"
                style={{
                  width: "100%",
                  maxWidth: aspectRatio === "16:9" ? "1280px" : aspectRatio === "1:1" ? "800px" : "1067px",
                  aspectRatio: aspectRatio === "16:9" ? "16/9" : aspectRatio === "1:1" ? "1/1" : "4/3",
                  transform: `translate(${mtPan.x}px, ${mtPan.y}px) scale(${mtZoom})`,
                  transformOrigin: "center center",
                }}
                onClick={(e) => {
                  if (!e.shiftKey) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  updateMt("hubX", Math.round(x));
                  updateMt("hubY", Math.round(y));
                }}
              >
                {/* Source video (invisible base — draw into overlay canvas instead) */}
                <video
                  ref={videoRef}
                  id="mt-video"
                  src={mtConfig.sourceMode === "UPLOAD" ? (uploadedVideoUrl || undefined) : undefined}
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", opacity: 0, pointerEvents: "none" }}
                  autoPlay
                  playsInline
                  muted
                  loop={mtConfig.sourceMode === "UPLOAD" ? mtConfig.loop : true}
                  onTimeUpdate={onVideoTimeUpdate}
                  onDurationChange={onVideoDurationChange}
                  onPlay={onVideoPlay}
                  onPause={onVideoPause}
                />

                {/* Overlay canvas — same size as video, drawn on top */}
                <canvas
                  ref={overlayCanvasRef}
                  id="mt-overlay"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                />
              </div>
            </div>
          ) : (
            <div className="relative h-full max-h-full flex items-center justify-center">
              {canvasZoom !== 1 || canvasPan.x !== 0 || canvasPan.y !== 0 ? (
                <button
                  onClick={resetView}
                  className="absolute top-2 right-2 z-10 px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-control transition-colors"
                >
                  {Math.round(canvasZoom * 100)}% · Reset
                </button>
              ) : null}
              <BrandCanvas
                state={s}
                zones={zones}
                strokes={strokes}
                onAddZone={(z) => setZones((p) => [...p, z])}
                onStrokeStart={onStrokeStart}
                onStrokeExtend={onStrokeExtend}
                onStrokeCommit={onStrokeCommit}
                canvasRef={canvasRef}
                playbackActive={playbackActive}
                onPlaybackComplete={() => setPlaybackActive(false)}
                zoom={canvasZoom}
                pan={canvasPan}
              />
            </div>
          )}
        </main>

        <aside className="w-[320px] shrink-0 border-l border-border bg-surface overflow-y-auto">
          {tab === "Motion Track" ? (
            <div className="px-4 pt-4 pb-3 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Post-Processing</p>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-3 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Effects & Output</p>
            </div>
          )}

          {tab === "Motion Track" ? (
            <>
              {/* Trail Section */}
              <Section title="Trail" defaultOpen={false}>
                <Toggle
                  label="Trail"
                  value={mtConfig.trailEnabled}
                  onChange={(v) => updateMt("trailEnabled", v)}
                />
                {mtConfig.trailEnabled && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Mode</label>
                      <SegButton
                        value={mtConfig.trailMode}
                        options={[
                          { id: "SPATIAL", label: "Spatial" },
                          { id: "TEMPORAL", label: "Temporal" },
                        ]}
                        onChange={(v) => updateMt("trailMode", v)}
                      />
                    </div>

                    {mtConfig.trailMode === "TEMPORAL" && (
                      <SliderRow
                        label="Trail Length"
                        value={mtConfig.trailLength}
                        min={5}
                        max={120}
                        onChange={(v) => updateMt("trailLength", v)}
                      />
                    )}

                    <SliderRow
                      label="Line Smooth"
                      value={mtConfig.lineSmooth}
                      min={2}
                      max={16}
                      onChange={(v) => updateMt("lineSmooth", v)}
                    />

                    <ColorPickerRow
                      label="Trail Color"
                      value={mtConfig.trailColor}
                      onChange={(v) => updateMt("trailColor", v)}
                    />

                    <SliderRow
                      label="Trail Width"
                      value={mtConfig.trailWidth}
                      min={0.5}
                      max={8}
                      step={0.1}
                      onChange={(v) => updateMt("trailWidth", v)}
                    />

                    <SliderRow
                      label="Trail Opacity"
                      value={mtConfig.trailOpacity}
                      min={0}
                      max={100}
                      onChange={(v) => updateMt("trailOpacity", v)}
                    />

                    {mtConfig.trailMode === "TEMPORAL" && (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Fade</label>
                        <SegButton
                          value={mtConfig.trailFade}
                          options={[
                            { id: "LINEAR", label: "Linear" },
                            { id: "EXPONENTIAL", label: "Expo" },
                            { id: "NONE", label: "None" },
                          ]}
                          onChange={(v) => updateMt("trailFade", v)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Section>

              <Section title="Circles" defaultOpen={false}>
                <Toggle
                  label="Circles"
                  value={mtConfig.circlesEnabled}
                  onChange={(v) => updateMt("circlesEnabled", v)}
                />
                {mtConfig.circlesEnabled && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Anchor</label>
                      <SegButton
                        value={mtConfig.circleAnchor}
                        options={[
                          { id: "CENTROID", label: "Centroid" },
                          { id: "BOX CENTER", label: "Box Center" },
                          { id: "CANVAS CENTER", label: "Canvas" },
                        ]}
                        onChange={(v) => updateMt("circleAnchor", v)}
                      />
                    </div>

                    <SliderRow
                      label="Chain Count"
                      value={mtConfig.chainCount}
                      min={1}
                      max={12}
                      onChange={(v) => updateMt("chainCount", v)}
                    />

                    <SliderRow
                      label="Chain Angle"
                      value={mtConfig.chainAngle}
                      min={0}
                      max={360}
                      onChange={(v) => updateMt("chainAngle", v)}
                      format={(v) => `${v}°`}
                    />

                    <SliderRow
                      label="Base Radius"
                      value={mtConfig.baseRadius}
                      min={20}
                      max={400}
                      onChange={(v) => updateMt("baseRadius", v)}
                    />

                    <SliderRow
                      label="Size Ratio"
                      value={mtConfig.sizeRatio}
                      min={0.3}
                      max={1.0}
                      step={0.01}
                      onChange={(v) => updateMt("sizeRatio", v)}
                    />

                    <SliderRow
                      label="Spacing"
                      value={mtConfig.chainSpacing}
                      min={0}
                      max={300}
                      onChange={(v) => updateMt("chainSpacing", v)}
                    />

                    <hr className="border-border opacity-50" />

                    <Toggle
                      label="Stroke"
                      value={mtConfig.circleStroke}
                      onChange={(v) => updateMt("circleStroke", v)}
                    />

                    {mtConfig.circleStroke && (
                      <div className="space-y-3 pl-2 border-l border-border/50">
                        <SliderRow
                          label="Stroke Width"
                          value={mtConfig.circleStrokeWidth}
                          min={0.5}
                          max={6}
                          step={0.1}
                          onChange={(v) => updateMt("circleStrokeWidth", v)}
                        />
                        <ColorPickerRow
                          label="Stroke Color"
                          value={mtConfig.circleStrokeColor}
                          onChange={(v) => updateMt("circleStrokeColor", v)}
                        />
                        <SliderRow
                          label="Stroke Opacity"
                          value={mtConfig.circleStrokeOpacity}
                          min={0}
                          max={100}
                          onChange={(v) => updateMt("circleStrokeOpacity", v)}
                        />
                      </div>
                    )}

                    <Toggle
                      label="Fill"
                      value={mtConfig.circleFill}
                      onChange={(v) => updateMt("circleFill", v)}
                    />

                    {mtConfig.circleFill && (
                      <div className="space-y-3 pl-2 border-l border-border/50">
                        <ColorPickerRow
                          label="Fill Color"
                          value={mtConfig.circleFillColor}
                          onChange={(v) => updateMt("circleFillColor", v)}
                        />
                        <SliderRow
                          label="Fill Opacity"
                          value={mtConfig.circleFillOpacity}
                          min={0}
                          max={100}
                          onChange={(v) => updateMt("circleFillOpacity", v)}
                        />
                      </div>
                    )}

                    <Toggle
                      label="Center Dot"
                      value={mtConfig.showCenterDot}
                      onChange={(v) => updateMt("showCenterDot", v)}
                    />

                    {mtConfig.showCenterDot && (
                      <div className="space-y-3 pl-2 border-l border-border/50">
                        <SliderRow
                          label="Dot Radius"
                          value={mtConfig.centerDotRadius}
                          min={2}
                          max={20}
                          onChange={(v) => updateMt("centerDotRadius", v)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Section>

              <Section title="Frame" defaultOpen={false}>
                <Toggle
                  label="Frame Overlay"
                  value={mtConfig.frameEnabled}
                  onChange={(v) => updateMt("frameEnabled", v)}
                />
                {mtConfig.frameEnabled && (
                  <div className="space-y-4 pt-1">
                    <Toggle
                      label="Crosshair"
                      value={mtConfig.crosshairEnabled}
                      onChange={(v) => updateMt("crosshairEnabled", v)}
                    />
                    {mtConfig.crosshairEnabled && (
                      <div className="space-y-3 pl-2 border-l border-border/50">
                        <SliderRow
                          label="Opacity"
                          value={mtConfig.crosshairOpacity}
                          min={0}
                          max={100}
                          onChange={(v) => updateMt("crosshairOpacity", v)}
                        />
                        <ColorPickerRow
                          label="Color"
                          value={mtConfig.crosshairColor}
                          onChange={(v) => updateMt("crosshairColor", v)}
                        />
                        <Toggle
                          label="Tick Marks"
                          value={mtConfig.tickMarks}
                          onChange={(v) => updateMt("tickMarks", v)}
                        />
                      </div>
                    )}

                    <Toggle
                      label="Border"
                      value={mtConfig.borderEnabled}
                      onChange={(v) => updateMt("borderEnabled", v)}
                    />
                    {mtConfig.borderEnabled && (
                      <div className="space-y-3 pl-2 border-l border-border/50">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Style</label>
                          <SegButton
                            value={mtConfig.borderStyle}
                            options={[
                              { id: "FULL", label: "Full" },
                              { id: "CORNERS", label: "Corners" },
                            ]}
                            onChange={(v) => updateMt("borderStyle", v)}
                          />
                        </div>
                        <SliderRow
                          label="Width"
                          value={mtConfig.borderWidth}
                          min={0.5}
                          max={4}
                          step={0.1}
                          onChange={(v) => updateMt("borderWidth", v)}
                        />
                        <ColorPickerRow
                          label="Color"
                          value={mtConfig.borderColor}
                          onChange={(v) => updateMt("borderColor", v)}
                        />
                        <SliderRow
                          label="Opacity"
                          value={mtConfig.borderOpacity}
                          min={0}
                          max={100}
                          onChange={(v) => updateMt("borderOpacity", v)}
                        />
                      </div>
                    )}

                    <Toggle
                      label="Frame Text"
                      value={mtConfig.frameTextEnabled}
                      onChange={(v) => updateMt("frameTextEnabled", v)}
                    />
                    {mtConfig.frameTextEnabled && (
                      <div className="space-y-3 pl-2 border-l border-border/50">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Text Content</label>
                          <input
                            type="text"
                            value={mtConfig.frameText}
                            placeholder="BRAND-001"
                            onChange={(e) => updateMt("frameText", e.target.value)}
                            className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Position</label>
                          <select
                            value={mtConfig.frameTextPosition}
                            onChange={(e) => updateMt("frameTextPosition", e.target.value as any)}
                            className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground focus:outline-none"
                          >
                            <option value="TOP LEFT">TOP LEFT</option>
                            <option value="TOP RIGHT">TOP RIGHT</option>
                            <option value="BOTTOM LEFT">BOTTOM LEFT</option>
                            <option value="BOTTOM RIGHT">BOTTOM RIGHT</option>
                          </select>
                        </div>
                        <SliderRow
                          label="Font Size"
                          value={mtConfig.frameTextSize}
                          min={8}
                          max={24}
                          onChange={(v) => updateMt("frameTextSize", v)}
                        />
                        <ColorPickerRow
                          label="Color"
                          value={mtConfig.frameTextColor}
                          onChange={(v) => updateMt("frameTextColor", v)}
                        />
                        <SliderRow
                          label="Opacity"
                          value={mtConfig.frameTextOpacity}
                          min={0}
                          max={100}
                          onChange={(v) => updateMt("frameTextOpacity", v)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Section>

              <Section title="Effects" defaultOpen={false}>
                <Toggle
                  label="Scan Lines"
                  value={mtConfig.scanEnabled}
                  onChange={(v) => updateMt("scanEnabled", v)}
                />
                {mtConfig.scanEnabled && (
                  <div className="space-y-3 pl-2 border-l border-border/50">
                    <SliderRow
                      label="Density"
                      value={mtConfig.scanDensity}
                      min={1}
                      max={10}
                      onChange={(v) => updateMt("scanDensity", v)}
                    />
                    <SliderRow
                      label="Opacity"
                      value={mtConfig.scanOpacity}
                      min={0}
                      max={60}
                      onChange={(v) => updateMt("scanOpacity", v)}
                    />
                    <Toggle
                      label="Animate"
                      value={mtConfig.scanAnimate}
                      onChange={(v) => updateMt("scanAnimate", v)}
                    />
                  </div>
                )}

                <Toggle
                  label="Vignette"
                  value={mtConfig.vignetteEnabled}
                  onChange={(v) => updateMt("vignetteEnabled", v)}
                />
                {mtConfig.vignetteEnabled && (
                  <div className="space-y-3 pl-2 border-l border-border/50">
                    <SliderRow
                      label="Intensity"
                      value={mtConfig.vignetteIntensity}
                      min={0}
                      max={100}
                      onChange={(v) => updateMt("vignetteIntensity", v)}
                    />
                    <ColorPickerRow
                      label="Color"
                      value={mtConfig.vignetteColor}
                      onChange={(v) => updateMt("vignetteColor", v)}
                    />
                  </div>
                )}

                <Toggle
                  label="Grain"
                  value={mtConfig.grainEnabled}
                  onChange={(v) => updateMt("grainEnabled", v)}
                />
                {mtConfig.grainEnabled && (
                  <div className="space-y-3 pl-2 border-l border-border/50">
                    <SliderRow
                      label="Amount"
                      value={mtConfig.grainAmount}
                      min={0}
                      max={100}
                      onChange={(v) => updateMt("grainAmount", v)}
                    />
                    <SliderRow
                      label="Size"
                      value={mtConfig.grainSize}
                      min={1}
                      max={4}
                      onChange={(v) => updateMt("grainSize", v)}
                    />
                    <SliderRow
                      label="Opacity"
                      value={mtConfig.grainOpacity}
                      min={0}
                      max={80}
                      onChange={(v) => updateMt("grainOpacity", v)}
                    />
                  </div>
                )}
              </Section>

              <Section title="Labels" defaultOpen={false}>
                <Toggle
                  label="Labels"
                  value={mtConfig.labelsEnabled}
                  onChange={(v) => updateMt("labelsEnabled", v)}
                />
                {mtConfig.labelsEnabled && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Content</label>
                      <select
                        value={mtConfig.labelContent}
                        onChange={(e) => updateMt("labelContent", e.target.value as any)}
                        className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground focus:outline-none"
                      >
                        <option value="INDEX">INDEX</option>
                        <option value="AREA">AREA</option>
                        <option value="POSITION">POSITION</option>
                        <option value="VELOCITY">VELOCITY</option>
                        <option value="CUSTOM">CUSTOM</option>
                      </select>
                    </div>

                    {mtConfig.labelContent === "CUSTOM" && (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Label Text</label>
                        <input
                          type="text"
                          value={mtConfig.labelText}
                          placeholder="BRAND-001"
                          onChange={(e) => updateMt("labelText", e.target.value)}
                          className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground"
                        />
                      </div>
                    )}

                    <SliderRow
                      label="Font Size"
                      value={mtConfig.labelFontSize}
                      min={8}
                      max={24}
                      onChange={(v) => updateMt("labelFontSize", v)}
                    />

                    <ColorPickerRow
                      label="Color"
                      value={mtConfig.labelColor}
                      onChange={(v) => updateMt("labelColor", v)}
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Position</label>
                      <select
                        value={mtConfig.labelPosition}
                        onChange={(e) => updateMt("labelPosition", e.target.value as any)}
                        className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground focus:outline-none"
                      >
                        <option value="ABOVE BOX">ABOVE BOX</option>
                        <option value="INSIDE TOP">INSIDE TOP</option>
                        <option value="AT CENTROID">AT CENTROID</option>
                        <option value="BELOW BOX">BELOW BOX</option>
                      </select>
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Global" defaultOpen={false}>
                <SliderRow
                  label="Video Opacity"
                  value={mtConfig.videoOpacity}
                  min={0}
                  max={100}
                  onChange={(v) => updateMt("videoOpacity", v)}
                />
                <Toggle
                  label="Grid"
                  value={mtConfig.gridEnabled}
                  onChange={(v) => updateMt("gridEnabled", v)}
                />
                {mtConfig.gridEnabled && (
                  <SliderRow
                    label="Grid Opacity"
                    value={mtConfig.gridOpacity}
                    min={0}
                    max={100}
                    onChange={(v) => updateMt("gridOpacity", v)}
                  />
                )}
                <Toggle
                  label="Metrics"
                  value={mtConfig.metricsEnabled}
                  onChange={(v) => updateMt("metricsEnabled", v)}
                />
                <Toggle
                  label="Status"
                  value={mtConfig.statusEnabled}
                  onChange={(v) => updateMt("statusEnabled", v)}
                />
              </Section>

              <Section title="Export" defaultOpen={true}>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block font-bold border-b border-border pb-1">Format</label>
                    <div className="flex w-full gap-1">
                      {(["PNG", "JPEG", "WEBP", "GIF", "MP4"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setMtExportFormat(f)}
                          className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-mono border text-center transition-all ${
                            mtExportFormat === f
                              ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                              : "bg-control text-foreground border-border hover:bg-control-hover"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Format-specific controls */}
                  {(mtExportFormat === "PNG" || mtExportFormat === "JPEG" || mtExportFormat === "WEBP") && (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">Scale</label>
                      <div className="flex gap-1">
                        {([1, 2, 3] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => updateMt("exportMultiplier", m)}
                            className={`flex-1 py-1 text-[9px] font-mono border text-center ${
                              mtConfig.exportMultiplier === m
                                ? "bg-foreground text-background border-foreground"
                                : "bg-control border-border hover:bg-control-hover"
                            }`}
                          >
                            {m}×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(mtExportFormat === "GIF" || mtExportFormat === "MP4") && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">FPS</label>
                        <div className="flex gap-1">
                          {([24, 30, 60] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => updateMt("recordFPS", f)}
                              className={`flex-1 py-1 text-[9px] font-mono border text-center ${
                                mtConfig.recordFPS === f
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-control border-border hover:bg-control-hover"
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      <SliderRow
                        label="Bitrate"
                        value={mtConfig.recordBitrate}
                        min={1}
                        max={20}
                        onChange={(v) => updateMt("recordBitrate", v)}
                        format={(v) => `${v} Mbps`}
                      />
                    </>
                  )}

                  <ActionButton
                    variant="primary"
                    disabled={mtIsExporting}
                    onClick={handleMtExport}
                  >
                    {mtIsExporting ? (mtExportProgressLabel || "Exporting...") : `Export ${mtExportFormat}`}
                  </ActionButton>
                </div>
              </Section>
            </>
          ) : (
            <>
              {/* Ink Diffusion Effects (Drawing Studio only) */}
              {tab === "Drawing Studio" && (
                <Section title="Ink Diffusion Effects" defaultOpen={true}>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Style</label>
                    <SegButton<BrandState["inkEffectMode"]>
                      value={s.inkEffectMode}
                      options={[
                        { id: "none", label: "None" },
                        { id: "water", label: "Water" },
                        { id: "charcoal", label: "Charcoal" },
                        { id: "watercolor", label: "Watercolor" },
                        { id: "salt", label: "Salt" },
                        { id: "bleed", label: "Bleed" },
                        { id: "fiber", label: "Fiber" },
                      ]}
                      onChange={(v) => update("inkEffectMode", v)}
                    />
                  </div>
                  <SliderRow label="Ink Bleed" value={s.bleedAmount} min={0} max={2} step={0.1} onChange={(v) => update("bleedAmount", v)} hint="Simulates wet ink spread" />
                </Section>
              )}

              {/* Canvas Shaders (Drawing Studio only) */}
              {tab === "Drawing Studio" && (
                <Section title="Canvas Shaders" defaultOpen={true}>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono block">Metallic Effect</label>
                    <SegButton<BrandState["canvasEffectMetallic"]>
                      value={s.canvasEffectMetallic}
                      options={[
                        { id: "none", label: "None" },
                        { id: "gold", label: "Gold" },
                        { id: "silver", label: "Silver" },
                        { id: "copper", label: "Copper" },
                        { id: "rose", label: "Rose" },
                        { id: "black-gold", label: "Black Gold" },
                        { id: "diamond", label: "Diamond" },
                      ]}
                      onChange={(v) => update("canvasEffectMetallic", v)}
                    />
                  </div>
                  <SliderRow label="Paper Grain" value={s.canvasEffectGrain} min={0} max={1} step={0.05} onChange={(v) => update("canvasEffectGrain", v)} />
                  <SliderRow label="White Dots" value={s.canvasEffectWhiteDots} min={0} max={1} step={0.05} onChange={(v) => update("canvasEffectWhiteDots", v)} />
                </Section>
              )}

              {/* Chain Section: Circle Mapping or Hero Compositions */}
              {(tab === "Circle Mapping" || tab === "Hero Compositions") && (
                <Section title="Chain" defaultOpen={true}>
                  <Toggle label="Chain" value={s.chainOn} onChange={(v) => update("chainOn", v)} />
                  <SliderRow label="Count" value={s.chainCount} min={1} max={20} onChange={(v) => update("chainCount", v)} />
                  <SliderRow label="Angle" value={s.chainAngle} min={0} max={360} onChange={(v) => update("chainAngle", v)} format={(v) => `${v}°`} />
                  <SliderRow label="Base Radius" value={s.baseRadius} min={20} max={500} onChange={(v) => update("baseRadius", v)} />
                  <SliderRow label="Size Ratio" value={s.sizeRatio} min={0.3} max={1} step={0.01} onChange={(v) => update("sizeRatio", v)} />
                  <Toggle label="Intersections" value={s.intersectionsOn} onChange={(v) => update("intersectionsOn", v)} />
                  <SliderRow label="Marker Size" value={s.markerSize} min={0} max={20} step={0.5} onChange={(v) => update("markerSize", v)} />
                </Section>
              )}

              {/* Detection Section: Geo-Generator or Hero Compositions */}
              {(tab === "Geo-Generator" || tab === "Hero Compositions") && (
                <Section title="Detection" defaultOpen={false}>
                  <Toggle label="Detection" value={s.detectionOn} onChange={(v) => update("detectionOn", v)} />
                  <SegButton<typeof s.detectionMode>
                    value={s.detectionMode}
                    options={[
                      { id: "combined", label: "Combined" },
                      { id: "contrast", label: "Contrast" },
                      { id: "bright", label: "Bright" },
                      { id: "dark", label: "Dark" },
                    ]}
                    onChange={(v) => update("detectionMode", v)}
                  />
                  <SliderRow label="Block Size" value={s.blockSize} min={4} max={48} onChange={(v) => update("blockSize", v)} />
                  <SliderRow label="Threshold" value={s.threshold} min={5} max={100} onChange={(v) => update("threshold", v)} />
                  <SliderRow label="Max Circles" value={s.maxCircles} min={5} max={400} onChange={(v) => update("maxCircles", v)} />
                  <SliderRow label="Min Distance" value={s.minDistance} min={5} max={120} onChange={(v) => update("minDistance", v)} />
                </Section>
              )}

              {/* Shapes Section: Geo-Generator only */}
              {tab === "Geo-Generator" && (
                <Section title="Shapes" defaultOpen={false}>
                  <SegButton<typeof s.shapeMode>
                    value={s.shapeMode}
                    options={[{ id: "circle", label: "Circle" }, { id: "square", label: "Square" }]}
                    onChange={(v) => update("shapeMode", v)}
                  />
                  <SliderRow label="Min Radius" value={s.minRadius} min={1} max={30} onChange={(v) => update("minRadius", v)} />
                  <SliderRow label="Max Radius" value={s.maxRadius} min={5} max={80} onChange={(v) => update("maxRadius", v)} />
                  <SliderRow label="Stroke" value={s.shapeStroke} min={0.5} max={4} step={0.1} onChange={(v) => update("shapeStroke", v)} />
                  <SliderRow label="Size Seed" value={s.sizeSeed} min={1} max={999} onChange={(v) => update("sizeSeed", v)} />
                  <SliderRow label="Label Size" value={s.labelSize} min={6} max={18} onChange={(v) => update("labelSize", v)} />
                  <Toggle label="Labels" value={s.showLabels} onChange={(v) => update("showLabels", v)} />
                  <SliderRow label="Overlay Opacity" value={s.overlayOpacity} min={0} max={1} step={0.01} onChange={(v) => update("overlayOpacity", v)} />
                </Section>
              )}

              {/* Connections Section: Geo-Generator only */}
              {tab === "Geo-Generator" && (
                <Section title="Connections" defaultOpen={false}>
                  <SliderRow label="Max Distance" value={s.maxDistance} min={0} max={400} onChange={(v) => update("maxDistance", v)} />
                  <SliderRow label="Line Weight" value={s.lineWeight} min={0.2} max={3} step={0.1} onChange={(v) => update("lineWeight", v)} />
                </Section>
              )}

              {/* Palette Section: Hidden in Drawing Studio */}
              {tab !== "Drawing Studio" && (
                <Section title="Palette" defaultOpen={false}>
                  <div className="grid grid-cols-6 gap-2">
                    {PALETTES.map((p) => (
                      <button key={p.id} onClick={() => update("paletteId", p.id)}
                        className={`flex h-10 items-center justify-center border ${s.paletteId === p.id ? "border-foreground" : "border-border"}`}
                        style={{ background: p.preview[0] }} title={p.label}>
                        <span className="block h-4 w-4 rounded-full" style={{ background: p.preview[1] }} />
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{palette.label}</p>
                </Section>
              )}

              {/* Size Section */}
              <Section title="Size" defaultOpen={false}>
                <select value={s.sizeId} onChange={(e) => update("sizeId", e.target.value)}
                  className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono">
                  {SIZE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Section>

              {/* Texture / Noise Section: Hidden in Drawing Studio */}
              {tab !== "Drawing Studio" && (
                <Section title="Texture / Noise" defaultOpen={false}>
                  <input type="file" accept="image/*" id="tex-upload" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "textureSrc")} />
                  <label htmlFor="tex-upload" className="block w-full text-center bg-control border border-border px-3 py-2.5 text-[11px] uppercase tracking-[0.15em] cursor-pointer hover:bg-control-hover">
                    {s.textureSrc ? "Replace Texture" : "Upload Texture"}
                  </label>
                  {s.textureSrc && <ActionButton onClick={() => update("textureSrc", null)}>Remove Texture</ActionButton>}
                  <SliderRow label="Texture Opacity" value={s.textureOpacity} min={0} max={1} step={0.01} onChange={(v) => update("textureOpacity", v)} />
                </Section>
              )}

              {/* Export Section */}
              <Section title="Export" defaultOpen={true}>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">PNG</label>
                    <div className="flex gap-1">
                      <ActionButton variant="primary" onClick={() => exportPNG(1)}>1×</ActionButton>
                      <ActionButton onClick={() => exportPNG(2)}>2×</ActionButton>
                      <ActionButton onClick={() => exportPNG(3)}>3×</ActionButton>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">JPEG · WebP</label>
                    <div className="flex gap-1">
                      <ActionButton onClick={() => exportJPEG(1)}>JPG 1×</ActionButton>
                      <ActionButton onClick={() => exportJPEG(2)}>JPG 2×</ActionButton>
                      <ActionButton onClick={() => exportWebP(1)}>WebP</ActionButton>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">Video · Animation</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => exportCanvasMedia("MP4")}
                        disabled={generalExporting}
                        className="flex-1 py-1 text-[9px] font-mono border text-center transition-all bg-control text-foreground border-border hover:bg-control-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generalExporting && generalExportProgress ? generalExportProgress : "MP4 (4s)"}
                      </button>
                      <button
                        onClick={() => exportCanvasMedia("GIF")}
                        disabled={generalExporting}
                        className="flex-1 py-1 text-[9px] font-mono border text-center transition-all bg-control text-foreground border-border hover:bg-control-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generalExporting && generalExportProgress ? generalExportProgress : "GIF (4s)"}
                      </button>
                    </div>
                  </div>
                  <ActionButton onClick={exportSVGStub}>SVG (raster embed)</ActionButton>
                </div>
              </Section>
            </>
          )}
        </aside>
        </div>
      </div>

      <footer className="border-t border-border px-5 h-7 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span>{preset.w} × {preset.h} / {palette.label} / tool: {s.tool} {tab !== "Effects" && tab !== "Motion Track" ? `/ zoom: ${Math.round(canvasZoom * 100)}%` : tab === "Motion Track" ? `/ zoom: ${Math.round(mtZoom * 100)}%` : ""}</span>
        <span>Scroll to zoom · Alt+drag to pan · ⌘Z undo · ⌘⇧Z redo · by <a href="https://grvx.dev" className="text-foreground" target="_blank" rel="noreferrer">Gaurav Mandal</a></span>
      </footer>
    </div>
  );
}
