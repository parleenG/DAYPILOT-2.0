// Shared client-safe types for DayPilot.

export type TaskPriority = "low" | "medium" | "high";
export type MissionStatus = "not_started" | "in_progress" | "waiting" | "completed";
export type PlanId = "free" | "plus" | "premium" | "concierge";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  language: string;
  timezone: string;
  areas: string[];
  onboarding_completed: boolean;
  notification_prefs: Record<string, boolean>;
  appearance: string;
  email?: string;
}

export interface Task {
  id: string;
  user_id: string;
  household_id: string | null;
  mission_id: string | null;
  title: string;
  description: string;
  category: string;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  reminder_at: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mission {
  id: string;
  user_id: string;
  household_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  start_date: string | null;
  deadline: string | null;
  status: MissionStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MissionItem {
  id: string;
  mission_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface MissionDetail extends Mission {
  items: MissionItem[];
  progress: number;
  tasks?: Task[];
}

export interface HouseholdInfo {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  members: HouseholdMemberInfo[];
}

export interface HouseholdMemberInfo {
  id: string;
  user_id: string;
  role: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  open_tasks: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload: AssistantPayload | null;
  created_at: string;
}

export interface AssistantPayload {
  suggestions?: {
    tasks?: { title: string; due_date?: string | null; due_time?: string | null; priority?: TaskPriority; category?: string }[];
    mission?: { title: string; description?: string; deadline?: string | null; checklist?: string[] } | null;
  };
  used_ai?: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface SubscriptionInfo {
  plan: PlanId;
  status: string;
}

export interface DashboardSummary {
  profile: Profile;
  plan: PlanId;
  tasks: Task[];
  missions: Mission[];
  household_name: string | null;
}
