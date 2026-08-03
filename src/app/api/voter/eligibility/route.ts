import { db } from "@/lib/db";
import { resolveOrgBySubdomain } from "@/lib/org-context";
import { api, parseBody, ok } from "@/lib/api";
import { schemas } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { z } from "zod";

export const dynamic = "force-dynamic";

const eligibilitySchema = z.object({
  subdomain: z.string().min(1),
  identifier: z.string().min(1).max(80),
});

export const POST = api(async (req) => {
  const input = await parseBody(req, eligibilitySchema);
  const org = await resolveOrgBySubdomain(input.subdomain);
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  const voter = await db.voter.findUnique({
    where: { organizationId_identifier: { organizationId: org.id, identifier: input.identifier } },
    select: { id: true, fullName: true, hasVoted: true, flagged: true },
  });

  if (!voter) {
    return ok({ eligible: false, reason: "NOT_REGISTERED" });
  }
  if (voter.flagged) {
    return ok({ eligible: false, reason: "FLAGGED", fullName: voter.fullName });
  }

  // find any upcoming/active elections for this org
  const elections = await db.election.findMany({
    where: {
      organizationId: org.id,
      status: { in: ["SCHEDULED", "LIVE", "CLOSED"] },
    },
    select: { id: true, name: true, status: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  const eligibleElections = [];
  for (const e of elections) {
    const elig = await db.voterEligibility.findUnique({
      where: { electionId_voterId: { electionId: e.id, voterId: voter.id } },
    });
    if (elig) {
      eligibleElections.push({
        ...e,
        accredited: elig.accredited,
        alreadyVoted: voter.hasVoted,
      });
    }
  }

  return ok({
    eligible: true,
    fullName: voter.fullName,
    alreadyVoted: voter.hasVoted,
    elections: eligibleElections,
  });
});
