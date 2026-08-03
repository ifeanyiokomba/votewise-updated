"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatNumber, formatPercent, formatDateTime, timeAgo, cn } from "@/lib/utils";
import { Eye, Vote, Users, Flag, Activity, TrendingUp, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";

interface ObserverData {
  ok: boolean;
  data: {
    liveElections: Array<{ id: string; name: string; startTime: string; endTime: string; votes: number }>;
    openIncidents: Array<{ id: string; title: string; severity: string; status: string; createdAt: string; election?: { name: string } | null }>;
    recentVotes: Array<{ id: string; receiptCode: string; isNota: boolean; createdAt: string; position: { title: string; election: { name: string } } }>;
    recentEvents: Array<{ id: string; eventType: string; actorName: string | null; createdAt: string; election: { name: string } }>;
    summary: { totalLive: number; totalVoters: number; totalVotes: number; turnoutPct: number; openIncidents: number };
  };
}

const EVENT_LABELS: Record<string, string> = {
  CREATED: "Election created", PUBLISHED: "Election published", VOTING_OPENED: "Voting opened",
  VOTE_CAST: "Vote cast", PAUSED: "Election paused", VOTING_CLOSED: "Voting closed",
  RESULTS_GENERATED: "Results generated", CERTIFIED: "Election certified", CANCELLED: "Election cancelled",
};

const SEVERITY_TONE: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground", MEDIUM: "bg-info/10 text-info",
  HIGH: "bg-warning/10 text-warning", CRITICAL: "bg-destructive/10 text-destructive",
};

export default function ObserverDashboardPage() {
  const { data, isLoading } = useQuery<ObserverData>({
    queryKey: ["observer-dashboard"],
    queryFn: async () => (await fetch("/api/dashboard/observer")).json(),
    refetchInterval: 10_000,
  });

  if (isLoading) return <PageLoader label="Loading observer dashboard" />;
  if (!data?.ok) return <div className="p-8 text-sm text-muted-foreground">Failed to load.</div>;
  const { liveElections, openIncidents, recentVotes, recentEvents, summary } = data.data;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Eye className="size-5" />
        </span>
        <div>
          <h1 className="vw-display text-2xl">Observer Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time, read-only election monitoring.</p>
        </div>
      </div>

      {/* summary KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Live elections", value: summary.totalLive, icon: Vote, tone: "text-success" },
          { label: "Total votes", value: summary.totalVotes, icon: TrendingUp, tone: "text-primary" },
          { label: "Eligible voters", value: summary.totalVoters, icon: Users, tone: "text-info" },
          { label: "Turnout", value: `${summary.turnoutPct}%`, icon: CheckCircle2, tone: "text-success" },
          { label: "Open incidents", value: summary.openIncidents, icon: Flag, tone: summary.openIncidents > 0 ? "text-warning" : "text-muted-foreground" },
        ].map((kpi) => (
          <Card key={kpi.label} className="vw-interactive vw-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={cn("size-3.5", kpi.tone)} />
              </div>
              <div className="vw-stat mt-1 text-2xl">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* live elections */}
      <div className="mt-8">
        <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
          <Vote className="size-4 text-muted-foreground" /> Live elections
        </h2>
        {liveElections.length === 0 ? (
          <Card><CardContent className="p-6"><EmptyState icon={<Vote className="size-8" />} title="No live elections" description="Elections will appear here when voting opens." /></CardContent></Card>
        ) : (
          <div className="flex flex-col gap-3">
            {liveElections.map((e) => (
              <Card key={e.id} className="vw-interactive border-success/20">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="votewise-live-dot shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{e.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(e.votes)} votes · Closes {formatDateTime(e.endTime)}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/o/achema/results?election=${e.id}`}>View results</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* recent votes */}
        <div>
          <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" /> Recent votes
          </h2>
          {recentVotes.length === 0 ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">No votes cast yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-4 max-h-80 overflow-y-auto votewise-scroll">
                <div className="flex flex-col gap-2">
                  {recentVotes.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid size-7 place-items-center rounded-md bg-success/10 text-success shrink-0">
                          <Vote className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{v.position.election.name}</div>
                          <div className="text-[10px] text-muted-foreground">{v.position.title}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <code className="vw-mono text-[10px] text-primary">{v.receiptCode}</code>
                        <div className="text-[10px] text-muted-foreground">{timeAgo(v.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* open incidents */}
        <div>
          <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
            <ShieldAlert className="size-4 text-muted-foreground" /> Open incidents
          </h2>
          {openIncidents.length === 0 ? (
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" /> No open incidents — election proceeding smoothly.
              </div>
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-4 max-h-80 overflow-y-auto votewise-scroll">
                <div className="flex flex-col gap-2">
                  {openIncidents.map((inc) => (
                    <div key={inc.id} className="rounded-lg border border-border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{inc.title}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", SEVERITY_TONE[inc.severity] ?? SEVERITY_TONE.LOW)}>
                          {inc.severity}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {inc.election?.name ?? "Unknown"} · {timeAgo(inc.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* event timeline */}
      <div className="mt-8">
        <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" /> Election event timeline
        </h2>
        {recentEvents.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">No events recorded.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-4 max-h-96 overflow-y-auto votewise-scroll">
              <div className="relative flex flex-col gap-3 pl-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                {recentEvents.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-3">
                    <span className="absolute -left-4 mt-0.5 grid size-3.5 place-items-center rounded-full border-2 border-background bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{EVENT_LABELS[event.eventType] ?? event.eventType}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(event.createdAt)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {event.election.name}
                        {event.actorName && ` · by ${event.actorName}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
