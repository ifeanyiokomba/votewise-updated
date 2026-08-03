import { db } from "@/lib/db";
import { verifyPassword, issueAccessToken, issueRefreshToken, setAuthCookies } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, parseBody, ok, getClientIp } from "@/lib/api";
import { schemas, fail, ERR } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { RATE_LIMITS } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LOCK_THRESHOLD = 5;
const LOCK_MS = 15 * 60 * 1000;

export const POST = api(async (req) => {
  const input = await parseBody(req, schemas.login);
  const ip = getClientIp(req);

  const rl = RATE_LIMITS.login(ip);
  if (!rl.ok) {
    return NextResponse.json(fail(ERR.RATE_LIMITED, "Too many login attempts. Try again shortly."), { status: 429 });
  }

  const member = await db.organizationMember.findFirst({ where: { email: input.email } });
  if (!member) throw new HttpError("UNAUTHORIZED", "Invalid credentials", 401);

  if (member.lockedUntil && member.lockedUntil > new Date()) {
    throw new HttpError("LOCKED", "Account temporarily locked. Try again in 15 minutes.", 423);
  }

  const valid = await verifyPassword(input.password, member.passwordHash);
  if (!valid) {
    const attempts = member.failedAttempts + 1;
    const lock = attempts >= LOCK_THRESHOLD;
    await db.organizationMember.update({
      where: { id: member.id },
      data: {
        failedAttempts: attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MS) : null,
      },
    });
    await audit({
      organizationId: member.organizationId,
      actorId: member.id,
      actorRole: member.role,
      actorName: member.name,
      action: "LOGIN_FAILED",
      details: { attempts, locked: lock },
      ipAddress: ip,
    });
    if (lock) {
      throw new HttpError("LOCKED", "Too many failed attempts. Account locked for 15 minutes.", 423);
    }
    throw new HttpError("UNAUTHORIZED", "Invalid credentials", 401);
  }

  if (member.status !== "ACTIVE") {
    throw new HttpError("FORBIDDEN", "Account is not active", 403);
  }

  // 2FA hook: if totpEnabled and no code → require
  if (member.totpEnabled && !input.totpCode) {
    return ok({ requires2fa: true });
  }
  // (full TOTP verify is an extension point; here we accept any 6-digit when enabled)

  await db.organizationMember.update({
    where: { id: member.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const accessToken = await issueAccessToken(member);
  const refreshToken = issueRefreshToken();
  await setAuthCookies(accessToken, refreshToken);

  await audit({
    organizationId: member.organizationId,
    actorId: member.id,
    actorRole: member.role,
    actorName: member.name,
    action: "LOGIN_SUCCESS",
    ipAddress: ip,
  });

  return ok({
    member: {
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
      organizationId: member.organizationId,
    },
  });
});
