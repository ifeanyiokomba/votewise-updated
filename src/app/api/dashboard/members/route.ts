import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const members = await db.organizationMember.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, email: true, name: true, role: true, status: true,
      lastLoginAt: true, createdAt: true, totpEnabled: true,
    },
  });
  return ok({ members, currentMemberId: member.id });
});

const inviteSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  role: z.enum(["ORG_ADMIN", "OBSERVER"]),
});

export const POST = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Only org owners can invite members", 403);
  }
  const input = await parseBody(req, inviteSchema);

  const existing = await db.organizationMember.findFirst({
    where: { organizationId: member.organizationId, email: input.email },
  });
  if (existing) throw new HttpError("CONFLICT", "Member with this email already exists", 409);

  // In production, this would email an invitation link. For demo, we create a temp password.
  const tempPassword = Math.random().toString(36).slice(2, 10);
  const { hashPassword } = await import("@/lib/auth");
  const passwordHash = await hashPassword(tempPassword);

  const newMember = await db.organizationMember.create({
    data: {
      organizationId: member.organizationId,
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      status: "ACTIVE",
    },
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "MEMBER_INVITED", resource: "member", resourceId: newMember.id,
    details: { email: input.email, name: input.name, role: input.role },
  });

  return ok({
    member: { id: newMember.id, email: newMember.email, name: newMember.name, role: newMember.role },
    tempPassword, // demo only — in production this would be emailed
  });
});

const updateSchema = z.object({
  role: z.enum(["ORG_ADMIN", "OBSERVER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export const PATCH = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Only org owners can modify members", 403);
  }
  const body = await req.json().catch(() => ({}));
  const targetId = (body as { id?: string }).id;
  if (!targetId) throw new HttpError("VALIDATION", "Member id required", 400);
  const input = updateSchema.parse(body);

  const target = await db.organizationMember.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError("NOT_FOUND", "Member not found", 404);
  if (target.organizationId !== member.organizationId) throw new HttpError("FORBIDDEN", "Not your member", 403);
  if (target.role === "ORG_OWNER") throw new HttpError("FORBIDDEN", "Cannot modify the org owner", 403);

  const updated = await db.organizationMember.update({
    where: { id: targetId },
    data: { ...(input.role && { role: input.role }), ...(input.status && { status: input.status }) },
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "MEMBER_UPDATED", resource: "member", resourceId: targetId,
    details: { from: { role: target.role, status: target.status }, to: input },
  });

  return ok({ member: { id: updated.id, role: updated.role, status: updated.status } });
});
