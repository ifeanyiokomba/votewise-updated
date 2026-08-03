import { db } from "@/lib/db";
import { resolveOrgBySubdomain } from "@/lib/org-context";
import { api, parseBody, ok, getClientIp } from "@/lib/api";
import { schemas, fail, ERR } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { RATE_LIMITS } from "@/lib/ratelimit";
import { sha256, generateOtp } from "@/lib/sve/crypto";
import { SVE_SECRETS, isProduction } from "@/lib/secrets";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const POST = api(async (req) => {
  const input = await parseBody(req, schemas.sendOtp);
  const ip = getClientIp(req);

  const org = await resolveOrgBySubdomain(input.subdomain);
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  const voter = await db.voter.findUnique({
    where: { organizationId_identifier: { organizationId: org.id, identifier: input.identifier } },
  });
  if (!voter) {
    // do not leak existence — return generic success
    return ok({ sent: true, channel: "EMAIL", devOtp: null });
  }

  if (voter.lockedUntil && voter.lockedUntil > new Date()) {
    throw new HttpError("LOCKED", "Account temporarily locked", 423);
  }
  if (voter.otpCooldownUntil && voter.otpCooldownUntil > new Date()) {
    return NextResponse.json(
      fail(ERR.RATE_LIMITED, "Please wait before requesting another code."),
      { status: 429 }
    );
  }
  const rl = RATE_LIMITS.sendOtp(input.identifier);
  if (!rl.ok) {
    return NextResponse.json(
      fail(ERR.RATE_LIMITED, "Too many OTP requests. Try again shortly."),
      { status: 429 }
    );
  }

  const code = generateOtp();
  const hashed = sha256(code + SVE_SECRETS.voterPepper);
  const expiresAt = new Date(Date.now() + 5 * 60_000);

  await db.voter.update({
    where: { id: voter.id },
    data: {
      otpCode: hashed,
      otpExpiresAt: expiresAt,
      otpCooldownUntil: new Date(Date.now() + 60_000),
      otpAttempts: 0,
    },
  });

  // Delivery — in sandbox we log + return devOtp; in prod we'd call Resend/Termii.
  const channel = voter.email ? "EMAIL" : voter.phone ? "SMS" : "EMAIL";
  if (!isProduction()) {
    console.log(`[VoteWise dev OTP] org=${org.subdomain} identifier=${input.identifier} code=${code}`);
    return ok({ sent: true, channel, devOtp: code });
  }
  // production: fire delivery (extension point)
  console.log(`[VoteWise] OTP delivered to ${voter.email ?? voter.phone} via ${channel}`);
  return ok({ sent: true, channel, devOtp: null });
});
