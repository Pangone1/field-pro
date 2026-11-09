import { Check, Eraser, PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function SignaturePad({
  value,
  signerName,
  onSave,
}: {
  value: string | null;
  signerName: string;
  onSave: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [editing, setEditing] = useState(value === null);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = getComputedStyle(canvas).color;
  }, []);

  useEffect(() => {
    if (!editing) return;
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [editing, setup]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  if (!editing && value) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl border bg-card p-2">
          <img src={value} alt={`Signature of ${signerName}`} className="h-36 w-full object-contain dark:invert" />
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
            <Check className="size-3" /> Signed
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSave(null);
            setEditing(true);
            setHasInk(false);
          }}
        >
          <PenLine /> Re-sign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed bg-card">
        <canvas
          ref={canvasRef}
          aria-label="Signature pad"
          className="block h-44 w-full touch-none text-foreground"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-muted-foreground/40" />
        <div className="pointer-events-none absolute bottom-3 left-6 text-[11px] text-muted-foreground">
          ✕ {signerName}
        </div>
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Customer signs here
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={clear} disabled={!hasInk}>
          <Eraser /> Clear
        </Button>
        <Button
          variant="success"
          className="flex-1"
          disabled={!hasInk}
          onClick={() => {
            const url = canvasRef.current?.toDataURL("image/png");
            if (url) {
              onSave(url);
              setEditing(false);
            }
          }}
        >
          <Check /> Accept signature
        </Button>
      </div>
    </div>
  );
}
