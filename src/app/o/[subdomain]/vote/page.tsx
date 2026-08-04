"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ShieldCheck, Fingerprint, Vote, CheckCircle2, Copy, ArrowRight, ArrowLeft, Lock, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "identify" | "otp" | "ballot" | "review" | "done";

interface BallotView {
  id: string;
  expiresAt: string;
  positions: Array<{
    id: string; title: string; description: string | null; maxVotes: number;
    candidates: Array<{ id: string; name: string; slogan: string | null }>;
    allowNota: boolean;
  }>;
}

export default function VotePage() {
  const params = useParams<{ subdomain: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const electionId = sp.get("election");

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [voterName, setVoterName] = useState("");
  const [ballot, setBallot] = useState<BallotView | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [receipts, setReceipts] = useState<Array<{ positionId: string; receiptCode: string }>>([]);
  const topRef = useRef<HTMLDivElement>(null);

  // scroll to top on step change so action buttons are never covered
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // ---- eligibility + send OTP ----
  const sendOtpMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/voter/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdomain: params.subdomain, identifier, electionId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setDevOtp(data.data.devOtp ?? null);
        setStep("otp");
        toast.success("Verification code sent");
      } else {
        toast.error(data.error?.message ?? "Failed to send code");
      }
    },
    onError: () => toast.error("Network error"),
  });

  // ---- verify OTP ----
  const verifyOtpMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/voter/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdomain: params.subdomain, identifier, code: otp }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setToken(data.data.token);
        setVoterName(data.data.voter.fullName);
        if (data.data.voter.hasVoted) {
          toast.info("You've already voted. You can verify your receipt instead.");
        }
        buildBallotMut.mutate({ token: data.data.token });
      } else {
        toast.error(data.error?.message ?? "Invalid code");
      }
    },
    onError: () => toast.error("Network error"),
  });

  // ---- build ballot ----
  const buildBallotMut = useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const res = await fetch("/api/vote/ballot", {
        method: "POST",
        headers: { "content-type": "application/json", "x-voter-token": token },
        body: JSON.stringify({ electionId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setBallot(data.data.ballot);
        setStep("ballot");
      } else {
        toast.error(data.error?.message ?? "Could not build ballot");
      }
    },
    onError: () => toast.error("Network error"),
  });

  // ---- cast vote ----
  const castMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vote/cast", {
        method: "POST",
        headers: { "content-type": "application/json", "x-voter-token": token! },
        body: JSON.stringify({
          ballotId: ballot!.id,
          selections: Object.entries(selections).map(([positionId, candidateId]) => ({ positionId, candidateId })),
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setReceipts(data.data.receipts);
        setStep("done");
        toast.success("Vote recorded");
      } else {
        toast.error(data.error?.message ?? "Could not cast vote");
      }
    },
    onError: () => toast.error("Network error"),
  });

  if (!electionId) {
    return (
      <div className="vw-section py-20 text-center">
        <p className="text-muted-foreground">No election selected. Return to the portal to choose one.</p>
        <Button asChild className="mt-4"><a href={`/o/${params.subdomain}`}>Back to portal</a></Button>
      </div>
    );
  }

  const steps: Array<{ id: Step; label: string; icon: typeof ShieldCheck }> = [
    { id: "identify", label: "Verify identity", icon: Fingerprint },
    { id: "otp", label: "Enter code", icon: Lock },
    { id: "ballot", label: "Vote", icon: Vote },
    { id: "review", label: "Confirm", icon: ShieldCheck },
    { id: "done", label: "Receipt", icon: Receipt },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="vw-section py-10 md:py-14 pb-32" ref={topRef}>
      {/* stepper */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto votewise-scroll pb-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              i === currentIdx ? "border-primary text-primary" : i < currentIdx ? "border-success/30 text-success" : "border-border text-muted-foreground"
            )}>
              <s.icon className="size-3" />
              <span className="whitespace-nowrap">{s.label}</span>
              {i < currentIdx && <CheckCircle2 className="size-3" />}
            </div>
            {i < steps.length - 1 && <div className="h-px w-4 bg-border md:w-8" />}
          </div>
        ))}
      </div>

      {/* identify */}
      {step === "identify" && (
        <Card className="mx-auto max-w-lg vw-fade-up">
          <CardContent className="p-6 md:p-8">
            <div className="mb-6">
              <span className="vw-eyebrow">Step 1</span>
              <h1 className="vw-display text-2xl">Verify your identity</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter your voter identifier to receive a one-time code.</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="identifier">Voter identifier (ID / membership no.)</Label>
                <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. VOT/2025000" />
              </div>
              <Button onClick={() => sendOtpMut.mutate()} disabled={!identifier || sendOtpMut.isPending}>
                {sendOtpMut.isPending ? "Sending…" : "Send verification code"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* otp */}
      {step === "otp" && (
        <Card className="mx-auto max-w-lg vw-fade-up">
          <CardContent className="p-6 md:p-8">
            <div className="mb-6">
              <span className="vw-eyebrow">Step 2</span>
              <h1 className="vw-display text-2xl">Enter your code</h1>
              <p className="mt-1 text-sm text-muted-foreground">A 6-digit code was sent to your registered contact.</p>
            </div>
            {devOtp && (
              <div className="mb-4 rounded-lg bg-info/10 p-3 text-sm text-info">
                <strong>Dev mode:</strong> your code is <code className="vw-mono">{devOtp}</code>
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="vw-mono text-center text-lg tracking-widest"
                  inputMode="numeric"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep("identify")}><ArrowLeft className="size-4" /> Back</Button>
                <Button onClick={() => verifyOtpMut.mutate()} disabled={otp.length !== 6 || verifyOtpMut.isPending} className="flex-1">
                  {verifyOtpMut.isPending ? "Verifying…" : "Verify"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ballot */}
      {step === "ballot" && ballot && (
        <div className="mx-auto max-w-3xl vw-fade-up">
          <div className="mb-6">
            <span className="vw-eyebrow">Step 3 · {voterName}</span>
            <h1 className="vw-display text-2xl">Your ballot</h1>
            <p className="mt-1 text-sm text-muted-foreground">Select one candidate per position. Your order is shuffled for fairness.</p>
          </div>
          <div className="flex flex-col gap-4">
            {ballot.positions.map((pos) => (
              <Card key={pos.id}>
                <CardContent className="p-5">
                  <h3 className="vw-display text-base">{pos.title}</h3>
                  {pos.description && <p className="mt-1 text-sm text-muted-foreground">{pos.description}</p>}
                  <RadioGroup
                    value={selections[pos.id] ?? ""}
                    onValueChange={(v) => setSelections((s) => ({ ...s, [pos.id]: v }))}
                    className="mt-4 flex flex-col gap-2"
                  >
                    {pos.candidates.map((c) => (
                      <label
                        key={c.id}
                        htmlFor={`${pos.id}-${c.id}`}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                          selections[pos.id] === c.id ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                        )}
                      >
                        <RadioGroupItem id={`${pos.id}-${c.id}`} value={c.id} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{c.name}</div>
                          {c.slogan && <div className="text-xs text-muted-foreground">{c.slogan}</div>}
                        </div>
                      </label>
                    ))}
                    {pos.allowNota && (
                      <label
                        htmlFor={`${pos.id}-NOTA`}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 transition-colors",
                          selections[pos.id] === "NOTA" ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                        )}
                      >
                        <RadioGroupItem id={`${pos.id}-NOTA`} value="NOTA" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">None of the above</div>
                          <div className="text-xs text-muted-foreground">Vote against all candidates</div>
                        </div>
                      </label>
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setStep("review")}
              disabled={ballot.positions.some((p) => !selections[p.id])}
            >
              Review selections <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* review */}
      {step === "review" && ballot && (
        <Card className="mx-auto max-w-2xl vw-fade-up">
          <CardContent className="p-6 md:p-8">
            <div className="mb-6">
              <span className="vw-eyebrow">Step 4</span>
              <h1 className="vw-display text-2xl">Confirm your vote</h1>
              <p className="mt-1 text-sm text-muted-foreground">This is final. You cannot change your vote after casting.</p>
            </div>
            <div className="flex flex-col gap-3">
              {ballot.positions.map((pos) => {
                const sel = selections[pos.id];
                const cand = pos.candidates.find((c) => c.id === sel);
                return (
                  <div key={pos.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <div className="text-xs text-muted-foreground">{pos.title}</div>
                      <div className="text-sm font-medium">{sel === "NOTA" ? "None of the above" : cand?.name}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep("ballot")}>Change</Button>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-success/5 p-3 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-success" />
              Your selections will be encrypted with AES-256-GCM and recorded atomically.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep("ballot")}><ArrowLeft className="size-4" /> Back</Button>
              <Button onClick={() => castMut.mutate()} disabled={castMut.isPending} className="bg-success text-success-foreground hover:bg-success/90">
                {castMut.isPending ? "Recording…" : "Cast vote"} <Vote className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* done */}
      {step === "done" && (
        <Card className="mx-auto max-w-2xl vw-fade-up">
          <CardContent className="p-6 md:p-8 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="vw-display text-2xl">Vote recorded</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your encrypted ballot is on the ledger. Keep these receipt codes — they prove you voted without revealing your choices.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {receipts.map((r, i) => {
                const pos = ballot?.positions.find((p) => p.id === r.positionId);
                return (
                  <div key={r.receiptCode} className="flex items-center justify-between rounded-lg border border-border bg-background-subtle p-3">
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">{pos?.title ?? `Position ${i + 1}`}</div>
                      <code className="vw-mono text-sm text-foreground">{r.receiptCode}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(r.receiptCode); toast.success("Copied"); }}
                    >
                      <Copy className="size-3.5" /> Copy
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button asChild variant="outline">
                <a href={`/o/${params.subdomain}/verify?code=${receipts[0]?.receiptCode ?? ""}`}>Verify receipt</a>
              </Button>
              <Button asChild>
                <a href={`/o/${params.subdomain}/results?election=${electionId}`}>View live results</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
