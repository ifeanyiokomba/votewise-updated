"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState, SectionHeader } from "@/components/votewise/primitives/section";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { Vote, Users, Plus, ArrowRight, BarChart3 } from "lucide-react";

interface ElectionsData {
  ok: boolean;
  data: {
    elections: Array<{
      id: string; name: string; status: string; visibility: string;
      startTime: string; endTime: string; createdAt: string;
      _count?: { votes: number; positions: number };
    }>;
  };
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-info/10 text-info",
  LIVE: "bg-success/10 text-success",
  PAUSED: "bg-warning/10 text-warning",
  CLOSED: "bg-muted text-muted-foreground",
  CERTIFIED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export default function DashboardOverview() {
  const { data, isLoading } = useQuery<ElectionsData>({
    queryKey: ["dash-elections"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/elections");
      return res.json();
    },
  });

  if (isLoading) return <PageLoader label="Loading dashboard" />;

  const elections = data?.data?.elections ?? [];
  const live = elections.filter((e) => e.status === "LIVE");
  const totalVotes = elections.reduce((s, e) => s + (e._count?.votes ?? 0), 0);
  const totalPositions = elections.reduce((s, e) => s + (e._count?.positions ?? 0), 0);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">Overview</h1>
          <p className="text-sm text-muted-foreground">Your election workspace at a glance.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/elections/new"><Plus className="size-4" /> New election</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Vote className="size-3.5" /> Elections</div>
          <div className="vw-stat mt-1 text-2xl">{formatNumber(elections.length)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="size-3.5" /> Live now</div>
          <div className="vw-stat mt-1 text-2xl text-success">{formatNumber(live.length)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" /> Votes cast</div>
          <div className="vw-stat mt-1 text-2xl">{formatNumber(totalVotes)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Vote className="size-3.5" /> Positions</div>
          <div className="vw-stat mt-1 text-2xl">{formatNumber(totalPositions)}</div>
        </CardContent></Card>
      </div>

      <div className="mt-10">
        <SectionHeader eyebrow="Recent" title={<>Your elections</>} className="mb-4" />
        {elections.length === 0 ? (
          <EmptyState
            icon={<Vote className="size-8" />}
            title="No elections yet"
            description="Create your first election to get started."
            action={<Button asChild><Link href="/dashboard/elections/new"><Plus className="size-4" /> Create election</Link></Button>}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {elections.map((e) => (
              <Card key={e.id} className="vw-interactive">
                <Link href={`/dashboard/elections/${e.id}`} className="block">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{e.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[e.status] ?? STATUS_TONE.DRAFT}`}>
                          {e.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(e.startTime)} · {e._count?.positions ?? 0} positions · {e._count?.votes ?? 0} votes
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
