import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { notificationsQuery } from "@/lib/queries";
import { markNotificationRead } from "@/lib/data.functions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared";

export const Route = createFileRoute("/_authenticated/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DayPilot" }, { name: "description", content: "Your reminders and updates." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationsQuery),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data } = useSuspenseQuery(notificationsQuery);
  const qc = useQueryClient();
  const mark = useMutation({ mutationFn: (v: { id?: string; all?: boolean }) => markNotificationRead({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold">Notifications</h1>{data.some((n) => !n.read) && <Button variant="outline" size="sm" onClick={() => mark.mutate({ all: true })}>Mark all read</Button>}</div>
      {data.length === 0 && <EmptyState title="No notifications" body="Assignments and reminders will appear here." />}
      {data.map((n) => (
        <button key={n.id} onClick={() => !n.read && mark.mutate({ id: n.id })} className={`card-surface block w-full p-4 text-left ${n.read ? "opacity-70" : ""}`}>
          <p className="font-medium">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
        </button>
      ))}
    </div>
  );
}
