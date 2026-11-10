# DayPilot — Build Roadmap

Tagline: "Your life, under control." Premium life-management SaaS per the pasted product brief.

## Phases

- [x] PHASE 1 — Branding, design system (exact palette), responsive layout, bottom navigation, interactive dashboard
- [x] PHASE 2 — Onboarding, auth (email/password, reset, persistent sessions), profile & settings
- [x] PHASE 3 — Life Missions, task management, interactive calendar/agenda views
- [x] PHASE 4 — AI assistant (Lovable AI Gateway via server functions) and household management
- [x] PHASE 5 — Database schema, RLS, grants, indexes (migration)
- [x] PHASE 6 — Real AI integration wired through the gateway; notifications structure (in-app notifications table + preferences)
- [x] PHASE 7 — Subscription tiers (Free/Plus/Premium/Concierge), pricing page, plan-gated features (placeholder prices, no live payments)
- [x] PHASE 8 — Testing, launch checklist

## Notes / decisions
- Lovable Cloud (Supabase) for auth + Postgres; AI via @lovable.dev/ai-gateway in server functions.
- Animations: framer-motion; respect prefers-reduced-motion.
- Concierge human services are NOT advertised as available (no real service operation).
- Payments: checkout structure ready for a provider, no simulated successful payments.

## Open items
- [ ] Signed-in end-to-end walkthrough (signup → onboarding → tasks/missions → assistant) not yet run in a test browser. (blocked on external config)
- [ ] Live payment provider credentials (Stripe/Paddle) — checkout is structured, needs account.
- [ ] Push notification delivery (web push / native) — preferences + data structure exist; needs platform config.
- [ ] Professional legal review of privacy policy / ToS drafts.
- [ ] Android/iOS native apps (architecture prepared, not in scope of web build).
