"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { initials, colorFromString } from "@/lib/utils";
import { Vote } from "lucide-react";

interface ElectionDetail {
  ok: boolean;
  data: {
    election: { id: string; name: string; description: string | null; status: string };
    positions: Array<{
      id: string; title: string; description: string | null; maxVotes: number;
      candidates: Array<{ id: string; name: string; bio: string | null; slogan: string | null; photoUrl: string | null }>;
    }>;
  };
}

export default function CandidatesPage() {
  const params = useParams<{ subdomain: string }>();
  const sp = useSearchParams();
  const electionId = sp.get("election");

  const { data, isLoading } = useQuery<ElectionDetail>({
    queryKey: ["election", electionId],
    queryFn: async () => {
      const res = await fetch(`/api/elections/${electionId}`);
      return res.json();
    },
    enabled: !!electionId,
  });

  if (!electionId) {
    return (
      <div className="vw-section py-20">
        <EmptyState title="Select an election" description="Choose an election from the portal to view its candidates." />
      </div>
    );
  }
  if (isLoading) return <PageLoader label="Loading candidates" />;
  if (!data?.ok)
    return (
      <div className="vw-section py-20">
        <EmptyState title="Election not found" />
      </div>
    );

  const { election, positions } = data.data;

  return (
    <div className="vw-section py-10 md:py-14">
      <div className="vw-fade-up mb-8">
        <span className="vw-eyebrow">Candidates</span>
        <h1 className="vw-display text-3xl md:text-4xl">{election.name}</h1>
        {election.description && <p className="mt-2 max-w-2xl text-muted-foreground">{election.description}</p>}
      </div>

      <div className="flex flex-col gap-10">
        {positions.map((pos) => (
          <section key={pos.id}>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="vw-display text-xl">{pos.title}</h2>
              <span className="text-xs text-muted-foreground">{pos.candidates.length} candidates</span>
            </div>
            {pos.description && <p className="mb-4 text-sm text-muted-foreground">{pos.description}</p>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pos.candidates.map((c) => (
                <Card key={c.id} className="vw-interactive vw-lift">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-12" style={{ backgroundColor: colorFromString(c.name) }}>
                        <AvatarFallback className="text-white font-medium">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">{c.name}</h3>
                        {c.slogan && <p className="text-xs text-primary">{c.slogan}</p>}
                      </div>
                    </div>
                    {c.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{c.bio}</p>}
                  </CardContent>
                </Card>
              ))}
              {pos.candidates.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-sm text-muted-foreground">No approved candidates for this position.</CardContent>
                </Card>
              )}
            </div>
          </section>
        ))}
        {positions.length === 0 && (
          <EmptyState icon={<Vote className="size-8" />} title="No positions yet" description="Positions and candidates will appear here once configured." />
        )}
      </div>
    </div>
  );
}
