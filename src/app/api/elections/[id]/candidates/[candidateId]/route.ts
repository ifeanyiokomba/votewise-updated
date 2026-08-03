import { db } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string; candidateId: string }> }) => {
  const { id, candidateId } = await params;
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    include: {
      position: {
        select: { title: true, description: true, electionId: true, election: { select: { name: true, status: true } } },
      },
    },
  });
  if (!candidate) throw new HttpError("NOT_FOUND", "Candidate not found", 404);
  if (candidate.position.electionId !== id) throw new HttpError("NOT_FOUND", "Candidate not in this election", 404);

  return ok({
    candidate: {
      id: candidate.id,
      name: candidate.name,
      bio: candidate.bio,
      manifesto: candidate.manifesto,
      slogan: candidate.slogan,
      photoUrl: candidate.photoUrl,
      status: candidate.status,
      position: {
        title: candidate.position.title,
        description: candidate.position.description,
        electionName: candidate.position.election.name,
        electionStatus: candidate.position.election.status,
      },
    },
  });
});
