"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatNumber, formatPercent, formatDateTime, cn } from "@/lib/utils";
import { BarChart3, TrendingUp, Vote, Users, Trophy, Calendar, Activity } from "lucide-react";

interface AnalyticsData {
  ok: boolean;
  data: {
    summary: {
      totalElections: number; totalVotes: number; totalEligible: number;
      avgTurnout: number; liveCount: number; certifiedCount: number;
    };
    comparison: Array<{
      id: string; name: string; status: string; startTime: string; endTime: string;
      votes: number; eligible: number; positions: number; turnout: number;
    }>;
    daily: Array<{ date: string; count: number }>;
  };
}

const STATUS_TONE: Record<string, string> = {
  LIVE: "bg-success/10 text-success",
  CERTIFIED: "bg-success/10 text-success",
  CLOSED: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-info/10 text-info",
  DRAFT: "bg-muted text-muted-foreground",
};

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => (await fetch("/api/dashboard/analytics")).json(),
  });

  if (isLoading) return <PageLoader label="Loading analytics" />;
  if (!data?.ok) return <div className="p-8 text-sm text-muted-foreground">Failed to load analytics.</div>;

  const { summary, comparison, daily } = data.data;
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));
  const maxTurnout = Math.max(100, ...comparison.map((c) => c.turnout));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="vw-display text-2xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">Cross-election insights and trends.</p>
      </div>

      {/* summary KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Elections", value: summary.totalElections, icon: Vote, tone: "text-primary" },
          { label: "Live now", value: summary.liveCount, icon: Activity, tone: "text-success" },
          { label: "Certified", value: summary.certifiedCount, icon: Trophy, tone: "text-success" },
          { label: "Total votes", value: summary.totalVotes, icon: BarChart3, tone: "text-primary" },
          { label: "Eligible", value: summary.totalEligible, icon: Users, tone: "text-info" },
          { label: "Avg turnout", value: `${summary.avgTurnout}%`, icon: TrendingUp, tone: "text-success" },
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

      {/* daily votes chart (last 30 days) */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" /> Vote activity (last 30 days)
            </h3>
            <span className="text-xs text-muted-foreground">
              {daily.reduce((s, d) => s + d.count, 0)} votes total
            </span>
          </div>
          <div className="flex items-end gap-1 h-40">
            {daily.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className={cn(
                    "w-full rounded-t transition-all duration-300 hover:opacity-80",
                    d.count > 0 ? "bg-primary/60 hover:bg-primary" : "bg-muted/30"
                  )}
                  style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? "4px" : "2px" }}
                />
                {i % 5 === 0 && (
                  <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                )}
                {d.count > 0 && (
                  <span className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity rounded bg-foreground text-background px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap z-10">
                    {d.count} on {d.date.slice(5)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* election comparison table */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-medium flex items-center gap-2">
            <Trophy className="size-4 text-muted-foreground" /> Election comparison
          </h3>
          {comparison.length === 0 ? (
            <EmptyState title="No elections yet" description="Create elections to see comparison data." />
          ) : (
            <div className="overflow-x-auto votewise-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Election</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Votes</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Eligible</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Positions</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground" style={{ minWidth: 120 }}>Turnout</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((e) => (
                    <tr key={e.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <div className="font-medium truncate max-w-[200px]">{e.name}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(e.startTime)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[e.status] ?? STATUS_TONE.DRAFT)}>
                          {e.status === "LIVE" && <span className="votewise-live-dot" style={{ width: 5, height: 5 }} />}
                          {e.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right vw-mono">{formatNumber(e.votes)}</td>
                      <td className="px-3 py-2.5 text-right vw-mono">{formatNumber(e.eligible)}</td>
                      <td className="px-3 py-2.5 text-right vw-mono">{e.positions}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", e.turnout > 60 ? "bg-success" : e.turnout > 30 ? "bg-primary" : "bg-muted-foreground")}
                              style={{ width: `${(e.turnout / maxTurnout) * 100}%` }}
                            />
                          </div>
                          <span className="vw-mono text-xs w-12 text-right">{e.turnout}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
