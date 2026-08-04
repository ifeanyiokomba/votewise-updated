import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pre-configured election templates — generalized for any organization type
const TEMPLATES = {
  executive: {
    name: "Executive Committee Election",
    description: "Standard election with President/Chairman, Vice, Secretary, and Treasurer positions.",
    category: "ORGANIZATION",
    positions: [
      { title: "President", description: "Head of the organization", maxVotes: 1, candidates: 3 },
      { title: "Vice President", description: "Deputy head of the organization", maxVotes: 1, candidates: 3 },
      { title: "Secretary General", description: "Records and communicates decisions", maxVotes: 1, candidates: 2 },
      { title: "Treasurer", description: "Manages finances", maxVotes: 1, candidates: 2 },
    ],
  },
  board: {
    name: "Board of Directors Election",
    description: "Corporate board election with Chairman, Secretary, and Member positions.",
    category: "COMPANY",
    positions: [
      { title: "Chairman", description: "Leads the board of directors", maxVotes: 1, candidates: 2 },
      { title: "Board Secretary", description: "Maintains board records", maxVotes: 1, candidates: 2 },
      { title: "Board Member", description: "Member of the board of directors", maxVotes: 3, candidates: 5 },
    ],
  },
  agm: {
    name: "Annual General Meeting Election",
    description: "Cooperative/association AGM with Chairman, Vice, Secretary, and PRO.",
    category: "COOPERATIVE",
    positions: [
      { title: "Chairman", description: "Presides over meetings", maxVotes: 1, candidates: 3 },
      { title: "Vice Chairman", description: "Assists the chairman", maxVotes: 1, candidates: 3 },
      { title: "Secretary", description: "Records meeting minutes", maxVotes: 1, candidates: 2 },
      { title: "Public Relations Officer", description: "Manages external communications", maxVotes: 1, candidates: 2 },
    ],
  },
  single: {
    name: "Single-Position Election",
    description: "Single-position election for a representative or officer.",
    category: "ORGANIZATION",
    positions: [
      { title: "Representative", description: "Elected representative", maxVotes: 1, candidates: 4 },
    ],
  },
  council: {
    name: "Council Leadership Election",
    description: "Leadership election with Chairman, Secretary, and Treasurer.",
    category: "ORGANIZATION",
    positions: [
      { title: "Chairman", description: "Leader of the council", maxVotes: 1, candidates: 2 },
      { title: "Secretary", description: "Manages records", maxVotes: 1, candidates: 2 },
      { title: "Treasurer", description: "Manages finances", maxVotes: 1, candidates: 2 },
    ],
  },
} as const;

export const GET = api(async (req) => {
  const member = await requireOfficial();
  return ok({
    templates: Object.entries(TEMPLATES).map(([key, t]) => ({
      key,
      name: t.name,
      description: t.description,
      category: t.category,
      positionsCount: t.positions.length,
      positions: t.positions.map((p) => ({ title: p.title, maxVotes: p.maxVotes, candidateSlots: p.candidates })),
    })),
  });
});

const createSchema = z.object({
  templateKey: z.enum(["executive", "board", "agm", "single", "council"]),
  electionName: z.string().min(3).max(120).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

export const POST = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  const input = await parseBody(req, createSchema);
  const template = TEMPLATES[input.templateKey];
  if (!template) throw new HttpError("VALIDATION", "Invalid template", 400);

  const startTime = input.startTime ? new Date(input.startTime) : new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const endTime = input.endTime ? new Date(input.endTime) : new Date(startTime.getTime() + 6 * 60 * 60_000);
  if (endTime <= startTime) throw new HttpError("VALIDATION", "End time must be after start time", 400);

  const election = await db.$transaction(async (tx) => {
    const e = await tx.election.create({
      data: {
        organizationId: member.organizationId,
        name: input.electionName ?? template.name,
        description: template.description,
        status: "DRAFT",
        visibility: "PUBLIC",
        startTime,
        endTime,
        showLiveResults: true,
        hideResultsUntilEnd: false,
        requireAccreditation: false,
        notaEnabled: true,
        ballotRandomization: true,
      },
    });

    for (let i = 0; i < template.positions.length; i++) {
      const pos = template.positions[i]!;
      const newPos = await tx.position.create({
        data: {
          electionId: e.id,
          title: pos.title,
          description: pos.description,
          maxVotes: pos.maxVotes,
          displayOrder: i,
        },
      });
      // Create placeholder candidate slots
      for (let j = 0; j < pos.candidates; j++) {
        await tx.candidate.create({
          data: {
            positionId: newPos.id,
            name: `Candidate ${j + 1}`,
            status: "APPROVED",
            screeningStatus: "APPROVED",
            displayOrder: j,
          },
        });
      }
    }

    await tx.electionEvent.create({
      data: {
        electionId: e.id,
        eventType: "CREATED",
        actorId: member.id,
        actorName: member.name,
        details: JSON.stringify({ template: input.templateKey, templateName: template.name }),
      },
    });

    return e;
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "ELECTION_CREATED_FROM_TEMPLATE", resource: "election", resourceId: election.id,
    details: { template: input.templateKey, name: election.name },
  });

  return ok({ election: { id: election.id, name: election.name, status: election.status } });
});
