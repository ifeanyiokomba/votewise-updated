import { db } from "@/lib/db";
import { requireVoter } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { schemas } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { buildBallot, toBallotView } from "@/lib/sve/ballot";
import { canAcceptVotes } from "@/lib/sve/vote-recorder";

export const dynamic = "force-dynamic";

export const POST = api(async (req) => {
  const voter = await requireVoter(req);
  const input = await parseBody(req, schemas.buildBallot);
  const election = await db.election.findUnique({ where: { id: input.electionId } });
  if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);

  // verify voter is eligible
  const elig = await db.voterEligibility.findUnique({
    where: { electionId_voterId: { electionId: election.id, voterId: voter.id } },
  });
  if (!elig) throw new HttpError("FORBIDDEN", "You are not eligible for this election", 403);
  if (election.requireAccreditation && !elig.accredited) {
    throw new HttpError("FORBIDDEN", "Accreditation required", 403);
  }
  if (voter.hasVoted) throw new HttpError("DUPLICATE_VOTE", "You have already voted", 409);

  if (!canAcceptVotes(election)) {
    throw new HttpError("ELECTION_NOT_LIVE", "Election is not currently accepting votes", 409);
  }

  const ballot = await buildBallot(election, voter);
  return ok({ ballot: toBallotView(ballot) });
});
