"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatDateTime, timeAgo, cn } from "@/lib/utils";
import {
  ShieldCheck, Search, AlertTriangle, CheckCircle2, XCircle, Hash,
  Activity, Filter, ChevronDown, ChevronRight,
} from "lucide-react";

interface AuditLogData {
  ok: boolean;
  data: {
    logs: Array<{
      id: string; actorName: string | null; actorRole: string | null;
      action: string; resource: string | null; resourceId: string | null;
      details: string | null; prevHash: string | null; hash: string;
      nonce: string; ipAddress: string | null; createdAt: string;
    }>;
    chain: {
      intact: boolean; brokenAt: string | null; brokenReason: string | null;
      totalEntries: number; verifiedCount: number;
    };
    availableActions: string[];
  };
}

const ACTION_ICONS: Record<string, typeof ShieldCheck> = {
  VOTE_CAST: CheckCircle2,
  ELECTION_CREATED: Activity,
  ELECTION_CERTIFIED: ShieldCheck,
  VOTER_FLAGGED: AlertTriangle,
  VOTER_UNFLAGGED: CheckCircle2,
  VOTERS_IMPORTED: Activity,
  LOGIN_SUCCESS: ShieldCheck,
  LOGIN_FAILED: XCircle,
  MEMBER_INVITED: Activity,
  MEMBER_UPDATED: Activity,
  PLAN_CHANGED: Activity,
  ANNOUNCEMENT_PUBLISHED: Activity,
  INCIDENT_REPORTED: AlertTriangle,
  WEBHOOK_CREATED: Activity,
  API_KEY_CREATED: Activity,
  CUSTOM_DOMAIN_UPDATED: Activity,
  BRAND_UPDATED: Activity,
  ELECTION_CLONED: Activity,
};

const ACTION_TONES: Record<string, string> = {
  VOTE_CAST: "text-success",
  ELECTION_CERTIFIED: "text-success",
  VOTER_FLAGGED: "text-destructive",
  LOGIN_FAILED: "text-destructive",
  INCIDENT_REPORTED: "text-warning",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (actionFilter) params.set("action", actionFilter);
    return params.toString();
  }, [debouncedSearch, actionFilter]);

  const { data, isLoading } = useQuery<AuditLogData>({
    queryKey: ["audit-log", queryString],
    queryFn: async () => (await fetch(`/api/dashboard/audit-log?${queryString}`)).json(),
    refetchInterval: 30_000,
  });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) return <PageLoader label="Loading audit log" />;
  if (!data?.ok) return <div className="p-8 text-sm text-muted-foreground">Failed to load.</div>;

  const { logs, chain, availableActions } = data.data;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="vw-display text-2xl">Audit log</h1>
        <p className="text-sm text-muted-foreground">Tamper-evident hash-chained record of all actions.</p>
      </div>

      {/* chain verification status */}
      <Card className={cn("mb-4 border-l-4", chain.intact ? "border-l-success border-success/30 bg-success/5" : "border-l-destructive border-destructive/30 bg-destructive/5")}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {chain.intact ? (
              <CheckCircle2 className="size-6 text-success shrink-0" />
            ) : (
              <XCircle className="size-6 text-destructive shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={cn("font-medium", chain.intact ? "text-success" : "text-destructive")}>
                {chain.intact ? "Chain integrity verified" : "Chain integrity broken"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {chain.intact
                  ? `All ${chain.verifiedCount} entries verified — no tampering detected.`
                  : chain.brokenReason ?? "Chain broken — investigate immediately."}
              </p>
              {!chain.intact && chain.brokenAt && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Broken at:</span>
                  <code className="vw-mono text-destructive">{chain.brokenAt.slice(0, 24)}…</code>
                </div>
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Total entries: <strong className="text-foreground">{chain.totalEntries}</strong></span>
                <span>Verified: <strong className="text-foreground">{chain.verifiedCount}</strong></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* search + filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, resource…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All actions</option>
            {availableActions.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, " ").toLowerCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* log entries */}
      {logs.length === 0 ? (
        <EmptyState icon={<Activity className="size-8" />} title="No audit entries" description="Actions will be recorded here as they occur." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto votewise-scroll">
              <table className="w-full text-sm">
                <thead className="bg-background-subtle sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-8"></th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Action</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Actor</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Resource</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Time</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground hidden xl:table-cell">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const Icon = ACTION_ICONS[log.action] ?? Activity;
                    const tone = ACTION_TONES[log.action] ?? "text-muted-foreground";
                    const isExpanded = expandedRows.has(log.id);
                    return (
                      <>
                        <tr
                          key={log.id}
                          className="border-t border-border hover:bg-muted/30 cursor-pointer"
                          onClick={() => toggleRow(log.id)}
                        >
                          <td className="px-3 py-2.5">
                            {isExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Icon className={cn("size-3.5 shrink-0", tone)} />
                              <span className="font-medium text-xs">{log.action.replace(/_/g, " ").toLowerCase()}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <div className="text-xs">{log.actorName ?? "System"}</div>
                            {log.actorRole && <div className="text-[10px] text-muted-foreground">{log.actorRole}</div>}
                          </td>
                          <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                            {log.resource ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {timeAgo(log.createdAt)}
                          </td>
                          <td className="px-3 py-2.5 text-right hidden xl:table-cell">
                            <code className="vw-mono text-[10px] text-muted-foreground">{log.hash.slice(0, 12)}…</code>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-t border-border bg-muted/20">
                            <td colSpan={6} className="px-6 py-3">
                              <div className="flex flex-col gap-2 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-muted-foreground">Timestamp:</span>{" "}
                                    <span className="font-medium">{formatDateTime(log.createdAt)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">IP:</span>{" "}
                                    <span className="font-medium vw-mono">{log.ipAddress ?? "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Resource ID:</span>{" "}
                                    <code className="vw-mono">{log.resourceId ?? "—"}</code>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Nonce:</span>{" "}
                                    <code className="vw-mono">{log.nonce.slice(0, 16)}…</code>
                                  </div>
                                </div>
                                {log.details && (
                                  <div>
                                    <span className="text-muted-foreground">Details:</span>
                                    <pre className="mt-1 rounded-md bg-background p-2 text-[10px] overflow-x-auto votewise-scroll">{log.details}</pre>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 gap-2 mt-2">
                                  <div className="flex items-center gap-2">
                                    <Hash className="size-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Hash:</span>
                                    <code className="vw-mono text-[10px] break-all">{log.hash}</code>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Hash className="size-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Prev:</span>
                                    <code className="vw-mono text-[10px] break-all">{log.prevHash ?? "null (genesis)"}</code>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
