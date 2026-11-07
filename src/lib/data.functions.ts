// App-internal server functions: profile, tasks, missions, household, notifications, plan.
import { createServerFn } from "@tanstack/react-start";
import type { PlanId, Profile, Task, Mission, MissionItem, MissionDetail, HouseholdInfo, HouseholdMemberInfo, AppNotification } from "./types";
import { planLimits } from "./plan";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


// ---------- Profile ----------

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("subscriptions").select("plan,status").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      profile: (profile as Profile | null) ?? null,
      plan: (sub?.plan ?? "free") as PlanId,
      planStatus: sub?.status ?? "active",
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { full_name?: string; avatar_url?: string | null; language?: string; timezone?: string; areas?: string[]; appearance?: string; notification_prefs?: Record<string, boolean> }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    const allowed = ["full_name", "avatar_url", "language", "timezone", "areas", "appearance", "notification_prefs"];
    for (const k of allowed) if (k in data) patch[k] = data[k];
    if (Object.keys(patch).length === 0) return { error: "Nothing to update" };
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    return error ? { error: error.message } : { ok: true };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((input: { full_name?: string; language: string; timezone: string; areas: string[] }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.full_name?.slice(0, 80), language: data.language, timezone: data.timezone, areas: data.areas.slice(0, 12), onboarding_completed: true })
      .eq("id", context.userId);
    if (error) return { error: error.message };
    await context.supabase.from("consents").upsert({ user_id: context.userId, terms_version: "v1" }, { onConflict: "user_id" });
    return { ok: true };
  });

// ---------- Tasks ----------

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Task[]> => {
    const { data } = await context.supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
    return (data as unknown as Task[]) ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; description?: string; category?: string; due_date?: string | null; due_time?: string | null; priority?: string; reminder_at?: string | null; mission_id?: string | null; household_id?: string | null; assign_to?: string | null }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const title = data.title.trim();
    if (!title) return { error: "Give the task a title" };
    const { data: created, error } = await context.supabase
      .from("tasks")
      .insert({
        user_id: data.assign_to && data.household_id ? data.assign_to : context.userId,
        household_id: data.household_id ?? null,
        mission_id: data.mission_id ?? null,
        title: title.slice(0, 200),
        description: (data.description ?? "").slice(0, 2000),
        category: data.category ?? "personal",
        due_date: data.due_date || null,
        due_time: data.due_time || null,
        priority: data.priority === "low" || data.priority === "high" ? data.priority : "medium",
        reminder_at: data.reminder_at || null,
      })
      .select("*")
      .single();
    if (error) return { error: error.message };
    if (data.assign_to && data.assign_to !== context.userId && data.household_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("notifications").insert({
        user_id: data.assign_to,
        type: "task_assigned",
        title: "New task assigned to you",
        body: title.slice(0, 200),
      });
    }
    return { task: created as unknown as Task };
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; title?: string; description?: string; category?: string; due_date?: string | null; due_time?: string | null; priority?: string; reminder_at?: string | null; mission_id?: string | null; completed?: boolean; assign_to?: string | null }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { id, assign_to, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (typeof data.completed === "boolean") patch.completed_at = data.completed ? new Date().toISOString() : null;
    if (assign_to !== undefined) patch.user_id = assign_to;
    const { error } = await context.supabase.from("tasks").update(patch).eq("id", id);
    if (error) return { error: error.message };
    if (assign_to && assign_to !== context.userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await context.supabase.from("tasks").select("title").eq("id", id).maybeSingle();
      await supabaseAdmin.from("notifications").insert({
        user_id: assign_to,
        type: "task_assigned",
        title: "A task was assigned to you",
        body: (row?.title ?? "").slice(0, 200),
      });
    }
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    return error ? { error: error.message } : { ok: true };
  });

// ---------- Missions ----------

export const listMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MissionDetail[]> => {
    const [{ data: missions }, { data: items }] = await Promise.all([
      context.supabase.from("missions").select("*").order("created_at", { ascending: false }),
      context.supabase.from("mission_items").select("*").order("sort_order", { ascending: true }),
    ]);
    const ms = (missions as Mission[]) ?? [];
    const its = (items as MissionItem[]) ?? [];
    return ms.map((m) => {
      const mine = its.filter((i) => i.mission_id === m.id);
      const done = mine.filter((i) => i.completed).length;
      return { ...m, items: mine, progress: mine.length ? Math.round((done / mine.length) * 100) : m.status === "completed" ? 100 : 0 };
    });
  });

