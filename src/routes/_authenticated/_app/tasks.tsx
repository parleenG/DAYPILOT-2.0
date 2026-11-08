import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AnimatePresence } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { tasksQuery } from "@/lib/queries";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState, TaskRow } from "@/components/shared";
import { TaskEditor, useToggleTask } from "@/components/task-editor";
import { CATEGORY_OPTIONS, friendlyDate, relativeDayLabel } from "@/lib/format";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "today" | "upcoming" | "overdue" | "all" | "calendar" | "agenda";
const VIEWS: View[] = ["today", "upcoming", "overdue", "all", "calendar", "agenda"];

export const Route = createFileRoute("/_authenticated/_app/tasks")({
  validateSearch: (s: Record<string, unknown>): { view?: View; q?: string; cat?: string; sort?: "date" | "priority" } => ({
    view: VIEWS.includes(s.view as View) ? (s.view as View) : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    sort: s.sort === "priority" ? "priority" : undefined,
  }),
  head: () => ({ meta: [{ title: "Tasks & calendar — DayPilot" }, { name: "description", content: "Manage tasks by day, with calendar and agenda views." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: TasksPage,
});

const PRI = { high: 0, medium: 1, low: 2 } as Record<string, number>;

function TasksPage() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/tasks" });
  const view = search.view ?? "today";
  const toggle = useToggleTask();
  const [selected, setSelected] = useState<Date>(new Date());
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const set = (p: Partial<typeof search>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });

  const filtered = useMemo(() => {
    let list = tasks;
    if (search.q) list = list.filter((t) => (t.title + " " + t.description).toLowerCase().includes(search.q!.toLowerCase()));
    if (search.cat) list = list.filter((t) => t.category === search.cat);
    const selISO = format(selected, "yyyy-MM-dd");
    if (view === "today") list = list.filter((t) => relativeDayLabel(t.due_date) === "today");
    if (view === "upcoming") list = list.filter((t) => !t.completed && ["tomorrow", "upcoming"].includes(relativeDayLabel(t.due_date)));
    if (view === "overdue") list = list.filter((t) => !t.completed && relativeDayLabel(t.due_date) === "overdue");
    if (view === "calendar") list = list.filter((t) => t.due_date === selISO);
    if (view === "agenda") list = list.filter((t) => !t.completed && t.due_date);
    return [...list].sort((a, b) =>
      search.sort === "priority" ? (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1) : (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || (a.due_time ?? "").localeCompare(b.due_time ?? "")
    );
  }, [tasks, search, view, selected]);

  const datesWithTasks = useMemo(() => tasks.filter((t) => t.due_date).map((t) => new Date(`${t.due_date}T00:00:00`)), [tasks]);
  const agenda = useMemo(() => {
    const m = new Map<string, Task[]>();
    filtered.forEach((t) => m.set(t.due_date!, [...(m.get(t.due_date!) ?? []), t]));
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <Button className="rounded-full" onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> New task</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {VIEWS.map((v) => (
          <button key={v} onClick={() => set({ view: v })} className={cn("tap shrink-0 rounded-full px-4 py-1.5 text-sm capitalize", view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border")}>{v}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} placeholder="Search tasks" className="pl-9" />
        </div>
        <select value={search.cat ?? ""} onChange={(e) => set({ cat: e.target.value || undefined })} className="h-9 rounded-md border border-input bg-card px-2 text-sm" aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={search.sort ?? "date"} onChange={(e) => set({ sort: e.target.value === "priority" ? "priority" : undefined })} className="h-9 rounded-md border border-input bg-card px-2 text-sm" aria-label="Sort">
          <option value="date">Sort by date</option>
          <option value="priority">Sort by priority</option>
        </select>
      </div>

      <div className={cn(view === "calendar" && "grid gap-5 md:grid-cols-[auto_1fr]")}>
        {view === "calendar" && (
          <div className="card-surface w-fit p-2">
            <Calendar mode="single" selected={selected} onSelect={(d) => d && setSelected(d)} modifiers={{ busy: datesWithTasks }} modifiersClassNames={{ busy: "font-bold underline decoration-teal decoration-2 underline-offset-4" }} />
          </div>
        )}
        <div className="space-y-2">
          {view === "calendar" && <p className="text-sm font-medium text-muted-foreground">{format(selected, "EEEE, d MMMM")}</p>}
          {view === "agenda" ? (
            agenda.map(([d, list]) => (
              <div key={d} className="space-y-2">
                <p className="pt-2 text-sm font-semibold text-muted-foreground">{friendlyDate(d)}</p>
                {list.map((t, i) => <TaskRow key={t.id} task={t} index={i} onToggle={(x) => toggle.mutate(x)} onOpen={setEditing} />)}
              </div>
            ))
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((t, i) => <TaskRow key={t.id} task={t} index={i} onToggle={(x) => toggle.mutate(x)} onOpen={setEditing} />)}
            </AnimatePresence>
          )}
          {filtered.length === 0 && <EmptyState title="No tasks here" body="Try another view or add a new task." />}
        </div>
      </div>

      <TaskEditor open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }} task={editing} draft={{ due_date: view === "calendar" ? format(selected, "yyyy-MM-dd") : null }} />
    </div>
  );
}
