import { useState, type ReactNode } from "react";

export function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-divider">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-foreground">{title}</span>
        <span className="text-muted-foreground font-mono text-sm">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex w-full items-center justify-between border px-3 py-2 text-[11px] uppercase tracking-[0.15em] font-mono transition-colors ${
        value
          ? "bg-foreground text-background border-foreground"
          : "bg-control text-foreground border-border hover:bg-control-hover"
      }`}
    >
      <span>{label}</span>
      <span>{value ? "ON" : "OFF"}</span>
    </button>
  );
}

export function ActionButton({ children, onClick, variant = "default" }: { children: ReactNode; onClick: () => void; variant?: "default" | "primary" | "ghost" }) {
  const cls =
    variant === "primary"
      ? "bg-foreground text-background hover:opacity-90"
      : variant === "ghost"
      ? "bg-transparent border border-border text-foreground hover:bg-control"
      : "bg-control text-foreground border border-border hover:bg-control-hover";
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2.5 text-[11px] uppercase tracking-[0.15em] font-mono transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}
