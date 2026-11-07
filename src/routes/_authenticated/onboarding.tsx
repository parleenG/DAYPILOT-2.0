import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Briefcase, CalendarClock, FolderCheck, GraduationCap, Home, User, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AREA_OPTIONS } from "@/lib/format";
import { completeOnboarding } from "@/lib/data.functions";
import { meQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — DayPilot" }, { name: "description", content: "Set up DayPilot in a minute." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Onboarding,
});

const ICONS = { User, GraduationCap, Briefcase, Home, CalendarClock, FolderCheck, Users } as const;
const LANGUAGES = [
  { v: "en", l: "English" }, { v: "es", l: "Español" }, { v: "fr", l: "Français" }, { v: "de", l: "Deutsch" },
  { v: "pt", l: "Português" }, { v: "hi", l: "हिन्दी" }, { v: "ar", l: "العربية" }, { v: "zh", l: "中文" },
];

function Onboarding() {
  const { data: me } = useSuspenseQuery(meQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tzs = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];
  const [step, setStep] = useState(0);
  const [name, setName] = useState(me.profile?.full_name ?? "");
  const [areas, setAreas] = useState<string[]>([]);
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [saving, setSaving] = useState(false);
  const total = 5;

  async function finish() {
    setSaving(true);
    const res = await completeOnboarding({ data: { full_name: name, language, timezone, areas } });
    setSaving(false);
    if ("error" in res && res.error) return toast.error(res.error);
    await qc.invalidateQueries({ queryKey: ["me"] });
    setStep(5);
  }

  const next = () => setStep((s) => Math.min(s + 1, total));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
              <motion.span className="block h-full bg-teal" initial={false} animate={{ width: i < step ? "100%" : "0%" }} />
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
            {step === 0 && (
              <>
                <img src="/favicon.png" alt="" className="h-14 w-14 rounded-2xl" />
                <h1 className="mt-6 text-4xl font-semibold">Welcome to DayPilot</h1>
                <p className="mt-3 text-muted-foreground">Your life, under control. Let's set things up — it takes under a minute.</p>
                <div className="mt-6 space-y-1.5">
                  <label htmlFor="ob-name" className="text-sm font-medium">What should we call you?</label>
                  <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h1 className="text-3xl font-semibold">How DayPilot works</h1>
                <ul className="mt-6 space-y-4">
                  {[
                    ["Life Missions", "Big responsibilities broken into steps, with deadlines and progress."],
                    ["Tasks & calendar", "Everything you need to do, by day, with reminders."],
                    ["Assistant", "Describe it in plain words; review suggestions before anything is saved."],
                    ["Household", "Share and assign responsibilities with the people you live with."],
                  ].map(([t, b]) => (
                    <li key={t} className="card-surface p-4"><p className="font-medium">{t}</p><p className="text-sm text-muted-foreground">{b}</p></li>
                  ))}
                </ul>
              </>
            )}
            {step === 2 && (
              <>
                <h1 className="text-3xl font-semibold">Where do you need help?</h1>
                <p className="mt-2 text-sm text-muted-foreground">Pick any — this is optional.</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {AREA_OPTIONS.map((a) => {
                    const Icon = ICONS[a.icon as keyof typeof ICONS];
                    const on = areas.includes(a.value);
                    return (
                      <button key={a.value} onClick={() => setAreas(on ? areas.filter((x) => x !== a.value) : [...areas, a.value])} className={cn("tap relative flex flex-col items-start gap-2 rounded-2xl border p-3 text-left text-sm", on ? "border-teal bg-accent" : "border-border bg-card")}>
                        <Icon className="h-5 w-5 text-teal" />
                        {a.label}
                        {on && <Check className="absolute right-2 top-2 h-4 w-4 text-teal" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h1 className="text-3xl font-semibold">Language</h1>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {LANGUAGES.map((l) => (
                    <button key={l.v} onClick={() => setLanguage(l.v)} className={cn("tap rounded-2xl border p-3 text-sm", language === l.v ? "border-teal bg-accent" : "border-border bg-card")}>{l.l}</button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">The app is currently shown in English; your preference is saved for upcoming translations and the assistant.</p>
              </>
            )}
            {step === 4 && (
              <>
                <h1 className="text-3xl font-semibold">Time zone</h1>
                <p className="mt-2 text-sm text-muted-foreground">We detected yours — change it if needed.</p>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-6 h-11 rounded-xl border border-input bg-card px-3 text-sm">
                  {tzs.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </>
            )}
            {step === 5 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex h-16 w-16 items-center justify-center rounded-full bg-teal text-white"><Check className="h-8 w-8" /></motion.span>
                <h1 className="mt-6 text-3xl font-semibold">You're all set{name ? `, ${name.split(" ")[0]}` : ""}</h1>
                <p className="mt-2 text-muted-foreground">Your dashboard shows today, upcoming tasks and active missions. Tap + anywhere to add something.</p>
                <Button className="mt-8 rounded-full px-8" onClick={() => navigate({ to: "/dashboard", replace: true })}>Open my dashboard</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {step < 5 && (
          <div className="mt-8 flex items-center gap-2">
            {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
            {(step === 2 || step === 3) && <Button variant="ghost" onClick={next}>Skip</Button>}
            <Button className="ml-auto rounded-full px-8" disabled={saving} onClick={() => (step === 4 ? finish() : next())}>
              {step === 4 ? (saving ? "Saving…" : "Finish") : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
