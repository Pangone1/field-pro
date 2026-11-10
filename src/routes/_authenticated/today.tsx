import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation, Plus, Route as RouteIcon } from "lucide-react";

import { JobCard } from "@/components/app/JobCard";
import { PageHeader, Section } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/billing";
import { fromDateKey, googleMapsDirections } from "@/lib/links";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today's Jobs — FieldPro" },
      { name: "description", content: "Your daily job schedule with one-tap navigation to every stop." },
      { property: "og:title", content: "Today's Jobs — FieldPro" },
      { property: "og:description", content: "Your daily job schedule with one-tap navigation to every stop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { jobs, today, invoices, trips, estimates } = useStore();
  const todays = jobs.filter((j) => j.date === today).sort((a, b) => a.startHour - b.startHour);
  const remaining = todays.filter((j) => j.status !== "completed");
  const next = remaining[0];
  const unpaid = invoices.filter((i) => i.status === "unpaid").length;
  const miles = trips
    .filter((t) => t.endOdometer !== null)
    .reduce((s, t) => s + ((t.endOdometer ?? 0) - t.startOdometer), 0);
  const pipeline = estimates
    .filter((e) => e.status === "draft" || e.status === "sent")
    .reduce((s, e) => s + e.tiers[e.selectedTier].items.reduce((a, i) => a + i.qty * i.unitPrice, 0), 0);

  const dateLabel = fromDateKey(today).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Multi-stop route: last remaining stop is the destination, the rest are waypoints.
  const routeUrl =
    remaining.length > 0
      ? (() => {
          const dest = remaining[remaining.length - 1]?.address ?? "";
          const waypoints = remaining
            .slice(0, -1)
            .map((j) => j.address)
            .join("|");
          let url = googleMapsDirections(dest);
          if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
          return url;
        })()
      : null;

  return (
    <div>
      <PageHeader eyebrow={dateLabel} title="Today's jobs" />

      <div className="grid grid-cols-3 gap-2 px-4">
        <Stat label="Stops left" value={`${remaining.length}/${todays.length}`} />
        <Stat label="Miles" value={miles.toFixed(1)} />
        <Link to="/invoices" className="block">
          <Stat label="Unpaid inv." value={String(unpaid)} />
        </Link>
      </div>

      {next && (
        <div className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-2xl bg-ink p-4 text-ink-foreground">
            <div className="hazard-strip absolute inset-x-0 top-0 h-1" />
            <div className="eyebrow text-ink-foreground/60">Up next</div>
            <div className="mt-1 font-display text-lg font-extrabold leading-tight">{next.title}</div>
            <div className="mt-0.5 line-clamp-1 text-sm text-ink-foreground/70">{next.address}</div>
            <div className="mt-3 flex gap-2">
              <Button asChild variant="signal" className="flex-1">
                <a href={googleMapsDirections(next.address)} target="_blank" rel="noreferrer">
                  <Navigation /> Navigate
                </a>
              </Button>
              {routeUrl && remaining.length > 1 && (
                <Button asChild variant="secondary" className="flex-1">
                  <a href={routeUrl} target="_blank" rel="noreferrer">
                    <RouteIcon /> Full route
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <Section
        title={`Schedule · ${todays.length} jobs`}
        action={
          <Link to="/schedule" className="flex items-center gap-1 text-xs font-semibold text-primary">
            <Plus className="size-3.5" /> Calendar
          </Link>
        }
      >
        <div className="space-y-3">
          {todays.map((job, i) => (
            <JobCard key={job.id} job={job} index={i} />
          ))}
        </div>
      </Section>

      {pipeline > 0 && (
        <Section title="Pipeline">
          <Link to="/estimates" className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-card">
            <span className="text-sm text-muted-foreground">Open estimates</span>
            <span className="tabular font-bold">{money(pipeline)}</span>
          </Link>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 shadow-card">
      <div className="tabular text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
