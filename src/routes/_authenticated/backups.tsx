import { createFileRoute } from "@tanstack/react-router";
import { Box, Check, Cloud, HardDrive, Loader2, type LucideIcon } from "lucide-react";

import { Card, PageHeader } from "@/components/app/PageHeader";
import { useStore } from "@/lib/store";
import type { BackupProvider } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/backups")({
  head: () => ({
    meta: [
      { title: "Cloud Backup Hub — FieldPro" },
      { name: "description", content: "Back up your jobs, invoices and records to your own cloud storage." },
      { property: "og:title", content: "Cloud Backup Hub — FieldPro" },
      { property: "og:description", content: "Back up your jobs, invoices and records to your own cloud storage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BackupsPage,
});

const PROVIDERS: { key: BackupProvider; label: string; icon: LucideIcon }[] = [
  { key: "gdrive", label: "Backup to Google Drive", icon: HardDrive },
  { key: "onedrive", label: "Backup to OneDrive", icon: Cloud },
  { key: "dropbox", label: "Backup to Dropbox", icon: Box },
];

function BackupsPage() {
  const { backups, runBackup } = useStore();
  return (
    <div>
      <PageHeader back eyebrow="Settings" title="Cloud Backup Hub" />
      <p className="px-4 pb-3 text-sm text-muted-foreground">
        Send a full copy of your jobs, customers, invoices, expenses and mileage to your own cloud storage.
      </p>
      <div className="space-y-2 px-4">
        {PROVIDERS.map(({ key, label, icon: Icon }) => {
          const b = backups[key];
          return (
            <Card key={key} className="overflow-hidden">
              <button
                onClick={() => runBackup(key)}
                disabled={b.status === "running"}
                className="flex w-full items-center gap-3 p-4 text-left disabled:opacity-80"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  {b.status === "running" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : b.status === "done" ? (
                    <Check className="size-5" />
                  ) : (
                    <Icon className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.status === "running"
                      ? `Uploading… ${Math.round(b.progress)}%`
                      : b.lastBackupAt
                        ? `Last backup ${new Date(b.lastBackupAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                        : "Never backed up"}
                  </div>
                </div>
              </button>
              {b.status === "running" && (
                <div className="h-1 bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${b.progress}%` }} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
