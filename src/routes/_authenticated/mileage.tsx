import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MapPin, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, PageHeader, Section } from "@/components/app/PageHeader";
import { useNow } from "@/components/app/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration, formatTime, toDateKey } from "@/lib/links";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/mileage")({
  head: () => ({
    meta: [
      { title: "Mileage Tracker — FieldPro" },
      { name: "description", content: "Log trips with start and end addresses, elapsed time and odometer readings." },
      { property: "og:title", content: "Mileage Tracker — FieldPro" },
      { property: "og:description", content: "Log trips with start and end addresses, elapsed time and odometer readings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MileagePage,
});

function MileagePage() {
  const { trips, activeTripId, startTrip, endTrip, today } = useStore();
  const now = useNow();
  const active = trips.find((t) => t.id === activeTripId);
  const lastOdo = trips.reduce((m, t) => Math.max(m, t.endOdometer ?? t.startOdometer), 0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [odo, setOdo] = useState("");
  const [busy, setBusy] = useState(false);

  // While a trip runs, the inputs show its addresses so the destination can still be corrected.
  useEffect(() => {
    if (active) {
      setFrom(active.addressFrom);
      setTo(active.addressTo);
    }
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const todaysTrips = trips.filter((t) => toDateKey(new Date(t.startAt)) === today);
  const miles = todaysTrips.reduce((s, t) => s + (t.endOdometer !== null ? t.endOdometer - t.startOdometer : 0), 0);
  const log = [...trips].sort((a, b) => b.startAt - a.startAt);

  const toggle = async () => {
    const reading = odo ? Number(odo) : lastOdo;
    if (!Number.isFinite(reading) || reading < 0) {
      toast.error("Enter a valid odometer reading.");
      return;
    }
    setBusy(true);
    try {
      if (active) {
        if (reading < active.startOdometer) {
          toast.error("End odometer can't be lower than the start reading.");
          return;
        }
        const { queued, trip } = await endTrip({ odometer: reading, addressTo: to });
        const msg = `Trip ended · ${(reading - trip.startOdometer).toFixed(1)} mi · ${formatDuration((trip.elapsedSeconds ?? 0) * 1000)}`;
        if (queued) toast(msg, { description: "Saved on this device — uploads when you have signal." });
        else toast.success(msg);
        setFrom("");
        setTo("");
      } else {
        if (!from.trim()) {
          toast.error("Add where you're starting from.");
          return;
        }
        const purpose = to.trim() ? `${from.trim()} → ${to.trim()}` : from.trim();
        const { queued } = await startTrip({ purpose, odometer: reading, addressFrom: from, addressTo: to });
        toast.success("Trip started", queued ? { description: "Saved on this device for now." } : undefined);
      }
      setOdo("");
    } finally {
      setBusy(false);
    }
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
                Trip in progress · {formatDuration(now - active.startAt)} · from {active.startOdometer.toFixed(1)}
              </div>
            )}
            <div className="mt-4 space-y-2">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-success" />
                <Input
                  aria-label="Address From"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  disabled={!!active}
                  placeholder="Address From"
                  className="h-11 rounded-xl pl-9"
                  autoComplete="street-address"
                />
              </div>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-destructive" />
                <Input
                  aria-label="Address To"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Address To"
                  className="h-11 rounded-xl pl-9"
                  autoComplete="street-address"
                />
              </div>
              <Input
                aria-label="Odometer reading"
                value={odo}
                onChange={(e) => setOdo(e.target.value)}
                inputMode="decimal"
                placeholder={`Odometer (last: ${lastOdo.toFixed(1)})`}
                className="tabular h-11 rounded-xl"
              />
              <Button
                variant={active ? "destructive" : "signal"}
                size="xl"
                className="w-full"
                onClick={toggle}
                disabled={busy}
              >
                {active ? <Square /> : <Play />}
                {active ? "End Trip" : "Start Trip"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Section title="Trip log">
        <Card className="overflow-hidden">
          {log.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No trips yet. Start one above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Trip</th>
                  <th className="px-2 py-2 text-right font-semibold">Time</th>
                  <th className="px-3 py-2 text-right font-semibold">Odometer</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {log.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[13px] font-semibold">
                        <span className="line-clamp-1">{t.addressFrom || "—"}</span>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                        <span className="line-clamp-1">{t.addressTo || "—"}</span>
                      </div>
                      <div className="tabular text-[11px] text-muted-foreground">
                        {new Date(t.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
                        {formatTime(t.startAt)}
                        {t.endAt ? ` – ${formatTime(t.endAt)}` : " · in progress"}
                      </div>
                    </td>
                    <td className="tabular px-2 py-2.5 text-right text-xs">
                      {t.elapsedSeconds !== null ? formatDuration(t.elapsedSeconds * 1000) : formatDuration(now - t.startAt)}
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-xs">
                      <div>{t.startOdometer.toFixed(1)}</div>
                      <div className="font-semibold">{t.endOdometer !== null ? t.endOdometer.toFixed(1) : "…"}</div>
                      {t.endOdometer !== null && (
                        <div className="text-[11px] text-success">+{(t.endOdometer - t.startOdometer).toFixed(1)} mi</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </Section>
    </div>
  );
}
