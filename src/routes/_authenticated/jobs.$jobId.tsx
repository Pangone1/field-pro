import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  Clock,
  FileText,
  History,
  Mail,
  MapPin,
  Navigation,
  StickyNote,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Card, PageHeader, Section } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/JobCard";
import { CommsActions } from "@/components/job/CommsActions";
import { NotesEditor } from "@/components/job/NotesEditor";
import { PhotoCapture } from "@/components/job/PhotoCapture";
import { SignaturePad } from "@/components/job/SignaturePad";
import { Button } from "@/components/ui/button";
import { formatHour, formatTime, fromDateKey, googleMapsDirections, uid } from "@/lib/links";
import { statusLabel, useStore } from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Details — FieldPro" },
      { name: "description", content: "Customer, address, equipment history, checklist, photos, notes and signature." },
      { property: "og:title", content: "Job Details — FieldPro" },
      { property: "og:description", content: "Customer, address, equipment history, checklist, photos, notes and signature." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JobDetailsPage,
});

const FLOW: JobStatus[] = ["scheduled", "en_route", "in_progress", "completed"];

function JobDetailsPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const store = useStore();
  const job = store.jobs.find((j) => j.id === jobId);
  const customer = store.customers.find((c) => c.id === job?.customerId);

  if (!job || !customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">This job isn't on your schedule.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/today">Back to today</Link>
        </Button>
      </div>
    );
  }

  const stepIndex = FLOW.indexOf(job.status);
  const nextStatus = FLOW[stepIndex + 1];
  const done = job.checklist.filter((c) => c.done).length;
  const estimate = store.estimates.find((e) => e.jobId === job.id);
  const invoice = store.invoices.find((i) => i.jobId === job.id);

  const nextLabel: Record<JobStatus, string> = {
    scheduled: "",
    en_route: "Start driving",
    in_progress: "Arrived — start work",
    completed: "Complete job",
  };

  return (
    <div>
      <PageHeader
        back
        eyebrow={`${fromDateKey(job.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${formatHour(job.startHour)}`}
        title={job.title}
      />

      {/* Status stepper */}
      <div className="px-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={job.status} />
            <span className="text-xs text-muted-foreground">{job.serviceType}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {FLOW.map((s, i) => (
              <div key={s} className="space-y-1">
                <div className={cn("h-1.5 rounded-full", i <= stepIndex ? "bg-primary" : "bg-muted")} />
                <div className={cn("text-[10px] font-semibold", i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>
                  {statusLabel(s)}
                </div>
              </div>
            ))}
          </div>
          {nextStatus && (
            <Button
              variant={nextStatus === "completed" ? "success" : "signal"}
              size="lg"
              className="mt-4 w-full"
              onClick={() => {
                if (nextStatus === "completed" && !job.signature) {
                  toast.warning("Get the customer's signature before completing.");
                  document.getElementById("signature")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  return;
                }
                store.setJobStatus(job.id, nextStatus);
                toast.success(`Status → ${statusLabel(nextStatus)}`);
              }}
            >
              {nextStatus === "completed" ? <Check /> : <ChevronRight />}
              {nextLabel[nextStatus]}
            </Button>
          )}
        </Card>
      </div>

      {/* Customer */}
      <Section title="Customer">
        <Card className="overflow-hidden">
          <div className="p-4">
            <div className="text-lg font-bold">{customer.name}</div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular">{customer.phone}</span>
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-foreground">
                <Mail className="size-3" /> Email
              </a>
              <span>Since {fromDateKey(customer.customerSince).getFullYear()}</span>
            </div>
            {customer.notes && (
              <p className="mt-3 flex gap-2 rounded-lg bg-warning/15 p-2.5 text-xs">
                <StickyNote className="mt-px size-3.5 shrink-0" /> {customer.notes}
              </p>
            )}
          </div>
          <a
            href={googleMapsDirections(job.address)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 border-t px-4 py-3 hover:bg-muted"
          >
            <MapPin className="size-5 shrink-0 text-primary" />
            <span className="flex-1 text-sm">{job.address}</span>
            <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              <Navigation className="size-3.5" /> Go
            </span>
          </a>
        </Card>
        <div className="mt-3">
          <CommsActions job={job} customer={customer} />
        </div>
      </Section>

      {/* Equipment */}
      <Section title={`Equipment · ${customer.equipment.length}`}>
        {customer.equipment.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">No equipment on file yet.</Card>
        ) : (
          <div className="space-y-2">
            {customer.equipment.map((eq) => (
              <Card key={eq.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Wrench className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{eq.name}</div>
                    <div className="text-xs text-muted-foreground">{eq.model}</div>
                    <div className="tabular mt-0.5 text-[11px] text-muted-foreground">
                      S/N {eq.serial} · Installed {fromDateKey(eq.installed).getFullYear()}
                    </div>
                  </div>
                </div>
                {eq.history.length > 0 && (
                  <ol className="mt-3 space-y-2 border-l-2 border-muted pl-3">
                    {eq.history.map((h) => (
                      <li key={h.date} className="text-xs">
                        <span className="tabular font-semibold">
                          {fromDateKey(h.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                        <span className="text-muted-foreground"> — {h.summary}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* Checklist */}
      <Section title={`Checklist · ${done}/${job.checklist.length}`}>
        <Card className="divide-y overflow-hidden">
          {job.checklist.map((item) => (
            <button
              key={item.id}
              onClick={() => store.toggleChecklist(job.id, item.id)}
              aria-pressed={item.done}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                  item.done ? "border-success bg-success text-success-foreground" : "border-input",
                )}
              >
                {item.done && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span className={cn("text-sm", item.done && "text-muted-foreground line-through")}>{item.label}</span>
            </button>
          ))}
        </Card>
      </Section>

      {/* Photos */}
      <Section title={`Photos · ${job.photos.length}`}>
        <Card className="p-4">
          <PhotoCapture
            photos={job.photos}
            onAdd={(kind, files) => {
              const added = Array.from(files).map((f) => ({
                id: uid("ph"),
                kind,
                url: URL.createObjectURL(f),
                takenAt: Date.now(),
              }));
              store.updateJob(
                job.id,
                { photos: [...job.photos, ...added] },
                { kind: "photo", label: `${added.length} ${kind === "pre" ? "before" : "after"} photo(s) · ${job.title}` },
              );
            }}
            onRemove={(id) => store.updateJob(job.id, { photos: job.photos.filter((p) => p.id !== id) })}
          />
        </Card>
      </Section>

      {/* Notes */}
      <Section title="Job notes">
        <NotesEditor
          job={job}
          onSave={(notes) =>
            store.updateJob(job.id, { notes }, { kind: "note", label: `Notes updated · ${job.title}` })
          }
        />
      </Section>

      {/* Signature */}
      <Section title="Customer signature">
        <div id="signature">
          <SignaturePad
            value={job.signature}
            signerName={customer.name}
            onSave={(signature) =>
              store.updateJob(
                job.id,
                { signature },
                signature ? { kind: "signature", label: `Signature captured · ${customer.name}` } : undefined,
              )
            }
          />
        </div>
      </Section>

      {/* Billing */}
      <Section title="Billing">
        <div className="grid grid-cols-2 gap-2">
          {estimate ? (
            <Button asChild variant="outline" size="lg">
              <Link to="/estimates/$estimateId" params={{ estimateId: estimate.id }}>
                <FileText /> {estimate.number}
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const est = store.createEstimate(customer.id, job.id);
                navigate({ to: "/estimates/$estimateId", params: { estimateId: est.id } });
              }}
            >
              <FileText /> New estimate
            </Button>
          )}
          {invoice ? (
            <Button asChild variant="ink" size="lg">
              <Link to="/invoices/$invoiceId" params={{ invoiceId: invoice.id }}>
                <FileText /> {invoice.number}
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" size="lg" disabled>
              No invoice yet
            </Button>
          )}
        </div>
      </Section>

      {/* Activity */}
      {job.activity.length > 0 && (
        <Section title="Activity">
          <Card className="space-y-2 p-4">
            {[...job.activity].reverse().map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <History className="size-3.5 text-muted-foreground" />
                <span className="tabular w-16 shrink-0 text-muted-foreground">{formatTime(a.at)}</span>
                <span>{a.text}</span>
              </div>
            ))}
          </Card>
        </Section>
      )}
      <div className="flex items-center justify-center gap-1.5 px-4 pt-6 text-[11px] text-muted-foreground">
        <Clock className="size-3" /> {job.durationHrs}h scheduled · {job.serviceType}
      </div>
    </div>
  );
}
