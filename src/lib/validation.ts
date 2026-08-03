import { z } from "zod";

/* ============================================================
   Shared Zod schemas — the single source of truth for every
   API boundary. Client and server import the same object, so
   validation is identical on both sides. No `any` crosses a
   network boundary.
   ============================================================ */

export const schemas = {
  /* ---- auth ---- */
  register: z.object({
    organizationName: z.string().min(2).max(80),
    subdomain: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
    category: z.enum([
      "UNIVERSITY",
      "COMPANY",
      "COOPERATIVE",
      "CHURCH",
      "NGO",
      "POLITICAL_PARTY",
      "ASSOCIATION",
      "GOVERNMENT",
    ]),
    ownerName: z.string().min(2).max(80),
    ownerEmail: z.string().email(),
    password: z.string().min(8).max(128),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(1).max(128),
    totpCode: z.string().optional(),
  }),

  /* ---- voter ---- */
  sendOtp: z.object({
    subdomain: z.string().min(1),
    identifier: z.string().min(1).max(80),
    electionId: z.string().optional(),
  }),

  verifyOtp: z.object({
    subdomain: z.string().min(1),
    identifier: z.string().min(1).max(80),
    code: z.string().regex(/^\d{6}$/, "6-digit code"),
    deviceFingerprint: z.string().optional(),
  }),

  /* ---- election ---- */
  createElection: z.object({
    name: z.string().min(3).max(120),
    description: z.string().max(2000).optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
    showLiveResults: z.boolean().default(true),
    hideResultsUntilEnd: z.boolean().default(false),
    requireAccreditation: z.boolean().default(false),
    notaEnabled: z.boolean().default(true),
    ballotRandomization: z.boolean().default(true),
  }),

  lifecycle: z.object({
    action: z.enum(["schedule", "open", "pause", "resume", "close", "cancel", "certify"]),
  }),

  /* ---- position ---- */
  createPosition: z.object({
    title: z.string().min(2).max(120),
    description: z.string().max(2000).optional(),
    maxVotes: z.number().int().min(1).max(10).default(1),
  }),

  /* ---- candidate ---- */
  createCandidate: z.object({
    name: z.string().min(2).max(120),
    bio: z.string().max(2000).optional(),
    manifesto: z.string().max(8000).optional(),
    slogan: z.string().max(120).optional(),
    photoUrl: z.string().url().optional(),
  }),

  updateCandidateStatus: z.object({
    status: z.enum(["APPROVED", "DISQUALIFIED", "WITHDRAWN"]),
  }),

  /* ---- voters import ---- */
  importVoters: z.object({
    electionId: z.string().optional(),
    voters: z
      .array(
        z.object({
          identifier: z.string().min(1).max(80),
          fullName: z.string().min(1).max(120),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().max(30).optional().or(z.literal("")),
        })
      )
      .min(1)
      .max(5000),
  }),

  /* ---- vote ---- */
  buildBallot: z.object({
    electionId: z.string().min(1),
  }),

  voteCast: z.object({
    ballotId: z.string().min(1),
    selections: z
      .array(
        z.object({
          positionId: z.string().min(1),
          candidateId: z.string().min(1), // "NOTA" allowed
        })
      )
      .min(1)
      .max(50),
  }),

  verifyReceipt: z.object({
    code: z.string().regex(/^VW-\d{4}-[A-Z0-9]{8}$/, "Invalid receipt format"),
  }),
} as const;

/* ---- inferred types (shared with the client) ---- */
export type RegisterInput = z.infer<typeof schemas.register>;
export type LoginInput = z.infer<typeof schemas.login>;
export type SendOtpInput = z.infer<typeof schemas.sendOtp>;
export type VerifyOtpInput = z.infer<typeof schemas.verifyOtp>;
export type CreateElectionInput = z.infer<typeof schemas.createElection>;
export type LifecycleInput = z.infer<typeof schemas.lifecycle>;
export type CreatePositionInput = z.infer<typeof schemas.createPosition>;
export type CreateCandidateInput = z.infer<typeof schemas.createCandidate>;
export type ImportVotersInput = z.infer<typeof schemas.importVoters>;
export type VoteCastInput = z.infer<typeof schemas.voteCast>;

/* ---- response helpers ---- */
export function ok<T>(data: T) {
  return { ok: true as const, data };
}

export function fail(code: string, message: string, fields?: Record<string, string[]>) {
  return { ok: false as const, error: { code, message, fields } };
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string[]> } };

/** Stable error codes used across the API. */
export const ERR = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  LOCKED: "LOCKED",
  ELECTION_NOT_LIVE: "ELECTION_NOT_LIVE",
  DUPLICATE_VOTE: "DUPLICATE_VOTE",
  BALLOT_EXPIRED: "BALLOT_EXPIRED",
  INTERNAL: "INTERNAL",
} as const;

export function httpStatusFor(code: string): number {
  switch (code) {
    case ERR.UNAUTHORIZED:
      return 401;
    case ERR.FORBIDDEN:
      return 403;
    case ERR.NOT_FOUND:
      return 404;
    case ERR.VALIDATION:
      return 400;
    case ERR.CONFLICT:
    case ERR.DUPLICATE_VOTE:
      return 409;
    case ERR.RATE_LIMITED:
      return 429;
    case ERR.LOCKED:
      return 423;
    case ERR.ELECTION_NOT_LIVE:
      return 409;
    case ERR.BALLOT_EXPIRED:
      return 400;
    default:
      return 500;
  }
}
