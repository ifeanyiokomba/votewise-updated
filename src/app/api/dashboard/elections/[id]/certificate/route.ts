import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { liveTally } from "@/lib/sve/tally";

export const dynamic = "force-dynamic";

/** Returns a print-ready HTML certification document. Browser print-to-PDF produces the PDF. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await requireOfficial();
    const election = await db.election.findUnique({
      where: { id },
      include: { organization: { include: { brand: true } } },
    });
    if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);
    if (member.role !== "PLATFORM_ADMIN" && election.organizationId !== member.organizationId) {
      throw new HttpError("FORBIDDEN", "Election belongs to a different organization", 403);
    }

    const tally = await liveTally(election.id);
    const verification = await db.electionVerification.findUnique({ where: { electionId: election.id } });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VoteWise Certification — ${escapeHtml(election.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #f5f5f0; line-height: 1.6; padding: 40px 20px; }
  .doc { max-width: 800px; margin: 0 auto; background: #fff; padding: 60px 50px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-top: 6px solid #163D2E; }
  .header { text-align: center; border-bottom: 2px solid #163D2E; padding-bottom: 30px; margin-bottom: 40px; }
  .logo { font-family: 'Helvetica', sans-serif; font-size: 28px; font-weight: 700; color: #163D2E; letter-spacing: -0.02em; }
  .logo span { color: #00C48C; }
  .doc-title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; color: #666; margin-top: 10px; }
  h1 { font-size: 32px; color: #163D2E; margin-bottom: 8px; }
  .subtitle { color: #666; font-size: 16px; margin-bottom: 30px; }
  .seal { display: inline-block; padding: 8px 16px; background: #163D2E; color: #fff; font-family: 'Helvetica', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 4px; }
  .section { margin-bottom: 35px; }
  .section-title { font-family: 'Helvetica', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #999; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
  .stat { text-align: center; padding: 20px 10px; background: #f9f8f5; border-radius: 8px; }
  .stat-value { font-family: 'Helvetica', sans-serif; font-size: 32px; font-weight: 300; color: #163D2E; }
  .stat-label { font-family: 'Helvetica', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; font-family: 'Helvetica', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; padding: 10px 12px; border-bottom: 2px solid #163D2E; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
  .winner-badge { display: inline-block; padding: 2px 8px; background: #e8f5e9; color: #2e7d32; font-family: 'Helvetica', sans-serif; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 3px; margin-left: 8px; }
  .hash-box { font-family: 'Courier New', monospace; font-size: 11px; color: #666; background: #f5f5f0; padding: 12px 16px; border-radius: 6px; word-break: break-all; border: 1px solid #e5e5e5; }
  .footer { margin-top: 50px; padding-top: 30px; border-top: 1px solid #e5e5e5; text-align: center; }
  .footer-text { font-family: 'Helvetica', sans-serif; font-size: 11px; color: #999; }
  .signature { margin-top: 30px; text-align: center; }
  .sig-line { width: 250px; height: 1px; background: #333; margin: 60px auto 8px; }
  .sig-label { font-family: 'Helvetica', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #163D2E; color: #fff; border: none; border-radius: 6px; font-family: 'Helvetica', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 100; }
  .print-btn:hover { background: #1E5C44; }
  @media print { body { background: #fff; padding: 0; } .doc { box-shadow: none; padding: 40px; max-width: none; } .print-btn { display: none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
<div class="doc">
  <div class="header">
    <div class="logo">VoteWise<span>.</span></div>
    <div class="doc-title">Election Certification Document</div>
  </div>
  <div style="text-align:center; margin-bottom: 40px;">
    <h1>${escapeHtml(election.name)}</h1>
    <div class="subtitle">${escapeHtml(election.organization.name)} · ${election.status === "CERTIFIED" ? "Certified" : "Live Results"} ${election.certifiedAt ? `· ${new Date(election.certifiedAt).toLocaleDateString()}` : ""}</div>
    ${election.status === "CERTIFIED" ? '<div class="seal">✓ Certified</div>' : '<div class="seal" style="background:#666">Live Results</div>'}
  </div>
  <div class="section">
    <div class="section-title">Election Summary</div>
    <div class="stats-grid">
      <div class="stat"><div class="stat-value">${tally.totalVotes}</div><div class="stat-label">Votes Cast</div></div>
      <div class="stat"><div class="stat-value">${tally.totalEligible}</div><div class="stat-label">Eligible Voters</div></div>
      <div class="stat"><div class="stat-value">${tally.turnoutPct.toFixed(1)}%</div><div class="stat-label">Turnout</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Election Timeline</div>
    <table>
      <tr><th style="width:30%">Event</th><th>Timestamp</th></tr>
      <tr><td>Voting opened</td><td>${new Date(election.startTime).toLocaleString()}</td></tr>
      <tr><td>Voting closed</td><td>${new Date(election.endTime).toLocaleString()}</td></tr>
      ${election.certifiedAt ? `<tr><td>Certified</td><td>${new Date(election.certifiedAt).toLocaleString()}</td></tr>` : ""}
      <tr><td>Document generated</td><td>${new Date().toLocaleString()}</td></tr>
    </table>
  </div>
  ${tally.positions.map(pos => `
  <div class="section">
    <div class="section-title">${escapeHtml(pos.positionTitle)}</div>
    <table>
      <tr><th>Candidate</th><th style="text-align:right">Votes</th><th style="text-align:right">Share</th></tr>
      ${pos.candidates.map(c => `<tr><td>${escapeHtml(c.name)}${pos.winners.includes(c.candidateId) ? '<span class="winner-badge">Winner</span>' : ""}</td><td style="text-align:right">${c.votes}</td><td style="text-align:right">${c.pct.toFixed(1)}%</td></tr>`).join("")}
      ${pos.notaVotes > 0 ? `<tr><td style="color:#999">None of the above</td><td style="text-align:right; color:#999">${pos.notaVotes}</td><td style="text-align:right; color:#999">${pos.totalVotes > 0 ? (pos.notaVotes / pos.totalVotes * 100).toFixed(1) : "0.0"}%</td></tr>` : ""}
    </table>
  </div>
  `).join("")}
  ${verification ? `
  <div class="section">
    <div class="section-title">Integrity Verification</div>
    <p style="font-size:13px; color:#666; margin-bottom:10px;">The following cryptographic hash chain-anchors this election's vote records. Any tampering breaks the chain.</p>
    <div class="hash-box">Audit Hash: ${verification.auditHash}</div>
    <div class="hash-box" style="margin-top:8px;">Integrity Signature: ${verification.integritySignature}</div>
  </div>
  ` : ""}
  <div class="signature">
    <div class="sig-line"></div>
    <div class="sig-label">Election Administrator</div>
  </div>
  <div class="footer">
    <div class="footer-text">Generated by VoteWise — The Voting Operating System · ${new Date().toISOString()}</div>
    <div class="footer-text" style="margin-top:4px;">This document is cryptographically verifiable via the audit hash.</div>
  </div>
</div>
</body>
</html>`;

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ ok: false, error: { code: e.code, message: e.message } }, { status: e.status });
    }
    console.error("[certificate]", e);
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
