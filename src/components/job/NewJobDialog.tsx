import { useNavigate } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusLabel, useStore } from "@/lib/store";
import type { JobStatus } from "@/lib/types";

const STATUSES: JobStatus[] = ["pending", "scheduled", "en_route", "in_progress", "completed"];

export function NewJobDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string;
}) {
  const { createJob, customers, today } = useStore();
  const navigate = useNavigate();
  const blank = () => ({
    title: "",
    customerName: "",
    address: "",
    date: defaultDate ?? today,
    startTime: "09:00",
    endTime: "10:00",
    status: "scheduled" as JobStatus,
  });
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Picking a known customer fills in their address.
  const onCustomer = (name: string) => {
    set("customerName", name);
    const match = customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (match?.address && !form.address) set("address", match.address);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.endTime <= form.startTime) {
      toast.error("End time must be after the start time.");
      return;
    }
    setSaving(true);
    try {
      const { queued } = await createJob(form);
      if (queued) toast("Job saved on this device", { description: "It will upload to the cloud when you have signal." });
      else toast.success("Job saved");
      onOpenChange(false);
      if (form.date) void navigate({ to: "/schedule" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">New job</DialogTitle>
          <DialogDescription>Add a stop to your schedule. Works offline too.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field id="job-title" label="Job title">
            <Input
              id="job-title"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. A/C not cooling"
              className="h-11 rounded-xl"
            />
          </Field>
          <Field id="job-customer" label="Customer name">
            <Input
              id="job-customer"
              required
              maxLength={200}
              list="job-customer-list"
              value={form.customerName}
              onChange={(e) => onCustomer(e.target.value)}
              placeholder="Existing or new customer"
              className="h-11 rounded-xl"
              autoComplete="off"
            />
            <datalist id="job-customer-list">
              {customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </Field>
          <Field id="job-address" label="Service address">
            <Input
              id="job-address"
              required
              maxLength={300}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street, city, ZIP"
              className="h-11 rounded-xl"
              autoComplete="street-address"
            />
          </Field>
          <Field id="job-date" label="Scheduled date">
            <Input
              id="job-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="h-11 rounded-xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field id="job-start" label="Start time">
              <Input
                id="job-start"
                type="time"
                required
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className="tabular h-11 rounded-xl"
              />
            </Field>
            <Field id="job-end" label="End time">
              <Input
                id="job-end"
                type="time"
                required
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className="tabular h-11 rounded-xl"
              />
            </Field>
          </div>
          <Field id="job-status" label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v as JobStatus)}>
              <SelectTrigger id="job-status" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" variant="signal" size="xl" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save Job
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
