import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { liveTally } from "@/lib/sve/tally";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await requireOfficial();
    const election = await db.election.findUnique({ where: { id } });
    if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);
    if (member.role !== "PLATFORM_ADMIN" && election.organizationId !== member.organizationId) {
      throw new HttpError("FORBIDDEN", "Election belongs to a different organization", 403);
    }

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "csv";

    const tally = await liveTally(election.id);
    const voters = await db.voter.findMany({
      where: { eligibilities: { some: { electionId: election.id } } },
      select: { id: true, identifier: true, fullName: true, email: true, hasVoted: true, votedAt: true },
      orderBy: { fullName: "asc" },
    });

    if (format === "json") {
      return NextResponse.json({ ok: true, data: { election: { id: election.id, name: election.name, status: election.status }, tally, voters } });
    }

    // CSV format
    const lines: string[] = [];
    lines.push(`# VoteWise Election Export`);
    lines.push(`# Election: ${election.name}`);
    lines.push(`# Status: ${election.status}`);
    lines.push(`# Start: ${election.startTime.toISOString()}`);
    lines.push(`# End: ${election.endTime.toISOString()}`);
    lines.push(`# Total Votes: ${tally.totalVotes}`);
    lines.push(`# Total Eligible: ${tally.totalEligible}`);
    lines.push(`# Turnout: ${tally.turnoutPct.toFixed(2)}%`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push("");

    lines.push("SECTION,POSITION,CANDIDATE,VOTES,PERCENTAGE");
    for (const pos of tally.positions) {
      for (const c of pos.candidates) {
        lines.push(`RESULT,"${pos.positionTitle}","${c.name}",${c.votes},${c.pct.toFixed(2)}`);
      }
      if (pos.notaVotes > 0) {
        lines.push(`RESULT,"${pos.positionTitle}","None of the above",${pos.notaVotes},${pos.totalVotes > 0 ? (pos.notaVotes / pos.totalVotes * 100).toFixed(2) : "0.00"}`);
      }
    }
    lines.push("");

    lines.push("SECTION,IDENTIFIER,FULL_NAME,STATUS,VOTED_AT");
    for (const v of voters) {
      lines.push(`VOTER,"${v.identifier}","${v.fullName}",${v.hasVoted ? "VOTED" : "NOT_VOTED"}${v.votedAt ? `,${v.votedAt.toISOString()}` : ""}`);
    }

    const csv = lines.join("\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="votewise-${election.id}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ ok: false, error: { code: e.code, message: e.message } }, { status: e.status });
    }
    console.error("[export]", e);
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: "Export failed" } }, { status: 500 });
  }
}
