import type { Estimate, Invoice, LineItem } from "./types";

export function lineTotal(item: LineItem): number {
  return round2(item.qty * item.unitPrice);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTotals(items: LineItem[], taxRate: number) {
  const subtotal = round2(items.reduce((sum, i) => sum + lineTotal(i), 0));
  const tax = round2(subtotal * taxRate);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

/** Converts an approved estimate's selected tier into a new unpaid invoice. */
export function estimateToInvoice(
  estimate: Estimate,
  opts: { id: string; number: string; now: number; dueDate: string },
): Invoice {
  if (estimate.status !== "approved") {
    throw new Error("Only approved estimates can be converted");
  }
  const tier = estimate.tiers[estimate.selectedTier];
  return {
    id: opts.id,
    number: opts.number,
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    estimateId: estimate.id,
    title: `${estimate.title} — ${tier.name}`,
    items: tier.items.map((i) => ({ ...i })),
    taxRate: estimate.taxRate,
    status: "unpaid",
    createdAt: opts.now,
    dueDate: opts.dueDate,
    paidAt: null,
    paidMethod: null,
    stripeSessionId: null,
  };
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
