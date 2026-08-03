import { db } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { liveTally } from "@/lib/sve/tally";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const election = await db.election.findUnique({ where: { id } });
  if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);

  const now = new Date();
  const isLive = election.status === "LIVE";
  const isClosed = ["CLOSED", "CERTIFIED"].includes(election.status);

  // visibility gate
  const showResults =
    isClosed || // closed/certified always show
    (isLive && election.showLiveResults && !election.hideResultsUntilEnd);

  if (!showResults) {
    // return turnout only, no per-candidate breakdown
    const totalVotes = await db.voteRecord.count({ where: { electionId: election.id, isSimulation: false } });
    const totalEligible = await db.voterEligibility.count({ where: { electionId: election.id } });
    return ok({
      electionId: election.id,
      name: election.name,
      status: election.status,
      hidden: true,
      totalVotes,
      totalEligible,
      turnoutPct: totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0,
      positions: [],
    });
  }

  const tally = await liveTally(election.id);
  return ok({
    electionId: election.id,
    name: election.name,
    status: election.status,
    hidden: false,
    certifiedAt: election.certifiedAt,
    ...tally,
    serverTime: now.toISOString(),
  });
});
