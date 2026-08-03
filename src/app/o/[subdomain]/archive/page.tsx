"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState, SectionHeader } from "@/components/votewise/primitives/section";
import { formatNumber, formatPercent, formatDateTime } from "@/lib/utils";
import { Archive, Trophy, Users, BarChart3, ArrowRight, ShieldCheck } from "lucide-react";

interface ArchiveData {
  ok: boolean;
  data: {
    elections: Array<{
      id: string; name: string; description: string | null; status: string;
      startTime: string; endTime: string; certifiedAt: string | null;
      verification: { totalVotes: number; totalEligible: number; turnoutPct: number; auditHash: string } | null;
      _count: { votes: number; positions: number };
    }>;
  };
}

export default function ArchivePage() {
  const params = useParams<{ subdomain: string }>();

  const { data, isLoading } = useQuery<ArchiveData>({
    queryKey: ["archive", params.subdomain],
    queryFn: async () => (await fetch(`/api/portal/${params.subdomain}/archive`)).json(),
  });

  if (isLoading) return <PageLoader label="Loading archive" />;
  const elections = data?.data?.elections ?? [];

  return (
    <div className="vw-section py-10 md:py-14">
      <div className="vw-fade-up mb-8">
        <span className="vw-eyebrow">Election archive</span>
        <h1 className="vw-display text-3xl md:text-4xl">Past elections</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          A transparent record of completed elections and their certified results.
        </p>
      </div>

      {elections.length === 0 ? (
        <EmptyState
          icon={<Archive className="size-8" />}
          title="No completed elections yet"
          description="Certified elections will appear here with their full results and audit trail."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {elections.map((e) => (
            <Card key={e.id} className="vw-interactive vw-lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="vw-display text-base truncate">{e.name}</h3>
                      {e.status === "CERTIFIED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success shrink-0">
                          <ShieldCheck className="size-3" /> Certified
                        </span>
                      )}
                    </div>
                    {e.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1"><Users className="size-3" /> Votes</div>
                        <div className="vw-stat text-base">{formatNumber(e.verification?.totalVotes ?? e._count.votes)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1"><BarChart3 className="size-3" /> Turnout</div>
                        <div className="vw-stat text-base">{formatPercent(e.verification?.turnoutPct ?? 0)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1"><Trophy className="size-3" /> Positions</div>
                        <div className="vw-stat text-base">{formatNumber(e._count.positions)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {formatDateTime(e.startTime)} → {formatDateTime(e.endTime)}
                    </div>
                    {e.verification && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
                        <ShieldCheck className="size-3 text-success" />
                        <code className="vw-mono truncate">{e.verification.auditHash.slice(0, 24)}…</code>
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                  <Link href={`/o/${params.subdomain}/results?election=${e.id}`}>
                    View results <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
