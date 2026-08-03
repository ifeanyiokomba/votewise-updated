"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, EmptyState, SectionHeader } from "@/components/votewise/primitives/section";
import { formatNumber, formatPercent, cn } from "@/lib/utils";
import { joinElectionRoom } from "@/lib/realtime/client";
import { Trophy, Users, BarChart3 } from "lucide-react";

interface PositionResult {
  positionId: string; positionTitle: string; totalVotes: number; notaVotes: number;
  candidates: Array<{ candidateId: string; name: string; votes: number; pct: number }>;
  winners: string[];
}
interface TallyData {
  electionId: string; name: string; status: string; hidden: boolean;
  totalVotes: number; totalEligible: number; turnoutPct: number;
  positions: PositionResult[]; serverTime?: string;
}

export default function ResultsPage() {
  const params = useParams<{ subdomain: string }>();
  const sp = useSearchParams();
  const electionId = sp.get("election");
  const [socketOverride, setSocketOverride] = useState<TallyData | null>(null);

  const { data, isLoading } = useQuery<{ ok: boolean; data: TallyData }>({
    queryKey: ["results", electionId],
    queryFn: async () => {
      const res = await fetch(`/api/results/${electionId}`);
      return res.json();
    },
    enabled: !!electionId,
    refetchInterval: 5000,
  });

  // socket.io live updates — prefer the most recent of socket vs query
  useEffect(() => {
    if (!electionId) return;
    const leave = joinElectionRoom(electionId, (payload) => {
      setSocketOverride(payload as TallyData);
    });
    return leave;
  }, [electionId]);

  const live = socketOverride ?? data?.data ?? null;

  if (!electionId) {
    return <div className="vw-section py-20"><EmptyState title="Select an election" description="Choose an election from the portal to view results." /></div>;
  }
  if (isLoading) return <PageLoader label="Loading results" />;
  if (!live) return <div className="vw-section py-20"><EmptyState title="Results unavailable" /></div>;

  const hidden = live.hidden;
  const maxVotes = Math.max(1, ...live.positions.flatMap((p) => p.candidates.map((c) => c.votes)));

  return (
    <div className="vw-section py-10 md:py-14">
      <div className="vw-fade-up mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="vw-eyebrow">Live results</span>
          <h1 className="vw-display text-3xl md:text-4xl">{live.name}</h1>
        </div>
        {live.status === "LIVE" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
            <span className="votewise-live-dot" /> Updating live
          </span>
        )}
      </div>

      {/* summary stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="vw-interactive"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" /> Votes cast</div>
          <div className="vw-stat mt-1 text-2xl">{formatNumber(live.totalVotes)}</div>
        </CardContent></Card>
        <Card className="vw-interactive"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="size-3.5" /> Turnout</div>
          <div className="vw-stat mt-1 text-2xl">{formatPercent(live.turnoutPct)}</div>
        </CardContent></Card>
        <Card className="vw-interactive"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" /> Eligible</div>
          <div className="vw-stat mt-1 text-2xl">{formatNumber(live.totalEligible)}</div>
        </CardContent></Card>
        <Card className="vw-interactive"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Trophy className="size-3.5" /> Positions</div>
          <div className="vw-stat mt-1 text-2xl">{live.positions.length}</div>
        </CardContent></Card>
      </div>

      {hidden ? (
        <Card className="mt-8"><CardContent className="p-8 text-center">
          <BarChart3 className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h3 className="vw-display text-lg">Results are hidden until the election closes</h3>
          <p className="mt-1 text-sm text-muted-foreground">Turnout is shown live; per-candidate results will be published when voting ends.</p>
        </CardContent></Card>
      ) : (
        <div className="mt-10 flex flex-col gap-8">
          {live.positions.map((pos) => (
            <section key={pos.positionId}>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="vw-display text-xl">{pos.positionTitle}</h2>
                <span className="text-xs text-muted-foreground">{formatNumber(pos.totalVotes)} votes</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {pos.candidates.map((c, idx) => {
                  const isWinner = pos.winners.includes(c.candidateId);
                  const barPct = (c.votes / maxVotes) * 100;
                  return (
                    <div key={c.candidateId} className={cn("rounded-lg border p-3", isWinner ? "border-success/40 bg-success/5" : "border-border")}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isWinner && <Trophy className="size-4 text-success" />}
                          <span className="text-sm font-medium">{c.name}</span>
                          {idx === 0 && !isWinner && <span className="text-xs text-muted-foreground">leading</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="vw-mono text-sm">{formatNumber(c.votes)}</span>
                          <span className="vw-mono text-xs text-muted-foreground">{formatPercent(c.pct)}</span>
                        </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", isWinner ? "bg-success" : "bg-primary/60")}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {pos.notaVotes > 0 && (
                  <div className="rounded-lg border border-dashed border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">None of the above</span>
                      <div className="flex items-center gap-3">
                        <span className="vw-mono text-sm">{formatNumber(pos.notaVotes)}</span>
                        <span className="vw-mono text-xs text-muted-foreground">{formatPercent(pos.totalVotes > 0 ? (pos.notaVotes / pos.totalVotes) * 100 : 0)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {pos.candidates.length === 0 && (
                  <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {live.status === "CERTIFIED" ? "Certified results" : "Live tally — updates every few seconds"} ·
        Last refresh {live.serverTime ? new Date(live.serverTime).toLocaleTimeString() : "—"}
      </p>
    </div>
  );
}
