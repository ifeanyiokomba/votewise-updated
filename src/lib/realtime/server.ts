/**
 * Server-side helper to notify the results-service that a vote was cast.
 * Calls the internal loopback endpoint on the results-service (port 3031).
 * Fire-and-forget — never blocks the vote response.
 */

const RESULTS_INTERNAL = "http://127.0.0.1:3031/internal/bump";

export async function bumpElection(electionId: string): Promise<void> {
  try {
    await fetch(RESULTS_INTERNAL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ electionId }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // non-fatal — results-service has its own polling fallback
  }
}
