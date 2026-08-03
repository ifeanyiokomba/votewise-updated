import { db } from "@/lib/db";
import { api, parseBody, ok } from "@/lib/api";
import { getScopedElection, assertManage } from "@/lib/election-access";
import { schemas } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { certifyElection } from "@/lib/sve/tally";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

function nowInRange(election: { startTime: Date; endTime: Date; status: string }): boolean {
  const n = new Date();
  return n >= election.startTime && n < election.endTime;
}

export const POST = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election, memberId, memberRole, memberName, organizationId } = await getScopedElection(id);
  assertManage(memberRole);
  const input = await parseBody(req, schemas.lifecycle);

  let newStatus = election.status;
  const events: string[] = [];

  switch (input.action) {
    case "schedule": {
      if (election.status !== "DRAFT") throw new HttpError("CONFLICT", "Only DRAFT elections can be scheduled", 409);
      newStatus = "SCHEDULED";
      events.push("PUBLISHED");
      break;
    }
    case "open": {
      if (election.status !== "SCHEDULED" && election.status !== "PAUSED") {
        throw new HttpError("CONFLICT", "Election must be SCHEDULED or PAUSED to open", 409);
      }
      newStatus = "LIVE";
      events.push("VOTING_OPENED");
      break;
    }
    case "pause": {
      if (election.status !== "LIVE") throw new HttpError("CONFLICT", "Only LIVE elections can be paused", 409);
      newStatus = "PAUSED";
      events.push("PAUSED");
      break;
    }
    case "resume": {
      if (election.status !== "PAUSED") throw new HttpError("CONFLICT", "Only PAUSED elections can resume", 409);
      newStatus = "LIVE";
      events.push("VOTING_OPENED");
      break;
    }
    case "close": {
      if (election.status !== "LIVE" && election.status !== "PAUSED") {
        throw new HttpError("CONFLICT", "Only LIVE/PAUSED elections can close", 409);
      }
      newStatus = "CLOSED";
      events.push("VOTING_CLOSED");
      break;
    }
    case "cancel": {
      if (election.status === "CERTIFIED" || election.status === "ARCHIVED") {
        throw new HttpError("CONFLICT", "Cannot cancel a CERTIFIED/ARCHIVED election", 409);
      }
      newStatus = "CANCELLED";
      events.push("CANCELLED");
      break;
    }
    case "certify": {
      if (election.status !== "CLOSED") throw new HttpError("CONFLICT", "Only CLOSED elections can be certified", 409);
      const tally = await certifyElection(election.id, memberId, memberName);
      await audit({
        organizationId, actorId: memberId, actorRole: memberRole, actorName: memberName,
        action: "ELECTION_CERTIFIED", resource: "election", resourceId: election.id,
        details: { totalVotes: tally.totalVotes, turnoutPct: tally.turnoutPct },
      });
      return ok({ status: "CERTIFIED", tally });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.election.update({ where: { id: election.id }, data: { status: newStatus } });
    for (const ev of events) {
      await tx.electionEvent.create({
        data: { electionId: election.id, eventType: ev, actorId: memberId, actorName: memberName },
      });
    }
    await audit({
      organizationId, actorId: memberId, actorRole: memberRole, actorName: memberName,
      action: `ELECTION_${newStatus}`, resource: "election", resourceId: election.id,
      details: { action: input.action, from: election.status, to: newStatus },
    });
  });

  return ok({ status: newStatus });
});
