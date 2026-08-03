"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent, cn } from "@/lib/utils";
import { Users, TrendingUp, Activity } from "lucide-react";
import { joinElectionRoom } from "@/lib/realtime/client";

interface TallyData {
  electionId: string;
  totalVotes: number;
  totalEligible: number;
  turnoutPct: number;
  status: string;
}

export function LiveTurnout({ electionId, electionName }: { electionId: string; electionName: string }) {
  const [live, setLive] = useState<TallyData | null>(null);
  const { data } = useQuery<{ ok: boolean; data: TallyData }>({
    queryKey: ["turnout", electionId],
    queryFn: async () => (await fetch(`/api/results/${electionId}`)).json(),
    refetchInterval: 10_000,
  });

  // socket.io live updates — prefer socket data, fall back to poll data
  useEffect(() => {
    const leave = joinElectionRoom(electionId, (payload) => {
      setLive(payload as TallyData);
    });
    return leave;
  }, [electionId]);

  const current = live ?? data?.data ?? null;

  if (!current) {
    return (
      <Card className="vw-card-subtle">
        <CardContent className="p-5">
          <div className="h-16 animate-pulse rounded-md bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  const turnout = current.turnoutPct;
  const ringColor = turnout > 60 ? "text-success" : turnout > 30 ? "text-primary" : "text-muted-foreground";

  // SVG ring
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (turnout / 100) * circumference;

  return (
    <Card className="vw-card-subtle vw-pop">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* ring */}
          <div className="relative shrink-0">
            <svg className="-rotate-90" width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={radius} className="fill-none stroke-muted" strokeWidth="6" />
              <circle
                cx="44" cy="44" r={radius}
                className={cn("fill-none transition-all duration-700", ringColor)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="vw-stat text-lg">{formatPercent(turnout, 0)}</span>
            </div>
          </div>
          {/* stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="size-3" />
              <span className="truncate">{electionName}</span>
              {current.status === "LIVE" && <span className="votewise-live-dot ml-1" />}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" /> Voted
                </div>
                <div className="vw-stat text-xl">{formatNumber(current.totalVotes)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" /> Eligible
                </div>
                <div className="vw-stat text-xl">{formatNumber(current.totalEligible)}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
