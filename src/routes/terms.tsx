import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — DayPilot" },
      { name: "description", content: "DayPilot Terms of Service (draft)." },
      { property: "og:title", content: "Terms of Service — DayPilot" },
      { property: "og:description", content: "DayPilot Terms of Service (draft)." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link to="/" className="text-sm text-muted-foreground">← DayPilot</Link>
      <h1 className="mt-4 text-4xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-gold">Draft — not yet reviewed by a lawyer.</p>
      <p className="mt-6 leading-relaxed text-muted-foreground">DayPilot helps you organize responsibilities; it never makes payments, bookings or submissions on your behalf. AI suggestions may be inaccurate — review them before relying on them. Paid plans will be billed through a payment provider once available. You're responsible for content you share with your household. This is a draft pending professional legal review.</p>
    </div>
  ),
});
