import { useState, useEffect } from "react";

interface SliderRowProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

export function SliderRow({ label, hint, value, min, max, step = 1, onChange, format }: SliderRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => { setDraft(String(value)); }, [value]);

  const display = format ? format(value) : (Number.isInteger(step) ? String(value) : value.toFixed(2));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] uppercase tracking-[0.15em] text-foreground font-mono">{label}</label>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const n = Number(draft);
              if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
              setEditing(false);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-16 bg-control px-1 text-right text-xs font-mono text-foreground outline-none"
          />
        ) : (
          <button
            onDoubleClick={() => setEditing(true)}
            className="text-xs font-mono text-foreground tabular-nums"
          >
            {display}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground font-mono leading-tight">{hint}</p>}
      <input
        type="range"
        className="bg-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
