"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { initials, colorFromString } from "@/lib/utils";
import { ArrowLeft, Vote, Quote, CheckCircle2, User } from "lucide-react";

interface CandidateDetail {
  ok: boolean;
  data: {
    candidate: {
      id: string; name: string; bio: string | null; manifesto: string | null;
      slogan: string | null; photoUrl: string | null; status: string;
      position: { title: string; description: string | null; electionName: string; electionStatus: string };
    };
  };
}

export default function CandidateDetailPage() {
  const params = useParams<{ subdomain: string; candidateId: string }>();
  const sp = useSearchParams();
  const electionId = sp.get("election");

  const { data, isLoading } = useQuery<CandidateDetail>({
    queryKey: ["candidate", electionId, params.candidateId],
    queryFn: async () => {
      const res = await fetch(`/api/elections/${electionId}/candidates/${params.candidateId}`);
      return res.json();
    },
    enabled: !!electionId && !!params.candidateId,
  });

  if (isLoading) return <PageLoader label="Loading candidate" />;
  if (!data?.ok)
    return (
      <div className="vw-section py-20">
        <EmptyState title="Candidate not found" />
      </div>
    );

  const c = data.data.candidate;

  return (
    <div className="vw-section py-10 md:py-14 max-w-3xl">
      <Link
        href={`/o/${params.subdomain}/candidates?election=${electionId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to candidates
      </Link>

      {/* header card */}
      <Card className="vw-fade-up vw-pop overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end gap-4">
              <Avatar className="size-24 ring-4 ring-card" style={{ backgroundColor: colorFromString(c.name) }}>
                <AvatarFallback className="text-2xl font-medium text-white">
                  {initials(c.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="vw-display text-2xl md:text-3xl">{c.name}</h1>
                  {c.status === "APPROVED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      <CheckCircle2 className="size-3" /> Approved
                    </span>
                  )}
                </div>
                {c.slogan && <p className="mt-0.5 text-sm text-primary font-medium">{c.slogan}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Running for <span className="text-foreground font-medium">{c.position.title}</span> · {c.position.electionName}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* bio */}
      {c.bio && (
        <Card className="mt-4 vw-fade-up" style={{ animationDelay: "60ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">About</h2>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{c.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* manifesto */}
      {c.manifesto && (
        <Card className="mt-4 vw-fade-up" style={{ animationDelay: "120ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Manifesto</h2>
            </div>
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line border-l-2 border-primary/30 pl-4">
              {c.manifesto}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      {c.position.electionStatus === "LIVE" && (
        <Card className="mt-4 vw-fade-up border-success/30" style={{ animationDelay: "180ms" }}>
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <Vote className="size-8 text-success" />
            <div>
              <h3 className="vw-display text-base">Ready to vote?</h3>
              <p className="text-sm text-muted-foreground">This election is open now.</p>
            </div>
            <Button asChild>
              <Link href={`/o/${params.subdomain}/vote?election=${electionId}`}>Cast your vote</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
