"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { cn } from "@/lib/utils";
import { ArrowLeft, ShieldCheck, Search, CheckCircle2, XCircle, AlertTriangle, FileSearch, Hash } from "lucide-react";

interface RLASummary {
  ok: boolean;
  data: {
    election: { id: string; name: string; status: string; certifiedAt: string | null };
    totalVotes: number;
    positions: Record<string, { positionId: string; title: string; candidates: Array<{ candidateId: string; name: string; reportedCount: number }> }>;
    canAudit: boolean;
  };
}

interface AuditResult {
  ok: boolean;
  data: {
    audit: {
      seed: string; riskLimit: number; sampleSize: number; totalVotes: number;
      samplingRate: string; discrepancies: number; discrepancyRate: number;
      passesAudit: boolean; recommendation: string;
    };
    sample: Array<{ index: number; receiptCode: string; position: string; candidate: string; verified: boolean }>;
  };
}

export default function RLAPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [riskLimit, setRiskLimit] = useState(10);
  const [sampleSize, setSampleSize] = useState(25);
  const [result, setResult] = useState<AuditResult["data"] | null>(null);

  const { data, isLoading } = useQuery<RLASummary>({
    queryKey: ["rla-summary", params.id],
    queryFn: async () => (await fetch(`/api/dashboard/elections/${params.id}/rla`)).json(),
  });

  const auditMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/elections/${params.id}/rla`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ riskLimit, sampleSize }),
      });
      return res.json();
    },
    onSuccess: (d: AuditResult) => {
      if (d.ok) { setResult(d.data); toast.success("Audit completed"); }
      else toast.error(d.error?.message ?? "Audit failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading audit" />;
  if (!data?.ok) return <div className="p-8"><EmptyState title="Election not found" /></div>;

  const { election, totalVotes, positions, canAudit } = data.data;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href={`/dashboard/elections/${params.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" /> Back to election
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="vw-display text-2xl">Risk-Limiting Audit</h1>
          <p className="text-sm text-muted-foreground">{election.name}</p>
        </div>
      </div>

      {/* election summary */}
      <Card className="mb-4 vw-card-subtle">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-medium">{election.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total votes</div>
              <div className="vw-stat text-lg">{totalVotes}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Positions</div>
              <div className="vw-stat text-lg">{Object.keys(positions).length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Certified</div>
              <div className="font-medium">{election.certifiedAt ? "Yes" : "No"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* reported tally */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Hash className="size-4 text-muted-foreground" /> Reported tally
          </h3>
          <div className="flex flex-col gap-3">
            {Object.values(positions).map((pos) => (
              <div key={pos.positionId}>
                <div className="text-xs text-muted-foreground mb-1">{pos.title}</div>
                <div className="flex flex-wrap gap-2">
                  {pos.candidates.map((c) => (
                    <span key={c.candidateId} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs">
                      {c.name} <span className="vw-mono font-medium">{c.reportedCount}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!canAudit ? (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="size-5 text-warning shrink-0" />
            <div>
              <h3 className="font-medium text-warning">Audit not available</h3>
              <p className="text-sm text-muted-foreground">The election must be CLOSED or CERTIFIED before an audit can be performed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* audit config */}
          <Card className="mb-4">
            <CardContent className="p-5">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
                <FileSearch className="size-4 text-muted-foreground" /> Audit configuration
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="risk">Risk limit (%)</Label>
                  <Input id="risk" type="number" min={1} max={20} value={riskLimit} onChange={(e) => setRiskLimit(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Maximum acceptable discrepancy rate before a full recount.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sample">Sample size</Label>
                  <Input id="sample" type="number" min={5} max={500} value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Number of votes to sample (max: {totalVotes}).</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => auditMut.mutate()} disabled={auditMut.isPending}>
                  <Search className="size-4" /> {auditMut.isPending ? "Auditing…" : "Run audit"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* audit result */}
          {result && (
            <div className="flex flex-col gap-4 vw-fade-up">
              {/* verdict */}
              <Card className={result.audit.passesAudit ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    {result.audit.passesAudit ? (
                      <CheckCircle2 className="size-6 text-success shrink-0" />
                    ) : (
                      <XCircle className="size-6 text-destructive shrink-0" />
                    )}
                    <div>
                      <h3 className={cn("font-medium", result.audit.passesAudit ? "text-success" : "text-destructive")}>
                        {result.audit.passesAudit ? "Audit passed" : "Audit failed"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{result.audit.recommendation}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Sample size</div>
                      <div className="vw-stat text-lg">{result.audit.sampleSize}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Sampling rate</div>
                      <div className="vw-stat text-lg">{result.audit.samplingRate}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Discrepancies</div>
                      <div className={cn("vw-stat text-lg", result.audit.discrepancies > 0 ? "text-warning" : "text-success")}>{result.audit.discrepancies}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Discrepancy rate</div>
                      <div className={cn("vw-stat text-lg", result.audit.discrepancyRate > result.audit.riskLimit ? "text-destructive" : "text-success")}>{result.audit.discrepancyRate}%</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Hash className="size-3" />
                    Audit seed: <code className="vw-mono">{result.audit.seed.slice(0, 16)}…</code>
                  </div>
                </CardContent>
              </Card>

              {/* sample details */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-medium mb-3">Sampled votes</h3>
                  <div className="overflow-x-auto votewise-scroll rounded-lg border border-border max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-background-subtle sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Position</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Candidate</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Verified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.sample.map((s) => (
                          <tr key={s.index} className="border-t border-border hover:bg-muted/30">
                            <td className="px-3 py-2 vw-mono text-xs">{s.index + 1}</td>
                            <td className="px-3 py-2"><code className="vw-mono text-xs text-primary">{s.receiptCode}</code></td>
                            <td className="px-3 py-2 text-xs">{s.position}</td>
                            <td className="px-3 py-2 text-xs">{s.candidate}</td>
                            <td className="px-3 py-2 text-center">
                              {s.verified ? <CheckCircle2 className="inline size-4 text-success" /> : <XCircle className="inline size-4 text-destructive" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
