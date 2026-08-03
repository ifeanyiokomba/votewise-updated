import { SignJWT, jwtVerify } from "jose";
import { scrypt as _scrypt, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SVE_SECRETS } from "@/lib/secrets";
import type { OrganizationMember } from "@prisma/client";

const scrypt = (password: string, salt: string, keylen: number, options: { N: number; r: number; p: number }) =>
  new Promise<Buffer>((resolve, reject) => {
    _scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

const ACCESS_TTL = 15 * 60; // 15 min
const REFRESH_TTL_DAYS = 7;

const enc = new TextEncoder();
const ACCESS_SECRET = enc.encode(SVE_SECRETS.jwtAccessSecret);

/* ---- password hashing (scrypt, memory-hard) ---- */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${buf.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4]!;
  const hash = parts[5]!;
  const buf = await scrypt(password, salt, KEYLEN, { N, r, p });
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(buf);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ---- JWT ---- */
export interface AccessClaims {
  sub: string;
  memberId: string;
  organizationId: string;
  role: string;
  email: string;
  name: string;
}

export async function issueAccessToken(member: OrganizationMember): Promise<string> {
  return new SignJWT({
    memberId: member.id,
    organizationId: member.organizationId,
    role: member.role,
    email: member.email,
    name: member.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(member.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(ACCESS_SECRET);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as AccessClaims;
  } catch {
    return null;
  }
}

/* ---- cookies ---- */
const ACCESS_COOKIE = "vw_access";
const REFRESH_COOKIE = "vw_refresh";

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const c = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  c.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL,
  });
  c.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_DAYS * 86400,
  });
}

export async function clearAuthCookies() {
  const c = await cookies();
  c.delete(ACCESS_COOKIE);
  c.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(ACCESS_COOKIE)?.value;
}

export function issueRefreshToken(): string {
  return randomBytes(30).toString("hex");
}

/* ---- current member ---- */
export async function getCurrentMember(): Promise<OrganizationMember | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const claims = await verifyAccessToken(token);
  if (!claims) return null;
  return db.organizationMember.findUnique({
    where: { id: claims.memberId },
  });
}
