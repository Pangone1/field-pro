import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, FileText, Plus } from "lucide-react";

import { PageHeader, Section } from "@/components/app/PageHeader";
import { BillingTabs } from "@/components/billing/BillingTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeTotals, money } from "@/lib/billing";
import { useStore } from "@/lib/store";
import type { EstimateStatus } from "@/lib/types";

export const Route = createFileRoute("/estimates/")({
  head: () => ({
    meta: [
      { title: "Estimates — FieldPro" },
      { name: "description", content: "Build Good / Better / Best estimates and convert approvals to invoices." },
      { property: "og:title", content: "Estimates — FieldPro" },
      { property: "og:description", content: "Build Good / Better / Best estimates and convert approvals to invoices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstimatesPage,
});

export const estimateStatusVariant: Record<EstimateStatus, "secondary" | "info" | "success" | "signal"> = {
  draft: "secondary",
  sent: "info",
  approved: "success",
  converted: "signal",
};

function EstimatesPage() {
  const { estimates, customers, createEstimate } = useStore();
  const navigate = useNavigate();
  const name = (id: string) => customers.find((c) => c.id === id)?.name ?? "";

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Estimates"
        action={
          <Button
            variant="signal"
            size="sm"
            onClick={() => {
              const est = createEstimate(customers[0]?.id ?? "", null);
              navigate({ to: "/estimates/$estimateId", params: { estimateId: est.id } });
            }}
          >
            <Plus /> New
          </Button>
        }
      />
      <BillingTabs active="estimates" />
      <Section title={`${estimates.length} estimates`}>
        <div className="space-y-2">
          {estimates.map((e) => {
            const tier = e.tiers[e.selectedTier];
            const { total } = computeTotals(tier.items, e.taxRate);
            return (
              <Link
                key={e.id}
                to="/estimates/$estimateId"
                params={{ estimateId: e.id }}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="tabular text-xs text-muted-foreground">{e.number}</span>
                    <Badge variant={estimateStatusVariant[e.status]} className="capitalize">
                      {e.status}
                    </Badge>
                  </div>
                  <div className="truncate font-semibold">{e.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {name(e.customerId)} · {tier.name} tier
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular font-bold">{money(total)}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
