import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, DatabaseBackup, FileText, LogOut, Moon, ReceiptText, Signal, Sun } from "lucide-react";
import { toast } from "sonner";

import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { formatDuration, formatTime } from "@/lib/links";
import { supabase } from "@/integrations/supabase/client";
import { clearOfflineData, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useNow } from "./TopBar";

export function AppDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { clockedIn, toggleClock, timeEntries, theme, setTheme, simulateOffline, setSimulateOffline, networkOnline, email, outbox } =
    useStore();
  const navigate = useNavigate();
  const signOut = async () => {
    if (outbox.length > 0 && !window.confirm(`${outbox.length} change(s) haven't uploaded yet and will be lost. Sign out anyway?`)) return;
    await supabase.auth.signOut();
    await clearOfflineData();
    onOpenChange(false);
    void navigate({ to: "/auth" });
  };
  const now = useNow();
  const openEntry = timeEntries.find((e) => e.clockOut === null);
  const workedMs = timeEntries.reduce((sum, e) => sum + ((e.clockOut ?? now) - e.clockIn), 0);

  const links = [
    { to: "/invoices", label: "Invoices", icon: FileText },
    { to: "/expenses", label: "Expense Scanner", icon: ReceiptText },
    { to: "/backups", label: "Cloud Backup Hub", icon: DatabaseBackup },
  ] as const;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-xl">Menu</DrawerTitle>
          <DrawerDescription>Timesheet, tools and settings</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-4 pb-8">
          {/* Timesheet */}
          <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
            {clockedIn && <div className="hazard-strip h-1.5" />}
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="eyebrow">Timesheet · today</div>
                <div className="tabular mt-1 text-2xl font-bold">{formatDuration(workedMs)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {openEntry ? `On the clock since ${formatTime(openEntry.clockIn)}` : "You're off the clock"}
                </div>
              </div>
              <button
                onClick={() => {
                  toggleClock();
                  toast(clockedIn ? "Clocked out" : "Clocked in", { description: formatTime(Date.now()) });
                }}
                aria-pressed={clockedIn}
                className={cn(
                  "flex size-20 shrink-0 flex-col items-center justify-center rounded-full font-display text-xs font-extrabold uppercase tracking-wide transition-all active:scale-95",
                  clockedIn ? "bg-destructive text-destructive-foreground" : "bg-signal text-primary-foreground shadow-glow",
                )}
              >
                {clockedIn ? "Clock out" : "Clock in"}
              </button>
            </div>
            <div className="border-t px-4 py-2.5">
              {timeEntries.map((e) => (
                <div key={e.id} className="tabular flex justify-between py-0.5 text-xs text-muted-foreground">
                  <span>
                    {formatTime(e.clockIn)} → {e.clockOut ? formatTime(e.clockOut) : "now"}
                  </span>
                  <span>{formatDuration((e.clockOut ?? now) - e.clockIn)}</span>
                </div>
              ))}
            </div>
          </section>

          <nav className="overflow-hidden rounded-2xl border bg-card">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 border-b px-4 py-3.5 text-sm font-semibold last:border-b-0 hover:bg-muted"
              >
                <Icon className="size-5 text-primary" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </nav>

          <section className="overflow-hidden rounded-2xl border bg-card">
            <label className="flex items-center gap-3 border-b px-4 py-3.5 text-sm font-semibold">
              {theme === "dark" ? <Moon className="size-5 text-primary" /> : <Sun className="size-5 text-primary" />}
              <span className="flex-1">Dark mode</span>
              <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
            </label>
            <label className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold">
              <Signal className="size-5 text-primary" />
              <span className="flex-1">
                Simulate no signal
                <span className="block text-xs font-normal text-muted-foreground">
                  Device network: {networkOnline ? "connected" : "disconnected"}
                </span>
              </span>
              <Switch checked={simulateOffline} onCheckedChange={setSimulateOffline} />
            </label>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-card">
            <button onClick={signOut} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold">
              <LogOut className="size-5 text-primary" />
              <span className="flex-1">
                Sign out
                <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
              </span>
            </button>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
