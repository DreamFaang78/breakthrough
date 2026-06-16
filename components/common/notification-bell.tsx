"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Calendar, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  entity_id: string | null;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  new_request: "bg-blue-100 text-blue-700",
  reschedule_request: "bg-amber-100 text-amber-700",
  cancellation_request: "bg-red-100 text-red-700",
  appointment_approved: "bg-green-100 text-green-700",
  follow_up_due: "bg-teal-100 text-teal-700",
};

export function NotificationBell({ hospitalId }: { hospitalId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, is_read, created_at, entity_id")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription — new notifications appear instantly
    const channel = supabase
      .channel(`notifications:${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `hospital_id=eq.${hospitalId}` },
        () => { fetchNotifications(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    setLoading(true);
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setLoading(false);
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-xl border bg-background hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border bg-background shadow-xl shadow-black/10 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="size-3 animate-spin" /> : null}
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                <Bell className="size-6 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${TYPE_COLORS[n.type] ?? "bg-muted text-muted-foreground"}`}>
                      <Calendar className="size-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold" : "font-medium"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">{n.body}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
