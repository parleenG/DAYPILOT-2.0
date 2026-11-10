import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plan";
import { supabase } from "@/integrations/supabase/client";
import { changePlan, getMe } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/types";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — DayPilot" },
      { name: "description", content: "Free, Plus, Premium and Concierge plans for DayPilot." },
      { property: "og:title", content: "Pricing — DayPilot" },
      { property: "og:description", content: "Compare DayPilot plans: Free, Plus, Premium and Concierge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const [current, setCurrent] = useState<PlanId | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      setSignedIn(true);
      const me = await getMe();
      setCurrent(me.plan);
    });
  }, []);

  async function choose(id: PlanId) {
    if (!signedIn) return;
    const r = await changePlan({ data: { plan: id } });
    if ("error" in r && r.error) return toast.info(r.error);
    setCurrent(id);
    toast.success("Plan updated");
  }

  return (
    <div className="min-h-dvh bg-background px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <Link to={signedIn ? "/dashboard" : "/"} className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="mt-4 text-center text-4xl font-semibold">Choose your plan</h1>
        <p className="mt-2 text-center text-muted-foreground">Prices shown are placeholders. Online payment isn't connected yet, so paid plans can't be purchased today.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={`card-surface flex flex-col p-6 ${p.id === "premium" ? "ring-2 ring-gold" : ""}`}>
              <p className="font-display text-xl font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.tagline}</p>
              <p className="mt-4"><span className="font-display text-4xl font-semibold">${p.price}</span> <span className="text-sm text-muted-foreground">{p.period}</span></p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />{f}</li>)}</ul>
              {!signedIn ? (
                <Link to="/auth" search={{ mode: "signup" }} className="tap mt-6 rounded-full bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">Get started</Link>
              ) : current === p.id ? (
                <Button disabled className="mt-6 rounded-full">Current plan</Button>
              ) : (
                <Button variant={p.id === "free" ? "outline" : "default"} className="mt-6 rounded-full" onClick={() => choose(p.id)}>{p.id === "free" ? "Downgrade to Free" : "Upgrade"}</Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
