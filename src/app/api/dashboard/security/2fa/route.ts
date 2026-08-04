import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { SVE_SECRETS } from "@/lib/secrets";
import { createHash, timingSafeEqual, createHmac } from "crypto";
import { Buffer } from "buffer";
import { z } from "zod";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/** Generate a TOTP secret (base32) + OTPAuth URL */
function generateTotpSecret(email: string): { secret: string; otpauthUrl: string } {
  // Generate 20 random bytes, encode as base32
  const bytes = Buffer.alloc(20);
  for (let i = 0; i < 20; i++) bytes[i] = Math.floor(Math.random() * 256);
  const base32 = bytes.toString("base64").replace(/=/g, "").replace(/\+/g, "").replace(/\//g, "").toUpperCase().slice(0, 32);
  const label = encodeURIComponent(`VoteWise:${email}`);
  const issuer = encodeURIComponent("VoteWise");
  const otpauthUrl = `otpauth://totp/${label}?secret=${base32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return { secret: base32, otpauthUrl };
}

/** Generate current TOTP code (RFC 6238) */
function generateTotp(secret: string, timeStep?: number): string {
  const counter = Math.floor((timeStep ?? Math.floor(Date.now() / 1000)) / 30);
  const counterBuffer = Buffer.alloc(8);
  // Write counter as 64-bit big-endian (high 32 bits + low 32 bits)
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  // Decode base32 secret to buffer
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret) {
    const val = base32Chars.indexOf(char.toUpperCase());
    if (val >= 0) bits += val.toString(2).padStart(5, "0");
  }
  const keyBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    if (i + 8 <= bits.length) keyBytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  const keyBuffer = Buffer.from(keyBytes);

  // HMAC-SHA1
  const hmac = createHmac("sha1", keyBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 1000000;
  return code.toString().padStart(6, "0");
}

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const fullMember = await db.organizationMember.findUnique({ where: { id: member.id } });
  if (!fullMember) throw new HttpError("NOT_FOUND", "Member not found", 404);

  return ok({
    totpEnabled: fullMember.totpEnabled,
    hasSecret: !!fullMember.totpSecret,
  });
});

/** Step 1: Generate a new TOTP secret and return it + the QR code URL */
export const POST = api(async (req) => {
  const member = await requireOfficial();
  const { secret, otpauthUrl } = generateTotpSecret(member.email);

  // Store the secret temporarily (not enabled yet — user must verify a code first)
  await db.organizationMember.update({
    where: { id: member.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  // Generate QR code locally (no external API dependency)
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#163D2E", light: "#ffffff" },
  });

  return ok({
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  });
});

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "6-digit code"),
});

/** Step 2: Verify a TOTP code to enable 2FA */
export const PATCH = api(async (req) => {
  const member = await requireOfficial();
  const input = await verifySchema.parse(await req.json().catch(() => ({})));
  const fullMember = await db.organizationMember.findUnique({ where: { id: member.id } });
  if (!fullMember?.totpSecret) throw new HttpError("VALIDATION", "No TOTP secret set up. Generate one first.", 400);

  // Generate expected code (allow ±1 window for clock drift)
  const now = Math.floor(Date.now() / 1000);
  const validCodes = [generateTotp(fullMember.totpSecret, now), generateTotp(fullMember.totpSecret, now - 30), generateTotp(fullMember.totpSecret, now + 30)];
  const isValid = validCodes.some((c) => {
    const a = Buffer.from(c, "utf8");
    const b = Buffer.from(input.code, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  });

  if (!isValid) throw new HttpError("UNAUTHORIZED", "Invalid code. Try again.", 401);

  await db.organizationMember.update({
    where: { id: member.id },
    data: { totpEnabled: true },
  });

  return ok({ enabled: true });
});

/** DELETE: Disable 2FA */
export const DELETE = api(async (req) => {
  const member = await requireOfficial();
  await db.organizationMember.update({
    where: { id: member.id },
    data: { totpSecret: null, totpEnabled: false },
  });
  return ok({ disabled: true });
});
