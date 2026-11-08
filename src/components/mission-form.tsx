import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMission, updateMission } from "@/lib/data.functions";
import { householdQuery, SYNC_KEYS } from "@/lib/queries";
import { CATEGORY_OPTIONS } from "@/lib/format";
import type { Mission } from "@/lib/types";

export function MissionForm({ open, onOpenChange, mission }: { open: boolean; onOpenChange: (o: boolean) => void; mission?: Mission | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const household = useQuery({ ...householdQuery, enabled: open });
  const [f, setF] = useState({ title: "", description: "", category: "personal", priority: "medium", start_date: "", deadline: "", notes: "", checklist: "", shared: false });

  useEffect(() => {
    if (!open) return;
    setF(mission
      ? { title: mission.title, description: mission.description, category: mission.category, priority: mission.priority, start_date: mission.start_date ?? "", deadline: mission.deadline ?? "", notes: mission.notes, checklist: "", shared: !!mission.household_id }
      : { title: "", description: "", category: "personal", priority: "medium", start_date: "", deadline: "", notes: "", checklist: "", shared: false });
  }, [open, mission]);

  const save = useMutation({
    mutationFn: async () => {
      const base = { title: f.title, description: f.description, category: f.category, priority: f.priority, start_date: f.start_date || null, deadline: f.deadline || null, notes: f.notes };
      if (mission) return updateMission({ data: { id: mission.id, ...base } });
      return createMission({ data: { ...base, checklist: f.checklist.split("\n"), household_id: f.shared && household.data ? household.data.id : null } });
    },
    onSuccess: (res) => {
      if ("error" in res && res.error) return toast.error(res.error);
      SYNC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] }));
      toast.success(mission ? "Mission updated" : "Mission created");
      onOpenChange(false);
      if (!mission && "missionId" in res && res.missionId) navigate({ to: "/missions/$id", params: { id: res.missionId } });
    },
    onError: () => toast.error("Couldn't save the mission"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">{mission ? "Edit mission" : "New Life Mission"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return toast.error("Give the mission a title"); save.mutate(); }}>
          <div className="space-y-1.5"><Label htmlFor="m-t">Title</Label><Input id="m-t" value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Renew my passport" /></div>
          <div className="space-y-1.5"><Label htmlFor="m-d">Description</Label><Textarea id="m-d" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Priority</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="m-s">Start date</Label><Input id="m-s" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="m-dl">Deadline</Label><Input id="m-dl" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
          </div>
          {!mission && <div className="space-y-1.5"><Label htmlFor="m-c">Checklist (one step per line)</Label><Textarea id="m-c" rows={4} value={f.checklist} onChange={(e) => setF({ ...f, checklist: e.target.value })} placeholder={"Check requirements\nFill in form\nBook appointment"} /></div>}
          <div className="space-y-1.5"><Label htmlFor="m-n">Notes</Label><Textarea id="m-n" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          {!mission && household.data && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.shared} onChange={(e) => setF({ ...f, shared: e.target.checked })} /> Share with {household.data.name}</label>
          )}
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>{save.isPending ? "Saving…" : mission ? "Save changes" : "Create mission"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
