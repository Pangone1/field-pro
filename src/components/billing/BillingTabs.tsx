import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function BillingTabs({ active }: { active: "estimates" | "invoices" }) {
  return (
    <div className="mx-4 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-bold">
      {(
        [
          ["estimates", "/estimates", "Estimates"],
          ["invoices", "/invoices", "Invoices"],
        ] as const
      ).map(([key, to, label]) => (
        <Link
          key={key}
          to={to}
          className={cn(
            "rounded-lg py-2 text-center transition-colors",
            active === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function TotalsBlock({ subtotal, tax, total, taxRate }: { subtotal: number; tax: number; total: number; taxRate: number }) {
  const m = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span className="tabular">{m(subtotal)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
        <span className="tabular">{m(tax)}</span>
      </div>
      <div className="flex items-baseline justify-between border-t pt-2">
        <span className="font-bold">Total</span>
        <span className="tabular text-2xl font-bold">{m(total)}</span>
      </div>
    </div>
  );
}
