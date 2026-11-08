import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, AlertTriangle } from "lucide-react";
import { meQuery, tasksQuery, missionsQuery } from "@/lib/queries";
import { AnimatedCounter, EmptyState, ProgressRing, TaskRow } from "@/components/shared";
import { TaskEditor, useToggleTask } from "@/components/task-editor";
import { addDaysISO, friendlyDate, greeting, relativeDayLabel, todayISO } from "@/lib/format";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({ meta: [{ title: "Home — DayPilot" }, { name: "description", content: "Your personal command centre." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(tasksQuery), context.queryClient.ensureQueryData(missionsQuery)]),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: missions } = useSuspenseQuery(missionsQuery);
  const toggle = useToggleTask();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [section, setSection] = useState<"today" | "upcoming" | "overdue" | "done">("today");

  const groups = useMemo(() => {
    const open = tasks.filter((t) => !t.completed);
    return {
      today: open.filter((t) => relativeDayLabel(t.due_date) === "today"),
      overdue: open.filter((t) => relativeDayLabel(t.due_date) === "overdue"),
      upcoming: open.filter((t) => ["tomorrow", "upcoming"].includes(relativeDayLabel(t.due_date))),
      done: tasks.filter((t) => t.completed).slice(0, 10),
    };
  }, [tasks]);

  const week = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDaysISO(i - 6);
      const all = tasks.filter((t) => t.due_date === d);
      return { d, total: all.length, done: all.filter((t) => t.completed).length };
    });
  }, [tasks]);
  const weekTotal = week.reduce((a, w) => a + w.total, 0);
  const weekDone = week.reduce((a, w) => a + w.done, 0);
  const active = missions.filter((m) => m.status !== "completed");
  const high = tasks.filter((t) => !t.completed && t.priority === "high").length;
  const name = (me.profile?.full_name ?? "").split(" ")[0];
  const upcomingSchedule = tasks.filter((t) => !t.completed && t.due_date && t.due_date >= todayISO()).slice(0, 5);
  const list = groups[section];

  return (
    <div className="space-y-6">
      <section className="gradient-hero overflow-hidden rounded-3xl p-6 text-primary-foreground">
        <p className="text-sm opacity-70">{format(new Date(), "EEEE, d MMMM")}</p>
        <h1 className="mt-1 text-3xl font-semibold">{greeting()}{name ? `, ${name}` : ""}</h1>
        <p className="mt-2 text-sm opacity-80">
          {groups.today.length === 0 && groups.overdue.length === 0 ? "Nothing pressing today — a good moment to plan ahead." : `${groups.today.length} for today${groups.overdue.length ? `, ${groups.overdue.length} overdue` : ""}. You've got this.`}
        </p>
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {[["Today", groups.today.length], ["Overdue", groups.overdue.length], ["Missions", active.length], ["High priority", high]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl bg-primary-foreground/10 py-3">
              <AnimatedCounter value={v as number} className="block font-display text-2xl font-semibold" />
              <span className="text-[11px] opacity-70">{l}</span>
            </div>
          ))}
        </div>
        <Link to="/assistant" className="tap mt-5 flex items-center gap-2 rounded-2xl bg-primary-foreground/10 px-4 py-3 text-sm hover:bg-primary-foreground/15">
          <Sparkles className="h-4 w-4 text-gold" /> Ask DayPilot to plan something…
        </Link>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(["today", "upcoming", "overdue", "done"] as const).map((s) => (
              <button key={s} onClick={() => setSection(s)} className="tap relative rounded-full px-4 py-1.5 text-sm font-medium capitalize">
                {section === s && <motion.span layoutId="dash-tab" className="absolute inset-0 rounded-full bg-primary" />}
                <span className={`relative z-10 ${section === s ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  {s === "done" ? "Completed" : s} {s !== "done" && groups[s].length > 0 && `· ${groups[s].length}`}
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {list.map((t, i) => <TaskRow key={t.id} task={t} index={i} onToggle={(x) => toggle.mutate(x)} onOpen={setEditing} />)}
            </AnimatePresence>
            {list.length === 0 && (
              <EmptyState
                title={section === "overdue" ? "Nothing overdue" : section === "done" ? "No completed tasks yet" : "All clear"}
                body={section === "today" ? "Add something for today, or ask the assistant to help plan your day." : "Tasks will appear here as you add them."}
                action={<button onClick={() => setCreating(true)} className="tap mt-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Add a task</button>}
              />
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Weekly progress</h2>
              <span className="text-sm text-muted-foreground">{weekDone}/{weekTotal}</span>
            </div>
            <div className="mt-4 flex h-24 items-end gap-2">
              {week.map((w) => (
                <div key={w.d} className="group flex flex-1 flex-col items-center gap-1" title={`${w.done}/${w.total} on ${friendlyDate(w.d)}`}>
                  <div className="relative flex h-20 w-full items-end overflow-hidden rounded-lg bg-sand">
                    <motion.div className="w-full rounded-lg bg-teal" initial={{ height: 0 }} animate={{ height: w.total ? `${(w.done / w.total) * 100}%` : "0%" }} transition={{ type: "spring", stiffness: 80 }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(`${w.d}T00:00:00`), "EEEEE")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active missions</h2>
              <Link to="/missions" className="text-sm text-teal">All</Link>
            </div>
            <div className="mt-3 space-y-2">
              {active.slice(0, 4).map((m) => (
                <Link key={m.id} to="/missions/$id" params={{ id: m.id }} className="tap flex items-center gap-3 rounded-2xl p-2 hover:bg-accent">
                  <ProgressRing value={m.progress} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.deadline ? `Due ${friendlyDate(m.deadline)}` : "No deadline"}</p>
                  </div>
                </Link>
              ))}
              {active.length === 0 && <p className="py-3 text-sm text-muted-foreground">No active missions. <Link to="/missions" className="text-teal">Start one</Link>.</p>}
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upcoming schedule</h2>
              <Link to="/tasks" className="text-sm text-teal">Calendar</Link>
            </div>
            <ul className="mt-3 space-y-2">
              {upcomingSchedule.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setEditing(t)} className="flex w-full items-center gap-3 text-left text-sm">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{friendlyDate(t.due_date)}</span>
                    <span className="truncate">{t.title}</span>
                    {relativeDayLabel(t.due_date) === "overdue" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  </button>
                </li>
              ))}
              {upcomingSchedule.length === 0 && <li className="text-sm text-muted-foreground">Nothing scheduled yet.</li>}
            </ul>
            <button onClick={() => navigate({ to: "/tasks" })} className="sr-only">Open calendar</button>
          </div>
        </aside>
      </div>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setCreating(true)}
        aria-label="Quick add task"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-lift)] md:bottom-8 md:right-8"
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <TaskEditor open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }} task={editing} draft={{ due_date: section === "today" ? todayISO() : null }} />
    </div>
  );
}
