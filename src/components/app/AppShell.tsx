import type { ReactNode } from "react";

import { BottomNav } from "@/components/app/BottomNav";
import { TopBar } from "@/components/app/TopBar";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider, useStore } from "@/lib/store";

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <img src="/icon-192.png" alt="" width={72} height={72} className="size-18 rounded-2xl" />
      <div className="font-display text-lg font-extrabold">FieldPro</div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
        <div className="hazard-strip h-full w-full animate-pulse" />
      </div>
    </div>
  );
}

function AppToaster() {
  const { theme } = useStore();
  return <Toaster theme={theme} position="top-center" offset={64} />;
}

/** Signed-in app chrome: data store, top bar, bottom tabs. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider splash={<Splash />}>
      <div className="relative mx-auto min-h-dvh max-w-md bg-background sm:border-x">
        <TopBar />
        <main className="pb-28">{children}</main>
        <BottomNav />
      </div>
      <AppToaster />
    </StoreProvider>
  );
}
