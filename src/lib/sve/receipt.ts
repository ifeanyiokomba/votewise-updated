import { db } from "@/lib/db";
import { hmacVerify } from "@/lib/sve/crypto";

/**
 * Receipt verification — anonymity-preserving.
 * Returns ONLY: valid, receiptCode, electionName, positionTitle, recordedAt.
 * NEVER returns: candidateId, encryptedChoice, voterHash, ipAddress, deviceFingerprint.
 */
export async function verifyReceipt(code: string) {
  const vote = await db.voteRecord.findUnique({
    where: { receiptCode: code },
    select: {
      id: true,
      receiptCode: true,
      isNota: true,
      isSimulation: true,
      createdAt: true,
      positionId: true,
      electionId: true,
    },
  });

  if (!vote) {
    return { valid: false, receiptCode: code, message: "Receipt not found" };
  }

  const position = await db.position.findUnique({
    where: { id: vote.positionId },
    select: { title: true },
  });
  const election = await db.election.findUnique({
    where: { id: vote.electionId },
    select: { name: true },
  });

  return {
    valid: true,
    receiptCode: vote.receiptCode,
    electionName: election?.name ?? "Unknown election",
    positionTitle: position?.title ?? "Unknown position",
    recordedAt: vote.createdAt,
    isSimulation: vote.isSimulation,
    isNota: vote.isNota,
    message: "This receipt corresponds to a vote recorded on the VoteWise ledger.",
  };
}
