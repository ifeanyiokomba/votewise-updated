import { db } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { getScopedElection } from "@/lib/election-access";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election } = await getScopedElection(id);
  const events = await db.electionEvent.findMany({
    where: { electionId: election.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, eventType: true, actorName: true, actorRole: true, details: true, createdAt: true,
    },
  });
  return ok({ events });
});
