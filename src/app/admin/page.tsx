import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.role !== "PLATFORM_ADMIN") redirect("/dashboard");

  const [orgs, logs, chain, elections, voters, votes] = await Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, subdomain: true, category: true, status: true, plan: true, createdAt: true, _count: { select: { elections: true, voters: true, members: true } } },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 15, select: { id: true, actorName: true, actorRole: true, action: true, resource: true, createdAt: true, hash: true } }),
    (async () => {
      // verify chain integrity
      const all = await db.auditLog.findMany({ orderBy: { createdAt: "asc" }, select: { hash: true, prevHash: true, actorId: true, action: true, details: true, createdAt: true, nonce: true } });
      let prev: string | null = null;
      let intact = true;
      let brokenAt: string | null = null;
      const { createHash } = await import("crypto");
      const GENESIS = "GENESIS-votewise-v2";
      for (const log of all) {
        if (log.prevHash !== prev) { intact = false; brokenAt = log.hash; break; }
        const recomputed = createHash("sha256").update([log.prevHash ?? GENESIS, log.actorId ?? "", log.action, log.details ?? "", log.createdAt.toISOString(), log.nonce].join("|")).digest("hex");
        if (recomputed !== log.hash) { intact = false; brokenAt = log.hash; break; }
        prev = log.hash;
      }
      return { intact, brokenAt, count: all.length };
    })(),
    db.election.count(),
    db.voter.count(),
    db.voteRecord.count(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="vw-blur border-b border-border">
        <div className="vw-section flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <span className="vw-display text-sm">VoteWise · Platform Admin</span>
          </div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        </div>
      </header>

      <main id="main-content" className="vw-section flex-1 py-10">
        <div className="mb-8">
          <span className="vw-eyebrow">Platform operations</span>
          <h1 className="vw-display text-3xl">System overview</h1>
        </div>

        {/* platform stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Organizations", value: orgs.length },
            { label: "Elections", value: elections },
            { label: "Voters", value: voters },
            { label: "Votes recorded", value: votes },
          ].map((s) => (
            <div key={s.label} className="vw-card">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="vw-stat mt-1 text-2xl">{s.value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* audit chain integrity */}
        <div className={`mt-8 rounded-lg border p-4 ${chain.intact ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`size-5 ${chain.intact ? "text-success" : "text-destructive"}`} />
            <h2 className="vw-display text-base">Audit chain integrity</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {chain.intact
              ? `Chain verified intact — ${chain.count.toLocaleString()} entries, no broken links.`
              : `Chain broken at ${chain.brokenAt}. Investigate immediately.`}
          </p>
        </div>

        {/* organizations table */}
        <div className="mt-10">
          <h2 className="vw-display text-xl mb-4">Organizations</h2>
          <div className="overflow-x-auto votewise-scroll rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background-subtle">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Subdomain</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Elections</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Voters</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{o.name}</td>
                    <td className="px-4 py-2.5 vw-mono text-xs">{o.subdomain}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.category}</td>
                    <td className="px-4 py-2.5"><span className="rounded bg-muted px-1.5 py-0.5 text-xs">{o.plan}</span></td>
                    <td className="px-4 py-2.5 text-right vw-mono">{o._count.elections}</td>
                    <td className="px-4 py-2.5 text-right vw-mono">{o._count.voters}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${o.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* recent audit log */}
        <div className="mt-10">
          <h2 className="vw-display text-xl mb-4">Recent audit entries</h2>
          <div className="flex flex-col gap-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="vw-mono text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  <span className="font-medium">{log.action}</span>
                  {log.actorName && <span className="text-muted-foreground">by {log.actorName}</span>}
                  {log.resource && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{log.resource}</span>}
                </div>
                <code className="vw-mono text-[10px] text-muted-foreground">{log.hash.slice(0, 12)}…</code>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
