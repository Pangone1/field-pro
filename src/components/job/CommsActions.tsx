import { Clock, MessageSquareText, Phone, PhoneOff, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration, smsLink } from "@/lib/links";
import { useStore } from "@/lib/store";
import type { Customer, Job } from "@/lib/types";

type Template = "omw" | "late";

export function CommsActions({ job, customer }: { job: Job; customer: Customer }) {
  const { business, logJobActivity } = useStore();
  const [template, setTemplate] = useState<Template | null>(null);
  const [eta, setEta] = useState(20);
  const [body, setBody] = useState("");
  const [calling, setCalling] = useState(false);

  const first = customer.name.split(" ")[0] ?? customer.name;

  useEffect(() => {
    if (template === "omw") {
      setBody(
        `Hi ${first}, this is ${business.owner.split(" ")[0]} with ${business.name}. I'm on my way to ${job.address.split(",")[0]} — ETA about ${eta} minutes.`,
      );
    } else if (template === "late") {
      setBody(
        `Hi ${first}, ${business.owner.split(" ")[0]} with ${business.name} here. I'm running about ${eta} minutes behind schedule — sorry for the wait! I'll be there as soon as I can.`,
      );
    }
  }, [template, eta, first, business, job.address]);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <ActionTile icon={Truck} label="On my way" onClick={() => (setEta(20), setTemplate("omw"))} />
        <ActionTile icon={Clock} label="Running late" onClick={() => (setEta(15), setTemplate("late"))} />
        <ActionTile icon={Phone} label="Call customer" onClick={() => setCalling(true)} primary />
      </div>

      <Drawer open={template !== null} onOpenChange={(o) => !o && setTemplate(null)} shouldScaleBackground={false}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 font-display">
              <MessageSquareText className="size-5 text-primary" />
              {template === "omw" ? "On my way" : "Running late"} text
            </DrawerTitle>
            <DrawerDescription>
              To {customer.name} · {customer.phone}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4">
            <div className="flex gap-2">
              {[10, 15, 20, 30, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => setEta(m)}
                  className={`tabular flex-1 rounded-lg border py-2 text-sm font-semibold ${eta === m ? "border-primary bg-accent text-accent-foreground" : "bg-card"}`}
                >
                  {m}m
                </button>
              ))}
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-28 rounded-xl" />
          </div>
          <DrawerFooter>
            <Button asChild variant="signal" size="lg">
              <a
                href={smsLink(customer.phone, body)}
                onClick={() => {
                  logJobActivity(job.id, `SMS sent: ${template === "omw" ? "On my way" : "Running late"} (${eta} min)`);
                  setTemplate(null);
                }}
              >
                <MessageSquareText /> Open in Messages
              </a>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <CallSheet open={calling} onClose={() => setCalling(false)} customer={customer} maskedLine={business.maskedLine} onEnd={(d) => logJobActivity(job.id, `Call via business line (${d})`)} />
    </>
  );
}

function ActionTile({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof Phone;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-all active:scale-95 ${primary ? "border-transparent bg-ink text-ink-foreground" : "bg-card hover:bg-muted"}`}
    >
      <Icon className={`size-5 ${primary ? "" : "text-primary"}`} />
      {label}
    </button>
  );
}

/** Masked VoIP call UI. Wire `connect` to your VoIP provider's click-to-call API. */
function CallSheet({
  open,
  onClose,
  customer,
  maskedLine,
  onEnd,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer;
  maskedLine: string;
  onEnd: (duration: string) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "connecting" | "live">("ready");
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!open) setPhase("ready");
  }, [open]);

  useEffect(() => {
    if (phase === "connecting") {
      const t = window.setTimeout(() => {
        setPhase("live");
        setStartedAt(Date.now());
      }, 1800);
      return () => window.clearTimeout(t);
    }
    if (phase === "live") {
      const t = window.setInterval(() => setNow(Date.now()), 1000);
      return () => window.clearInterval(t);
    }
    return undefined;
  }, [phase]);

  const end = () => {
    if (phase === "live") onEnd(formatDuration(Date.now() - startedAt));
    setPhase("ready");
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && end()} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="items-center text-center">
          <div className="relative mb-2 flex size-20 items-center justify-center rounded-full bg-ink font-display text-2xl font-extrabold text-ink-foreground">
            {customer.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
            {phase !== "ready" && <span className="absolute inset-0 rounded-full text-success animate-pulse-ring" />}
          </div>
          <DrawerTitle className="font-display text-xl">{customer.name}</DrawerTitle>
          <DrawerDescription className="tabular">
            {phase === "ready" && customer.phone}
            {phase === "connecting" && "Connecting through business line…"}
            {phase === "live" && formatDuration(Math.max(0, now - startedAt))}
          </DrawerDescription>
        </DrawerHeader>
        <div className="mx-4 flex items-start gap-3 rounded-xl bg-success/10 p-3 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <div className="font-semibold">Your personal number is hidden</div>
            <div className="text-muted-foreground">
              Customer sees <span className="tabular font-semibold text-foreground">{maskedLine}</span> on caller ID.
            </div>
          </div>
        </div>
        <DrawerFooter>
          {phase === "ready" ? (
            <Button variant="success" size="xl" onClick={() => setPhase("connecting")}>
              <Phone /> Call via business line
            </Button>
          ) : (
            <Button variant="destructive" size="xl" onClick={end}>
              <PhoneOff /> End call
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
