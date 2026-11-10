import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { meQuery } from "@/lib/queries";
import { updateProfile, deleteAccount } from "@/lib/data.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { planLimits } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/_app/profile")({
  head: () => ({ meta: [{ title: "Profile & settings — DayPilot" }, { name: "description", content: "Manage your profile, preferences and account." }] }),
  component: ProfilePage,
});

const NOTIFS = [
  ["task_reminders", "Task reminders"], ["deadlines", "Upcoming deadlines"], ["overdue", "Overdue alerts"],
  ["mission_progress", "Mission progress"], ["daily_plan", "Daily planning reminder"], ["weekly_summary", "Weekly summary"],
] as const;

function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const p = me.profile!;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(p.full_name ?? "");
  const [avatar, setAvatar] = useState(p.avatar_url ?? "");
  const [tz, setTz] = useState(p.timezone);
  const [lang, setLang] = useState(p.language);
  const [confirmDel, setConfirmDel] = useState(false);
  const prefs = (p.notification_prefs ?? {}) as Record<string, boolean>;
  const tzs = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updateProfile>[0]["data"]) => updateProfile({ data: patch }),
    onSuccess: (r) => { if ("error" in r && r.error) return toast.error(r.error); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["me"] }); },
  });
  const del = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: async (r) => { if ("error" in r && r.error) return toast.error(r.error); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/", replace: true }); },
  });

  async function signOut() {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <section className="card-surface space-y-4 p-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarImage src={avatar || undefined} /><AvatarFallback>{(name || "?").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
          <div><p className="font-display text-lg font-semibold">{name || "Your name"}</p><p className="text-sm text-muted-foreground">{planLimits(me.plan).name} plan</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="p-n">Name</Label><Input id="p-n" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="p-a">Profile picture URL</Label><Input id="p-a" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1.5"><Label>Language</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
              {[["en","English"],["es","Español"],["fr","Français"],["de","Deutsch"],["pt","Português"],["hi","हिन्दी"],["ar","العربية"],["zh","中文"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>Time zone</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={tz} onChange={(e) => setTz(e.target.value)}>{tzs.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <Button className="rounded-full" disabled={save.isPending} onClick={() => save.mutate({ full_name: name, avatar_url: avatar || null, language: lang, timezone: tz })}>Save profile</Button>
      </section>

      <section className="card-surface p-5">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="mt-3 flex gap-2">
          {["light", "dark", "system"].map((a) => (
            <button key={a} onClick={() => save.mutate({ appearance: a })} className={`tap rounded-full border px-4 py-1.5 text-sm capitalize ${p.appearance === a ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{a}</button>
          ))}
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-xs text-muted-foreground">In-app notifications. Push and email delivery are coming later.</p>
        <ul className="mt-3 space-y-3">
          {NOTIFS.map(([k, l]) => (
            <li key={k} className="flex items-center justify-between text-sm">{l}<Switch checked={prefs[k] !== false} onCheckedChange={(v) => save.mutate({ notification_prefs: { ...prefs, [k]: v } })} /></li>
          ))}
        </ul>
      </section>

      <section className="card-surface divide-y divide-border p-2 text-sm">
        <Link to="/pricing" className="block px-3 py-3 hover:bg-accent">Subscription & billing</Link>
        <Link to="/notifications" className="block px-3 py-3 hover:bg-accent">All notifications</Link>
        <Link to="/privacy" className="block px-3 py-3 hover:bg-accent">Privacy policy</Link>
        <Link to="/terms" className="block px-3 py-3 hover:bg-accent">Terms of service</Link>
        <a href="mailto:support@daypilot.app" className="block px-3 py-3 hover:bg-accent">Help & support</a>
        <p className="px-3 py-3 text-muted-foreground">About DayPilot — Your life, under control. Version 1.0</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-full" onClick={signOut}>Sign out</Button>
        <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDel(true)}>Delete account</Button>
      </div>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader><AlertDialogTitle>Delete your account?</AlertDialogTitle><AlertDialogDescription>This permanently deletes your profile, tasks, missions and conversations. It can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate()}>Delete everything</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
