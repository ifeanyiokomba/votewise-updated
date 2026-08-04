"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/votewise/primitives/section";
import { ShieldCheck, KeyRound, QrCode, CheckCircle2, AlertTriangle, Smartphone, Lock } from "lucide-react";

interface StatusData {
  ok: boolean;
  data: { totpEnabled: boolean; hasSecret: boolean };
}

interface SetupData {
  ok: boolean;
  data: { secret: string; otpauthUrl: string; qrCodeDataUrl: string };
}

export default function SecurityPage() {
  const qc = useQueryClient();
  const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
  const [setupData, setSetupData] = useState<SetupData["data"] | null>(null);
  const [code, setCode] = useState("");

  const { data: statusData, isLoading } = useQuery<StatusData>({
    queryKey: ["2fa-status"],
    queryFn: async () => (await fetch("/api/dashboard/security/2fa")).json(),
  });

  const setupMut = useMutation({
    mutationFn: async () => (await fetch("/api/dashboard/security/2fa", { method: "POST" })).json() as Promise<SetupData>,
    onSuccess: (d) => {
      if (d.ok) { setSetupData(d.data); setStep("verify"); }
      else toast.error("Failed to setup");
    },
  });

  const verifyMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/security/2fa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success("2FA enabled!"); setStep("idle"); setCode(""); setSetupData(null); qc.invalidateQueries({ queryKey: ["2fa-status"] }); }
      else toast.error(d.error?.message ?? "Invalid code");
    },
  });

  const disableMut = useMutation({
    mutationFn: async () => (await fetch("/api/dashboard/security/2fa", { method: "DELETE" })).json(),
    onSuccess: (d) => { if (d.ok) { toast.success("2FA disabled"); qc.invalidateQueries({ queryKey: ["2fa-status"] }); } },
  });

  if (isLoading) return <PageLoader label="Loading security settings" />;
  const totpEnabled = statusData?.data?.totpEnabled ?? false;

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="vw-display text-2xl">Security</h1>
        <p className="text-sm text-muted-foreground">Manage your account security settings.</p>
      </div>

      {/* current status */}
      <Card className={totpEnabled ? "border-success/30" : ""}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <span className={`grid size-12 place-items-center rounded-lg shrink-0 ${totpEnabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {totpEnabled ? <ShieldCheck className="size-6" /> : <AlertTriangle className="size-6 text-warning" />}
            </span>
            <div className="flex-1">
              <h2 className="vw-display text-base">Two-factor authentication (2FA)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {totpEnabled
                  ? "2FA is enabled. You'll need a code from your authenticator app when logging in."
                  : "Add an extra layer of security. You'll need a code from your authenticator app (Google Authenticator, Authy, etc.) when logging in."}
              </p>
              <div className="mt-3">
                {totpEnabled ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                    <CheckCircle2 className="size-4" /> Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
                    <AlertTriangle className="size-4" /> Not enabled
                  </span>
                )}
              </div>
            </div>
          </div>

          {totpEnabled ? (
            <div className="mt-4 border-t border-border pt-4">
              <Button variant="outline" className="text-destructive" onClick={() => disableMut.mutate()} disabled={disableMut.isPending}>
                {disableMut.isPending ? "Disabling…" : "Disable 2FA"}
              </Button>
            </div>
          ) : step === "idle" ? (
            <div className="mt-4 border-t border-border pt-4">
              <Button onClick={() => { setupMut.mutate(); setStep("setup"); }} disabled={setupMut.isPending}>
                <KeyRound className="size-4" /> {setupMut.isPending ? "Generating…" : "Set up 2FA"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* setup steps */}
      {step === "verify" && setupData && (
        <div className="mt-4 flex flex-col gap-4 vw-fade-up">
          {/* step 1: scan QR */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                <h3 className="text-sm font-medium flex items-center gap-2"><QrCode className="size-4" /> Scan QR code</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Open your authenticator app (Google Authenticator, Authy, 1Password) and scan this code:
              </p>
              <div className="flex justify-center">
                <img src={setupData.qrCodeDataUrl} alt="2FA QR Code" className="rounded-lg border border-border" width={200} height={200} />
              </div>
              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Or enter this code manually:</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="vw-mono flex-1 rounded-md bg-muted p-2 text-xs break-all">{setupData.secret}</code>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(setupData.secret); toast.success("Copied"); }}>
                    <Smartphone className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* step 2: verify */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                <h3 className="text-sm font-medium flex items-center gap-2"><Lock className="size-4" /> Verify the code</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code from your authenticator app:
              </p>
              <div className="flex flex-col gap-3">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="vw-mono text-center text-lg tracking-widest max-w-[200px]"
                  inputMode="numeric"
                />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setStep("idle"); setSetupData(null); setCode(""); }}>Cancel</Button>
                  <Button onClick={() => verifyMut.mutate()} disabled={code.length !== 6 || verifyMut.isPending}>
                    {verifyMut.isPending ? "Verifying…" : "Verify & enable"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* security tips */}
      <Card className="mt-6 vw-card-subtle">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <ShieldCheck className="size-4 text-muted-foreground" /> Security recommendations
          </h3>
          <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Use a strong, unique password</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Enable 2FA on your account</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Review team member access regularly</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Check the audit log for suspicious activity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
