"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, XCircle, Vote, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  fullName?: string;
  alreadyVoted?: boolean;
  elections?: Array<{
    id: string; name: string; status: string; startTime: string; endTime: string;
    accredited: boolean; alreadyVoted: boolean;
  }>;
}

export default function CheckEligibilityPage() {
  const params = useParams<{ subdomain: string }>();
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<EligibilityResult | null>(null);

  const check = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/voter/eligibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdomain: params.subdomain, identifier }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) setResult(data.data);
    },
  });

  const statusIcon = (status: string) => {
    if (status === "LIVE") return <Vote className="size-4 text-success" />;
    if (status === "SCHEDULED") return <Clock className="size-4 text-info" />;
    if (["CLOSED", "CERTIFIED"].includes(status)) return <CheckCircle2 className="size-4 text-muted-foreground" />;
    return <AlertCircle className="size-4 text-muted-foreground" />;
  };

  return (
    <div className="vw-section py-10 md:py-14">
      <div className="mx-auto max-w-lg">
        <div className="vw-fade-up mb-8 text-center">
          <span className="vw-eyebrow">Eligibility check</span>
          <h1 className="vw-display text-3xl">Are you registered?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your voter identifier to check your eligibility — no password required.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="id">Voter identifier</Label>
                <Input
                  id="id"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. VOT/2025000"
                  onKeyDown={(e) => { if (e.key === "Enter" && identifier) check.mutate(); }}
                />
              </div>
              <Button onClick={() => check.mutate()} disabled={!identifier || check.isPending}>
                <Search className="size-4" />
                {check.isPending ? "Checking…" : "Check eligibility"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className={`mt-4 vw-fade-up ${result.eligible ? "border-success/30" : "border-destructive/30"}`}>
            <CardContent className="p-6">
              {result.eligible ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-success/10 text-success">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div>
                      <div className="font-medium">You're registered, {result.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {result.alreadyVoted ? "You have already cast your vote." : "You are eligible to vote."}
                      </div>
                    </div>
                  </div>

                  {result.elections && result.elections.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="mb-3 text-xs font-medium text-muted-foreground">Your elections</div>
                      <div className="flex flex-col gap-2">
                        {result.elections.map((e) => (
                          <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-2.5">
                              {statusIcon(e.status)}
                              <div>
                                <div className="text-sm font-medium">{e.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(e.startTime)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {e.alreadyVoted ? (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Voted</span>
                              ) : e.status === "LIVE" ? (
                                <Button asChild size="sm">
                                  <Link href={`/o/${params.subdomain}/vote?election=${e.id}`}>
                                    Vote now <ArrowRight className="size-3" />
                                  </Link>
                                </Button>
                              ) : e.status === "SCHEDULED" ? (
                                <span className="rounded-full bg-info/10 px-2 py-0.5 text-xs text-info">Upcoming</span>
                              ) : (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Closed</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
                    <XCircle className="size-5" />
                  </span>
                  <div>
                    <div className="font-medium">
                      {result.reason === "NOT_REGISTERED" ? "Not registered" : "Account flagged"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.reason === "NOT_REGISTERED"
                        ? "This identifier is not in the voter roll. Contact your election administrator."
                        : "Your account has been flagged. Contact your election administrator."}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
