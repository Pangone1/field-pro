import { createFileRoute } from "@tanstack/react-router";
import { Play, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, PageHeader, Section } from "@/components/app/PageHeader";
import { useNow } from "@/components/app/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration, formatTime } from "@/lib/links";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/mileage")({
  head: () => ({
    meta: [
      { title: "Mileage Tracker — FieldPro" },
      { name: "description", content: "Start and end trips, track today's miles and odometer readings." },
      { property: "og:title", content: "Mileage Tracker — FieldPro" },
      { property: "og:description", content: "Start and end trips, track today's miles and odometer readings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MileagePage,
});

function MileagePage() {
  const { trips, activeTripId, startTrip, endTrip } = useStore();
  const now = useNow();
  const active = trips.find((t) => t.id === activeTripId);
  const lastOdo = trips.reduce((m, t) => Math.max(m, t.endOdometer ?? t.startOdometer), 0);
  const [purpose, setPurpose] = useState("");
  const [odo, setOdo] = useState("");
  const miles = trips.reduce((s, t) => s + (t.endOdometer !== null ? t.endOdometer - t.startOdometer : 0), 0);

  const log = trips
    .flatMap((t) => [
      { at: t.startAt, event: "Start", odo: t.startOdometer, purpose: t.purpose },
      ...(t.endAt !== null && t.endOdometer !== null
        ? [{ at: t.endAt, event: "End", odo: t.endOdometer, purpose: t.purpose }]
        : []),
    ])
    .sort((a, b) => b.at - a.at);

  const toggle = () => {
    const reading = odo ? Number(odo) : lastOdo;
    if (active) {
      if (reading < active.startOdometer) {
        toast.error("End odometer can't be lower than the start reading.");
        return;
      }
      endTrip(reading);
      toast.success(`Trip ended · ${(reading - active.startOdometer).toFixed(1)} mi`);
    } else {
      startTrip(purpose.trim() || "Business trip", reading);
      toast.success("Trip started");
    }
    setOdo("");
    setPurpose("");
  };

  return (
    <div>
      <PageHeader eyebrow="GPS & mileage" title="Mileage" />
      <div className="px-4">
        <Card className="overflow-hidden">
          {active && <div className="hazard-strip h-1.5" />}
          <div className="p-4">
            <div className="eyebrow">Today's total</div>
            <div className="tabular text-5xl font-bold">
              {miles.toFixed(1)} <span className="text-lg text-muted-foreground">mi</span>
            </div>
            {active && (
              <div className="tabular mt-1 text-sm text-primary">
                Trip in progress · {formatDuration(now - active.startAt)} · {active.purpose}
              </div>
            )}
            <div className="mt-4 space-y-2">
              {!active && (
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Trip purpose (e.g. Supply house → job)"
                  className="h-11 rounded-xl"
                />
              )}
              <Input
                value={odo}
                onChange={(e) => setOdo(e.target.value)}
                inputMode="decimal"
                placeholder={`Odometer (last: ${lastOdo.toFixed(1)})`}
                className="tabular h-11 rounded-xl"
              />
              <Button variant={active ? "destructive" : "signal"} size="xl" className="w-full" onClick={toggle}>
                {active ? <Square /> : <Play />}
                {active ? "End Trip" : "Start Trip"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Section title="Activity log">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-semibold">Time</th>
                <th className="px-2 py-2 font-semibold">Event</th>
                <th className="px-4 py-2 text-right font-semibold">Odometer</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {log.map((row, i) => (
                <tr key={i}>
                  <td className="tabular px-4 py-2.5 text-xs">{formatTime(row.at)}</td>
                  <td className="px-2 py-2.5">
                    <div className={row.event === "Start" ? "font-semibold text-success" : "font-semibold"}>{row.event}</div>
                    <div className="line-clamp-1 text-[11px] text-muted-foreground">{row.purpose}</div>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right">{row.odo.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>
    </div>
  );
}
