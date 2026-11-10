import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DayPilot" },
      { name: "description", content: "DayPilot Privacy Policy (draft)." },
      { property: "og:title", content: "Privacy Policy — DayPilot" },
      { property: "og:description", content: "DayPilot Privacy Policy (draft)." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link to="/" className="text-sm text-muted-foreground">← DayPilot</Link>
      <h1 className="mt-4 text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gold">Draft — not yet reviewed by a lawyer.</p>
      <p className="mt-6 leading-relaxed text-muted-foreground">We collect only what DayPilot needs to work: your account email, profile details you choose to add, and the tasks, missions, household data and assistant conversations you create. Assistant messages are sent to an AI provider to generate replies. We don't sell your data. You can delete your account and all associated data at any time from Profile. This is a draft pending professional legal review.</p>
    </div>
  ),
});
