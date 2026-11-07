import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, MessagesSquare, Users, CalendarDays, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DayPilot — Your life, under control." },
      { name: "description", content: "Turn big responsibilities into Life Missions with checklists, deadlines and a calm AI assistant. Tasks, calendar and household in one place." },
      { property: "og:title", content: "DayPilot — Your life, under control." },
      { property: "og:description", content: "Life Missions, tasks, calendar, household and an AI planner in one calm place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Compass, title: "Life Missions", body: "Renew a passport, prepare for exams, plan a move — broken into clear steps with a deadline and live progress." },
  { icon: MessagesSquare, title: "A calm AI assistant", body: "Describe what's on your mind. DayPilot suggests tasks and missions, and saves nothing without your OK." },
  { icon: CalendarDays, title: "Tasks & calendar", body: "Today, upcoming and overdue at a glance, with an interactive calendar and agenda." },
  { icon: Users, title: "Household", body: "Share tasks and missions with the people you live with, and see who's handling what." },
];

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-xl font-semibold text-foreground">DayPilot</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/pricing" className="hidden px-3 py-2 text-muted-foreground hover:text-foreground sm:block">Pricing</Link>
          <Link to="/auth" className="px-3 py-2 text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="tap rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90">Get started</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        <div className="gradient-hero relative overflow-hidden rounded-[2rem] px-6 py-16 text-primary-foreground sm:px-14 sm:py-24">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-sm uppercase tracking-[0.2em] text-gold">Personal life management</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">
            Your life, <span className="text-gradient-gold italic">under control.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 max-w-xl text-base opacity-80 sm:text-lg">
            DayPilot turns everyday responsibilities into clear plans — so the important things actually get done.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="tap gradient-gold rounded-full px-6 py-3 font-medium text-midnight shadow-[var(--shadow-glow)]">Start free</Link>
            <Link to="/pricing" className="tap rounded-full border border-primary-foreground/30 px-6 py-3 font-medium">See plans</Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="animate-float-soft mt-12 max-w-sm rounded-3xl bg-card p-5 text-card-foreground shadow-[var(--shadow-lift)] sm:absolute sm:bottom-14 sm:right-14 sm:mt-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Life Mission</p>
            <p className="mt-1 font-display text-lg font-semibold">Renew my passport</p>
            <div className="mt-3 h-2 rounded-full bg-sand"><div className="h-2 w-2/3 rounded-full bg-teal" /></div>
            <ul className="mt-4 space-y-2 text-sm">
              {["Check passport photo rules", "Fill in renewal form", "Book appointment"].map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${i < 2 ? "bg-teal text-white" : "border-2 border-border"}`}>{i < 2 && <Check className="h-3 w-3" />}</span>
                  <span className={i < 2 ? "text-muted-foreground line-through" : ""}>{s}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="card-surface p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent"><Icon className="h-5 w-5 text-teal" /></span>
            <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </motion.div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DayPilot</p>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
