import { getCurrentMember } from "@/lib/auth";
import { api, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async () => {
  const member = await getCurrentMember();
  if (!member) throw new HttpError("UNAUTHORIZED", "Not authenticated", 401);
  const org = await db.organization.findUnique({ where: { id: member.organizationId } });
  return ok({
    member: {
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
      organizationId: member.organizationId,
    },
    organization: org
      ? { id: org.id, name: org.name, subdomain: org.subdomain, category: org.category }
      : null,
  });
});
