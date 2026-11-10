import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock, MapPin, Navigation } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatHour, googleMapsDirections } from "@/lib/links";
import { statusLabel, useCustomer } from "@/lib/store";
import type { Job, JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const statusVariant: Record<JobStatus, "secondary" | "info" | "warning" | "success"> = {
  pending: "warning",
  scheduled: "secondary",
  en_route: "info",
  in_progress: "warning",
  completed: "success",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={statusVariant[status]}>{statusLabel(status)}</Badge>;
}

export function JobCard({ job, index }: { job: Job; index?: number }) {
  const customer = useCustomer(job.customerId);
  const done = job.checklist.filter((c) => c.done).length;
  const pct = job.checklist.length ? (done / job.checklist.length) * 100 : 0;
  const active = job.status === "in_progress" || job.status === "en_route";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-card transition-colors",
        active && "border-primary/60",
        job.status === "completed" && "opacity-75",
      )}
    >
      {active && <div className="hazard-strip absolute inset-y-0 left-0 w-1.5" />}
      <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="block p-4 pl-5">
        <div className="flex items-start gap-3">
          <div className="flex w-14 shrink-0 flex-col items-start">
            <span className="tabular text-sm font-bold">{formatHour(job.startHour).replace(" ", "\u00a0")}</span>
            <span className="text-[11px] text-muted-foreground">{job.durationHrs}h</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {index !== undefined && <span className="eyebrow">Stop {index + 1}</span>}
              <StatusBadge status={job.status} />
              {job.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
            </div>
            <h3 className="mt-1.5 text-base font-bold leading-snug">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{customer?.name}</p>
            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-px size-3.5 shrink-0" />
              <span className="line-clamp-1">{job.address}</span>
            </p>
          </div>
          <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
        </div>
        {job.checklist.length > 0 && (
          <div className="mt-3 flex items-center gap-2 pl-[68px]">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular text-[11px] text-muted-foreground">
              {done}/{job.checklist.length}
            </span>
          </div>
        )}
      </Link>
      <div className="flex border-t">
        <a
          href={googleMapsDirections(job.address)}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold text-primary hover:bg-muted"
        >
          <Navigation className="size-4" /> Navigate
        </a>
        <Link
          to="/jobs/$jobId"
          params={{ jobId: job.id }}
          className="flex flex-1 items-center justify-center gap-2 border-l py-2.5 text-sm font-semibold hover:bg-muted"
        >
          <Clock className="size-4" /> Open job
        </Link>
      </div>
    </article>
  );
}
