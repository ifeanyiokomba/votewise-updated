import { db } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import type { OrganizationMember, Voter } from "@prisma/client";

/* ---- error helper ---- */
export class HttpError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export const unauthorized = () => new HttpError("UNAUTHORIZED", "Authentication required", 401);
export const forbidden = (msg = "You don't have access to this organization") =>
  new HttpError("FORBIDDEN", msg, 403);
export const notFound = (msg = "Not found") => new HttpError("NOT_FOUND", msg, 404);
export const conflict = (code: string, msg: string) => new HttpError(code, msg, 409);

/* ---- officials ---- */
export async function requireOfficial(): Promise<OrganizationMember> {
  const m = await getCurrentMember();
  if (!m) throw unauthorized();
  if (m.status !== "ACTIVE") throw new HttpError("FORBIDDEN", "Account is not active", 403);
  return m;
}

export async function requireOrgAdmin(organizationId: string): Promise<OrganizationMember> {
  const m = await requireOfficial();
  if (m.role === "PLATFORM_ADMIN") return m; // platform admin bypass
  if (m.organizationId !== organizationId) throw forbidden();
  if (!["ORG_OWNER", "ORG_ADMIN"].includes(m.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  return m;
}

/** Observer or higher — can view election data and file incidents. */
export async function requireObserver(): Promise<OrganizationMember> {
  const m = await requireOfficial();
  if (!["PLATFORM_ADMIN", "ORG_OWNER", "ORG_ADMIN", "OBSERVER"].includes(m.role)) {
    throw new HttpError("FORBIDDEN", "Observer access required", 403);
  }
  return m;
}

export async function requirePlatformAdmin(): Promise<OrganizationMember> {
  const m = await requireOfficial();
  if (m.role !== "PLATFORM_ADMIN") {
    throw new HttpError("FORBIDDEN", "Platform admin only", 403);
  }
  return m;
}

/* ---- voters ---- */
export async function requireVoter(req: Request): Promise<Voter> {
  const token = req.headers.get("x-voter-token");
  if (!token) throw unauthorized();
  const voter = await db.voter.findUnique({
    where: { sessionToken: token },
  });
  if (!voter) throw unauthorized();
  if (voter.lockedUntil && voter.lockedUntil > new Date()) {
    throw new HttpError("LOCKED", "Account temporarily locked", 423);
  }
  if (!voter.sessionExpiresAt || voter.sessionExpiresAt < new Date()) {
    throw new HttpError("UNAUTHORIZED", "Session expired", 401);
  }
  return voter;
}
