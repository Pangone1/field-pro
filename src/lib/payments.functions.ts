import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { computeTotals } from "./billing";
import type { InvoiceRow } from "./rows";
import type { LineItem } from "./types";

type StripeResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function stripe<T>(path: string, init: { method: "GET" | "POST"; form?: Record<string, string> }): Promise<StripeResult<T>> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return { ok: false, error: "Stripe isn't connected yet. Add your Stripe secret key first." };
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init.form ? new URLSearchParams(init.form).toString() : null,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) {
    console.error("Stripe error", res.status, body.error?.message);
    if (res.status === 401) return { ok: false, error: "Stripe rejected the secret key. Check it in your project secrets." };
    return { ok: false, error: body.error?.message ?? "Stripe couldn't process the request." };
  }
  return { ok: true, data: body };
}

const toCents = (n: number) => Math.round(n * 100);

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

/** Creates a Stripe Checkout page for an unpaid invoice. The link can be opened on the spot or texted to the customer. */
export const createInvoiceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        invoiceId: z.string().uuid(),
        origin: z
          .string()
          .url()
          .refine((u) => /^https?:\/\//.test(u), "Invalid origin"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { data: inv, error } = await context.supabase.from("invoices").select("*").eq("id", data.invoiceId).maybeSingle();
    if (error || !inv) return { ok: false, error: "Invoice not found. If you just created it offline, sync first." };
    if (inv.status === "paid") return { ok: false, error: "This invoice is already paid." };

    const items = (Array.isArray(inv.items) ? inv.items : []) as unknown as LineItem[];
    const { total } = computeTotals(items, Number(inv.tax_rate));
    if (toCents(total) < 50) return { ok: false, error: "Stripe needs an invoice total of at least $0.50." };

    let email = "";
    if (inv.customer_id) {
      const { data: c } = await context.supabase.from("customers").select("email").eq("id", inv.customer_id).maybeSingle();
      email = c?.email ?? "";
    }

    const origin = new URL(data.origin).origin;
    const form: Record<string, string> = {
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(toCents(total)),
      "line_items[0][price_data][product_data][name]": `${inv.number} — ${inv.title}`.slice(0, 250),
      success_url: `${origin}/invoices/${inv.id}?paid=1`,
      cancel_url: `${origin}/invoices/${inv.id}`,
      client_reference_id: inv.id,
      "metadata[invoice_id]": inv.id,
      "payment_intent_data[metadata][invoice_id]": inv.id,
      "payment_intent_data[description]": `${inv.number} — ${inv.title}`.slice(0, 250),
    };
    if (email && z.string().email().safeParse(email).success) form["customer_email"] = email;

    const res = await stripe<{ id: string; url: string }>("checkout/sessions", { method: "POST", form });
    if (!res.ok) return res;

    await context.supabase.from("invoices").update({ stripe_session_id: res.data.id }).eq("id", inv.id);
    return { ok: true, url: res.data.url };
  });

export type RefreshResult = { ok: true; paid: boolean; row: InvoiceRow } | { ok: false; error: string };

/** Asks Stripe whether the invoice's checkout was paid and, if so, marks the invoice paid. */
export const refreshInvoicePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<RefreshResult> => {
    const { data: inv, error } = await context.supabase.from("invoices").select("*").eq("id", data.invoiceId).maybeSingle();
    if (error || !inv) return { ok: false, error: "Invoice not found." };
    if (inv.status === "paid" || !inv.stripe_session_id) return { ok: true, paid: inv.status === "paid", row: inv };

    const res = await stripe<{ payment_status: string; metadata?: Record<string, string> }>(
      `checkout/sessions/${encodeURIComponent(inv.stripe_session_id)}`,
      { method: "GET" },
    );
    if (!res.ok) return res;
    const paid = res.data.payment_status === "paid" && res.data.metadata?.["invoice_id"] === inv.id;
    if (!paid) return { ok: true, paid: false, row: inv };

    const { data: updated, error: upErr } = await context.supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_method: "stripe" })
      .eq("id", inv.id)
      .select("*")
      .single();
    if (upErr || !updated) return { ok: false, error: "Payment went through, but the invoice couldn't be updated. Try again." };
    return { ok: true, paid: true, row: updated };
  });
