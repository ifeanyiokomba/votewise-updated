import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import { SVE_SECRETS, VOTE_KEY_ID } from "@/lib/secrets";

/* ============================================================
   SVE cryptography primitives
   - AES-256-GCM for vote encryption (auth tag, no padding oracle)
   - HMAC-SHA256 for signatures (ballot, certification)
   - SHA-256 for hashing (voterHash, rulesHash, auditHash)
   - timingSafeEqual for all comparisons
   ============================================================ */

const enc = new TextEncoder();
const dec = new TextDecoder();

function key32(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

const VOTE_KEY = key32(SVE_SECRETS.voteEncKey);
const HMAC_KEY = key32(SVE_SECRETS.hmacSecret);

/* ---- AES-256-GCM ---- */
export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  keyId: string;
}

export function encryptChoice(plain: object): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", VOTE_KEY, iv);
  const data = enc.encode(JSON.stringify(plain));
  const encBuf = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([encBuf, tag]);
  return { ciphertext: packed.toString("base64"), iv: iv.toString("base64"), keyId: VOTE_KEY_ID };
}

export function decryptChoice(payload: EncryptedPayload): object {
  const buf = Buffer.from(payload.ciphertext, "base64");
  const tag = buf.subarray(buf.length - 16);
  const encBuf = buf.subarray(0, buf.length - 16);
  const iv = Buffer.from(payload.iv, "base64");
  const decipher = createDecipheriv("aes-256-gcm", VOTE_KEY, iv);
  decipher.setAuthTag(tag);
  const data = Buffer.concat([decipher.update(encBuf), decipher.final()]);
  return JSON.parse(dec.decode(data));
}

/* ---- HMAC-SHA256 ---- */
export function hmacSign(message: string): string {
  return createHmac("sha256", HMAC_KEY).update(message, "utf8").digest("hex");
}

export function hmacVerify(message: string, signature: string): boolean {
  const expected = hmacSign(message);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ---- SHA-256 ---- */
export function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/* ---- voterHash (per-election, one-way) ---- */
export function voterHash(voterId: string, electionId: string): string {
  return sha256([voterId, electionId, SVE_SECRETS.voterPepper].join("|"));
}

export function idempotencyKey(voterId: string, electionId: string, positionId: string): string {
  return sha256([voterId, electionId, positionId].join("|"));
}

export function generateReceiptCode(): string {
  const year = new Date().getFullYear();
  const rand = randomBytes(4).toString("base64url").replace(/[-_]/g, "").toUpperCase().slice(0, 8);
  return `VW-${year}-${rand}`;
}

/* ---- seeded shuffle (Fisher-Yates via xorshift32 seeded with FNV-1a) ---- */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function generateToken(len = 32): string {
  return randomBytes(len).toString("hex");
}

export function generateOtp(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

/** Timing-safe comparison for hex strings of equal length. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
