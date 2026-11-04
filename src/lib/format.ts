import { format, isToday, isTomorrow, isPast, parseISO, startOfDay } from "date-fns";

export const CATEGORY_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "education", label: "Education" },
  { value: "work", label: "Work" },
  { value: "household", label: "Household" },
  { value: "appointments", label: "Appointments" },
  { value: "documents", label: "Documents" },
  { value: "family", label: "Family" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
] as const;

export const AREA_OPTIONS = [
  { value: "personal", label: "Personal responsibilities", icon: "User" },
  { value: "education", label: "Education", icon: "GraduationCap" },
  { value: "work", label: "Work", icon: "Briefcase" },
  { value: "household", label: "Household", icon: "Home" },
  { value: "appointments", label: "Appointments", icon: "CalendarClock" },
  { value: "documents", label: "Important documents", icon: "FolderCheck" },
  { value: "family", label: "Family responsibilities", icon: "Users" },
] as const;

export const ONBOARDING_AREAS = AREA_OPTIONS;

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function addDaysISO(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}

export function friendlyDate(date: string | null): string {
  if (!date) return "No date";
  try {
    const d = parseISO(`${date}T00:00:00`);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEE, d MMM");
  } catch {
    return date;
  }
}

export function relativeDayLabel(date: string | null): "overdue" | "today" | "tomorrow" | "upcoming" | "none" {
  if (!date) return "none";
  try {
    const d = startOfDay(parseISO(`${date}T00:00:00`));
    if (isToday(d)) return "today";
    if (isPast(d)) return "overdue";
    if (isTomorrow(d)) return "tomorrow";
    return "upcoming";
  } catch {
    return "none";
  }
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Winding down";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function timeLabel(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export function priorityColor(p: string): string {
  if (p === "high") return "text-destructive";
  if (p === "medium") return "text-gold";
  return "text-teal";
}
