import { createFileRoute, redirect } from "@tanstack/react-router";

// The app opens on today's jobs; signed-out visitors are sent on to sign-in from there.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FieldPro — Solo Contractor Toolkit" },
      { name: "description", content: "Jobs, invoices, mileage and payments for solo field service contractors." },
      { property: "og:title", content: "FieldPro — Solo Contractor Toolkit" },
      { property: "og:description", content: "Jobs, invoices, mileage and payments for solo field service contractors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/today" });
  },
  component: () => null,
});
