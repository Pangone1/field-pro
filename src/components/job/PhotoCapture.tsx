import { Camera, ImagePlus, X } from "lucide-react";
import { useRef } from "react";

import type { JobPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PhotoCapture({
  photos,
  onAdd,
  onRemove,
}: {
  photos: JobPhoto[];
  onAdd: (kind: "pre" | "post", files: FileList) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["pre", "post"] as const).map((kind) => (
        <PhotoColumn
          key={kind}
          kind={kind}
          photos={photos.filter((p) => p.kind === kind)}
          onAdd={(files) => onAdd(kind, files)}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function PhotoColumn({
  kind,
  photos,
  onAdd,
  onRemove,
}: {
  kind: "pre" | "post";
  photos: JobPhoto[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold">{kind === "pre" ? "Before work" : "After work"}</span>
        <span className="tabular text-[11px] text-muted-foreground">{photos.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
            <img src={p.url} alt={`${kind} photo`} className="size-full object-cover" />
            <button
              onClick={() => onRemove(p.id)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/70 text-ink-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary",
            photos.length === 0 && "col-span-2 aspect-[2/1]",
          )}
        >
          {photos.length === 0 ? <Camera className="size-6" /> : <ImagePlus className="size-5" />}
          <span className="text-[11px] font-semibold">{photos.length === 0 ? "Take photo" : "Add"}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onAdd(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
