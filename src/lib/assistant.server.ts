import { generateChatCompletion } from "@lovable.dev/ai-gateway";

const PLAN_SCHEMA = {
  name: "daypilot_reply",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "tasks", "mission"],
    properties: {
      reply: { type: "string" },
      tasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "due_date", "priority", "category"],
          properties: {
            title: { type: "string" },
            due_date: { type: ["string", "null"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            category: { type: "string" },
          },
        },
      },
      mission: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["title", "description", "deadline", "checklist"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          deadline: { type: ["string", "null"] },
          checklist: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export interface AssistantSuggestion {
  tasks: { title: string; due_date: string | null; priority: string; category: string }[];
  mission: { title: string; description: string; deadline: string | null; checklist: string[] } | null;
}

export async function runAssistant(input: {
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
  userText: string;
}): Promise<{ reply: string; suggestions: AssistantSuggestion }> {
  const completion = await generateChatCompletion({
    model: "openai/gpt-6-astra",
    messages: [
      { role: "developer", content: input.system },
      ...input.history,
      { role: "user", content: input.userText },
    ],
    response_format: { type: "json_schema", json_schema: { ...PLAN_SCHEMA } },
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";
  let parsed: { reply?: string; tasks?: unknown; mission?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Defensive: fall back to treating the whole text as the reply.
    return { reply: raw.trim() || "I could not process that just now. Please try again.", suggestions: { tasks: [], mission: null } };
  }

  const suggestions = normalizeSuggestions(parsed);
  return { reply: typeof parsed.reply === "string" ? parsed.reply : "", suggestions };
}

function normalizeSuggestions(parsed: { tasks?: unknown; mission?: unknown }): AssistantSuggestion {
  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks
        .filter((t): t is Record<string, unknown> => !!t && typeof t === "object" && typeof (t as { title?: unknown }).title === "string")
        .slice(0, 8)
        .map((t) => ({
          title: String(t.title).slice(0, 200),
          due_date: typeof t.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : null,
          priority: t.priority === "low" || t.priority === "high" ? t.priority : "medium",
          category: typeof t.category === "string" && t.category ? t.category.slice(0, 40) : "personal",
        }))
    : [];

  let mission: AssistantSuggestion["mission"] = null;
  const m = parsed.mission;
  if (m && typeof m === "object" && typeof (m as { title?: unknown }).title === "string") {
    const mm = m as Record<string, unknown>;
    mission = {
      title: String(mm.title).slice(0, 160),
      description: typeof mm.description === "string" ? mm.description.slice(0, 600) : "",
      deadline: typeof mm.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(mm.deadline) ? mm.deadline : null,
      checklist: Array.isArray(mm.checklist)
        ? mm.checklist.filter((c) => typeof c === "string" && c.trim()).slice(0, 12).map((c) => c.slice(0, 160))
        : [],
    };
  }

  return { tasks, mission };
}
