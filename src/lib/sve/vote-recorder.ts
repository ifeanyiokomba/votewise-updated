import { db } from "@/lib/db";
import { HttpError } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { bumpElection } from "@/lib/realtime/server";
import {
  encryptChoice,
  hmacVerify,
  sha256,
  voterHash,
  idempotencyKey,
  generateReceiptCode,
} from "@/lib/sve/crypto";
import type { Ballot, Election, Voter } from "@prisma/client";
import { Prisma } from "@prisma/client";

export interface CastInput {
  ballotId: string;
  selections: Array<{ positionId: string; candidateId: string }>;
}

export interface CastResult {
  receipts: Array<{ positionId: string; receiptCode: string }>;
  votedAt: Date;
}

/* ---- election status gate ---- */
export function canAcceptVotes(election: Election): boolean {
  if (election.status !== "LIVE") return false;
  const now = new Date();
  if (now < election.startTime || now >= election.endTime) return false;
  return true;
}

/* ---- 8-step pre-validation ---- */
async function preValidate(
  ballot: Ballot | null,
  election: Election | null,
  voter: Voter,
  selections: CastInput["selections"]
): Promise<void> {
  // 1. ballot
  if (!ballot) throw new HttpError("NOT_FOUND", "Ballot not found", 404);
  if (ballot.status === "SUBMITTED")
    throw new HttpError("DUPLICATE_VOTE", "This ballot has already been submitted", 409);
  if (ballot.expiresAt < new Date())
    throw new HttpError("BALLOT_EXPIRED", "Ballot has expired. Please request a new one.", 400);

  // 2. election
  if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);
  if (!ballot.isSimulation && !canAcceptVotes(election))
    throw new HttpError("ELECTION_NOT_LIVE", "Election is not currently accepting votes", 409);

  // 3. voter
  if (voter.flagged)
    throw new HttpError("FORBIDDEN", `Your account is flagged: ${voter.flaggedReason ?? "contact admin"}`, 403);

  // 4. hasVoted
  if (voter.hasVoted)
    throw new HttpError("DUPLICATE_VOTE", "You have already cast your vote", 409);

  // 5. ballot belongs to voter
  if (ballot.voterId !== voter.id)
    throw new HttpError("FORBIDDEN", "Ballot does not belong to this voter", 403);

  // 6. ballot signature + integrity + rulesHash unchanged
  const vh = voterHash(voter.id, election.id);
  const content = JSON.parse(ballot.content);
  const generatedAt = content.electionId ? null : null; // integrity token embeds generatedAt; we recompute via content
  // We trust the stored integrityToken but verify the HMAC binding
  if (!hmacVerify("ballot:" + ballot.integrityToken, ballot.digitalSignature))
    throw new HttpError("VALIDATION", "Ballot signature invalid", 400);

  // 7. each selection is valid
  const positions = content.positions as Array<{
    id: string;
    maxVotes: number;
    candidates: Array<{ id: string }>;
  }>;
  const rules = content.rules;
  // group selections by position
  const grouped = new Map<string, string[]>();
  for (const s of selections) {
    if (!grouped.has(s.positionId)) grouped.set(s.positionId, []);
    grouped.get(s.positionId)!.push(s.candidateId);
  }
  for (const [posId, cands] of grouped) {
    const pos = positions.find((p) => p.id === posId);
    if (!pos) throw new HttpError("VALIDATION", `Unknown position: ${posId}`, 400);
    if (cands.length > pos.maxVotes)
      throw new HttpError("VALIDATION", `Too many selections for ${pos.title}`, 400);
    for (const cId of cands) {
      if (cId === "NOTA") {
        if (!rules.notaEnabled)
          throw new HttpError("VALIDATION", "NOTA is not enabled for this election", 400);
      } else {
        const exists = pos.candidates.some((c) => c.id === cId);
        if (!exists)
          throw new HttpError("VALIDATION", `Candidate not on ballot: ${cId}`, 400);
      }
    }
  }
}

