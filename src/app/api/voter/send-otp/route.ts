import { db } from "@/lib/db";
import { resolveOrgBySubdomain } from "@/lib/org-context";
import { api, parseBody, ok, getClientIp } from "@/lib/api";
import { schemas, fail, ERR } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { RATE_LIMITS } from "@/lib/ratelimit";
import { sha256, generateOtp } from "@/lib/sve/crypto";
import { SVE_SECRETS, isProduction } from "@/lib/secrets";
import { deliverOtp, type DeliveryChannel } from "@/lib/notifications";
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

  // Determine delivery channel and destination
  const channel: DeliveryChannel = voter.email ? "EMAIL" : voter.phone ? "SMS" : "EMAIL";
  const destination = voter.email ?? voter.phone ?? "";

  // Deliver OTP via real provider (Resend/Termii) in production, console.log in dev
  const result = await deliverOtp({
    channel,
    to: destination,
    code,
    orgName: org.name,
  });

  if (!result.success) {
    console.error(`[VoteWise] OTP delivery failed for ${destination}: ${result.error}`);
    // Don't expose the error to the client — just return a generic message
    return ok({ sent: false, channel, devOtp: null });
  }

  // In dev mode, deliverOtp returns the code for testing
  const devOtp = !isProduction() ? code : null;

  return ok({ sent: true, channel, devOtp });
});
