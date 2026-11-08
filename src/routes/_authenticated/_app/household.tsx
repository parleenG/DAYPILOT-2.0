import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, LogOut, UserMinus, Home } from "lucide-react";
import { householdQuery, meQuery, tasksQuery, missionsQuery, SYNC_KEYS } from "@/lib/queries";
import { createHousehold, joinHousehold, leaveHousehold, removeHouseholdMember } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProgressRing, TaskRow } from "@/components/shared";
import { TaskEditor, useToggleTask } from "@/components/task-editor";
import type { Task } from "@/lib/types";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/household")({
  head: () => ({ meta: [{ title: "Household — DayPilot" }, { name: "description", content: "Share responsibilities with your household." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(householdQuery), context.queryClient.ensureQueryData(tasksQuery), context.queryClient.ensureQueryData(missionsQuery)]),
  component: HouseholdPage,
});

function HouseholdPage() {
  const { data: hh } = useSuspenseQuery(householdQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: missions } = useSuspenseQuery(missionsQuery);
  const qc = useQueryClient();
  const toggle = useToggleTask();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState<Task | null | "new">(null);
  const sync = () => SYNC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] }));
  const handle = (r: { error?: string }, ok: string) => { if (r.error) return toast.error(r.error); toast.success(ok); sync(); };

  const create = useMutation({ mutationFn: () => createHousehold({ data: { name } }), onSuccess: (r) => handle(r, "Household created") });
  const join = useMutation({ mutationFn: () => joinHousehold({ data: { code } }), onSuccess: (r) => handle(r, "You joined the household") });
  const leave = useMutation({ mutationFn: () => leaveHousehold(), onSuccess: (r) => handle(r, "You left the household") });
  const kick = useMutation({ mutationFn: (id: string) => removeHouseholdMember({ data: { member_id: id } }), onSuccess: (r) => handle(r, "Member removed") });

  if (!hh) {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-semibold">Household</h1>
        <div className="card-surface p-6">
          <Home className="h-8 w-8 text-teal" />
          <h2 className="mt-3 text-xl font-semibold">Share life with your household</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a shared space for tasks and missions, then invite people with a code.</p>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Sharma home" maxLength={80} />
            <Button type="submit" disabled={create.isPending || !name.trim()}>Create</Button>
          </form>
        </div>
        <div className="card-surface p-6">
          <h2 className="text-lg font-semibold">Have an invite code?</h2>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); join.mutate(); }}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="8-character code" maxLength={16} />
            <Button type="submit" variant="outline" disabled={join.isPending || !code.trim()}>Join</Button>
          </form>
        </div>
      </div>
    );
  }

  const shared = tasks.filter((t) => t.household_id === hh.id);
  const sharedMissions = missions.filter((m) => m.household_id === hh.id);
  const owner = hh.owner_id === me.profile?.id;
  const activity = [...shared].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8);
  const nameOf = (uid: string) => hh.members.find((m) => m.user_id === uid)?.name ?? "Member";

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div><h1 className="text-3xl font-semibold">{hh.name}</h1><p className="text-sm text-muted-foreground">{hh.members.length} members · {shared.filter((t) => !t.completed).length} open shared tasks</p></div>
        <Button className="rounded-full" onClick={() => setEditing("new")}>Shared task</Button>
      </div>

      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-xs text-muted-foreground">Invite code — share it with people you live with</p><p className="font-mono text-lg tracking-widest">{hh.invite_code}</p></div>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(hh.invite_code); toast.success("Invite code copied"); }}><Copy className="mr-1 h-3.5 w-3.5" /> Copy</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="text-lg font-semibold">Members</h2>
          <ul className="mt-3 space-y-2">
            {hh.members.map((m) => {
              const mine = shared.filter((t) => t.user_id === m.user_id);
              const pct = mine.length ? Math.round((mine.filter((t) => t.completed).length / mine.length) * 100) : 0;
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar><AvatarImage src={m.avatar_url ?? undefined} /><AvatarFallback>{(m.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1"><p className="text-sm font-medium">{m.name ?? "Member"} {m.user_id === me.profile?.id && <span className="text-muted-foreground">(you)</span>}</p><p className="text-xs capitalize text-muted-foreground">{m.role} · {m.open_tasks} open</p></div>
                  <ProgressRing value={pct} size={36} stroke={4} />
                  {owner && m.user_id !== me.profile?.id && <button aria-label={`Remove ${m.name ?? "member"}`} onClick={() => kick.mutate(m.id)}><UserMinus className="h-4 w-4 text-muted-foreground" /></button>}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card-surface p-5">
          <h2 className="text-lg font-semibold">Activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {activity.map((t) => <li key={t.id} className="text-muted-foreground"><span className="text-foreground">{nameOf(t.user_id)}</span> {t.completed ? "completed" : "has"} “{t.title}”</li>)}
            {activity.length === 0 && <li className="text-muted-foreground">Shared activity shows up here.</li>}
          </ul>
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Shared tasks</h2>
        {shared.map((t) => (
          <div key={t.id} className="relative">
            <TaskRow task={t} onToggle={(x) => toggle.mutate(x)} onOpen={setEditing} />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-lavender sm:block">{nameOf(t.user_id)}</span>
          </div>
        ))}
        {shared.length === 0 && <p className="text-sm text-muted-foreground">No shared tasks yet.</p>}
      </section>

      {sharedMissions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Shared missions</h2>
          {sharedMissions.map((m) => <Link key={m.id} to="/missions/$id" params={{ id: m.id }} className="card-surface flex items-center gap-3 p-3"><ProgressRing value={m.progress} size={36} stroke={4} /><span className="text-sm font-medium">{m.title}</span></Link>)}
        </section>
      )}

      {!owner && <Button variant="ghost" className="text-destructive" onClick={() => leave.mutate()}><LogOut className="mr-1 h-4 w-4" /> Leave household</Button>}
      <TaskEditor open={!!editing} onOpenChange={(o) => !o && setEditing(null)} task={editing === "new" ? null : editing} draft={{ household_id: hh.id }} />
    </div>
  );
}