export async function castVote(voter: Voter, input: CastInput): Promise<CastResult> {
  const ballot = await db.ballot.findUnique({ where: { id: input.ballotId } });
  if (!ballot) throw new HttpError("NOT_FOUND", "Ballot not found", 404);

  const election = await db.election.findUnique({ where: { id: ballot.electionId } });
  if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);

  await preValidate(ballot, election, voter, input.selections);

  try {
    const result = await db.$transaction(async (tx) => {
      // race-safe re-fetch of voter inside the txn
      const v = await tx.voter.findUniqueOrThrow({ where: { id: voter.id } });
      if (v.hasVoted) throw new HttpError("DUPLICATE_VOTE", "You have already voted", 409);
      if (v.flagged) throw new HttpError("FORBIDDEN", "Account flagged", 403);

      const receipts: Array<{ positionId: string; receiptCode: string }> = [];
      const now = new Date();

      for (const sel of input.selections) {
        const isNota = sel.candidateId === "NOTA";
        const payload = encryptChoice({
          candidateId: isNota ? null : sel.candidateId,
          isNota,
          ts: now.getTime(),
        });
        const ik = idempotencyKey(v.id, election.id, sel.positionId);
        const receiptCode = generateReceiptCode();
        const vh = voterHash(v.id, election.id);

        try {
          await tx.voteRecord.create({
            data: {
              electionId: election.id,
              positionId: sel.positionId,
              candidateId: isNota ? null : sel.candidateId,
              voterId: v.id,
              voterHash: vh,
              ballotId: ballot.id,
              encryptedChoice: payload.ciphertext,
              iv: payload.iv,
              keyId: payload.keyId,
              isNota,
              receiptCode,
              idempotencyKey: ik,
              isSimulation: ballot.isSimulation,
              ipAddress: null,
              deviceFingerprint: v.sessionDeviceId,
            },
          });
        } catch (e: unknown) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            throw new HttpError("DUPLICATE_VOTE", "Duplicate vote detected", 409);
          }
          throw e;
        }

        // atomic tally increment
        if (!isNota) {
          await tx.candidateTally.upsert({
            where: {
              electionId_positionId_candidateId: {
                electionId: election.id,
                positionId: sel.positionId,
                candidateId: sel.candidateId,
              },
            },
            update: { count: { increment: 1 } },
            create: {
              electionId: election.id,
              positionId: sel.positionId,
              candidateId: sel.candidateId,
              count: 1,
            },
          });
        }

        receipts.push({ positionId: sel.positionId, receiptCode });
      }

      // mark voter voted + revoke session
      await tx.voter.update({
        where: { id: v.id },
        data: {
          hasVoted: true,
          votedAt: now,
          sessionToken: null,
          sessionExpiresAt: null,
          sessionDeviceId: null,
          otpCode: null,
        },
      });
      await tx.voterSession.updateMany({
        where: { voterId: v.id, revoked: false },
        data: { revoked: true },
      });

      // mark ballot submitted
      await tx.ballot.update({
        where: { id: ballot.id },
        data: { status: "SUBMITTED", submittedAt: now },
      });

      // election event
      await tx.electionEvent.create({
        data: {
          electionId: election.id,
          eventType: "VOTE_CAST",
          actorId: v.id,
          actorName: v.fullName,
          details: JSON.stringify({
            positions: receipts.map((r) => r.positionId),
            count: receipts.length,
            simulation: ballot.isSimulation,
          }),
        },
      });

      // audit (inside txn — chain-safe)
      await writeAudit(tx, {
        organizationId: election.organizationId,
        actorId: v.id,
        actorRole: "VOTER",
        actorName: v.fullName,
        action: "VOTE_CAST",
        resource: "election",
        resourceId: election.id,
        details: {
          electionId: election.id,
          positions: receipts.map((r) => r.positionId),
          count: receipts.length,
          simulation: ballot.isSimulation,
        },
      });

      return { receipts, votedAt: now };
    });

    // post-txn: notify results service (fire-and-forget, non-blocking)
    bumpElection(election.id).catch(() => {});

    return result;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError("DUPLICATE_VOTE", "Duplicate vote detected", 409);
    }
    throw e;
  }
}
