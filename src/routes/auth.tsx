import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode; redirect?: string } => ({
    mode: s.mode === "signup" || s.mode === "forgot" ? s.mode : undefined,
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//") ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — DayPilot" },
      { name: "description", content: "Sign in or create your DayPilot account." },
      { property: "og:title", content: "Sign in — DayPilot" },
      { property: "og:description", content: "Sign in or create your DayPilot account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72);

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);
  const target = search.redirect ?? "/dashboard";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: target, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) void navigate({ to: target, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    if (!em.success) return toast.error(em.error.issues[0]?.message);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("reset");
        return;
      }
      const pw = passwordSchema.safeParse(password);
      if (!pw.success) return toast.error(pw.error.issues[0]?.message);
      if (mode === "signup") {
        if (!consent) return toast.error("Please accept the Terms and Privacy Policy");
        const { data, error } = await supabase.auth.signUp({
          email: em.data,
          password: pw.data,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name.trim().slice(0, 80) } },
        });
        if (error) throw error;
        if (!data.session) setSent("confirm");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password: pw.data });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg.includes("Invalid login") ? "Email or password is incorrect" : msg);
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (res.error) toast.error("Sign-in didn't complete. Please try again.");
  }

  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <div className="gradient-hero hidden flex-col justify-between p-12 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt="" className="h-9 w-9 rounded-lg" />
          <span className="font-display text-xl font-semibold">DayPilot</span>
        </Link>
        <div>
          <h1 className="text-5xl font-semibold leading-tight">Your life, <span className="text-gradient-gold italic">under control.</span></h1>
          <p className="mt-4 max-w-sm opacity-80">Missions, tasks and your household — organized in one calm place.</p>
        </div>
        <p className="text-sm opacity-60">© {new Date().getFullYear()} DayPilot</p>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 md:hidden">
            <img src="/favicon.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-semibold">DayPilot</span>
          </Link>
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-6 text-center">
                <h2 className="text-2xl font-semibold">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {sent === "confirm" ? `We sent a confirmation link to ${email}. Open it to activate your account.` : `If an account exists for ${email}, a reset link is on its way.`}
                </p>
                <Button variant="outline" className="mt-5 rounded-full" onClick={() => { setSent(null); setMode("signin"); }}>Back to sign in</Button>
              </motion.div>
            ) : (
              <motion.div key={mode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                <h2 className="text-3xl font-semibold text-foreground">
                  {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "signup" ? "Start free — no card needed." : mode === "forgot" ? "We'll email you a secure link." : "Sign in to continue."}
                </p>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                  </div>
                  {mode !== "forgot" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {mode === "signin" && <button type="button" className="text-xs text-teal hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>}
                      </div>
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
                    </div>
                  )}
                  {mode === "signup" && (
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                      <span>I agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</span>
                    </label>
                  )}
                  <Button type="submit" className="w-full rounded-full" disabled={loading}>
                    {loading ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                  </Button>
                </form>
                {mode !== "forgot" && (
                  <>
                    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full rounded-full" onClick={() => oauth("google")}>Continue with Google</Button>
                      <Button variant="outline" className="w-full rounded-full" onClick={() => oauth("lovable")}>Continue with Lovable</Button>
                    </div>
                  </>
                )}
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {mode === "signup" ? "Already have an account? " : mode === "forgot" ? "Remembered it? " : "New to DayPilot? "}
                  <button className="font-medium text-foreground underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                    {mode === "signin" ? "Create an account" : "Sign in"}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
