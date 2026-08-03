"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Search, ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ReceiptResult {
  valid: boolean;
  receiptCode?: string;
  electionName?: string;
  positionTitle?: string;
  recordedAt?: string;
  isSimulation?: boolean;
  isNota?: boolean;
  message?: string;
}

export default function VerifyPage() {
  const sp = useSearchParams();
  const [code, setCode] = useState(sp.get("code") ?? "");
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async (c: string) => {
    if (!c) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vote/receipt/${c}`);
      const json = await res.json();
      setResult(json.ok ? json.data : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = sp.get("code");
    if (initial) verify(initial);
  }, [sp]);

  return (
    <div className="vw-section py-10 md:py-14">
      <div className="mx-auto max-w-lg">
        <div className="vw-fade-up mb-8 text-center">
          <span className="vw-eyebrow">Receipt verification</span>
          <h1 className="vw-display text-3xl">Verify a vote</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a receipt code to confirm a vote was recorded — without revealing the choice.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Receipt code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VW-2025-XXXXXXXX"
                  className="vw-mono"
                />
              </div>
              <Button onClick={() => verify(code)} disabled={!code || loading}>
                <Search className="size-4" />
                {loading ? "Verifying…" : "Verify receipt"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className={`mt-4 vw-fade-up ${result.valid ? "border-success/30" : "border-destructive/30"}`}>
            <CardContent className="p-6">
              {result.valid ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-success/10 text-success">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div>
                      <div className="font-medium">Valid receipt</div>
                      <div className="text-xs text-muted-foreground">{result.message}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Election</div>
                      <div className="font-medium">{result.electionName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Position</div>
                      <div className="font-medium">{result.positionTitle}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Recorded at</div>
                      <div className="font-medium">{result.recordedAt ? formatDateTime(result.recordedAt) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Receipt code</div>
                      <code className="vw-mono text-xs">{result.receiptCode}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-info/5 p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-info" />
                    This verification confirms the vote exists on the ledger. It never reveals which candidate was chosen.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
                    <XCircle className="size-5" />
                  </span>
                  <div>
                    <div className="font-medium">Receipt not found</div>
                    <div className="text-xs text-muted-foreground">{result.message ?? "Check the code and try again."}</div>
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
