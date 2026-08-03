"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatNumber, formatDateTime, timeAgo, cn } from "@/lib/utils";
import {
  ShieldCheck, CheckCircle2, XCircle, Activity, Vote, Trophy, Hash, ExternalLink, Eye,
} from "lucide-react";

interface AuditData {
  ok: boolean;
  data: {
    organization: { name: string; subdomain: string };
    chain: {
      intact: boolean; brokenAt: string | null; brokenReason: string | null;
      totalEntries: number; verifiedCount: number;
    };
    stats: { totalElections: number; totalVotes: number; certifiedCount: number };
    recentEntries: Array<{
      action: string; actorName: string | null; actorRole: string | null;
      resource: string | null; createdAt: string; hash: string;
    }>;
  };
}

const ACTION_ICONS: Record<string, typeof Vote> = {
  VOTE_CAST: Vote,
  ELECTION_CREATED: Activity,
  ELECTION_CERTIFIED: ShieldCheck,
  VOTER_FLAGGED: Activity,
  LOGIN_SUCCESS: ShieldCheck,
  LOGIN_FAILED: XCircle,
  INCIDENT_REPORTED: Activity,
};

export default function PublicAuditPage() {
  const params = useParams<{ subdomain: string }>();

  const { data, isLoading } = useQuery<AuditData>({
    queryKey: ["public-audit", params.subdomain],
    queryFn: async () => (await fetch(`/api/public/audit/${params.subdomain}`)).json(),
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader label="Verifying audit chain" />;
  if (!data?.ok)
    return (
      <div className="vw-section py-20">
        <EmptyState title="Organization not found" />
      </div>
    );

  const { organization, chain, stats, recentEntries } = data.data;

  return (
    <div className="vw-section py-10 md:py-14 max-w-4xl">
      {/* header */}
      <div className="vw-fade-up mb-8 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <span className="vw-eyebrow">Public audit verification</span>
          <h1 className="vw-display text-2xl md:text-3xl">{organization.name}</h1>
          <p className="text-sm text-muted-foreground">
            Independently verify the integrity of this organization's election audit trail.
          </p>
        </div>
      </div>

      {/* chain verification result */}
      <Card className={cn("mb-6 border-l-4", chain.intact ? "border-l-success border-success/30" : "border-l-destructive border-destructive/30")}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {chain.intact ? (
              <CheckCircle2 className="size-8 text-success shrink-0" />
            ) : (
              <XCircle className="size-8 text-destructive shrink-0" />
            )}
            <div className="flex-1">
              <h2 className={cn("vw-display text-xl", chain.intact ? "text-success" : "text-destructive")}>
                {chain.intact ? "Chain integrity verified" : "Chain integrity broken"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {chain.intact
                  ? `All ${chain.verifiedCount} audit entries are cryptographically linked and verified. No tampering detected.`
                  : chain.brokenReason ?? "The audit chain has been broken — investigate immediately."}
              </p>
              {!chain.intact && chain.brokenAt && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Broken at:</span>
                  <code className="vw-mono text-destructive">{chain.brokenAt}</code>
                </div>
              )}
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Total entries: </span>
                  <strong>{chain.totalEntries}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Verified: </span>
                  <strong className="text-success">{chain.verifiedCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* org stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Elections", value: stats.totalElections, icon: Vote, tone: "text-primary" },
          { label: "Votes cast", value: stats.totalVotes, icon: Activity, tone: "text-success" },
          { label: "Certified", value: stats.certifiedCount, icon: Trophy, tone: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="vw-interactive">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="vw-stat text-xl">{formatNumber(s.value)}</div>
              </div>
              <s.icon className={cn("size-4", s.tone)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* recent audit entries */}
      <div className="mb-6">
        <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
          <Eye className="size-4 text-muted-foreground" /> Recent audit entries
        </h2>
        {recentEntries.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No audit entries yet.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-4 max-h-96 overflow-y-auto votewise-scroll">
              <div className="relative flex flex-col gap-3 pl-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                {recentEntries.map((entry, i) => {
                  const Icon = ACTION_ICONS[entry.action] ?? Activity;
                  return (
                    <div key={i} className="relative flex items-start gap-3">
                      <span className="absolute -left-4 mt-0.5 grid size-3.5 place-items-center rounded-full border-2 border-background bg-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className="size-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{entry.action.replace(/_/g, " ").toLowerCase()}</span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(entry.createdAt)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {entry.actorName ?? "System"}
                          {entry.actorRole && ` · ${entry.actorRole}`}
                          {entry.resource && ` · ${entry.resource}`}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Hash className="size-3 text-muted-foreground" />
                          <code className="vw-mono text-[10px] text-muted-foreground">{entry.hash}</code>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* info */}
      <Card className="vw-card-subtle">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
            <ShieldCheck className="size-4 text-muted-foreground" /> How verification works
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every action on VoteWise (vote cast, election certified, voter flagged, etc.) is recorded as an
            audit log entry. Each entry is cryptographically linked to the previous one via a SHA-256 hash chain.
            If any entry is modified or deleted, the chain breaks and verification fails. This page lets anyone
            independently verify that the audit trail has not been tampered with.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
