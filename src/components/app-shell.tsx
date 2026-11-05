// App shell: desktop sidebar + mobile bottom nav (animated), header with notifications.
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Compass, Home, MessagesSquare, ScrollText, Users, LogOut, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/data.functions";
import { listNotifications, markNotificationRead } from "@/lib/data.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { queryOptions } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const notificationsQuery = queryOptions({ queryKey: ["notifications"], queryFn: () => listNotifications() });

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/missions", label: "Missions", icon: Compass },
  { to: "/assistant", label: "Assistant", icon: MessagesSquare },
  { to: "/household", label: "Household", icon: Users },
  { to: "/profile", label: "Profile", icon: ScrollText },
] as const;

export function AppShell() {
  const { data: me } = useSuspenseQuery(meQuery);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Appearance (light / dark) from profile.
  useEffect(() => {
    const appearance = me.profile?.appearance ?? "light";
    const dark = appearance === "dark" || (appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, [me.profile?.appearance]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const firstName = (me.profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <img src="/favicon.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-semibold text-foreground">DayPilot</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "tap relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {active && <motion.span layoutId="sidebar-pill" className="absolute inset-0 rounded-xl bg-primary" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <Icon className="relative z-10 h-4.5 w-4.5" />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
          <Link to="/tasks" className={cn("tap relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", location.pathname.startsWith("/tasks") ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <Check className="h-4.5 w-4.5" />
            <span>Tasks & calendar</span>
          </Link>
        </nav>
        <Button variant="ghost" onClick={signOut} className="justify-start gap-3 text-muted-foreground">
          <LogOut className="h-4.5 w-4.5" /> Sign out
        </Button>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/favicon.png" alt="" className="h-7 w-7 rounded-lg" />
          <span className="font-display text-base font-semibold text-foreground">DayPilot</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationsBell firstName={firstName} />
        </div>
      </header>

      {/* Desktop top bar */}
      <div className="sticky top-0 z-30 hidden items-center justify-between border-b border-border bg-background/90 px-8 py-3 backdrop-blur md:flex">
        <p className="font-display text-lg font-semibold text-foreground">
          {greetingFor(firstName)}
        </p>
        <div className="flex items-center gap-2">
          <Link to="/tasks" className="tap mr-1 inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Tasks & calendar
          </Link>
          <NotificationsBell firstName={firstName} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 md:max-w-5xl md:pl-64 md:pr-8 md:pb-12">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className="tap relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium">
                {active && <motion.span layoutId="nav-pill" className="absolute inset-x-2 inset-y-0 rounded-xl bg-secondary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon className={cn("relative z-10 h-5 w-5", active ? "text-foreground" : "text-muted-foreground")} />
                <span className={cn("relative z-10", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function greetingFor(name: string) {
  const h = new Date().getHours();
  const g = h < 5 ? "Winding down" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${g}, ${name}`;
}

export function NotificationsBell() {
  const { data: notifications } = useSuspenseQuery(notificationsQuery);
  const [open, setOpen] = useState(false);
  const markRead = useMutation({
    mutationFn: (input: { id?: string; all?: boolean }) => markNotificationRead(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Notifications" className="tap relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-accent">
          <Bell className="h-4 w-4 text-foreground" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button className="text-xs text-teal hover:underline" onClick={() => markRead.mutate({ all: true })}>
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing yet — reminders and updates land here.</p>}
          <AnimatePresence initial={false}>
            {notifications.map((n) => (
              <motion.button
                key={n.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn("block w-full rounded-xl px-3 py-2 text-left hover:bg-accent", !n.read && "bg-secondary/60")}
                onClick={() => !n.read && markRead.mutate({ id: n.id })}
              >
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
        <div className="border-t border-border pt-1.5 text-center">
          <Link to="/notifications" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
