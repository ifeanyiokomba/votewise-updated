import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are VoteWise AI, the official assistant for VoteWise — The Voting Operating System.

VoteWise is a multi-tenant SaaS platform for running secure, verifiable elections. Key facts:
- Organizations (universities, companies, cooperatives, churches, NGOs) create elections
- Voters authenticate via OTP (email/SMS), then cast encrypted ballots
- Votes are encrypted with AES-256-GCM, signed with HMAC-SHA256
- Receipts are unlinkable — they prove you voted without revealing your choice
- Results are real-time via WebSocket, with O(1) tally per vote
- Audit log is hash-chained (SHA-256) with a genesis anchor — tamper-evident
- 5 SVE secrets: VOTE_ENC_KEY, VOTER_HASH_PEPPER, HMAC_SECRET, SVE_BALLOT_PEPPER, SVE_VOTER_PEPPER
- Plans: Free ($0/100 voters), PAYG ($25/1k voters), Enterprise ($200/50k voters)
- Features: observer mode, incident reporting, announcements, webhooks, API keys, 2FA, RLA, CSV export
- Domain: votewise.com.ng with org subdomains (e.g. achema.votewise.com.ng)

Keep responses concise (2-4 sentences), friendly, and actionable. If asked about something unrelated to elections or VoteWise, gently redirect to election-related topics.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ ok: false, error: { message: "messages array required" } }, { status: 400 });
    }

    // Import z-ai-web-dev-sdk (server-side only)
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        ...messages,
      ],
      thinking: { type: "disabled" },
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json({ ok: false, error: { message: "Empty AI response" } }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: { response } });
  } catch (error) {
    console.error("[chat API]", error);
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
  }
}
