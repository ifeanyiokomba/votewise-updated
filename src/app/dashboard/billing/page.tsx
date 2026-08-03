"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/votewise/primitives/section";
import { formatNumber, formatDateTime, cn } from "@/lib/utils";
import { CheckCircle2, Crown, Zap, Gift, Users, Vote, TrendingUp, Calendar, AlertCircle } from "lucide-react";

interface BillingData {
  ok: boolean;
  data: {
    organization: { id: string; name: string; plan: string; voterQuota: number; paidUntil: string | null; createdAt: string; status: string; isActive: boolean };
    plan: { key: string; name: string; voterQuota: number; priceMonthly: number; features: string[] };
    usage: { votersUsed: number; voterQuota: number; usagePct: number; isOverQuota: boolean; electionsCount: number; votesCount: number };
    billing: { paidUntil: string | null; isActive: boolean; daysUntilExpiry: number | null };
    plans: Array<{ key: string; name: string; voterQuota: number; priceMonthly: number; features: string[] }>;
  };
}

const PLAN_ICONS: Record<string, typeof Gift> = { FREE: Gift, PAYG: Zap, ENTERPRISE: Crown };

export default function BillingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<BillingData>({
    queryKey: ["billing"],
    queryFn: async () => (await fetch("/api/dashboard/billing")).json(),
  });

  const upgradeMut = useMutation({
    mutationFn: async (plan: string) => {
      const res = await fetch("/api/dashboard/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success(`Plan changed to ${d.data.organization.plan}`); qc.invalidateQueries({ queryKey: ["billing"] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading billing" />;
  if (!data?.ok) return <div className="p-8 text-sm text-muted-foreground">Failed to load billing.</div>;

  const { organization, plan, usage, billing, plans } = data.data;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="vw-display text-2xl">Billing &amp; subscription</h1>
        <p className="text-sm text-muted-foreground">Manage your plan, usage, and quota.</p>
      </div>

      {/* current plan + usage */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* current plan */}
        <Card className="vw-card-subtle">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="vw-eyebrow">Current plan</div>
                <h2 className="vw-display text-2xl mt-1">{plan.name}</h2>
              </div>
              {(() => { const Icon = PLAN_ICONS[plan.key] ?? Gift; return <span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-6" /></span>; })()}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="vw-stat text-3xl">${plan.priceMonthly}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            {billing.paidUntil && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                {billing.isActive
                  ? `Active until ${formatDateTime(billing.paidUntil)} (${billing.daysUntilExpiry} days left)`
                  : `Expired ${formatDateTime(billing.paidUntil)}`}
              </div>
            )}
            {plan.key === "FREE" && (
              <div className="mt-3 flex items-center gap-2 text-xs text-info">
                <AlertCircle className="size-3.5" /> Upgrade for higher quotas and premium features
              </div>
            )}
          </CardContent>
        </Card>

        {/* usage */}
        <Card className="vw-card-subtle">
          <CardContent className="p-6">
            <div className="vw-eyebrow">Usage</div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="vw-stat text-3xl">{formatNumber(usage.votersUsed)}</span>
                <span className="text-sm text-muted-foreground"> / {formatNumber(usage.voterQuota)} voters</span>
              </div>
              <span className={cn("text-sm font-medium", usage.isOverQuota ? "text-destructive" : usage.usagePct > 80 ? "text-warning" : "text-success")}>
                {usage.usagePct.toFixed(0)}%
              </span>
            </div>
            {/* progress bar */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700", usage.isOverQuota ? "bg-destructive" : usage.usagePct > 80 ? "bg-warning" : "bg-primary")}
                style={{ width: `${Math.min(usage.usagePct, 100)}%` }}
              />
            </div>
            {usage.isOverQuota && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" /> Over quota — upgrade to add more voters
              </div>
            )}
            {/* mini stats */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Vote className="size-4 text-muted-foreground" />
                <div>
                  <div className="vw-stat text-base">{formatNumber(usage.electionsCount)}</div>
                  <div className="text-xs text-muted-foreground">Elections</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <div>
                  <div className="vw-stat text-base">{formatNumber(usage.votesCount)}</div>
                  <div className="text-xs text-muted-foreground">Votes cast</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* plan selection */}
      <div className="mt-8">
        <h2 className="vw-display text-lg mb-4">Available plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const Icon = PLAN_ICONS[p.key] ?? Gift;
            const isCurrent = p.key === organization.plan;
            return (
              <Card key={p.key} className={cn("vw-interactive relative", isCurrent && "border-primary")}>
                <CardContent className="p-6 flex flex-col gap-4">
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      Current
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-10 place-items-center rounded-lg", p.key === "FREE" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-medium">{p.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="vw-stat text-xl">${p.priceMonthly}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Users className="inline size-3.5 mr-1" />
                    Up to {formatNumber(p.voterQuota)} voters
                  </div>
                  <ul className="flex flex-col gap-1.5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || upgradeMut.isPending}
                    onClick={() => upgradeMut.mutate(p.key)}
                    className="w-full"
                  >
                    {isCurrent ? "Current plan" : `Upgrade to ${p.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-muted/30 p-4 text-xs text-muted-foreground">
        <AlertCircle className="mr-1.5 inline size-3.5" />
        This is a demo billing system. In production, plan changes would integrate with Paystack/Stripe for real payment processing.
      </div>
    </div>
  );
}
