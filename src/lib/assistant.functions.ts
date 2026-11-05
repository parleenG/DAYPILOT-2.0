// DayPilot AI assistant: chat persistence + gateway call, plan-limited.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planLimits } from "./plan";
import type { PlanId, ChatMessage, AssistantPayload, ConversationSummary } from "./types";

export const getChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ conversationId: string | null; messages: ChatMessage[]; usedToday: number; aiDaily: number }> => {
    const { supabase, userId } = context;
    const { data: conv } = await supabase.from("conversations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const planRow = await supabase.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
    const aiDaily = planLimits((planRow.data?.plan ?? "free") as PlanId).aiDaily;
    if (!conv) return { conversationId: null, messages: [], usedToday: 0, aiDaily };
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [{ data: msgs }, { count }] = await Promise.all([
      supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("role", "assistant").gte("created_at", since.toISOString()),
    ]);
    return {
      conversationId: conv.id,
      messages: ((msgs ?? []) as unknown as ChatMessage[]) ?? [],
      usedToday: count ?? 0,
      aiDaily,
    };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConversationSummary[]> => {
    const { data } = await context.supabase.from("conversations").select("id, title, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20);
    return (data as unknown as ConversationSummary[]) ?? [];
  });

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator((input: { conversationId?: string | null; text: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const text = data.text.trim();
    if (!text) return { error: "Type a message first" };
    const { supabase, userId } = context;

    const planRow = await supabase.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
    const plan = (planRow.data?.plan ?? "free") as PlanId;
    const { aiDaily, name: planName } = planLimits(plan);
    if (aiDaily === 0) {
      return { limited: true as const, error: `The AI assistant is part of Plus and above. Your ${planName} plan doesn't include AI messages — upgrade on the pricing page to unlock it.` };
    }
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count: usedToday } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", (await supabase.from("conversations").select("id").eq("user_id", userId)).data?.map((c) => c.id) ?? [])
      .eq("role", "assistant")
      .gte("created_at", since.toISOString());
    if ((usedToday ?? 0) >= aiDaily) {
      return { limited: true as const, error: `You've used all ${aiDaily} AI messages for today on the ${planName} plan. Your allowance resets tomorrow, or upgrade for more.` };
    }

    let conversationId = data.conversationId ?? null;
    if (!conversationId) {
      const { data: conv, error } = await supabase.from("conversations").insert({ user_id: userId, title: text.slice(0, 60) }).select("id").single();
      if (error || !conv) return { error: error?.message ?? "Could not start the conversation" };
      conversationId = conv.id;
    }

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(12);
    const chatHistory = ((history ?? []) as { role: string; content: string }[]).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const { error: userErr } = await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: text });
    if (userErr) return { error: userErr.message };

    const system = [
      "You are DayPilot, a calm, practical life-management assistant.",
      "You help users organize everyday responsibilities, plan tasks and build Life Missions (a big responsibility broken into a checklist with a deadline).",
      "Today's date is " + new Date().toISOString().slice(0, 10) + ". Use relative dates the user implies (e.g. 'next month') and resolve them to YYYY-MM-DD in due_date/deadline, or null when unclear.",
      "Always reply in a warm, concise, encouraging tone. Ask permission before saving: mention what you suggest and that they can review it.",
      "Suggest at most 8 tasks and one mission. Priorities are low, medium or high. Categories: personal, education, work, household, appointments, documents, family, health, finance.",
      "Never claim you performed actions in the outside world; you only prepare suggestions the user confirms.",
    ].join(" ");

    let reply = "";
    let suggestions: AssistantPayload["suggestions"] = { tasks: [], mission: null };
    let aiError: string | null = null;
    try {
      const { runAssistant } = await import("./assistant.server");
      const out = await runAssistant({ system, history: chatHistory, userText: text });
      reply = out.reply;
      suggestions = { tasks: out.suggestions.tasks, mission: out.suggestions.mission };
    } catch {
      aiError = "The assistant service is unavailable right now. Please try again in a moment — your message was saved.";
    }

    const payload: AssistantPayload = { suggestions, used_ai: !aiError };
    const { data: msg, error: botErr } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "assistant", content: reply || (aiError ?? ""), payload: payload as unknown as Record<string, unknown> })
      .select("*")
      .single();
    if (botErr) return { error: botErr.message };

    return {
      conversationId,
      message: msg as unknown as ChatMessage,
      remaining: Math.max(0, aiDaily - ((usedToday ?? 0) + (aiError ? 0 : 1))),
      aiError,
    };
  });

export const clearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: convs } = await supabase.from("conversations").select("id").eq("user_id", userId);
    const ids = (convs ?? []).map((c) => c.id);
    if (ids.length) await supabase.from("messages").delete().in("conversation_id", ids);
    const { error } = await supabase.from("conversations").delete().eq("user_id", userId);
    return error ? { error: error.message } : { ok: true };
  });
