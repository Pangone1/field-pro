import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CreditCard, Landmark, Nfc } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, PageHeader, Section } from "@/components/app/PageHeader";
import { TotalsBlock } from "@/components/billing/BillingTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { computeTotals, lineTotal, money } from "@/lib/billing";
import { formatTime, fromDateKey } from "@/lib/links";
import { useStore } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice & Payment — FieldPro" },
      { name: "description", content: "Invoice summary with line items, taxes and mobile payment options." },
      { property: "og:title", content: "Invoice & Payment — FieldPro" },
      { property: "og:description", content: "Invoice summary with line items, taxes and mobile payment options." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicePage,
});

const METHOD_LABEL: Record<PaymentMethod, string> = {
  nfc: "Tap-to-Pay (NFC)",
  card: "Manual Card Entry",
  ach: "ACH Transfer",
};

function InvoicePage() {
  const { invoiceId } = Route.useParams();
  const store = useStore();
  const inv = store.invoices.find((i) => i.id === invoiceId);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);

  if (!inv) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invoice not found.{" "}
        <Link to="/invoices" className="text-primary underline">
          Back
        </Link>
      </div>
    );
  }

  const customer = store.customers.find((c) => c.id === inv.customerId);
  const totals = computeTotals(inv.items, inv.taxRate);

  // Simulated processing — replace with your payment provider.
  const pay = () => {
    if (!method) return;
    setProcessing(true);
    setTimeout(() => {
      store.payInvoice(inv.id, method);
      setProcessing(false);
      setMethod(null);
      toast.success(`Payment of ${money(totals.total)} received`);
    }, 1600);
  };

  return (
    <div>
      <PageHeader
        back
        eyebrow={`${inv.number} · Due ${fromDateKey(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
        title={inv.title}
        action={
          <Badge variant={inv.status === "paid" ? "success" : "warning"} className="mb-1.5 capitalize">
            {inv.status}
          </Badge>
        }
      />

      <Section title="Bill to">
        <Card className="p-4">
          <div className="font-semibold">{customer?.name}</div>
          <div className="text-xs text-muted-foreground">{customer?.email}</div>
        </Card>
      </Section>

      <Section title="Line items">
        <Card className="overflow-hidden">
          <div className="divide-y">
            {inv.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {item.description}{" "}
                  <span className="tabular text-muted-foreground">
                    {item.qty} × {money(item.unitPrice)}
                  </span>
                </span>
                <span className="tabular font-semibold">{money(lineTotal(item))}</span>
              </div>
            ))}
          </div>
          <div className="border-t bg-muted/40 p-4">
            <TotalsBlock {...totals} taxRate={inv.taxRate} />
          </div>
        </Card>
      </Section>

      <Section title="Payment">
        {inv.status === "paid" ? (
          <Card className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Paid {money(totals.total)}</div>
              <div className="text-xs text-muted-foreground">
                {inv.paidMethod ? METHOD_LABEL[inv.paidMethod] : ""} · {inv.paidAt ? formatTime(inv.paidAt) : ""}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="eyebrow">Total due</div>
            <div className="tabular text-4xl font-bold">{money(totals.total)}</div>
            <div className="mt-4 space-y-2">
              <Button variant="signal" size="xl" className="w-full" onClick={() => setMethod("nfc")}>
                <Nfc /> Tap-to-Pay (NFC)
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setMethod("card")}>
                <CreditCard /> Manual Card Entry
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setMethod("ach")}>
                <Landmark /> ACH Transfer
              </Button>
            </div>
          </Card>
        )}
      </Section>

      <Drawer open={method !== null} onOpenChange={(o) => !o && !processing && setMethod(null)} shouldScaleBackground={false}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display">{method ? METHOD_LABEL[method] : ""}</DrawerTitle>
            <DrawerDescription className="tabular">Charging {money(totals.total)}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 px-4">
            {method === "nfc" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="relative flex size-24 items-center justify-center rounded-full bg-accent text-primary">
                  <span className="absolute inset-0 rounded-full border-2 border-primary animate-nfc" />
                  <Nfc className="size-10" />
                </div>
                <p className="text-sm text-muted-foreground">Hold the card or phone near the back of your device</p>
              </div>
            )}
            {method === "card" && (
              <>
                <Input placeholder="Card number" inputMode="numeric" className="h-11 rounded-xl" />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="MM/YY" inputMode="numeric" className="h-11 rounded-xl" />
                  <Input placeholder="CVC" inputMode="numeric" className="h-11 rounded-xl" />
                  <Input placeholder="ZIP" inputMode="numeric" className="h-11 rounded-xl" />
                </div>
              </>
            )}
            {method === "ach" && (
              <>
                <Input placeholder="Account holder name" className="h-11 rounded-xl" />
                <Input placeholder="Routing number" inputMode="numeric" className="h-11 rounded-xl" />
                <Input placeholder="Account number" inputMode="numeric" className="h-11 rounded-xl" />
              </>
            )}
          </div>
          <DrawerFooter>
            <Button variant="success" size="xl" disabled={processing} onClick={pay}>
              {processing ? "Processing…" : method === "nfc" ? "Simulate tap" : `Charge ${money(totals.total)}`}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
