import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PLANS = {
  FREE: { name: "Free", voterQuota: 100, priceMonthly: 0, features: ["1 organization", "100 voters", "Live results", "Basic audit log"] },
  PAYG: { name: "Pay-as-you-go", voterQuota: 1000, priceMonthly: 25, features: ["1,000 voters", "Real-time monitoring", "Observer mode", "CSV export", "Announcements", "Priority support"] },
  ENTERPRISE: { name: "Enterprise", voterQuota: 50000, priceMonthly: 200, features: ["50,000 voters", "Custom branding", "API access", "Webhooks", "SSO / 2FA", "Dedicated support", "SLA 99.99%"] },
} as const;

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const org = await db.organization.findUnique({
    where: { id: member.organizationId },
    select: { id: true, name: true, plan: true, voterQuota: true, paidUntil: true, createdAt: true, status: true },
  });
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  const voterCount = await db.voter.count({ where: { organizationId: org.id } });
  const electionCount = await db.election.count({ where: { organizationId: org.id } });
  const voteCount = await db.voteRecord.count({
    where: { election: { organizationId: org.id }, isSimulation: false },
  });

  const plan = PLANS[org.plan as keyof typeof PLANS] ?? PLANS.FREE;
  const usagePct = plan.voterQuota > 0 ? (voterCount / plan.voterQuota) * 100 : 0;
  const isOverQuota = voterCount > plan.voterQuota;
  const isActive = !org.paidUntil || org.paidUntil > new Date() || org.plan === "FREE";

  return ok({
    organization: { ...org, isActive },
    plan: { ...plan, key: org.plan },
    usage: {
      votersUsed: voterCount,
      voterQuota: plan.voterQuota,
      usagePct: Math.min(usagePct, 100),
      isOverQuota,
      electionsCount: electionCount,
      votesCount: voteCount,
    },
    billing: {
      paidUntil: org.paidUntil,
      isActive,
      daysUntilExpiry: org.paidUntil ? Math.ceil((org.paidUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    },
    plans: Object.entries(PLANS).map(([key, p]) => ({ key, ...p })),
  });
});

const upgradeSchema = z.object({
  plan: z.enum(["FREE", "PAYG", "ENTERPRISE"]),
});

export const POST = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Only org owners can change plans", 403);
  }
  const input = await upgradeSchema.parse(await req.json().catch(() => ({})));
  const planConfig = PLANS[input.plan];
  if (!planConfig) throw new HttpError("VALIDATION", "Invalid plan", 400);

  const updated = await db.organization.update({
    where: { id: member.organizationId },
    data: {
      plan: input.plan,
      voterQuota: planConfig.voterQuota,
      paidUntil: input.plan === "FREE" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "PLAN_CHANGED", resource: "organization", resourceId: member.organizationId,
    details: { from: "previous", to: input.plan, quota: planConfig.voterQuota },
  });

  return ok({ organization: { id: updated.id, plan: updated.plan, voterQuota: updated.voterQuota, paidUntil: updated.paidUntil } });
});
