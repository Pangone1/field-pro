import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileText } from "lucide-react";

import { PageHeader, Section } from "@/components/app/PageHeader";
import { BillingTabs } from "@/components/billing/BillingTabs";
import { Badge } from "@/components/ui/badge";
import { computeTotals, money } from "@/lib/billing";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoices — FieldPro" },
      { name: "description", content: "Track unpaid and paid invoices and collect payment in the field." },
      { property: "og:title", content: "Invoices — FieldPro" },
      { property: "og:description", content: "Track unpaid and paid invoices and collect payment in the field." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { invoices, customers } = useStore();
  const name = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  return (
    <div>
      <PageHeader eyebrow="Billing" title="Invoices" />
      <BillingTabs active="invoices" />
      <Section title={`${invoices.length} invoices`}>
        <div className="space-y-2">
          {invoices.map((inv) => {
            const { total } = computeTotals(inv.items, inv.taxRate);
            return (
              <Link
                key={inv.id}
                to="/invoices/$invoiceId"
                params={{ invoiceId: inv.id }}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="tabular text-xs text-muted-foreground">{inv.number}</span>
                    <Badge variant={inv.status === "paid" ? "success" : "warning"} className="capitalize">
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="truncate font-semibold">{inv.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{name(inv.customerId)}</div>
                </div>
                <div className="tabular font-bold">{money(total)}</div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
