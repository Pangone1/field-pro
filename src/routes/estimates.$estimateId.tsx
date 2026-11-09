import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRightLeft, Check, Plus, Save, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, PageHeader, Section } from "@/components/app/PageHeader";
import { TotalsBlock } from "@/components/billing/BillingTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeTotals, lineTotal, money } from "@/lib/billing";
import { uid } from "@/lib/links";
import { useStore } from "@/lib/store";
import type { Estimate, LineItem, TierKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/estimates/$estimateId")({
  head: () => ({
    meta: [
      { title: "Estimate Builder — FieldPro" },
      { name: "description", content: "Create Good / Better / Best estimate tiers with line items." },
      { property: "og:title", content: "Estimate Builder — FieldPro" },
      { property: "og:description", content: "Create Good / Better / Best estimate tiers with line items." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EstimateBuilderPage,
});

const TIERS: TierKey[] = ["good", "better", "best"];

function EstimateBuilderPage() {
  const { estimateId } = Route.useParams();
  const store = useStore();
  const navigate = useNavigate();
  const saved = store.estimates.find((e) => e.id === estimateId);
  const [est, setEst] = useState<Estimate | null>(saved ?? null);
  const [editingTier, setEditingTier] = useState<TierKey>(saved?.selectedTier ?? "better");

  useEffect(() => {
    if (saved) setEst(saved);
  }, [saved]);

  if (!est) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Estimate not found.{" "}
        <Link to="/estimates" className="text-primary underline">
          Back
        </Link>
      </div>
    );
  }

  const locked = est.status === "converted";
  const tier = est.tiers[editingTier];
  const customer = store.customers.find((c) => c.id === est.customerId);

  const setTierItems = (items: LineItem[]) =>
    setEst({ ...est, tiers: { ...est.tiers, [editingTier]: { ...tier, items } } });
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setTierItems(tier.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const save = (next: Estimate = est, msg = "Estimate saved") => {
    store.saveEstimate(next);
    toast.success(msg);
  };

  return (
    <div>
      <PageHeader
        back
        eyebrow={`${est.number} · ${customer?.name ?? ""}`}
        title={est.title}
        action={
          <Badge variant={est.status === "approved" ? "success" : est.status === "converted" ? "signal" : "secondary"} className="mb-1.5 capitalize">
            {est.status}
          </Badge>
        }
      />

      {!locked && (
        <div className="grid grid-cols-2 gap-2 px-4">
          <Input
            value={est.title}
            onChange={(e) => setEst({ ...est, title: e.target.value })}
            aria-label="Estimate title"
            className="col-span-2 h-11 rounded-xl bg-card"
          />
          <select
            value={est.customerId}
            onChange={(e) => setEst({ ...est, customerId: e.target.value })}
            aria-label="Customer"
            className="h-11 rounded-xl border bg-card px-3 text-sm"
          >
            {store.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="flex h-11 items-center gap-2 rounded-xl border bg-card px-3 text-sm">
            <span className="text-muted-foreground">Tax %</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={+(est.taxRate * 100).toFixed(3)}
              onChange={(e) => setEst({ ...est, taxRate: Math.max(0, Number(e.target.value) || 0) / 100 })}
              className="tabular w-full bg-transparent text-right outline-none"
            />
          </label>
        </div>
      )}

      {/* Tier selector */}
      <Section title="Options for customer">
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map((key) => {
            const t = est.tiers[key];
            const { total } = computeTotals(t.items, est.taxRate);
            const selected = est.selectedTier === key;
            const editing = editingTier === key;
            return (
              <button
                key={key}
                onClick={() => setEditingTier(key)}
                className={cn(
                  "relative flex flex-col items-start rounded-2xl border-2 bg-card p-3 text-left transition-all",
                  editing ? "border-primary shadow-glow" : "border-transparent shadow-card",
                )}
              >
                {selected && (
                  <span className="absolute -top-2 right-2 rounded-full bg-success px-1.5 py-0.5 text-[9px] font-bold uppercase text-success-foreground">
                    Chosen
                  </span>
                )}
                <span className="eyebrow">{key}</span>
                <span className="font-display text-base font-extrabold">{t.name}</span>
                <span className="line-clamp-2 min-h-8 text-[11px] leading-tight text-muted-foreground">{t.summary}</span>
                <span className="tabular mt-2 text-sm font-bold">{money(total)}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Line items */}
      <Section
        title={`${tier.name} · line items`}
        action={
          !locked && (
            <button
              onClick={() => {
                setEst({ ...est, selectedTier: editingTier });
              }}
              className={cn(
                "flex items-center gap-1 text-xs font-semibold",
                est.selectedTier === editingTier ? "text-success" : "text-primary",
              )}
            >
              <Check className="size-3.5" />
              {est.selectedTier === editingTier ? "Customer's choice" : "Mark as chosen"}
            </button>
          )
        }
      >
        <Card className="overflow-hidden">
          {!locked && (
            <div className="border-b p-3">
              <Input
                value={tier.summary}
                onChange={(e) => setEst({ ...est, tiers: { ...est.tiers, [editingTier]: { ...tier, summary: e.target.value } } })}
                placeholder="Tier description"
                className="h-9 rounded-lg"
              />
            </div>
          )}
          <div className="divide-y">
            {tier.items.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No line items yet.</div>
            )}
            {tier.items.map((item) =>
              locked ? (
                <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {item.description} <span className="tabular text-muted-foreground">× {item.qty}</span>
                  </span>
                  <span className="tabular font-semibold">{money(lineTotal(item))}</span>
                </div>
              ) : (
                <div key={item.id} className="space-y-2 p-3">
                  <div className="flex gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="Description"
                      className="h-9 flex-1 rounded-lg"
                    />
                    <button
                      onClick={() => setTierItems(tier.items.filter((i) => i.id !== item.id))}
                      aria-label="Remove line item"
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex h-9 w-20 items-center gap-1 rounded-lg border px-2 text-xs">
                      <span className="text-muted-foreground">Qty</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, { qty: Math.max(0, Number(e.target.value) || 0) })}
                        className="tabular w-full bg-transparent text-right outline-none"
                      />
                    </label>
                    <label className="flex h-9 flex-1 items-center gap-1 rounded-lg border px-2 text-xs">
                      <span className="text-muted-foreground">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                        className="tabular w-full bg-transparent text-right outline-none"
                      />
                    </label>
                    <span className="tabular w-24 text-right text-sm font-bold">{money(lineTotal(item))}</span>
                  </div>
                </div>
              ),
            )}
          </div>
          {!locked && (
            <button
              onClick={() => setTierItems([...tier.items, { id: uid("li"), description: "", qty: 1, unitPrice: 0 }])}
              className="flex w-full items-center justify-center gap-2 border-t py-3 text-sm font-semibold text-primary hover:bg-muted"
            >
              <Plus className="size-4" /> Add line item
            </button>
          )}
          <div className="border-t bg-muted/40 p-4">
            <TotalsBlock {...computeTotals(tier.items, est.taxRate)} taxRate={est.taxRate} />
          </div>
        </Card>
      </Section>

      {/* Actions */}
      <div className="space-y-2 px-4 pt-5">
        {est.status === "converted" && est.invoiceId ? (
          <Button asChild variant="ink" size="xl" className="w-full">
            <Link to="/invoices/$invoiceId" params={{ invoiceId: est.invoiceId }}>
              View invoice
            </Link>
          </Button>
        ) : est.status === "approved" ? (
          <Button
            variant="signal"
            size="xl"
            className="w-full"
            onClick={() => {
              store.saveEstimate(est);
              // Wait a tick so the save lands before converting.
              setTimeout(() => {
                const inv = store.convertEstimate(est.id);
                if (inv) {
                  toast.success(`${inv.number} created`);
                  navigate({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } });
                }
              }, 0);
            }}
          >
            <ArrowRightLeft /> Convert to invoice
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => save({ ...est, status: "sent" }, `Sent to ${customer?.name ?? "customer"}`)}
            >
              <Send /> Send
            </Button>
            <Button
              variant="success"
              size="lg"
              disabled={est.tiers[est.selectedTier].items.length === 0}
              onClick={() => save({ ...est, status: "approved" }, `${est.tiers[est.selectedTier].name} option approved`)}
            >
              <Check /> Approve
            </Button>
          </div>
        )}
        {!locked && (
          <Button variant="ghost" className="w-full" onClick={() => save()}>
            <Save /> Save draft
          </Button>
        )}
      </div>
    </div>
  );
}