export const getMission = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ mission: MissionDetail | null }> => {
    const { data: m } = await context.supabase.from("missions").select("*").eq("id", data.id).maybeSingle();
    if (!m) return { mission: null };
    const { data: items } = await context.supabase.from("mission_items").select("*").eq("mission_id", data.id).order("sort_order", { ascending: true });
    const { data: tasks } = await context.supabase.from("tasks").select("*").eq("mission_id", data.id).order("due_date", { ascending: true, nullsFirst: false });
    const its = (items as MissionItem[]) ?? [];
    const done = its.filter((i) => i.completed).length;
    return {
      mission: {
        ...(m as Mission),
        items: its,
        tasks: (tasks as unknown as Task[]) ?? [],
        progress: its.length ? Math.round((done / its.length) * 100) : (m as Mission).status === "completed" ? 100 : 0,
      },
    };
  });

export const createMission = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; description?: string; category?: string; priority?: string; start_date?: string | null; deadline?: string | null; notes?: string; checklist?: string[]; household_id?: string | null }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const title = data.title.trim();
    if (!title) return { error: "Give the mission a title" };
    const { data: sub } = await context.supabase.from("subscriptions").select("plan").eq("user_id", context.userId).maybeSingle();
    const plan = (sub?.plan ?? "free") as PlanId;
    const { count } = await context.supabase.from("missions").select("id", { count: "exact", head: true });
    const { missionLimit } = planLimits(plan);
    if ((count ?? 0) >= missionLimit) return { error: `Your ${planLimits(plan).name} plan allows up to ${missionLimit} Life Missions. Upgrade for more.`, limitReached: true };
    const { data: created, error } = await context.supabase
      .from("missions")
      .insert({
        user_id: context.userId,
        household_id: data.household_id ?? null,
        title: title.slice(0, 160),
        description: (data.description ?? "").slice(0, 2000),
        category: data.category ?? "personal",
        priority: data.priority === "low" || data.priority === "high" ? data.priority : "medium",
        start_date: data.start_date || null,
        deadline: data.deadline || null,
        status: "not_started",
        notes: (data.notes ?? "").slice(0, 4000),
      })
      .select("*")
      .single();
    if (error) return { error: error.message };
    const mission = created as Mission;
    const checklist = (data.checklist ?? []).map((c) => c.trim()).filter(Boolean).slice(0, 30);
    if (checklist.length) {
      await context.supabase.from("mission_items").insert(checklist.map((t, i) => ({ mission_id: mission.id, title: t.slice(0, 200), sort_order: i })));
    }
    return { missionId: mission.id };
  });

export const updateMission = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; title?: string; description?: string; category?: string; priority?: string; start_date?: string | null; deadline?: string | null; notes?: string; status?: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (rest.status === "completed") delete rest.status; // completion requires confirmation via setMissionStatus
    const { error } = await context.supabase.from("missions").update(rest).eq("id", id);
    return error ? { error: error.message } : { ok: true };
  });

export const setMissionStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: string; confirm?: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    if (data.status === "completed" && !data.confirm) return { error: "Missions are only completed after your confirmation." };
    const { error } = await context.supabase.from("missions").update({ status: data.status }).eq("id", data.id);
    return error ? { error: error.message } : { ok: true };
  });

export const deleteMission = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("missions").delete().eq("id", data.id);
    return error ? { error: error.message } : { ok: true };
  });

export const addMissionItem = createServerFn({ method: "POST" })
  .inputValidator((input: { mission_id: string; title: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: maxRow } = await context.supabase.from("mission_items").select("sort_order").eq("mission_id", data.mission_id).order("sort_order", { ascending: false }).limit(1);
    const next = ((maxRow?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1;
    const { data: item, error } = await context.supabase.from("mission_items").insert({ mission_id: data.mission_id, title: data.title.trim().slice(0, 200), sort_order: next }).select("*").single();
    return error ? { error: error.message } : { item: item as MissionItem };
  });

export const toggleMissionItem = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; completed: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("mission_items").update({ completed: data.completed }).eq("id", data.id);
    return error ? { error: error.message } : { ok: true };
  });

export const deleteMissionItem = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("mission_items").delete().eq("id", data.id);
    return error ? { error: error.message } : { ok: true };
  });

// ---------- Household ----------

