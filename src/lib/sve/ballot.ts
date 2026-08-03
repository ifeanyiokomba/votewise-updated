import { db } from "@/lib/db";
import { SVE_SECRETS } from "@/lib/secrets";
import { hmacSign, sha256, voterHash, seededShuffle } from "@/lib/sve/crypto";
import { HttpError } from "@/lib/guards";
import type { Ballot, Election, Position, Candidate, Voter } from "@prisma/client";

const BALLOT_TTL_MIN = 30;

interface BallotContent {
  electionId: string;
  positions: Array<{
    id: string;
    title: string;
    description: string | null;
    maxVotes: number;
    candidates: Array<{ id: string; name: string; slogan: string | null }>;
  }>;
  rules: {
    notaEnabled: boolean;
    ballotRandomization: boolean;
    requireAccreditation: boolean;
    maxVotes: Record<string, number>;
  };
}

function buildContent(
  election: Election,
  positions: (Position & { candidates: Candidate[] })[]
): BallotContent {
  return {
    electionId: election.id,
    positions: positions.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      maxVotes: p.maxVotes,
      candidates: p.candidates
        .filter((c) => c.status === "APPROVED")
        .map((c) => ({ id: c.id, name: c.name, slogan: c.slogan })),
    })),
    rules: {
      notaEnabled: election.notaEnabled,
      ballotRandomization: election.ballotRandomization,
      requireAccreditation: election.requireAccreditation,
      maxVotes: Object.fromEntries(positions.map((p) => [p.id, p.maxVotes])),
    },
  };
}

export async function buildBallot(
  election: Election,
  voter: Voter
): Promise<Ballot> {
  // load positions + approved candidates
  const positions = await db.position.findMany({
    where: { electionId: election.id },
    orderBy: { displayOrder: "asc" },
    include: { candidates: { where: { status: "APPROVED" }, orderBy: { displayOrder: "asc" } } },
  });

  if (positions.length === 0) {
    throw new HttpError("VALIDATION", "Election has no positions configured", 400);
  }

  // optional randomization, seeded per voter+position (deterministic per voter)
  const vh = voterHash(voter.id, election.id);
  const finalPositions = election.ballotRandomization
    ? positions.map((p) => ({
        ...p,
        candidates: seededShuffle(p.candidates, `${vh}|${p.id}`),
      }))
    : positions;

  const content = buildContent(election, finalPositions);
  const contentJson = JSON.stringify(content);
  const rulesHash = sha256(
    JSON.stringify({
      nota: election.notaEnabled,
      rand: election.ballotRandomization,
      acc: election.requireAccreditation,
      positions: positions.map((p) => ({ id: p.id, mv: p.maxVotes, c: p.candidates.map((c) => c.id).sort() })),
    })
  );
  const generatedAt = new Date().toISOString();
  const integrityToken = sha256([contentJson, vh, generatedAt, SVE_SECRETS.ballotPepper].join("|"));
  const digitalSignature = hmacSign("ballot:" + integrityToken);

  const expiresAt = new Date(Date.now() + BALLOT_TTL_MIN * 60_000);

  return db.ballot.create({
    data: {
      electionId: election.id,
      voterId: voter.id,
      content: contentJson,
      rulesHash,
      integrityToken,
      digitalSignature,
      status: "GENERATED",
      expiresAt,
    },
  });
}

export interface BallotView {
  id: string;
  expiresAt: Date;
  positions: Array<{
    id: string;
    title: string;
    description: string | null;
    maxVotes: number;
    candidates: Array<{ id: string; name: string; slogan: string | null }>;
    allowNota: boolean;
  }>;
}

export function toBallotView(ballot: Ballot): BallotView {
  const content = JSON.parse(ballot.content) as BallotContent;
  return {
    id: ballot.id,
    expiresAt: ballot.expiresAt,
    positions: content.positions.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      maxVotes: p.maxVotes,
      candidates: p.candidates,
      allowNota: content.rules.notaEnabled,
    })),
  };
}
