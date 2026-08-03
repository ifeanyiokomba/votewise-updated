import { requireVoter } from "@/lib/guards";
import { api, parseBody, ok, getClientIp } from "@/lib/api";
import { schemas, fail, ERR } from "@/lib/validation";
import { castVote } from "@/lib/sve/vote-recorder";
import { RATE_LIMITS } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const POST = api(async (req) => {
  const voter = await requireVoter(req);
  const input = await parseBody(req, schemas.voteCast);
  const rl = RATE_LIMITS.voteCast(voter.id);
  if (!rl.ok) {
    return NextResponse.json(fail(ERR.RATE_LIMITED, "Too many vote attempts. Wait a minute."), { status: 429 });
  }
  const result = await castVote(voter, input);
  return ok(result);
});
