"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatNumber, formatPercent, formatDateTime, cn } from "@/lib/utils";
import { GitCompare, Trophy, Users, Vote, TrendingUp, CheckCircle2 } from "lucide-react";

interface CompareData {
  ok: boolean;
  data: {
    elections: Array<{
      id: string; name: string; status: string;
      startTime: string; endTime: string; certifiedAt: string | null;
      visibility: string; totalVotes: number; totalEligible: number;
      turnoutPct: number; positionsCount: number;
      positions: Array<{
        title: string; totalVotes: number; notaVotes: number;
        candidates: Array<{ name: string; votes: number; pct: number; isWinner: boolean }>;
      }>;
    }>;
  };
}

const STATUS_TONE: Record<string, string> = {
  LIVE: "bg-success/10 text-success",
  CERTIFIED: "bg-success/10 text-success",
  CLOSED: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-info/10 text-info",
  DRAFT: "bg-muted text-muted-foreground",
};

export default function ComparePage() {
  const [selected, setSelected] = useState<string[]>([]);

  const { data: allData } = useQuery<CompareData>({
    queryKey: ["compare-all"],
    queryFn: async () => (await fetch("/api/dashboard/elections/compare")).json(),
  });

  const { data: compareData, isLoading } = useQuery<CompareData>({
    queryKey: ["compare", selected.join(",")],
    queryFn: async () => (await fetch(`/api/dashboard/elections/compare?id=${selected.map((id) => `id=${id}`).join("&")}`)).json(),
    enabled: selected.length >= 2,
  });

  const allElections = allData?.data?.elections ?? [];
  const comparisons = selected.length >= 2 ? compareData?.data?.elections ?? [] : [];

  const toggleElection = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="vw-display text-2xl flex items-center gap-2">
          <GitCompare className="size-6 text-muted-foreground" /> Election comparison
        </h1>
        <p className="text-sm text-muted-foreground">Compare results across elections side-by-side. Select 2-4 elections.</p>
      </div>

      {/* election selector */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium mb-3">Select elections to compare ({selected.length}/4)</h3>
          {allElections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No elections available.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allElections.map((e) => (
                <button
                  key={e.id}
                  onClick={() => toggleElection(e.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                    selected.includes(e.id) ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(e.id)}
                    onChange={() => {}}
                    className="accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("rounded px-1.5 py-0.5 font-medium", STATUS_TONE[e.status] ?? STATUS_TONE.DRAFT)}>
                        {e.status}
                      </span>
                      <span>{e.totalVotes} votes</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* comparison results */}
      {selected.length < 2 ? (
        <EmptyState
          icon={<GitCompare className="size-8" />}
          title="Select at least 2 elections"
          description="Choose elections from the list above to see a side-by-side comparison."
        />
      ) : isLoading ? (
        <PageLoader label="Comparing elections" />
      ) : comparisons.length === 0 ? (
        <EmptyState title="No data to compare" />
      ) : (
        <div className="flex flex-col gap-6">
          {/* summary comparison */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-medium mb-4">Summary</h3>
              <div className="overflow-x-auto votewise-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Metric</th>
                      {comparisons.map((e) => (
                        <th key={e.id} className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[150px]">{e.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2.5 text-muted-foreground">Status</td>
                      {comparisons.map((e) => (
                        <td key={e.id} className="px-3 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[e.status] ?? STATUS_TONE.DRAFT)}>
                            {e.status}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2.5 text-muted-foreground flex items-center gap-1"><Vote className="size-3.5" /> Total votes</td>
                      {comparisons.map((e) => (
                        <td key={e.id} className="px-3 py-2.5 vw-mono font-medium">{formatNumber(e.totalVotes)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2.5 text-muted-foreground flex items-center gap-1"><Users className="size-3.5" /> Eligible</td>
                      {comparisons.map((e) => (
                        <td key={e.id} className="px-3 py-2.5 vw-mono">{formatNumber(e.totalEligible)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2.5 text-muted-foreground flex items-center gap-1"><TrendingUp className="size-3.5" /> Turnout</td>
                      {comparisons.map((e) => {
                        const maxTurnout = Math.max(...comparisons.map((c) => c.turnoutPct));
                        return (
                          <td key={e.id} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={cn("vw-mono font-medium", e.turnoutPct === maxTurnout && "text-success")}>
                                {e.turnoutPct}%
                              </span>
                              {e.turnoutPct === maxTurnout && <Trophy className="size-3 text-success" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2.5 text-muted-foreground">Positions</td>
                      {comparisons.map((e) => (
                        <td key={e.id} className="px-3 py-2.5 vw-mono">{e.positionsCount}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 text-muted-foreground">Start date</td>
                      {comparisons.map((e) => (
                        <td key={e.id} className="px-3 py-2.5 text-xs">{formatDateTime(e.startTime)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* per-position comparison (only if positions match) */}
          {comparisons.length >= 2 && comparisons[0]?.positions.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-medium mb-4">Position results</h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisons.length}, 1fr)` }}>
                  {comparisons.map((e) => (
                    <div key={e.id}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 truncate">{e.name}</h4>
                      <div className="flex flex-col gap-3">
                        {e.positions.map((pos) => (
                          <div key={pos.title} className="rounded-lg border border-border p-3">
                            <div className="text-xs font-medium mb-2">{pos.title}</div>
                            <div className="flex flex-col gap-1">
                              {pos.candidates.map((c) => (
                                <div key={c.name} className="flex items-center justify-between text-xs">
                                  <span className={cn("truncate", c.isWinner && "font-bold text-success flex items-center gap-1")}>
                                    {c.isWinner && <CheckCircle2 className="size-3" />}
                                    {c.name}
                                  </span>
                                  <span className="vw-mono ml-2 shrink-0">{c.votes}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
