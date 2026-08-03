"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatNumber, formatDateTime, timeAgo, cn } from "@/lib/utils";
import {
  Vote, Users, BarChart3, CheckCircle2, Flag, Activity, ArrowRight,
  Megaphone, ShieldAlert, AlertTriangle, FileText, Crown, Shield, Eye,
} from "lucide-react";

interface OverviewData {
  ok: boolean;
  data: {
    stats: {
      totalElections: number; liveElections: number; totalVoters: number;
      totalVotes: number; totalMembers: number; openIncidents: number;
    };
    recentElections: Array<{
      id: string; name: string; status: string; startTime: string; endTime: string;
      _count?: { votes: number };
    }>;
    recentAudit: Array<{
      id: string; action: string; actorName: string | null; createdAt: string; resource: string | null;
    }>;
    recentIncidents: Array<{
      id: string; title: string; severity: string; status: string; createdAt: string;
      election?: { name: string } | null;
    }>;
  };
}

const AUDIT_ICONS: Record<string, typeof Vote> = {
  ELECTION_CREATED: Vote,
  ELECTION_LIVE: Vote,
  VOTE_CAST: Vote,
  ELECTION_CERTIFIED: CheckCircle2,
  VOTER_FLAGGED: Flag,
  VOTER_UNFLAGGED: CheckCircle2,
  VOTERS_IMPORTED: Users,
  PLAN_CHANGED: Crown,
  MEMBER_INVITED: Users,
  ANNOUNCEMENT_PUBLISHED: Megaphone,
  INCIDENT_REPORTED: ShieldAlert,
};

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-info/10 text-info",
  LIVE: "bg-success/10 text-success",
  PAUSED: "bg-warning/10 text-warning",
  CLOSED: "bg-muted text-muted-foreground",
  CERTIFIED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const SEVERITY_TONE: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-info/10 text-info",
  HIGH: "bg-warning/10 text-warning",
  CRITICAL: "bg-destructive/10 text-destructive",
};

export default function DashboardOverview() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: async () => (await fetch("/api/dashboard/overview")).json(),
    refetchInterval: 15_000,
  });

  if (isLoading) return <PageLoader label="Loading dashboard" />;
  const { stats, recentElections, recentAudit, recentIncidents } = data?.data ?? { stats: {}, recentElections: [], recentAudit: [], recentIncidents: [] };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">Overview</h1>
          <p className="text-sm text-muted-foreground">Your election workspace at a glance.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/elections/new">New election</Link>
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Elections", value: stats.totalElections, icon: Vote, tone: "text-primary" },
          { label: "Live now", value: stats.liveElections, icon: BarChart3, tone: "text-success" },
          { label: "Voters", value: stats.totalVoters, icon: Users, tone: "text-info" },
          { label: "Votes", value: stats.totalVotes, icon: CheckCircle2, tone: "text-success" },
          { label: "Members", value: stats.totalMembers, icon: Shield, tone: "text-primary" },
          { label: "Incidents", value: stats.openIncidents, icon: Flag, tone: stats.openIncidents > 0 ? "text-warning" : "text-muted-foreground" },
        ].map((kpi) => (
          <Card key={kpi.label} className="vw-interactive vw-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={cn("size-3.5", kpi.tone)} />
              </div>
              <div className="vw-stat mt-1 text-2xl">{formatNumber(kpi.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* recent elections */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="vw-display text-lg flex items-center gap-2">
              <Vote className="size-4 text-muted-foreground" /> Recent elections
            </h2>
            <Link href="/dashboard/elections" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentElections.length === 0 ? (
            <Card><CardContent className="p-6"><EmptyState icon={<Vote className="size-8" />} title="No elections yet" /></CardContent></Card>
          ) : (
            <div className="flex flex-col gap-2">
              {recentElections.map((e) => (
                <Card key={e.id} className="vw-interactive">
                  <Link href={`/dashboard/elections/${e.id}`}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{e.name}</h3>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[e.status] ?? STATUS_TONE.DRAFT)}>
                            {e.status === "LIVE" && <span className="votewise-live-dot mr-1" style={{ width: 5, height: 5 }} />}
                            {e.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(e.startTime)} · {e._count?.votes ?? 0} votes
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* recent activity (audit log) */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="vw-display text-lg flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" /> Recent activity
            </h2>
          </div>
          {recentAudit.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No activity yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {recentAudit.map((log) => {
                    const Icon = AUDIT_ICONS[log.action] ?? Activity;
                    return (
                      <div key={log.id} className="flex items-start gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted/50">
                          <Icon className="size-3.5 text-muted-foreground" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs">
                            <span className="font-medium">{log.actorName ?? "System"}</span>
                            <span className="text-muted-foreground"> · {log.action.replace(/_/g, " ").toLowerCase()}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* open incidents */}
      {recentIncidents.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="vw-display text-lg flex items-center gap-2">
              <ShieldAlert className="size-4 text-warning" /> Open incidents
            </h2>
            <Link href="/dashboard/incidents" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentIncidents.map((inc) => (
              <Card key={inc.id} className="vw-interactive border-l-4 border-warning">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">{inc.title}</h3>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", SEVERITY_TONE[inc.severity] ?? SEVERITY_TONE.LOW)}>
                        {inc.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inc.election?.name ?? "Unknown"} · {timeAgo(inc.createdAt)}
                    </p>
                  </div>
                  <Link href="/dashboard/incidents">
                    <Button size="sm" variant="ghost">Review <ArrowRight className="size-3" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
