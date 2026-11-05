// Shared DayPilot UI primitives.
import { motion } from "framer-motion";
import { Check, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS, friendlyDate, priorityColor, timeLabel } from "@/lib/format";
import type { Task } from "@/lib/types";

export function ProgressRing({ value, size = 44, stroke = 5, className }: { value: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className={cn("shrink-0", className)} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sand)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--teal)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, value))) / 100 }}
        transition={{ type: "spring", stiffness: 60, damping: 16 }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.28} fill="var(--ink)" fontWeight={600}>
        {value}
      </text>
    </svg>
  );
}

export function AnimatedCounter({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  return (
    <motion.span
      key={value}
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {value}
      {suffix}
    </motion.span>
  );
}

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const label = CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;
  return (
    <span className={cn("inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground", className)}>
      {label}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface flex flex-col items-center gap-2 px-6 py-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Inbox className="h-5 w-5 text-ink-soft" />
      </span>
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
      {action}
    </motion.div>
  );
}

export function TaskRow({ task, onToggle, onOpen, index = 0 }: { task: Task; onToggle: (t: Task) => void; onOpen: (t: Task) => void; index?: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.22 }}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-[var(--shadow-soft)]"
    >
      <button
        onClick={() => onToggle(task)}
        aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className={cn(
          "tap flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
          task.completed ? "border-teal bg-teal text-white" : "border-border hover:border-teal"
        )}
      >
        {task.completed && <Check className="h-3.5 w-3.5 animate-pop-check" strokeWidth={3} />}
      </button>
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <p className={cn("truncate text-sm font-medium", task.completed && "text-muted-foreground line-through")}>{task.title}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={priorityColor(task.priority)}>●</span>
          {friendlyDate(task.due_date)}
          {task.due_time ? ` · ${timeLabel(task.due_time)}` : ""}
        </p>
      </button>
      <CategoryBadge category={task.category} className="hidden sm:inline-flex" />
    </motion.div>
  );
}
