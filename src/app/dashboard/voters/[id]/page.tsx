"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatDateTime, timeAgo, initials, colorFromString, cn } from "@/lib/utils";
import { ArrowLeft, Vote, CheckCircle2, Clock, Flag, Activity, Receipt, ShieldCheck, Mail, Phone, Calendar } from "lucide-react";

interface VoterData {
  ok: boolean;
  data: {
    voter: {
      id: string; identifier: string; fullName: string; email: string | null; phone: string | null;
      hasVoted: boolean; votedAt: string | null; flagged: boolean; flaggedReason: string | null;
      createdAt: string; updatedAt: string;
    };
    eligibilities: Array<{
      electionId: string; electionName: string; electionStatus: string;
      accredited: boolean; accreditedAt: string | null;
    }>;
    voteRecords: Array<{
      id: string; receiptCode: string; positionTitle: string; electionName: string;
      isNota: boolean; createdAt: string;
    }>;
    auditEvents: Array<{
      action: string; details: string | null; createdAt: string; ipAddress: string | null;
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

const AUDIT_ICONS: Record<string, typeof Vote> = {
  VOTER_AUTHENTICATED: ShieldCheck,
  VOTE_CAST: Vote,
  VOTER_FLAGGED: Flag,
  VOTER_UNFLAGGED: CheckCircle2,
};

export default function VoterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery<VoterData>({
    queryKey: ["voter", params.id],
    queryFn: async () => (await fetch(`/api/dashboard/voters/${params.id}`)).json(),
  });

  if (isLoading) return <PageLoader label="Loading voter" />;
  if (!data?.ok) return <div className="p-8"><EmptyState title="Voter not found" /></div>;

  const { voter, eligibilities, voteRecords, auditEvents } = data.data;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/dashboard/elections/election-sug-2025" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" /> Back
      </Link>

      {/* voter header */}
      <Card className="vw-card-subtle mb-4">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="size-16" style={{ backgroundColor: colorFromString(voter.fullName) }}>
              <AvatarFallback className="text-xl font-medium text-white">{initials(voter.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="vw-display text-2xl">{voter.fullName}</h1>
                {voter.flagged && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                    <Flag className="size-3" /> Flagged
                  </span>
                )}
                {voter.hasVoted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                    <CheckCircle2 className="size-3" /> Voted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3" /> Not voted
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> Registered {timeAgo(voter.createdAt)}</span>
                {voter.email && <span className="flex items-center gap-1.5"><Mail className="size-3.5" /> {voter.email}</span>}
                {voter.phone && <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> {voter.phone}</span>}
              </div>
              <div className="mt-1">
                <code className="vw-mono text-xs text-muted-foreground">{voter.identifier}</code>
              </div>
              {voter.flagged && voter.flaggedReason && (
                <div className="mt-3 rounded-lg bg-destructive/5 border border-destructive/20 p-2 text-xs text-destructive">
                  <Flag className="mr-1.5 inline size-3" />{voter.flaggedReason}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* eligible elections */}
        <div>
          <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
            <Vote className="size-4 text-muted-foreground" /> Eligible elections
          </h2>
          {eligibilities.length === 0 ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Not eligible for any election.</CardContent></Card>
          ) : (
            <div className="flex flex-col gap-2">
              {eligibilities.map((e) => (
                <Card key={e.electionId} className="vw-interactive">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{e.electionName}</h3>
                        {e.accredited && <span className="text-xs text-success">✓ Accredited</span>}
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[e.electionStatus] ?? STATUS_TONE.DRAFT)}>
                        {e.electionStatus}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* vote receipts */}
        <div>
          <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
            <Receipt className="size-4 text-muted-foreground" /> Vote receipts
          </h2>
          {voteRecords.length === 0 ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">No votes cast yet.</CardContent></Card>
          ) : (
            <div className="flex flex-col gap-2">
              {voteRecords.map((v) => (
                <Card key={v.id} className="vw-interactive">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{v.positionTitle}</h3>
                        <p className="text-xs text-muted-foreground">{v.electionName}</p>
                        <code className="vw-mono text-xs text-primary">{v.receiptCode}</code>
                      </div>
                      <div className="text-right shrink-0">
                        {v.isNota && <span className="text-xs text-muted-foreground">NOTA</span>}
                        <div className="text-xs text-muted-foreground">{timeAgo(v.createdAt)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* audit timeline */}
      <div className="mt-6">
        <h2 className="vw-display text-lg mb-3 flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" /> Activity timeline
        </h2>
        {auditEvents.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">No activity recorded.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="relative flex flex-col gap-4 pl-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                {auditEvents.map((event) => {
                  const Icon = AUDIT_ICONS[event.action] ?? Activity;
                  return (
                    <div key={event.id} className="relative flex items-start gap-3">
                      <span className="absolute -left-4 mt-0.5 grid size-3.5 place-items-center rounded-full border-2 border-background bg-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{event.action.replace(/_/g, " ").toLowerCase()}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(event.createdAt)}</span>
                        </div>
                        {event.ipAddress && <span className="text-xs text-muted-foreground">IP: {event.ipAddress}</span>}
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
  );
}
