// Bottom-sheet task editor used for create + edit everywhere.
import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask, updateTask, deleteTask } from "@/lib/data.functions";
import { missionsQuery, householdQuery, SYNC_KEYS } from "@/lib/queries";
import { CATEGORY_OPTIONS } from "@/lib/format";
import type { Task } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export interface TaskDraft {
  title?: string;
  due_date?: string | null;
  mission_id?: string | null;
  household_id?: string | null;
}

export function TaskEditor({ open, onOpenChange, task, draft }: { open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null; draft?: TaskDraft }) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const missions = useQuery({ ...missionsQuery, enabled: open });
  const household = useQuery({ ...householdQuery, enabled: open });
  const [f, setF] = useState(blank());

  function blank() {
    return { title: "", description: "", category: "personal", due_date: "", due_time: "", priority: "medium", reminder_at: "", mission_id: "none", shared: false, assign_to: "" };
  }

  useEffect(() => {
    if (!open) return;
    if (task) {
      setF({
        title: task.title,
        description: task.description,
        category: task.category,
        due_date: task.due_date ?? "",
        due_time: task.due_time?.slice(0, 5) ?? "",
        priority: task.priority,
        reminder_at: task.reminder_at ? task.reminder_at.slice(0, 16) : "",
        mission_id: task.mission_id ?? "none",
        shared: !!task.household_id,
        assign_to: task.user_id,
      });
    } else {
      setF({ ...blank(), title: draft?.title ?? "", due_date: draft?.due_date ?? "", mission_id: draft?.mission_id ?? "none", shared: !!draft?.household_id });
    }
  }, [open, task, draft]);

  const sync = () => SYNC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] }));

  const save = useMutation({
    mutationFn: async () => {
      const hh = household.data;
      const payload = {
        title: f.title,
        description: f.description,
        category: f.category,
        due_date: f.due_date || null,
        due_time: f.due_time || null,
        priority: f.priority,
        reminder_at: f.reminder_at ? new Date(f.reminder_at).toISOString() : null,
        mission_id: f.mission_id === "none" ? null : f.mission_id,
      };
      if (task) {
        return updateTask({ data: { id: task.id, ...payload, ...(f.shared && f.assign_to && f.assign_to !== task.user_id ? { assign_to: f.assign_to } : {}) } });
      }
      return createTask({ data: { ...payload, household_id: f.shared && hh ? hh.id : null, assign_to: f.shared && f.assign_to ? f.assign_to : null } });
    },
    onSuccess: (res) => {
      if (res && "error" in res && res.error) return toast.error(res.error);
      toast.success(task ? "Task updated" : "Task added");
      sync();
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't save the task. Please try again."),
  });

  const remove = useMutation({
    mutationFn: () => deleteTask({ data: { id: task!.id } }),
    onSuccess: (res) => {
      if ("error" in res && res.error) return toast.error(res.error);
      toast.success("Task deleted");
      sync();
      onOpenChange(false);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "right"} className="max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-none">
        <SheetHeader>
          <SheetTitle className="font-display">{task ? "Edit task" : "New task"}</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-4 px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.title.trim()) return toast.error("Give the task a title");
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" autoFocus value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Book dentist appointment" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={f.description} maxLength={2000} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-date">Date</Label>
              <Input id="t-date" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-time">Time</Label>
              <Input id="t-time" type="time" value={f.due_time} onChange={(e) => setF({ ...f, due_time: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-rem">Reminder</Label>
            <Input id="t-rem" type="datetime-local" value={f.reminder_at} onChange={(e) => setF({ ...f, reminder_at: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Life Mission</Label>
            <Select value={f.mission_id} onValueChange={(v) => setF({ ...f, mission_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {(missions.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {household.data && (
            <div className="space-y-2 rounded-2xl bg-secondary/60 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.shared} disabled={!!task} onChange={(e) => setF({ ...f, shared: e.target.checked })} />
                Share with {household.data.name}
              </label>
              {f.shared && (
                <Select value={f.assign_to || "me"} onValueChange={(v) => setF({ ...f, assign_to: v === "me" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">Assign to me</SelectItem>
                    {household.data.members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name ?? "Member"}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {task && (
              <Button type="button" variant="outline" size="icon" aria-label="Delete task" onClick={() => remove.mutate()} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
            <Button type="submit" className="flex-1 rounded-full" disabled={save.isPending}>
              {save.isPending ? "Saving…" : task ? "Save changes" : "Add task"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: Task) => updateTask({ data: { id: t.id, completed: !t.completed } }),
    onMutate: async (t) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
      return { prev };
    },
    onSuccess: (_r, t) => { if (!t.completed) toast.success("Nice — task completed"); },
    onError: (_e, _t, ctx) => { ctx?.prev && qc.setQueryData(["tasks"], ctx.prev); toast.error("Couldn't update the task"); },
    onSettled: () => SYNC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] })),
  });
}
