"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState, SectionHeader } from "@/components/votewise/primitives/section";
import { formatDateTime } from "@/lib/utils";
import { Plus, ArrowRight, Vote } from "lucide-react";

interface ElectionsData {
  ok: boolean;
  data: { elections: Array<{ id: string; name: string; status: string; startTime: string; endTime: string; _count?: { votes: number; positions: number } }> };
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

export default function ElectionsListPage() {
  const { data, isLoading } = useQuery<ElectionsData>({
    queryKey: ["dash-elections"],
    queryFn: async () => (await fetch("/api/dashboard/elections")).json(),
  });
  if (isLoading) return <PageLoader label="Loading elections" />;
  const elections = data?.data?.elections ?? [];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">Elections</h1>
          <p className="text-sm text-muted-foreground">Create and manage your elections.</p>
        </div>
        <Button asChild><Link href="/dashboard/elections/new"><Plus className="size-4" /> New election</Link></Button>
      </div>

      {elections.length === 0 ? (
        <EmptyState icon={<Vote className="size-8" />} title="No elections yet" description="Create your first election to get started." />
      ) : (
        <div className="flex flex-col gap-2">
          {elections.map((e) => (
            <Card key={e.id} className="vw-interactive">
              <Link href={`/dashboard/elections/${e.id}`} className="block">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{e.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[e.status] ?? STATUS_TONE.DRAFT}`}>{e.status}</span>
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
  );
}
