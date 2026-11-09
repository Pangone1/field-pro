import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, GripVertical, Navigation } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { addDays, formatHour, fromDateKey, googleMapsDirections } from "@/lib/links";
import { useStore } from "@/lib/store";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — FieldPro" },
      { name: "description", content: "Drag-and-drop daily and weekly calendar for your jobs." },
      { property: "og:title", content: "Schedule — FieldPro" },
      { property: "og:description", content: "Drag-and-drop daily and weekly calendar for your jobs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchedulePage,
});

const START = 7;
const END = 19;
const SLOT_PX = 34; // per half hour

function SchedulePage() {
  const { jobs, today, rescheduleJob, customers } = useStore();
  const [view, setView] = useState<"day" | "week">("day");
  const [day, setDay] = useState(today);
  const [dragging, setDragging] = useState<Job | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const weekStart = (() => {
    const d = fromDateKey(day);
    return addDays(day, -((d.getDay() + 6) % 7)); // Monday
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const onStart = (e: DragStartEvent) => setDragging(jobs.find((j) => j.id === e.active.id) ?? null);
  const onEnd = (e: DragEndEvent) => {
    setDragging(null);
    const job = jobs.find((j) => j.id === e.active.id);
    const over = e.over?.id;
    if (!job || typeof over !== "string") return;
    const [kind, a, b] = over.split("|");
    if (kind === "slot" && a && b) {
      const hour = Number(b);
      if (hour + job.durationHrs > END) {
        toast.error("That job would run past the end of your day.");
        return;
      }
      rescheduleJob(job.id, a, hour);
      if (hour !== job.startHour) toast.success(`Moved to ${formatHour(hour)}`);
    } else if (kind === "day" && a) {
      rescheduleJob(job.id, a, job.startHour);
      if (a !== job.date)
        toast.success(`Moved to ${fromDateKey(a).toLocaleDateString("en-US", { weekday: "long" })}`);
    }
  };

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "";

  return (
    <div>
      <PageHeader
        eyebrow={view === "day" ? "Daily calendar" : "Weekly calendar"}
        title="Schedule"
        action={
          <div className="flex rounded-lg bg-muted p-1 text-xs font-bold">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 capitalize transition-colors",
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      {/* Date strip */}
      <div className="flex items-center gap-1 px-2">
        <button
          aria-label="Previous week"
          onClick={() => setDay(addDays(day, -7))}
          className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const date = fromDateKey(d);
            const count = jobs.filter((j) => j.date === d).length;
            const selected = d === day;
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={cn(
                  "flex flex-col items-center rounded-xl py-1.5 transition-colors",
                  selected ? "bg-ink text-ink-foreground" : "hover:bg-muted",
                )}
              >
                <span className={cn("text-[10px] font-semibold uppercase", !selected && "text-muted-foreground")}>
                  {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
                <span className={cn("tabular text-base font-bold", d === today && !selected && "text-primary")}>
                  {date.getDate()}
                </span>
                <span className="flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span key={i} className={cn("size-1 rounded-full", selected ? "bg-primary" : "bg-muted-foreground/50")} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <button
          aria-label="Next week"
          onClick={() => setDay(addDays(day, 7))}
          className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <p className="flex items-center gap-1.5 px-4 pb-2 pt-3 text-xs text-muted-foreground">
        <GripVertical className="size-3.5" /> Press and hold a job, then drag to reschedule.
      </p>

      <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragging(null)}>
        {view === "day" ? (
          <DayGrid day={day} jobs={jobs.filter((j) => j.date === day)} customerName={customerName} />
        ) : (
          <div className="space-y-2 px-4">
            {weekDays.map((d) => (
              <WeekRow key={d} day={d} isToday={d === today} jobs={jobs.filter((j) => j.date === d)} />
            ))}
          </div>
        )}
        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="rounded-xl border-2 border-primary bg-card px-3 py-2 shadow-glow">
              <div className="text-sm font-bold">{dragging.title}</div>
              <div className="tabular text-xs text-muted-foreground">{dragging.durationHrs}h</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DayGrid({ day, jobs, customerName }: { day: string; jobs: Job[]; customerName: (id: string) => string }) {
  const slots = Array.from({ length: (END - START) * 2 }, (_, i) => START + i / 2);
  return (
    <div className="relative mx-4 overflow-hidden rounded-2xl border bg-card shadow-card">
      {slots.map((h) => (
        <Slot key={h} day={day} hour={h} />
      ))}
      <div className="pointer-events-none absolute inset-y-0 left-14 right-2">
        {jobs.map((job) => (
          <DayJob key={job.id} job={job} customer={customerName(job.customerId)} />
        ))}
      </div>
    </div>
  );
}

function Slot({ day, hour }: { day: string; hour: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot|${day}|${hour}` });
  const full = Number.isInteger(hour);
  return (
    <div
      ref={setNodeRef}
      style={{ height: SLOT_PX }}
      className={cn(
        "flex border-b last:border-b-0",
        !full && "border-dashed",
        isOver && "bg-accent",
      )}
    >
      <span className="tabular w-14 shrink-0 pl-3 pt-1 text-[10px] text-muted-foreground">
        {full ? formatHour(hour).replace(":00", "") : ""}
      </span>
    </div>
  );
}

function DayJob({ job, customer }: { job: Job; customer: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const top = (job.startHour - START) * 2 * SLOT_PX + 2;
  const height = job.durationHrs * 2 * SLOT_PX - 4;
  const active = job.status === "in_progress" || job.status === "en_route";
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ top, height }}
      className={cn(
        "pointer-events-auto absolute inset-x-0 flex touch-manipulation overflow-hidden rounded-xl border-l-4 px-3 py-1.5 text-left transition-opacity select-none",
        job.status === "completed"
          ? "border-success bg-success/10"
          : active
            ? "border-primary bg-accent"
            : "border-info bg-info/10",
        isDragging && "opacity-30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold leading-tight">{job.title}</div>
        {height > 40 && (
          <div className="truncate text-[11px] text-muted-foreground">
            {formatHour(job.startHour)} · {customer}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <Link
          to="/jobs/$jobId"
          params={{ jobId: job.id }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-[11px] font-semibold text-primary"
        >
          Open
        </Link>
        {height > 60 && (
          <a
            href={googleMapsDirections(job.address)}
            target="_blank"
            rel="noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Navigate"
            className="text-primary"
          >
            <Navigation className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function WeekRow({ day, jobs, isToday }: { day: string; jobs: Job[]; isToday: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day|${day}` });
  const date = fromDateKey(day);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-16 gap-3 rounded-2xl border bg-card p-3 shadow-card transition-colors",
        isOver && "border-primary bg-accent",
      )}
    >
      <div className="w-10 shrink-0 text-center">
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </div>
        <div className={cn("tabular text-xl font-bold", isToday && "text-primary")}>{date.getDate()}</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {jobs.length === 0 && <div className="py-2 text-xs text-muted-foreground">Open day — drop a job here</div>}
        {jobs
          .sort((a, b) => a.startHour - b.startHour)
          .map((j) => (
            <WeekChip key={j.id} job={j} />
          ))}
      </div>
    </div>
  );
}

function WeekChip({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex touch-manipulation items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 select-none",
        isDragging && "opacity-30",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="tabular shrink-0 text-[11px] font-semibold">{formatHour(job.startHour)}</span>
      <span className="truncate text-sm">{job.title}</span>
    </div>
  );
}
