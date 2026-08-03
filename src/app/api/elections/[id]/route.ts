import { db } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const election = await db.election.findUnique({
    where: { id },
    select: {
      id: true, name: true, description: true, status: true, visibility: true,
      startTime: true, endTime: true, organizationId: true,
      organization: { select: { name: true, subdomain: true } },
    },
  });
  if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);

  const positions = await db.position.findMany({
    where: { electionId: election.id },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true, title: true, description: true, maxVotes: true,
      candidates: {
        where: { status: "APPROVED" },
        orderBy: { displayOrder: "asc" },
        select: { id: true, name: true, bio: true, slogan: true, photoUrl: true },
      },
    },
  });

  return ok({ election, positions });
});
