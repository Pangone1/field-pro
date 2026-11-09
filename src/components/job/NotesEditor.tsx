import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cleanUpNotes } from "@/lib/notes.functions";
import { useStore } from "@/lib/store";
import type { Job } from "@/lib/types";

export function NotesEditor({ job, onSave }: { job: Job; onSave: (notes: string) => void }) {
  const { online } = useStore();
  const [draft, setDraft] = useState(job.notes);
  const [previous, setPrevious] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cleanFn = useServerFn(cleanUpNotes);

  useEffect(() => setDraft(job.notes), [job.notes]);

  const dirty = draft !== job.notes;

  const runAI = async () => {
    if (!draft.trim()) {
      toast("Write some notes first", { description: "AI Notes+ tidies up what you've typed." });
      return;
    }
    setLoading(true);
    try {
      const res = await cleanFn({ data: { notes: draft, jobTitle: job.title, serviceType: job.serviceType } });
      if (res.ok) {
        setPrevious(draft);
        setDraft(res.text);
        onSave(res.text);
        toast.success("Notes cleaned up", { description: "Review the result — tap Undo to restore." });
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Couldn't reach AI Notes+. Your notes are unchanged.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => dirty && onSave(draft)}
          placeholder="What did you find? What did you do? Parts used, readings, recommendations…"
          className="min-h-36 resize-y rounded-xl bg-card text-[15px] leading-relaxed"
          disabled={loading}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/70 backdrop-blur-[2px]">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Loader2 className="size-4 animate-spin" /> Gemini is tidying your notes…
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="signal" onClick={runAI} disabled={loading || !online} className="flex-1">
          <Sparkles /> Clean Up Notes (AI)
        </Button>
        {previous !== null && !loading && (
          <Button
            variant="outline"
            onClick={() => {
              setDraft(previous);
              onSave(previous);
              setPrevious(null);
            }}
          >
            <Undo2 /> Undo
          </Button>
        )}
        {dirty && !loading && (
          <Button variant="ink" onClick={() => onSave(draft)}>
            Save
          </Button>
        )}
      </div>
      {!online && <p className="text-xs text-muted-foreground">AI Notes+ needs signal. Notes still save offline.</p>}
    </div>
  );
}
