import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Check, CreditCard, Loader2, MessageSquareText, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Card, PageHeader, Section } from "@/components/app/PageHeader";
import { TotalsBlock } from "@/components/billing/BillingTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeTotals, lineTotal, money } from "@/lib/billing";
import { formatTime, fromDateKey, smsLink } from "@/lib/links";
import { createInvoiceCheckout, refreshInvoicePayment } from "@/lib/payments.functions";
import { invoiceFromRow } from "@/lib/rows";
import { useStore } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice & Payment — FieldPro" },
      { name: "description", content: "Invoice summary with line items, taxes and Stripe card payments." },
      { property: "og:title", content: "Invoice & Payment — FieldPro" },
      { property: "og:description", content: "Invoice summary with line items, taxes and Stripe card payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: z.object({ paid: z.coerce.number().optional() }),
  component: InvoicePage,
});

const METHOD_LABEL: Record<PaymentMethod, string> = {
  stripe: "Card via Stripe",
  cash: "Cash",
  check: "Check",
  nfc: "Tap-to-Pay (NFC)",
  card: "Manual Card Entry",
  ach: "ACH Transfer",
};

function InvoicePage() {
  const { invoiceId } = Route.useParams();
  const { paid: returnedFromStripe } = Route.useSearch();
  const store = useStore();
  const inv = store.invoices.find((i) => i.id === invoiceId);
  const [busy, setBusy] = useState<null | "checkout" | "text" | "refresh">(null);
  const createCheckout = useServerFn(createInvoiceCheckout);
  const refreshPayment = useServerFn(refreshInvoicePayment);
  const checkedReturn = useRef(false);

  const refresh = async (quiet = false) => {
    setBusy("refresh");
    try {
      const res = await refreshPayment({ data: { invoiceId } });
      if (!res.ok) {
        if (!quiet) toast.error(res.error);
        return;
      }
      store.replaceInvoice(invoiceFromRow(res.row));
      if (res.paid) toast.success("Payment received through Stripe");
      else if (!quiet) toast("No payment yet", { description: "The customer hasn't finished paying." });
    } catch {
      if (!quiet) toast.error("Couldn't reach Stripe. Try again.");
    } finally {
      setBusy(null);
    }
  };

  // Back from Stripe Checkout → confirm the payment straight away.
  useEffect(() => {
    if (returnedFromStripe && !checkedReturn.current && inv?.status === "unpaid") {
      checkedReturn.current = true;
      void refresh(true);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

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

  const getCheckoutUrl = async (): Promise<string | null> => {
    const res = await createCheckout({ data: { invoiceId: inv.id, origin: window.location.origin } });
    if (!res.ok) {
      toast.error(res.error);
      return null;
    }
    store.replaceInvoice({ ...inv, stripeSessionId: "pending" });
    return res.url;
  };

  const collectNow = async () => {
    // Open the tab synchronously so phones don't block it as a pop-up.
    const tab = window.open("", "_blank");
    setBusy("checkout");
    try {
      const url = await getCheckoutUrl();
      if (!url) {
        tab?.close();
        return;
      }
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch {
      tab?.close();
      toast.error("Couldn't start the Stripe payment. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const textLink = async () => {
    if (!customer?.phone) {
      toast.error("Add a phone number to this customer to text the link.");
      return;
    }
    setBusy("text");
    try {
      const url = await getCheckoutUrl();
      if (!url) return;
      window.location.href = smsLink(
        customer.phone,
        `Hi ${customer.name.split(" ")[0]}, here's your secure payment link for ${inv.number} (${money(totals.total)}): ${url}`,
      );
    } catch {
      toast.error("Couldn't create the payment link. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const recordManual = (method: "cash" | "check") => {
    store.payInvoice(inv.id, method);
    toast.success(`${money(totals.total)} recorded as ${METHOD_LABEL[method].toLowerCase()}`);
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
              <Button variant="signal" size="xl" className="w-full" disabled={!store.online || busy !== null} onClick={collectNow}>
                {busy === "checkout" ? <Loader2 className="animate-spin" /> : <CreditCard />} Collect card payment
              </Button>
              <Button variant="outline" size="lg" className="w-full" disabled={!store.online || busy !== null} onClick={textLink}>
                {busy === "text" ? <Loader2 className="animate-spin" /> : <MessageSquareText />} Text payment link
              </Button>
              {inv.stripeSessionId && (
                <Button variant="ghost" size="lg" className="w-full" disabled={!store.online || busy !== null} onClick={() => refresh()}>
                  {busy === "refresh" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Check payment status
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" onClick={() => recordManual("cash")} disabled={busy !== null}>
                  <Banknote /> Cash
                </Button>
                <Button variant="outline" onClick={() => recordManual("check")} disabled={busy !== null}>
                  <Check /> Check
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {store.online
                ? "Card payments open a secure Stripe page — hand your phone to the customer or text them the link."
                : "Card payments need signal. Cash and check can be recorded offline."}
            </p>
          </Card>
        )}
      </Section>
    </div>
  );
}
