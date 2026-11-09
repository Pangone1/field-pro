import { createFileRoute } from "@tanstack/react-router";
import { Camera, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Card, PageHeader, Section } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/billing";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expense Scanner — FieldPro" },
      { name: "description", content: "Log expenses and capture receipt photos on the job." },
      { property: "og:title", content: "Expense Scanner — FieldPro" },
      { property: "og:description", content: "Log expenses and capture receipt photos on the job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

const CATEGORIES = ["Fuel", "Parts & Materials", "Tools", "Meals", "Permits", "Other"];

function ExpensesPage() {
  const { expenses, addExpense, today } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("Fuel");
  const [receipt, setReceipt] = useState<string | null>(null);

  const submit = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter an amount");
      return;
    }
    addExpense({ amount: value, vendor, category, date: today, note: "", receiptUrl: receipt });
    toast.success(`Expense ${money(value)} saved`);
    setAmount("");
    setVendor("");
    setReceipt(null);
  };

  return (
    <div>
      <PageHeader back eyebrow="Admin" title="Expenses" />
      <div className="px-4">
        <Card className="space-y-3 p-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary"
          >
            {receipt ? (
              <>
                <img src={receipt} alt="Receipt" className="size-full object-cover" />
                <span
                  role="button"
                  aria-label="Remove receipt"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReceipt(null);
                  }}
                  className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-ink/70 text-ink-foreground"
                >
                  <X className="size-4" />
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-1 text-sm font-semibold">
                <Camera className="size-7" /> Snap receipt
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setReceipt(URL.createObjectURL(f));
              e.target.value = "";
            }}
          />
          <label className="flex h-14 items-center gap-2 rounded-xl border bg-card px-4">
            <span className="text-2xl text-muted-foreground">$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount"
              className="tabular w-full bg-transparent text-2xl font-bold outline-none"
            />
          </label>
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor" className="h-11 rounded-xl" />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${category === c ? "border-primary bg-accent text-accent-foreground" : "bg-card"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <Button variant="signal" size="lg" className="w-full" onClick={submit}>
            <Plus /> Save expense
          </Button>
        </Card>
      </div>
      <Section title={`Recent · ${expenses.length}`}>
        <Card className="divide-y overflow-hidden">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              {e.receiptUrl ? (
                <img src={e.receiptUrl} alt="" className="size-10 rounded-lg object-cover" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Camera className="size-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{e.vendor || e.category}</div>
                <div className="text-xs text-muted-foreground">{e.category}</div>
              </div>
              <div className="tabular font-bold">{money(e.amount)}</div>
            </div>
          ))}
        </Card>
      </Section>
    </div>
  );
}
