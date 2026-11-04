import type { PlanId } from "./types";

// Placeholder prices — configure a payment provider before charging real money.
export const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  missionLimit: number;
  aiDaily: number;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "forever",
    tagline: "Get your day under control.",
    missionLimit: 3,
    aiDaily: 0,
    features: [
      "Basic task management",
      "Up to 3 Life Missions",
      "Basic reminders",
      "Calendar & agenda views",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "4",
    period: "per month",
    tagline: "More missions, more momentum.",
    missionLimit: 25,
    aiDaily: 20,
    features: [
      "Up to 25 Life Missions",
      "Advanced organization tools",
      "AI assistant allowance (20 msgs/day)",
      "Household workspace",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "9",
    period: "per month",
    tagline: "For busy households and big plans.",
    missionLimit: 100,
    aiDaily: 100,
    features: [
      "Up to 100 Life Missions",
      "Higher AI usage (100 msgs/day)",
      "Advanced planning & insights",
      "Enhanced household features",
      "More customization",
    ],
  },
  {
    id: "concierge",
    name: "Concierge",
    price: "19",
    period: "per month",
    tagline: "Personal help for what matters most.",
    missionLimit: 1000,
    aiDaily: 500,
    features: [
      "Everything in Premium",
      "Highest AI usage allowance",
      "Priority personalized support",
      "Access to concierge services when available",
    ],
  },
];

export function planLimits(plan: PlanId) {
  const p = PLANS.find((x) => x.id === plan) ?? PLANS[0];
  return { missionLimit: p.missionLimit, aiDaily: p.aiDaily, name: p.name };
}
