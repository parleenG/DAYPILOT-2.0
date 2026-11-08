import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Users } from "lucide-react";
import { missionsQuery, meQuery } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryBadge, EmptyState, ProgressRing } from "@/components/shared";
import { MissionForm } from "@/components/mission-form";
import { friendlyDate, relativeDayLabel } from "@/lib/format";
import { planLimits } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { MissionStatus } from "@/lib/types";

export const STATUS_LABEL: Record<MissionStatus, string> = { not_started: "Not started", in_progress: "In progress", waiting: "Waiting", completed: "Completed" };
type Filter = "all" | MissionStatus | "overdue" | "upcoming";

export const Route = createFileRoute("/_authenticated/_app/missions/")({
  validateSearch: (s: Record<string, unknown>): { filter?: Filter; q?: string; sort?: "deadline" | "progress" | "recent" } => ({
    filter: typeof s.filter === "string" ? (s.filter as Filter) : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    sort: s.sort === "progress" || s.sort === "recent" ? s.sort : undefined,
  }),
  head: () => ({ meta: [{ title: "Life Missions — DayPilot" }, { name: "description", content: "Your Life Missions, with progress and deadlines." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(missionsQuery),
  component: MissionsPage,
});

function MissionsPage() {
  const { data: missions } = useSuspenseQuery(missionsQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/missions/" });
  const [creating, setCreating] = useState(false);
  const filter = search.filter ?? "all";
  const limit = planLimits(me.plan).missionLimit;
  const set = (p: Partial<typeof search>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });

  const list = useMemo(() => {
    let l = missions;
    if (search.q) l = l.filter((m) => (m.title + m.description).toLowerCase().includes(search.q!.toLowerCase()));
    if (filter === "overdue") l = l.filter((m) => m.status !== "completed" && relativeDayLabel(m.deadline) === "overdue");
    else if (filter === "upcoming") l = l.filter((m) => m.status !== "completed" && m.deadline && relativeDayLabel(m.deadline) !== "overdue");
    else if (filter !== "all") l = l.filter((m) => m.status === filter);
    const s = search.sort ?? "deadline";
    return [...l].sort((a, b) => (s === "progress" ? b.progress - a.progress : s === "recent" ? b.created_at.localeCompare(a.created_at) : (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")));
  }, [missions, search, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Life Missions</h1>
          <p className="text-sm text-muted-foreground">{missions.length} of {limit} on your plan</p>
        </div>
        <Button className="rounded-full" onClick={() => (missions.length >= limit ? navigate({ to: "/pricing" }) : setCreating(true))}>
          <Plus className="mr-1 h-4 w-4" /> {missions.length >= limit ? "Upgrade for more" : "New mission"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {(["all", "not_started", "in_progress", "waiting", "completed", "overdue", "upcoming"] as Filter[]).map((f) => (
          <button key={f} onClick={() => set({ filter: f === "all" ? undefined : f })} className={cn("tap shrink-0 rounded-full border px-3.5 py-1.5 text-sm", filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
            {f === "all" ? "All" : f === "overdue" ? "Overdue" : f === "upcoming" ? "Upcoming" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} placeholder="Search missions" className="pl-9" />
        </div>
        <select aria-label="Sort missions" value={search.sort ?? "deadline"} onChange={(e) => set({ sort: e.target.value === "deadline" ? undefined : (e.target.value as "progress" | "recent") })} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
          <option value="deadline">By deadline</option><option value="progress">By progress</option><option value="recent">Most recent</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((m, i) => (
          <motion.div key={m.id} layoutId={`mission-${m.id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
            <Link to="/missions/$id" params={{ id: m.id }} className="tap card-surface flex gap-4 p-4 hover:shadow-[var(--shadow-lift)]">
              <ProgressRing value={m.progress} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate font-display text-base font-semibold">{m.title}</p>{m.household_id && <Users className="h-3.5 w-3.5 text-lavender" />}</div>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{m.description || `${m.items.length} steps`}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <CategoryBadge category={m.category} />
                  <span className="rounded-full bg-accent px-2 py-0.5">{STATUS_LABEL[m.status]}</span>
                  {m.deadline && <span className={cn(relativeDayLabel(m.deadline) === "overdue" && m.status !== "completed" ? "text-destructive" : "text-muted-foreground")}>Due {friendlyDate(m.deadline)}</span>}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {list.length === 0 && (
        <EmptyState title="No missions here" body="A Life Mission turns a big responsibility into clear steps — like renewing a passport or preparing for an exam." action={<Button className="mt-2 rounded-full" onClick={() => setCreating(true)}>Create a mission</Button>} />
      )}
      <MissionForm open={creating} onOpenChange={setCreating} />
    </div>
  );
}
