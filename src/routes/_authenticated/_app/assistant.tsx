import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowUp, Check, Sparkles, Trash2 } from "lucide-react";
import { chatQuery, SYNC_KEYS } from "@/lib/queries";
import { sendChat, clearChat } from "@/lib/assistant.functions";
import { createMission, createTask } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { friendlyDate } from "@/lib/format";
import type { AssistantPayload, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/assistant")({
  head: () => ({ meta: [{ title: "Assistant — DayPilot" }, { name: "description", content: "Plan tasks and Life Missions in plain words." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(chatQuery),
  component: AssistantPage,
});

const PROMPTS = [
  "I need to renew my passport next month",
  "I have an important exam in 3 weeks. Help me prepare.",
  "Plan my day: groceries, gym, and a report due at 5pm",
  "What should I prioritize this week?",
];

function AssistantPage() {
  const { data } = useSuspenseQuery(chatQuery);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data.messages.length, pending]);

  const send = useMutation({
    mutationFn: (t: string) => sendChat({ data: { conversationId: data.conversationId, text: t } }),
    onMutate: (t) => { setPending(t); setText(""); },
    onSuccess: (r) => {
      if ("limited" in r && r.limited) { setLimitMsg(r.error ?? null); return; }
      if ("error" in r && r.error && !("message" in r)) return toast.error(r.error);
      if ("aiError" in r && r.aiError) toast.error(r.aiError);
      qc.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: () => toast.error("Couldn't reach the assistant. Please try again."),
    onSettled: () => setPending(null),
  });
  const clear = useMutation({ mutationFn: () => clearChat(), onSuccess: () => { setLimitMsg(null); qc.invalidateQueries({ queryKey: ["chat"] }); } });

  const submit = (t: string) => { if (t.trim() && !send.isPending) send.mutate(t.trim()); };
  const empty = data.messages.length === 0 && !pending;

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Assistant</h1>
          <p className="text-xs text-muted-foreground">{data.aiDaily === 0 ? "Not included on the Free plan" : `${Math.max(0, data.aiDaily - data.usedToday)} of ${data.aiDaily} messages left today`}</p>
        </div>
        {data.messages.length > 0 && <Button variant="ghost" size="sm" onClick={() => clear.mutate()} disabled={clear.isPending}><Trash2 className="mr-1 h-4 w-4" /> Clear</Button>}
      </div>

      <div className="flex-1 space-y-4 py-5">
        {empty && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full gradient-gold"><Sparkles className="h-5 w-5 text-midnight" /></span>
            <p className="mt-3 font-display text-lg font-semibold">What's on your mind?</p>
            <p className="mt-1 text-sm text-muted-foreground">Describe a responsibility. I'll suggest tasks or a Life Mission — nothing is saved until you approve it.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {PROMPTS.map((p) => <button key={p} onClick={() => submit(p)} className="tap rounded-2xl border border-border bg-background px-3 py-2.5 text-left text-sm hover:bg-accent">{p}</button>)}
            </div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {data.messages.map((m) => <Bubble key={m.id} m={m} />)}
          {pending && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{pending}</div>
              <div className="flex w-fit gap-1 rounded-3xl rounded-bl-md bg-card px-4 py-3 shadow-[var(--shadow-soft)]" aria-label="DayPilot is typing">
                {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-lavender" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {limitMsg && (
          <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>{limitMsg}</span>
            <Link to="/pricing" className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground">See plans</Link>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(text); }} className="sticky bottom-20 flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-[var(--shadow-lift)] md:bottom-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(text); } }}
          placeholder="Ask DayPilot to plan something…"
          rows={1}
          maxLength={2000}
          className="min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={!text.trim() || send.isPending} aria-label="Send"><ArrowUp className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const user = m.role === "user";
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", user ? "items-end" : "items-start")}>
      <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-sm", user ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-[var(--shadow-soft)]")}>{m.content}</div>
      {!user && m.payload && <Suggestions payload={m.payload} />}
    </motion.div>
  );
}

function Suggestions({ payload }: { payload: AssistantPayload }) {
  const qc = useQueryClient();
  const tasks = payload.suggestions?.tasks ?? [];
  const mission = payload.suggestions?.mission;
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  if (!tasks.length && !mission) return null;
  const sync = () => SYNC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] }));

  async function saveTask(i: number) {
    const t = tasks[i]!;
    const r = await createTask({ data: { title: t.title, due_date: t.due_date ?? null, priority: t.priority, category: t.category } });
    if ("error" in r && r.error) return toast.error(r.error);
    setSaved((s) => new Set(s).add(`t${i}`)); sync(); toast.success("Task added");
  }
  async function saveAll() {
    setBusy(true);
    for (let i = 0; i < tasks.length; i++) if (!saved.has(`t${i}`)) await saveTask(i);
    setBusy(false);
  }
  async function saveMission() {
    if (!mission) return;
    setBusy(true);
    const r = await createMission({ data: { title: mission.title, description: mission.description, deadline: mission.deadline ?? null, checklist: mission.checklist ?? [] } });
    setBusy(false);
    if ("error" in r && r.error) return toast.error(r.error);
    setSaved((s) => new Set(s).add("m")); sync(); toast.success("Mission created");
  }

  return (
    <div className="mt-2 w-full max-w-[85%] space-y-2">
      {mission && (
        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-wider text-gold">Suggested Life Mission</p>
          <p className="mt-1 font-display font-semibold">{mission.title}</p>
          {mission.deadline && <p className="text-xs text-muted-foreground">Deadline {friendlyDate(mission.deadline)}</p>}
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{(mission.checklist ?? []).map((c) => <li key={c}>• {c}</li>)}</ul>
          <Button size="sm" className="mt-3 rounded-full" disabled={busy || saved.has("m")} onClick={saveMission}>{saved.has("m") ? <><Check className="mr-1 h-3.5 w-3.5" /> Saved</> : "Save this mission"}</Button>
        </div>
      )}
      {tasks.length > 0 && (
        <div className="card-surface p-4">
          <div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wider text-gold">Suggested tasks</p><button className="text-xs text-teal disabled:opacity-50" disabled={busy} onClick={saveAll}>Add all</button></div>
          <ul className="mt-2 space-y-1.5">
            {tasks.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{t.title} <span className="text-xs text-muted-foreground">· {friendlyDate(t.due_date ?? null)}</span></span>
                <button onClick={() => saveTask(i)} disabled={saved.has(`t${i}`)} className="tap shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs disabled:border-teal disabled:text-teal">{saved.has(`t${i}`) ? "Added" : "Add"}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
