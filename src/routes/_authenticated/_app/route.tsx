import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { meQuery, notificationsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (me.profile && !me.profile.onboarding_completed) throw redirect({ to: "/onboarding" });
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(notificationsQuery);
  },
  component: AppShell,
  pendingComponent: () => (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <div className="skeleton-line h-8 w-48" />
      <div className="skeleton-line h-28 w-full" />
      <div className="skeleton-line h-28 w-full" />
    </div>
  ),
});
