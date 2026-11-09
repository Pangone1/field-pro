import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  notes: z.string().min(1).max(8000),
  jobTitle: z.string().max(200),
  serviceType: z.string().max(100),
});

export type CleanNotesResult = { ok: true; text: string } | { ok: false; error: string };

export const cleanUpNotes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }): Promise<CleanNotesResult> => {
    const { generateChatCompletion, GatewayError, PaymentRequiredError, RateLimitError } =
      await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateChatCompletion({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "You rewrite a field service technician's rough job notes into clean, professional service notes for the customer record. Fix spelling, grammar and shorthand (e.g. 'repl' -> 'replaced', 'cust' -> 'customer'). Keep every fact, measurement, part number and reading exactly; never invent work, parts or findings. Use short sections when helpful: Findings, Work Performed, Recommendations. Plain text only, no markdown symbols like ** or #. Use '- ' for bullet points.",
          },
          {
            role: "user",
            content: `Job: ${data.jobTitle} (${data.serviceType})\n\nRough notes:\n${data.notes}`,
          },
        ],
      });
      const text = res.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) {
        return { ok: false, error: "The AI didn't return any text. Try again." };
      }
      return { ok: true, text: text.trim() };
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        return { ok: false, error: "AI credits are used up. Add credits to keep using AI Notes+." };
      }
      if (err instanceof RateLimitError) {
        return { ok: false, error: "Too many AI requests right now. Wait a moment and try again." };
      }
      if (err instanceof GatewayError) {
        console.error("cleanUpNotes gateway error", err.code, err.ids);
        return { ok: false, error: "AI Notes+ is unavailable right now. Your notes are unchanged." };
      }
      throw err;
    }
  });
