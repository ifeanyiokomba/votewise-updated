import { db } from "@/lib/db";
import { api, parseBody, ok } from "@/lib/api";
import { getScopedElection } from "@/lib/election-access";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election } = await getScopedElection(id);
  const incidents = await db.electionIncident.findMany({
    where: { electionId: election.id },
    orderBy: { createdAt: "desc" },
  });
  return ok({ incidents });
});

const incidentSchema = z.object({
  type: z.enum(["VOTER_INTIMIDATION", "SYSTEM_MALFUNCTION", "IRREGULARITY", "DISPUTE", "TECHNICAL_ISSUE", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  location: z.string().max(200).optional(),
});

export const POST = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election, memberId, memberRole, memberName, organizationId } = await getScopedElection(id);
  const input = await parseBody(req, incidentSchema);
  const incident = await db.electionIncident.create({
    data: {
      electionId: election.id,
      organizationId,
      reporterId: memberId,
      reporterName: memberName,
      reporterRole: memberRole,
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description,
      location: input.location,
    },
  });
  await audit({
    organizationId, actorId: memberId, actorRole: memberRole, actorName: memberName,
    action: "INCIDENT_REPORTED", resource: "incident", resourceId: incident.id,
    details: { electionId: election.id, type: input.type, severity: input.severity },
  });
  return ok({ incident });
});
