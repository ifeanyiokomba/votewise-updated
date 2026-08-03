"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { timeAgo, cn } from "@/lib/utils";
import { Bell, KeyRound, Megaphone, Activity, Mail, Phone } from "lucide-react";
import { useState } from "react";

interface NotificationsData {
  ok: boolean;
  data: {
    notifications: Array<{ id: string; type: string; title: string; description: string; timestamp: string; meta?: string }>;
    counts: { all: number; otp: number; announcement: number; system: number };
  };
}

const TYPE_META: Record<string, { icon: typeof Bell; tone: string; label: string }> = {
  otp: { icon: KeyRound, tone: "bg-info/10 text-info", label: "OTP" },
  announcement: { icon: Megaphone, tone: "bg-primary/10 text-primary", label: "Announcement" },
  system: { icon: Activity, tone: "bg-muted text-muted-foreground", label: "System" },
};

const SEVERITY_TONE: Record<string, string> = {
  INFO: "text-info", WARNING: "text-warning", CRITICAL: "text-destructive",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<NotificationsData>({
    queryKey: ["notifications", filter],
    queryFn: async () => (await fetch(`/api/dashboard/notifications?filter=${filter === "all" ? "" : filter}`)).json(),
    refetchInterval: 15_000,
  });

  if (isLoading) return <PageLoader label="Loading notifications" />;
  const notifications = data?.data?.notifications ?? [];
  const counts = data?.data?.counts ?? { all: 0, otp: 0, announcement: 0, system: 0 };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="vw-display text-2xl">Notification log</h1>
        <p className="text-sm text-muted-foreground">Track OTP deliveries, announcements, and system events.</p>
      </div>

      {/* filter tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto votewise-scroll">
        {[
          { key: "all", label: "All", count: counts.all },
          { key: "otp", label: "OTP", count: counts.otp },
          { key: "announcement", label: "Announcements", count: counts.announcement },
          { key: "system", label: "System", count: counts.system },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* notification list */}
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="size-8" />} title="No notifications" description="Notifications will appear here as events occur." />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            const Icon = meta.icon;
            return (
              <Card key={n.id} className="vw-interactive">
                <CardContent className="p-4 flex items-start gap-3">
                  <span className={cn("grid size-8 place-items-center rounded-md shrink-0", meta.tone)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium truncate">{n.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{timeAgo(n.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                    {n.meta && (
                      <div className="mt-1.5 flex items-center gap-2">
                        {n.type === "otp" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            {n.meta.includes("@") ? <Mail className="size-3" /> : <Phone className="size-3" />}
                            {n.meta}
                          </span>
                        )}
                        {n.type === "announcement" && (
                          <span className={cn("text-[10px] font-medium", SEVERITY_TONE[n.meta] ?? "")}>
                            {n.meta}
                          </span>
                        )}
                        {n.type === "system" && n.meta && (
                          <code className="vw-mono text-[10px] text-muted-foreground truncate max-w-[300px]">{n.meta.slice(0, 80)}</code>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
