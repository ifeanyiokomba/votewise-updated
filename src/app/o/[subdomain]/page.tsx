"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState, SectionHeader } from "@/components/votewise/primitives/section";
import { formatNumber, formatPercent, formatDateTime } from "@/lib/utils";
import { ELECTION_STATUSES } from "@/lib/constants";
import { Vote, Users, CheckCircle2, Calendar, BarChart3, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalData {
  ok: boolean;
  data: {
    organization: {
      id: string; name: string; subdomain: string; category: string; tagline: string; logoUrl: string | null;
    };
    stats: { totalVotes: number; totalVoters: number; electionsCount: number };
    elections: Array<{
      id: string; name: string; description: string | null; status: string;
      startTime: string; endTime: string; showLiveResults: boolean; hideResultsUntilEnd: boolean;
    }>;
  };
}

export default function OrgPortalPage() {
  const params = useParams<{ subdomain: string }>();
  const { data, isLoading, error } = useQuery<PortalData>({
    queryKey: ["portal", params.subdomain],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${params.subdomain}`);
      return res.json();
    },
  });

  if (isLoading) return <PageLoader label="Loading organization" />;
  if (error || !data?.ok)
    return (
      <div className="vw-section py-20">
        <EmptyState title="Couldn't load this organization" description="Please try again later." />
      </div>
    );

  const { organization, stats, elections } = data.data;
  const live = elections.find((e) => e.status === "LIVE");
  const upcoming = elections.filter((e) => e.status === "SCHEDULED");
  const past = elections.filter((e) => ["CLOSED", "CERTIFIED"].includes(e.status));

  return (
    <div className="vw-section py-10 md:py-14">
      {/* org header */}
      <div className="vw-fade-up flex flex-col gap-3">
        <span className="vw-eyebrow">{organization.category}</span>
        <h1 className="vw-display text-3xl md:text-4xl">{organization.name}</h1>
        <p className="max-w-2xl text-muted-foreground">{organization.tagline}</p>
      </div>

      {/* stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Vote, label: "Total votes", value: formatNumber(stats.totalVotes) },
          { icon: Users, label: "Registered voters", value: formatNumber(stats.totalVoters) },
          { icon: CheckCircle2, label: "Elections held", value: formatNumber(stats.electionsCount) },
          { icon: BarChart3, label: "Live now", value: live ? "1" : "0" },
        ].map((s) => (
          <Card key={s.label} className="vw-interactive">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                <s.icon className="size-4" />
              </span>
              <div>
                <div className="vw-stat text-xl">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* live election callout */}
      {live && (
        <Card className="mt-8 vw-pop border-success/30">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1 votewise-live-dot" />
              <div>
                <div className="vw-eyebrow text-success">Election open now</div>
                <h2 className="vw-display text-xl">{live.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Closes {formatDateTime(live.endTime)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/o/${params.subdomain}/vote?election=${live.id}`}>
                  Cast your vote <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              {live.showLiveResults && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/o/${params.subdomain}/results?election=${live.id}`}>Live results</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href={`/o/${params.subdomain}/check`}>
          <Card className="vw-interactive vw-lift h-full cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-info/10 text-info">
                <Search className="size-4" />
              </span>
              <div>
                <div className="text-sm font-medium">Check eligibility</div>
                <div className="text-xs text-muted-foreground">Am I registered?</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/o/${params.subdomain}/candidates${live ? `?election=${live.id}` : ""}`}>
          <Card className="vw-interactive vw-lift h-full cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                <Vote className="size-4" />
              </span>
              <div>
                <div className="text-sm font-medium">View candidates</div>
                <div className="text-xs text-muted-foreground">Meet the contenders</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/o/${params.subdomain}/verify`}>
          <Card className="vw-interactive vw-lift h-full cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-success/10 text-success">
                <CheckCircle2 className="size-4" />
              </span>
              <div>
                <div className="text-sm font-medium">Verify receipt</div>
                <div className="text-xs text-muted-foreground">Confirm a vote</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* elections list */}
      <div className="mt-12">
        <SectionHeader eyebrow="Elections" title={<>All elections</>} className="mb-6" />
        <div className="flex flex-col gap-3">
          {elections.length === 0 && (
            <EmptyState icon={<Vote className="size-8" />} title="No elections yet" description="Elections will appear here once scheduled." />
          )}
          {elections.map((e) => {
            const status = ELECTION_STATUSES[e.status as keyof typeof ELECTION_STATUSES];
            return (
              <Card key={e.id} className="vw-interactive">
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="vw-display text-base">{e.name}</h3>
                      <StatusBadge tone={status?.tone ?? "muted"} label={status?.label ?? e.status} />
                    </div>
                    {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="size-3" /> {formatDateTime(e.startTime)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {e.status === "LIVE" && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/o/${params.subdomain}/vote?election=${e.id}`}>Vote</Link>
                      </Button>
                    )}
                    {(["LIVE", "CLOSED", "CERTIFIED"].includes(e.status)) && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/o/${params.subdomain}/results?election=${e.id}`}>Results</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ tone, label }: { tone: string; label: string }) {
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
    muted: "bg-muted text-muted-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone] ?? tones.muted)}>
      {tone === "success" && <span className="votewise-live-dot" style={{ width: 6, height: 6 }} />}
      {label}
    </span>
  );
}
