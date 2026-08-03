"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatDateTime, cn } from "@/lib/utils";
import { Calendar, Clock, Vote, CheckCircle2, AlertCircle, ArrowRight, CalendarDays } from "lucide-react";
import { useState } from "react";

interface CalendarData {
  ok: boolean;
  data: {
    elections: Array<{
      id: string; name: string; status: string;
      startTime: string; endTime: string; votes: number;
      orgName?: string; orgSubdomain?: string;
    }>;
  };
}

const STATUS_META: Record<string, { label: string; tone: string; bg: string; icon: typeof Vote }> = {
  DRAFT: { label: "Draft", tone: "text-muted-foreground", bg: "bg-muted/50", icon: AlertCircle },
  SCHEDULED: { label: "Scheduled", tone: "text-info", bg: "bg-info/10", icon: Clock },
  LIVE: { label: "Live", tone: "text-success", bg: "bg-success/10", icon: Vote },
  PAUSED: { label: "Paused", tone: "text-warning", bg: "bg-warning/10", icon: Clock },
  CLOSED: { label: "Closed", tone: "text-muted-foreground", bg: "bg-muted/50", icon: CheckCircle2 },
  CERTIFIED: { label: "Certified", tone: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", tone: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle },
  ARCHIVED: { label: "Archived", tone: "text-muted-foreground", bg: "bg-muted/50", icon: CheckCircle2 },
};

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function CalendarPage() {
  const [view, setView] = useState<"timeline" | "month">("timeline");

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ["calendar"],
    queryFn: async () => (await fetch("/api/dashboard/calendar")).json(),
  });

  if (isLoading) return <PageLoader label="Loading calendar" />;
  if (!data?.ok) return <div className="p-8 text-sm text-muted-foreground">Failed to load.</div>;

  const elections = data.data.elections;

  // group by month for timeline view
  const byMonth: Record<string, typeof elections> = {};
  for (const e of elections) {
    const monthKey = getMonthLabel(new Date(e.startTime));
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(e);
  }

  // group by status for quick stats
  const stats = {
    live: elections.filter((e) => e.status === "LIVE").length,
    scheduled: elections.filter((e) => e.status === "SCHEDULED").length,
    completed: elections.filter((e) => ["CLOSED", "CERTIFIED"].includes(e.status)).length,
    draft: elections.filter((e) => e.status === "DRAFT").length,
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">Election calendar</h1>
          <p className="text-sm text-muted-foreground">Timeline of all scheduled and past elections.</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={view === "timeline" ? "default" : "outline"} onClick={() => setView("timeline")}>
            <CalendarDays className="size-3.5" /> Timeline
          </Button>
          <Button size="sm" variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>
            <Calendar className="size-3.5" /> Month
          </Button>
        </div>
      </div>

      {/* quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Live", value: stats.live, tone: "text-success", icon: Vote },
          { label: "Scheduled", value: stats.scheduled, tone: "text-info", icon: Clock },
          { label: "Completed", value: stats.completed, tone: "text-muted-foreground", icon: CheckCircle2 },
          { label: "Draft", value: stats.draft, tone: "text-muted-foreground", icon: AlertCircle },
        ].map((s) => (
          <Card key={s.label} className="vw-interactive">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={cn("vw-stat text-xl", s.tone)}>{s.value}</div>
              </div>
              <s.icon className={cn("size-4", s.tone)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {elections.length === 0 ? (
        <EmptyState icon={<Calendar className="size-8" />} title="No elections scheduled" description="Create an election to see it on the calendar." />
      ) : view === "timeline" ? (
        /* Timeline view */
        <div className="flex flex-col gap-8">
          {Object.entries(byMonth).map(([month, monthElections]) => (
            <div key={month}>
              <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" /> {month}
              </h2>
              <div className="relative flex flex-col gap-3 pl-6">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {monthElections.map((e) => {
                  const meta = STATUS_META[e.status] ?? STATUS_META.DRAFT;
                  const Icon = meta.icon;
                  return (
                    <div key={e.id} className="relative">
                      <span className={cn("absolute -left-6 top-3 grid size-3 place-items-center rounded-full border-2 border-background", meta.bg)}>
                        <span className={cn("size-1.5 rounded-full", meta.bg.replace("/10", "").replace("/50", ""))} />
                      </span>
                      <Card className="vw-interactive">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium truncate">{e.name}</h3>
                                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.bg, meta.tone)}>
                                  {e.status === "LIVE" && <span className="votewise-live-dot" style={{ width: 5, height: 5 }} />}
                                  {meta.label}
                                </span>
                                {e.orgName && <span className="text-xs text-muted-foreground">· {e.orgName}</span>}
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="size-3" /> {getDayLabel(new Date(e.startTime))}</span>
                                <span>→ {formatDateTime(e.endTime)}</span>
                                {e.votes > 0 && <span className="flex items-center gap-1"><Vote className="size-3" /> {e.votes} votes</span>}
                              </div>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/elections/${e.id}`}>
                                Manage <ArrowRight className="size-3" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Month grid view */
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-7 gap-1 mb-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* generate calendar cells for the current month */}
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startWeekday = firstDay.getDay();
                const daysInMonth = lastDay.getDate();
                const cells: React.ReactNode[] = [];

                // empty cells before the 1st
                for (let i = 0; i < startWeekday; i++) {
                  cells.push(<div key={`empty-${i}`} className="min-h-[80px] rounded-md bg-muted/20" />);
                }

                // day cells
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month, day);
                  const dayElections = elections.filter((e) => {
                    const start = new Date(e.startTime);
                    return start.getDate() === day && start.getMonth() === month && start.getFullYear() === year;
                  });
                  const isToday = day === now.getDate();
                  cells.push(
                    <div key={day} className={cn("min-h-[80px] rounded-md border border-border p-1.5", isToday && "border-primary bg-primary/5")}>
                      <div className={cn("text-xs mb-1", isToday ? "font-bold text-primary" : "text-muted-foreground")}>{day}</div>
                      <div className="flex flex-col gap-0.5">
                        {dayElections.slice(0, 2).map((e) => {
                          const meta = STATUS_META[e.status] ?? STATUS_META.DRAFT;
                          return (
                            <Link key={e.id} href={`/dashboard/elections/${e.id}`} className={cn("block truncate rounded px-1 py-0.5 text-[10px] font-medium hover:opacity-80", meta.bg, meta.tone)}>
                              {e.name}
                            </Link>
                          );
                        })}
                        {dayElections.length > 2 && <span className="text-[10px] text-muted-foreground px-1">+{dayElections.length - 2} more</span>}
                      </div>
                    </div>
                  );
                }
                return cells;
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
