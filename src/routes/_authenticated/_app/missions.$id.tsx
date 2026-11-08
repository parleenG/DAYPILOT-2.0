import { createFileRoute, Link, notFound, useNavigate, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { missionQuery, SYNC_KEYS } from "@/lib/queries";
import { addMissionItem, deleteMission, deleteMissionItem, setMissionStatus, toggleMissionItem } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategoryBadge, ProgressRing, TaskRow } from "@/components/shared";
import { MissionForm } from "@/components/mission-form";
import { TaskEditor, useToggleTask } from "@/components/task-editor";
import { friendlyDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MissionStatus, Task } from "@/lib/types";

const STATUSES: { v: MissionStatus; l: string }[] = [
  { v: "not_started", l: "Not started" }, { v: "in_progress", l: "In progress" }, { v: "waiting", l: "Waiting" }, { v: "completed", l: "Completed" },
];

export const Route = createFileRoute("/_authenticated/_app/missions/$id")({
  head: () => ({ meta: [{ title: "Mission — DayPilot" }, { name: "description", content: "Mission details, checklist and timeline." }] }),
  loader: async ({ context, params }) => {
    const r = await context.queryClient.ensureQueryData(missionQuery(params.id));
    if (!r.mission) throw notFound();
  },
  component: MissionDetailPage,
  notFoundComponent: () => (
    <div className="py-16 text-center"><p className="font-display text-xl">Mission not found</p><Link to="/missions" className="mt-3 inline-block text-teal">Back to missions</Link></div>
  ),
  errorComponent: MissionError,
});

function MissionError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="py-16 text-center">
      <p>{error instanceof Error ? error.message : "Couldn't load this mission"}</p>
      <Button className="mt-3" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
    </div>
  );
}

function MissionDetailPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(missionQuery(id));
  const mission = data.mission!;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toggleTask = useToggleTask();
  const [newItem, setNewItem] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [taskOpen, setTaskOpen] = useState<Task | null | "new">(null);
  const sync = () => { qc.invalidateQueries({ queryKey: ["missions"] }); SYNC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] })); };

  const toggleItem = useMutation({
    mutationFn: (v: { id: string; completed: boolean }) => toggleMissionItem({ data: v }),
    onMutate: (v) => {
      qc.setQueryData(missionQuery(id).queryKey, (old) => {
        if (!old?.mission) return old;
        const items = old.mission.items.map((i) => (i.id === v.id ? { ...i, completed: v.completed } : i));
        const done = items.filter((i) => i.completed).length;
        return { mission: { ...old.mission, items, progress: items.length ? Math.round((done / items.length) * 100) : 0 } };
      });
    },
    onSettled: sync,
  });
  const addItem = useMutation({
    mutationFn: (title: string) => addMissionItem({ data: { mission_id: id, title } }),
    onSuccess: (r) => { if ("error" in r && r.error) toast.error(r.error); setNewItem(""); sync(); },
  });
  const removeItem = useMutation({ mutationFn: (itemId: string) => deleteMissionItem({ data: { id: itemId } }), onSettled: sync });
  const status = useMutation({
    mutationFn: (v: { status: MissionStatus; confirm?: boolean }) => setMissionStatus({ data: { id, ...v } }),
    onSuccess: (r, v) => { if ("error" in r && r.error) return toast.error(r.error); if (v.status === "completed") toast.success("Mission completed — well done!"); sync(); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMission({ data: { id } }),
    onSuccess: () => { toast.success("Mission deleted"); qc.removeQueries({ queryKey: ["missions", id] }); sync(); navigate({ to: "/missions" }); },
  });

  const allDone = mission.items.length > 0 && mission.items.every((i) => i.completed);

  return (
    <div className="space-y-5">
      <Link to="/missions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Missions</Link>

      <motion.section layoutId={`mission-${mission.id}`} className="gradient-hero rounded-3xl p-6 text-primary-foreground">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-card p-1"><ProgressRing value={mission.progress} size={72} stroke={7} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">{mission.title}</h1>
            {mission.description && <p className="mt-1 text-sm opacity-80">{mission.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <CategoryBadge category={mission.category} />
              <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 capitalize">{mission.priority} priority</span>
              {mission.start_date && <span className="opacity-80">Starts {friendlyDate(mission.start_date)}</span>}
              {mission.deadline && <span className="opacity-80">Due {friendlyDate(mission.deadline)}</span>}
            </div>
          </div>
          <div className="flex gap-1">
            <button aria-label="Edit mission" onClick={() => setEditing(true)} className="tap rounded-full p-2 hover:bg-primary-foreground/10"><Pencil className="h-4 w-4" /></button>
            <button aria-label="Delete mission" onClick={() => setConfirmDelete(true)} className="tap rounded-full p-2 hover:bg-primary-foreground/10"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </motion.section>

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {STATUSES.map((s) => (
          <button key={s.v} onClick={() => (s.v === "completed" ? setConfirmComplete(true) : status.mutate({ status: s.v }))} className={cn("tap relative shrink-0 rounded-full px-4 py-1.5 text-sm", mission.status === s.v ? "text-primary-foreground" : "border border-border bg-card text-muted-foreground")}>
            {mission.status === s.v && <motion.span layoutId="status-pill" className="absolute inset-0 rounded-full bg-teal" />}
            <span className="relative z-10">{s.l}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card-surface p-5">
          <h2 className="text-lg font-semibold">Checklist timeline</h2>
          <ol className="relative mt-4 space-y-1">
            <span className="absolute bottom-3 left-[11px] top-3 w-0.5 bg-sand" aria-hidden />
            <AnimatePresence initial={false}>
              {mission.items.map((it) => (
                <motion.li key={it.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="group relative flex items-center gap-3 py-1.5">
                  <button onClick={() => toggleItem.mutate({ id: it.id, completed: !it.completed })} aria-label={it.completed ? `Mark ${it.title} not done` : `Mark ${it.title} done`} className={cn("tap relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", it.completed ? "border-teal bg-teal text-white" : "border-border bg-card")}>
                    {it.completed && <Check className="h-3.5 w-3.5 animate-pop-check" strokeWidth={3} />}
                  </button>
                  <span className={cn("flex-1 text-sm", it.completed && "text-muted-foreground line-through")}>{it.title}</span>
                  <button aria-label={`Remove ${it.title}`} onClick={() => removeItem.mutate(it.id)} className="opacity-0 transition group-hover:opacity-100 focus:opacity-100"><X className="h-4 w-4 text-muted-foreground" /></button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          {mission.items.length === 0 && <p className="text-sm text-muted-foreground">Add the steps this mission needs.</p>}
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newItem.trim()) addItem.mutate(newItem); }}>
            <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a step" maxLength={200} />
            <Button type="submit" size="icon" aria-label="Add step" disabled={addItem.isPending}><Plus className="h-4 w-4" /></Button>
          </form>
          {allDone && mission.status !== "completed" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-accent p-3 text-sm">
              Every step is done. Mark the mission completed?
              <Button size="sm" className="rounded-full" onClick={() => setConfirmComplete(true)}>Review</Button>
            </motion.div>
          )}
        </section>

        <div className="space-y-5">
          <section className="card-surface p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Related tasks</h2><Button size="sm" variant="outline" className="rounded-full" onClick={() => setTaskOpen("new")}><Plus className="mr-1 h-3.5 w-3.5" /> Task</Button></div>
            <div className="mt-3 space-y-2">
              {(mission.tasks ?? []).map((t) => <TaskRow key={t.id} task={t} onToggle={(x) => { toggleTask.mutate(x); setTimeout(sync, 300); }} onOpen={setTaskOpen} />)}
              {(mission.tasks ?? []).length === 0 && <p className="text-sm text-muted-foreground">Tasks with dates and reminders linked to this mission appear here.</p>}
            </div>
          </section>
          {mission.notes && <section className="card-surface p-5"><h2 className="text-lg font-semibold">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{mission.notes}</p></section>}
          <p className="text-xs text-muted-foreground">Created {new Date(mission.created_at).toLocaleDateString()} · Updated {new Date(mission.updated_at).toLocaleDateString()}</p>
        </div>
      </div>

      <MissionForm open={editing} onOpenChange={(o) => { setEditing(o); if (!o) sync(); }} mission={mission} />
      <TaskEditor open={!!taskOpen} onOpenChange={(o) => { if (!o) { setTaskOpen(null); sync(); } }} task={taskOpen === "new" ? null : taskOpen} draft={{ mission_id: id, household_id: mission.household_id }} />

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark “{mission.title}” as completed?</AlertDialogTitle>
            <AlertDialogDescription>{allDone ? "All checklist steps are done." : `${mission.items.filter((i) => !i.completed).length} checklist steps are still open.`} You can reopen it later by changing its status.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => status.mutate({ status: "completed", confirm: true })}>Yes, it's done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader><AlertDialogTitle>Delete this mission?</AlertDialogTitle><AlertDialogDescription>Its checklist is deleted too. Linked tasks are kept but unlinked.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
