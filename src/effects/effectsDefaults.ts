export const EFFECT_DEFAULTS = {
  ASCII: {
    cellSize: 8,
    charSet: "STANDARD" as "STANDARD" | "BLOCKS" | "BINARY" | "NUMBERS" | "SYMBOLS" | "CUSTOM",
    customChars: "",
    invertChars: false,
    colorMode: "SOURCE" as "SOURCE" | "MONO" | "CUSTOM",
    fgColor: "#00ff00",
    bgColor: "#000000",
    font: "MONO" as "MONO" | "COURIER" | "SPACE MONO",
    bold: false
  },
  DITHERING: {
    algorithm: "BAYER" as "BAYER" | "FLOYD-STEINBERG" | "ATKINSON" | "ORDERED",
    matrixSize: "4x4" as "2x2" | "4x4" | "8x8" | "16x16",
    levels: 4,
    palette: "MONO" as "MONO" | "CMYK" | "GAME BOY" | "RGB" | "CUSTOM",
    spread: 1.0,
    serpentine: true
  },
  HALFTONE: {
    dotSize: 12,
    spacing: 16,
    shape: "CIRCLE" as "CIRCLE" | "SQUARE" | "DIAMOND" | "LINE",
    angle: 45,
    colorMode: "MONO" as "MONO" | "CMYK" | "SOURCE",
    dotColor: "#000000",
    bgColor: "#ffffff",
    invert: false
  },
  MATRIX_RAIN: {
    colWidth: 14,
    speed: 1.0,
    charSet: "KATAKANA" as "KATAKANA" | "BINARY" | "NUMBERS" | "LATIN",
    trailLength: 20,
    fgColor: "#00ff00",
    bgColor: "#000000",
    sourceBlend: 0.5,
    fontSize: 14
  },
  DOTS: {
    dotSize: 8,
    spacing: 12,
    sizeBy: "INVERSE" as "BRIGHTNESS" | "INVERSE" | "FIXED",
    colorMode: "SOURCE" as "SOURCE" | "FOREGROUND" | "GRADIENT",
    fgColor: "#000000",
    gradStart: "#000000",
    gradEnd: "#ffffff",
    bgColor: "#ffffff",
    minRadius: 0
  },
  CONTOUR: {
    levels: 10,
    lineWidth: 1,
    smoothing: 2,
    colorMode: "MONO" as "MONO" | "RAINBOW" | "SOURCE",
    lineColor: "#000000",
    bgColor: "#ffffff",
    filled: false
  },
  PIXEL_SORT: {
    direction: "HORIZONTAL" as "HORIZONTAL" | "VERTICAL" | "DIAGONAL",
    sortBy: "BRIGHTNESS" as "BRIGHTNESS" | "HUE" | "RED" | "GREEN" | "BLUE",
    threshLow: 80,
    threshHigh: 200,
    sortOrder: "ASCENDING" as "ASCENDING" | "DESCENDING",
    span: 1.0
  },
  BLOCKIFY: {
    blockW: 16,
    blockH: 16,
    linkWH: true,
    shape: "RECTANGLE" as "RECTANGLE" | "CIRCLE" | "DIAMOND" | "HEXAGON",
    colorMethod: "AVERAGE" as "AVERAGE" | "CENTER PIXEL" | "DOMINANT",
    bgColor: "#000000",
    outline: false,
    outlineColor: "#000000"
  },
  THRESHOLD: {
    threshold: 128,
    levels: 2,
    lightColor: "#ffffff",
    darkColor: "#000000",
    smoothing: 0,
    channel: "LUMINANCE" as "LUMINANCE" | "RED" | "GREEN" | "BLUE",
    antiAlias: false
  },
  EDGE_DETECTION: {
    algorithm: "SOBEL" as "SOBEL" | "CANNY" | "LAPLACIAN" | "PREWITT",
    threshLow: 50,
    threshHigh: 150,
    preBlur: 1,
    strength: 1.0,
    edgeColor: "#ffffff",
    bgColor: "#000000",
    invert: false
  },
  CROSSHATCH: {
    lineSpacing: 8,
    lineWidth: 1,
    layers: 2,
    densityThreshold: 200,
    lineColor: "#000000",
    bgColor: "#ffffff",
    angle: 45,
    varyThickness: false
  },
  WAVE_LINES: {
    lineSpacing: 8,
    amplitude: 16,
    frequency: 0.01,
    phase: 0,
    animate: false,
    animSpeed: 0.02,
    direction: "HORIZONTAL" as "HORIZONTAL" | "VERTICAL" | "BOTH",
    lineWidth: 1,
    colorMode: "MONO" as "MONO" | "SOURCE",
    lineColor: "#000000",
    bgColor: "#ffffff"
  },
  NOISE_FIELD: {
    scale: 0.005,
    octaves: 4,
    persistence: 0.5,
    stepSize: 3,
    lineLength: 100,
    lineCount: 1000,
    lineWidth: 0.5,
    colorMode: "MONO" as "MONO" | "SOURCE",
    lineColor: "#ffffff",
    bgColor: "#000000",
    seed: 42,
    opacity: 0.6
  },
  VORONOI: {
    cellCount: 100,
    seed: 0,
    placement: "RANDOM" as "RANDOM" | "WEIGHTED" | "GRID" | "POISSON",
    colorSource: "SEED PIXEL" as "SEED PIXEL" | "AVERAGE" | "MONO",
    monoColor: "#ffffff",
    showSeeds: false,
    seedSize: 3,
    showBorders: true,
    borderColor: "#000000",
    borderWidth: 1,
    relaxation: 0
  },
  VHS: {
    trackingNoise: 0.4,
    noiseBands: 5,
    colorBleed: 8,
    scanlines: 0.3,
    jitter: 4,
    vertSync: 0.1,
    noiseGrain: 0.2, // matching step 8 defaults name
    satBleed: 0.3,
    edgeDistort: 0.2,
    animate: true,
    speed: 1.0
  }
};

export const GLOBAL_DEFAULTS = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  sharpness: 0,
  gamma: 1.0,
  colorMode: "ORIGINAL" as "ORIGINAL" | "MONO" | "DUOTONE",
  shadowColor: "#000000",
  highlightColor: "#ffffff",
  bgColor: "#000000",
  intensity: 1.0
};

export const PROCESSING_DEFAULTS = {
  invert: false,
  scale: 1.0,
  flipH: false,
  flipV: false,
  rotate: "0°" as "0°" | "90°" | "180°" | "270°",
  edgePad: 0
};

export const POST_DEFAULTS = {
  blur: 0,
  vignette: 0,
  grain: 0,
  scanlines: 0,
  chromaAb: 0,
  pixelate: 1,
  blendMode: "Normal" as "Normal" | "Screen" | "Multiply" | "Overlay" | "Add" | "Difference"
};
