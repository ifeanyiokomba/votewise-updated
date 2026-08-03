"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/votewise/primitives/section";
import { formatNumber, formatDateTime, timeAgo, cn } from "@/lib/utils";
import { Activity, Vote, TrendingUp, Clock, Hash, ArrowUpRight } from "lucide-react";

interface StatsData {
  ok: boolean;
  data: {
    totalVotes: number;
    totalEligible: number;
    totalVoted: number;
    turnoutPct: number;
    positions: Array<{ id: string; title: string; candidateCount: number; maxVotes: number }>;
    recentVotes: Array<{
      id: string; receiptCode: string; isNota: boolean; createdAt: string;
      position: { title: string };
    }>;
    tally: Array<{ positionTitle: string; candidateName: string; count: number }>;
    hourly: Array<{ hour: string; count: number }>;
  };
}

interface EventsData {
  ok: boolean;
  data: {
    events: Array<{
      id: string; eventType: string; actorName: string | null; actorRole: string | null;
      details: string | null; createdAt: string;
    }>;
  };
}

const EVENT_META: Record<string, { label: string; tone: string; icon: typeof Vote }> = {
  CREATED: { label: "Election created", tone: "muted", icon: Vote },
  PUBLISHED: { label: "Election published", tone: "info", icon: ArrowUpRight },
  VOTING_OPENED: { label: "Voting opened", tone: "success", icon: TrendingUp },
  VOTE_CAST: { label: "Vote cast", tone: "success", icon: Vote },
  PAUSED: { label: "Election paused", tone: "warning", icon: Clock },
  VOTING_CLOSED: { label: "Voting closed", tone: "muted", icon: Clock },
  RESULTS_GENERATED: { label: "Results generated", tone: "info", icon: Hash },
  CERTIFIED: { label: "Election certified", tone: "success", icon: ArrowUpRight },
  CANCELLED: { label: "Election cancelled", tone: "destructive", icon: Clock },
};

export function ElectionMonitor({ electionId }: { electionId: string }) {
  const { data: statsData } = useQuery<StatsData>({
    queryKey: ["election-stats", electionId],
    queryFn: async () => (await fetch(`/api/dashboard/elections/${electionId}/stats`)).json(),
    refetchInterval: 10_000,
  });
  const { data: eventsData } = useQuery<EventsData>({
    queryKey: ["election-events", electionId],
    queryFn: async () => (await fetch(`/api/dashboard/elections/${electionId}/events`)).json(),
    refetchInterval: 15_000,
  });

  const stats = statsData?.data;
  const events = eventsData?.data?.events ?? [];

  if (!stats) return <div className="py-8 text-sm text-muted-foreground">Loading monitor…</div>;

  const maxHourly = Math.max(1, ...stats.hourly.map((h) => h.count));

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Vote, label: "Total votes", value: formatNumber(stats.totalVotes), tone: "text-primary" },
          { icon: TrendingUp, label: "Turnout", value: `${stats.turnoutPct.toFixed(1)}%`, tone: "text-success" },
          { icon: Activity, label: "Voted", value: formatNumber(stats.totalVoted), tone: "text-foreground" },
          { icon: Clock, label: "Eligible", value: formatNumber(stats.totalEligible), tone: "text-muted-foreground" },
        ].map((kpi) => (
          <Card key={kpi.label} className="vw-interactive">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                <kpi.icon className={cn("size-3.5", kpi.tone)} />
              </div>
              <div className="vw-stat mt-1 text-2xl">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* hourly chart */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" /> Vote activity (last 24h)
            </h3>
            <span className="text-xs text-muted-foreground">{stats.hourly.reduce((s, h) => s + h.count, 0)} votes</span>
          </div>
          <div className="flex items-end gap-1 h-32">
            {stats.hourly.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t bg-primary/60 transition-all hover:bg-primary"
                  style={{ height: `${(h.count / maxHourly) * 100}%`, minHeight: h.count > 0 ? "4px" : "0" }}
                />
                <span className="text-[9px] text-muted-foreground">{h.hour}</span>
                {h.count > 0 && (
                  <span className="absolute -top-5 opacity-0 group-hover:opacity-100 transition-opacity rounded bg-foreground text-background px-1.5 py-0.5 text-[10px] font-medium">
                    {h.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* recent votes */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-medium flex items-center gap-2">
              <Vote className="size-4 text-muted-foreground" /> Recent votes
            </h3>
            {stats.recentVotes.length === 0 ? (
              <EmptyState title="No votes yet" description="Votes will appear here once voting starts." />
            ) : (
              <div className="flex flex-col gap-2">
                {stats.recentVotes.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 place-items-center rounded-md bg-success/10 text-success">
                        <Vote className="size-3.5" />
                      </span>
                      <div>
                        <div className="text-xs font-medium">{v.position.title}</div>
                        <div className="text-[10px] text-muted-foreground">{timeAgo(v.createdAt)}</div>
                      </div>
                    </div>
                    <code className="vw-mono text-[10px] text-muted-foreground">{v.receiptCode}</code>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* event timeline */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-medium flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" /> Election timeline
            </h3>
            {events.length === 0 ? (
              <EmptyState title="No events yet" />
            ) : (
              <div className="relative flex flex-col gap-3 max-h-72 overflow-y-auto votewise-scroll pl-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                {events.map((e) => {
                  const meta = EVENT_META[e.eventType] ?? { label: e.eventType, tone: "muted", icon: Hash };
                  return (
                    <div key={e.id} className="relative flex items-start gap-3">
                      <span className={cn(
                        "absolute -left-4 mt-0.5 grid size-3.5 place-items-center rounded-full border-2 border-background",
                        meta.tone === "success" ? "bg-success" :
                        meta.tone === "warning" ? "bg-warning" :
                        meta.tone === "destructive" ? "bg-destructive" :
                        meta.tone === "info" ? "bg-info" : "bg-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">{meta.label}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(e.createdAt)}</span>
                        </div>
                        {e.actorName && (
                          <div className="text-[10px] text-muted-foreground">by {e.actorName}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* tally leaderboard */}
      {stats.tally.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-medium flex items-center gap-2">
              <Hash className="size-4 text-muted-foreground" /> Current tally
            </h3>
            <div className="flex flex-col gap-4">
              {Object.entries(
                stats.tally.reduce((acc, t) => {
                  (acc[t.positionTitle] ??= []).push(t);
                  return acc;
                }, {} as Record<string, typeof stats.tally>)
              ).map(([posTitle, cands]) => {
                const max = Math.max(...cands.map((c) => c.count), 1);
                return (
                  <div key={posTitle}>
                    <div className="mb-2 text-xs font-medium text-muted-foreground">{posTitle}</div>
                    <div className="flex flex-col gap-1.5">
                      {cands.map((c) => (
                        <div key={c.candidateName} className="flex items-center gap-3">
                          <div className="w-32 truncate text-xs">{c.candidateName}</div>
                          <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded transition-all"
                              style={{ width: `${(c.count / max) * 100}%` }}
                            />
                          </div>
                          <div className="vw-mono text-xs w-10 text-right">{c.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
