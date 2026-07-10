import { useEffect, useRef, useState, useCallback } from "react";

export interface CircleMappingState {
  imageSrc: string | null;
  imageOpacity: number;
  pixelSize: number;
  zoneSize: number;
  strokeOn: boolean;
  strokeWidth: number;
  strokeColor: string;
  showCrosshair: boolean;
  crosshairOpacity: number;
  showFrameBorder: boolean;
  frameText: string;
  frameTextSize: number;
  chainOn: boolean;
  chainCount: number;
  chainAngle: number;
  baseRadius: number;
  sizeRatio: number;
  spacing: number;
  showLabels: boolean;
  bgColor: string;
}

export interface Zone { x: number; y: number; size: number }

interface Props {
  state: CircleMappingState;
  zones: Zone[];
  onAddZone: (z: Zone) => void;
  onClearZones: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const CANVAS_W = 900;
const CANVAS_H = 1200;

export function CircleCanvas({ state, zones, onAddZone, canvasRef }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgReady, setImgReady] = useState(0);

  useEffect(() => {
    if (!state.imageSrc) { imgRef.current = null; setImgReady((n) => n + 1); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setImgReady((n) => n + 1); };
    img.onerror = () => { imgRef.current = null; setImgReady((n) => n + 1); };
    img.src = state.imageSrc;
  }, [state.imageSrc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // bg image cover-fit
    const img = imgRef.current;
    if (img && img.width > 0) {
      ctx.save();
      ctx.globalAlpha = state.imageOpacity;
      const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
      ctx.restore();
    }

    // pixelation zones
    if (zones.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const z of zones) {
        const x = z.x - z.size;
        const y = z.y - z.size;
        const s = z.size * 2;
        try {
          const imgData = ctx.getImageData(x, y, s, s);
          const small = document.createElement("canvas");
          const block = Math.max(1, state.pixelSize);
          small.width = Math.max(1, Math.floor(s / block));
          small.height = Math.max(1, Math.floor(s / block));
          const sctx = small.getContext("2d")!;
          // put original into temp full-size
          const tmp = document.createElement("canvas");
          tmp.width = s; tmp.height = s;
          tmp.getContext("2d")!.putImageData(imgData, 0, 0);
          sctx.imageSmoothingEnabled = false;
          sctx.drawImage(tmp, 0, 0, small.width, small.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(small, 0, 0, small.width, small.height, x, y, s, s);
        } catch { /* tainted canvas */ }
      }
      ctx.restore();
    }

    // chain circles
    if (state.chainOn) {
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const ang = (state.chainAngle * Math.PI) / 180;
      ctx.save();
      ctx.strokeStyle = state.strokeColor;
      ctx.lineWidth = state.strokeOn ? state.strokeWidth : 1;
      ctx.globalAlpha = 0.85;
      ctx.font = `9px JetBrains Mono, monospace`;
      ctx.fillStyle = state.strokeColor;

      for (let i = 0; i < state.chainCount; i++) {
        const r = state.baseRadius * Math.pow(state.sizeRatio, i);
        const x = cx + Math.cos(ang) * state.spacing * i;
        const y = cy + Math.sin(ang) * state.spacing * i;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        // center dot
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        if (state.showLabels) {
          ctx.fillText(`${i + 1} → ${Math.round(x)} · ${Math.round(y)}`, x + 8, y - 8);
        }
      }
      ctx.restore();
    }

    // crosshair
    if (state.showCrosshair) {
      ctx.save();
      ctx.globalAlpha = state.crosshairOpacity;
      ctx.strokeStyle = state.strokeColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H / 2);
      ctx.lineTo(CANVAS_W, CANVAS_H / 2);
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      // center +
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 - 10, CANVAS_H / 2);
      ctx.lineTo(CANVAS_W / 2 + 10, CANVAS_H / 2);
      ctx.moveTo(CANVAS_W / 2, CANVAS_H / 2 - 10);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H / 2 + 10);
      ctx.stroke();
      ctx.restore();
    }

    // frame border
    if (state.showFrameBorder) {
      ctx.save();
      ctx.strokeStyle = state.strokeColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 40, CANVAS_W - 80, CANVAS_H - 80);
      ctx.restore();
    }

    // frame text — corners
    if (state.frameText) {
      ctx.save();
      ctx.fillStyle = state.strokeColor;
      ctx.font = `${state.frameTextSize}px JetBrains Mono, monospace`;
      ctx.fillText(state.frameText, 50, 60);
      ctx.textAlign = "right";
      ctx.fillText("Gaurav Mandal", CANVAS_W - 50, 60);
      ctx.textAlign = "left";
      ctx.fillText("grvx.dev", 50, CANVAS_H - 50);
      ctx.textAlign = "right";
      ctx.fillText("Delhi, India", CANVAS_W - 50, CANVAS_H - 50);
      ctx.restore();
    }
  }, [state, zones, imgReady, canvasRef]);

  useEffect(() => { draw(); }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    onAddZone({
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
      size: state.zoneSize,
    });
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="relative h-full max-h-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleClick}
          className="block h-full max-h-full w-auto cursor-crosshair border border-border"
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        />
      </div>
    </div>
  );
}

export const CANVAS_DIMS = { w: CANVAS_W, h: CANVAS_H };
