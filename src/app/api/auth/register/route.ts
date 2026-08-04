import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, parseBody, ok } from "@/lib/api";
import { schemas } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { issueAccessToken, issueRefreshToken, setAuthCookies } from "@/lib/auth";
import { validateSubdomainSlug } from "@/lib/tenant-utils";

export const dynamic = "force-dynamic";

export const POST = api(async (req) => {
  const input = await parseBody(req, schemas.register);

  // Validate subdomain against reserved list
  const slugError = validateSubdomainSlug(input.subdomain);
  if (slugError) throw new HttpError("VALIDATION", slugError, 400);

  const existingSub = await db.organization.findUnique({ where: { subdomain: input.subdomain } });
  if (existingSub) throw new HttpError("CONFLICT", "Subdomain already taken", 409);

  const existingEmail = await db.organizationMember.findFirst({ where: { email: input.ownerEmail } });
  if (existingEmail) throw new HttpError("CONFLICT", "Email already registered", 409);

  const passwordHash = await hashPassword(input.password);

  const org = await db.$transaction(async (tx) => {
    const o = await tx.organization.create({
      data: {
        name: input.organizationName,
        subdomain: input.subdomain,
        category: input.category,
        status: "ACTIVE",
        plan: "FREE",
      },
    });
    await tx.organizationBrand.create({
      data: { organizationId: o.id, tagline: "Secure elections, verified results." },
    });
    const member = await tx.organizationMember.create({
      data: {
        organizationId: o.id,
        email: input.ownerEmail,
        name: input.ownerName,
        passwordHash,
        role: "ORG_OWNER",
        status: "ACTIVE",
      },
    });
    await audit({
      organizationId: o.id,
      actorId: member.id,
      actorRole: "ORG_OWNER",
      actorName: member.name,
      action: "ORG_REGISTERED",
      resource: "organization",
      resourceId: o.id,
      details: { name: o.name, subdomain: o.subdomain },
    });
    return { o, member };
  });

  const accessToken = await issueAccessToken(org.member);
  const refreshToken = issueRefreshToken();
  await setAuthCookies(accessToken, refreshToken);

  return ok({
    organization: { id: org.o.id, name: org.o.name, subdomain: org.o.subdomain },
    member: { id: org.member.id, email: org.member.email, name: org.member.name, role: org.member.role },
  });
});
