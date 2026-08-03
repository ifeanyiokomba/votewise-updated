import { db } from "@/lib/db";
import { resolveOrgBySubdomain } from "@/lib/org-context";
import { api, parseBody, ok, getClientIp } from "@/lib/api";
import { schemas, fail, ERR } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { RATE_LIMITS } from "@/lib/ratelimit";
import { sha256, generateToken, timingSafeEqualHex } from "@/lib/sve/crypto";
import { SVE_SECRETS } from "@/lib/secrets";
import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_OTP_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;

export const POST = api(async (req) => {
  const input = await parseBody(req, schemas.verifyOtp);
  const ip = getClientIp(req);

  const rl = RATE_LIMITS.verifyOtp(ip);
  if (!rl.ok) {
    return NextResponse.json(fail(ERR.RATE_LIMITED, "Too many attempts. Try again shortly."), { status: 429 });
  }

  const org = await resolveOrgBySubdomain(input.subdomain);
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  const voter = await db.voter.findUnique({
    where: { organizationId_identifier: { organizationId: org.id, identifier: input.identifier } },
  });
  if (!voter) throw new HttpError("NOT_FOUND", "Voter not found", 404);

  if (voter.lockedUntil && voter.lockedUntil > new Date()) {
    throw new HttpError("LOCKED", "Account temporarily locked", 423);
  }
  if (!voter.otpCode || !voter.otpExpiresAt || voter.otpExpiresAt < new Date()) {
    throw new HttpError("VALIDATION", "Code expired. Request a new one.", 400);
  }

  const submitted = sha256(input.code + SVE_SECRETS.voterPepper);
  if (!timingSafeEqualHex(submitted, voter.otpCode)) {
    const attempts = voter.failedOtpAttempts + 1;
    const lock = attempts >= MAX_OTP_ATTEMPTS;
    await db.voter.update({
      where: { id: voter.id },
      data: {
        failedOtpAttempts: attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MS) : null,
      },
    });
    if (lock) throw new HttpError("LOCKED", "Too many failed attempts. Locked for 15 minutes.", 423);
    throw new HttpError("UNAUTHORIZED", "Invalid code", 401);
  }

  // success — issue session
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  await db.voter.update({
    where: { id: voter.id },
    data: {
      sessionToken: token,
      sessionExpiresAt: expiresAt,
      sessionDeviceId: input.deviceFingerprint ?? null,
      otpCode: null,
      otpExpiresAt: null,
      failedOtpAttempts: 0,
      lockedUntil: null,
    },
  });
  await db.voterSession.create({
    data: {
      voterId: voter.id,
      electionId: input.electionId,
      token,
      deviceFingerprint: input.deviceFingerprint ?? null,
      ipAddress: ip,
      expiresAt,
    },
  });
  await audit({
    organizationId: org.id,
    actorId: voter.id,
    actorRole: "VOTER",
    actorName: voter.fullName,
    action: "VOTER_AUTHENTICATED",
    details: { identifier: voter.identifier },
    ipAddress: ip,
  });

  return ok({
    token,
    expiresAt: expiresAt.toISOString(),
    voter: {
      id: voter.id,
      fullName: voter.fullName,
      identifier: voter.identifier,
      hasVoted: voter.hasVoted,
    },
  });
});