export const getHousehold = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HouseholdInfo | null> => {
    const { userId, supabase } = context;
    const { data: memberRows } = await supabase.from("household_members").select("household_id").eq("user_id", userId);
    const householdId = memberRows?.[0]?.household_id as string | undefined;
    if (!householdId) return null;
    const { data: h } = await supabase.from("households").select("*").eq("id", householdId).maybeSingle();
    if (!h) return null;
    const { data: rows } = await supabase.from("household_members").select("id, user_id, role, created_at").eq("household_id", householdId).order("created_at");
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", (rows ?? []).map((r) => r.user_id));
    const { data: hTasks } = await supabase.from("tasks").select("user_id, completed").eq("household_id", householdId);
    const members: HouseholdMemberInfo[] = (rows ?? []).map((r: Record<string, unknown>) => {
      const p = (profiles ?? []).find((x) => x.id === r.user_id);
      const open = (hTasks ?? []).filter((t) => t.user_id === r.user_id && !t.completed).length;
      return {
        id: String(r.id),
        user_id: String(r.user_id),
        role: String(r.role),
        name: (p?.full_name as string | null) ?? null,
        avatar_url: (p?.avatar_url as string | null) ?? null,
        email: null,
        open_tasks: open,
      };
    });
    return { id: h.id, name: h.name, owner_id: h.owner_id, invite_code: h.invite_code, created_at: h.created_at, members };
  });

export const createHousehold = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const name = data.name.trim();
    if (!name) return { error: "Name your household" };
    const { data: existing } = await context.supabase.from("household_members").select("household_id").eq("user_id", context.userId);
    if ((existing ?? []).length) return { error: "You already belong to a household. Leave it first." };
    const { data: h, error } = await context.supabase.from("households").insert({ name: name.slice(0, 80), owner_id: context.userId }).select("*").single();
    if (error || !h) return { error: error?.message ?? "Could not create household" };
    const { error: mErr } = await context.supabase.from("household_members").insert({ household_id: h.id, user_id: context.userId, role: "owner" });
    if (mErr) return { error: mErr.message };
    return { householdId: h.id };
  });

export const joinHousehold = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toLowerCase();
    const { data: h } = await context.supabase.from("households").select("id").eq("invite_code", code).maybeSingle();
    if (!h) return { error: "No household found with that invite code" };
    const { data: existing } = await context.supabase.from("household_members").select("household_id").eq("user_id", context.userId);
    if ((existing ?? []).some((r) => r.household_id === h.id)) return { ok: true, householdId: h.id };
    if ((existing ?? []).length) return { error: "You already belong to a household. Leave it first." };
    const { error } = await context.supabase.rpc("join_household", { _code: code });
    return error ? { error: error.message } : { ok: true, householdId: h.id };
  });

export const leaveHousehold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("household_members").delete().eq("user_id", context.userId);
    return error ? { error: error.message } : { ok: true };
  });

export const removeHouseholdMember = createServerFn({ method: "POST" })
  .inputValidator((input: { member_id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase.from("household_members").select("id, household_id").eq("id", data.member_id).maybeSingle();
    if (!member) return { error: "Member not found" };
    const { data: h } = await context.supabase.from("households").select("owner_id").eq("id", member.household_id).maybeSingle();
    if (h?.owner_id !== context.userId) return { error: "Only the household owner can remove members" };
    const { error } = await context.supabase.from("household_members").delete().eq("id", data.member_id);
    return error ? { error: error.message } : { ok: true };
  });

// ---------- Notifications ----------

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppNotification[]> => {
    const { data } = await context.supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    return (data as unknown as AppNotification[]) ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: string; all?: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const q = context.supabase.from("notifications").update({ read: true }).eq("user_id", context.userId);
    const { error } = data.all ? await q : await q.eq("id", data.id!);
    return error ? { error: error.message } : { ok: true };
  });

// ---------- Subscription (placeholder billing — no payments wired yet) ----------

export const changePlan = createServerFn({ method: "POST" })
  .inputValidator((input: { plan: PlanId }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    if (!["free", "plus", "premium", "concierge"].includes(data.plan)) return { error: "Unknown plan" };
    // Paid upgrades require a payment provider; never simulate a successful payment.
    if (data.plan !== "free") return { error: "Payments aren't set up yet, so paid plans can't be purchased right now.", paymentsUnavailable: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("subscriptions").update({ plan: data.plan, status: "active", updated_at: new Date().toISOString() }).eq("user_id", context.userId);
    return error ? { error: error.message } : { ok: true };
  });

// ---------- Account deletion ----------

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    return error ? { error: error.message } : { ok: true };
  });
