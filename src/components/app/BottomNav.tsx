import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, Gauge, Menu, Receipt } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { AppDrawer } from "./AppDrawer";

const tabs = [
  { to: "/today", label: "Today", icon: ClipboardList, match: (p: string) => p.startsWith("/today") || p.startsWith("/jobs") },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, match: (p: string) => p.startsWith("/schedule") },
  {
    to: "/estimates",
    label: "Billing",
    icon: Receipt,
    match: (p: string) => p.startsWith("/estimates") || p.startsWith("/invoices") || p.startsWith("/pay"),
  },
  { to: "/mileage", label: "Mileage", icon: Gauge, match: (p: string) => p.startsWith("/mileage") },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const moreActive = pathname.startsWith("/expenses") || pathname.startsWith("/backups");

  return (
    <>
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-card/95 shadow-float backdrop-blur-xl"
      >
        <ul className="grid h-16 grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {active && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary" />}
                  <Icon className={cn("size-[22px]", active && "text-primary")} strokeWidth={active ? 2.4 : 2} />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                moreActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {moreActive && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary" />}
              <Menu className={cn("size-[22px]", moreActive && "text-primary")} />
              More
            </button>
          </li>
        </ul>
      </nav>
      <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
