import { CloudOff, CloudUpload, Inbox, RefreshCw, Timer, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { formatDuration, formatTime } from "@/lib/links";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export { useNow };

export function ClockPill() {
  const { clockedIn, timeEntries } = useStore();
  const now = useNow();
  const open = timeEntries.find((e) => e.clockOut === null);
  if (!clockedIn || !open) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        <Timer className="size-3.5" /> Off clock
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
      <span className="size-1.5 rounded-full bg-success animate-pulse-ring" />
      <span className="tabular">{formatDuration(now - open.clockIn)}</span>
    </span>
  );
}

export function StatusIndicator() {
  const { online } = useStore();
  return (
    <span
      role="status"
      aria-label={online ? "Online" : "Offline"}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
      )}
    >
      {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function OutboxButton() {
  const { outbox, online, flushOutbox } = useStore();
  const count = outbox.length;
  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <button
          aria-label={`Outbox, ${count} pending`}
          className="relative flex size-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
        >
          <Inbox className="size-[18px]" />
          {count > 0 && (
            <span className="tabular absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 font-display text-xl">
            Outbox <span className="tabular text-base text-muted-foreground">({count})</span>
          </DrawerTitle>
          <DrawerDescription>
            {online
              ? "You're online. Pending changes are ready to upload."
              : "You're offline. These changes will upload when signal returns."}
          </DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-4">
          {count === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <CloudUpload className="size-8" />
              Everything is synced.
            </div>
          )}
          {[...outbox].reverse().map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
              <span className="eyebrow w-16 shrink-0">{item.kind}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
              <span className="tabular shrink-0 text-[11px] text-muted-foreground">{formatTime(item.at)}</span>
            </div>
          ))}
        </div>
        <DrawerFooter>
          <Button
            variant={online ? "signal" : "secondary"}
            size="lg"
            disabled={!online || count === 0}
            onClick={() => {
              flushOutbox();
              toast.success(`Uploaded ${count} change${count === 1 ? "" : "s"}`);
            }}
          >
            {online ? <RefreshCw /> : <CloudOff />}
            {online ? "Sync now" : "Waiting for signal"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function TopBar() {
  const { business } = useStore();
  return (
    <header className="pt-safe sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <img src="/icon-192.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
          <div className="min-w-0 leading-tight">
            <div className="font-display text-[15px] font-extrabold tracking-tight">FieldPro</div>
            <div className="truncate text-[11px] text-muted-foreground">{business.owner}</div>
          </div>
        </div>
        <ClockPill />
        <StatusIndicator />
        <OutboxButton />
      </div>
    </header>
  );
}
