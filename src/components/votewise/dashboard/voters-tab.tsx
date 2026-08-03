"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/votewise/primitives/section";
import { formatNumber, formatPercent, formatDateTime, cn } from "@/lib/utils";
import { Search, CheckCircle2, Clock, Users, Download, Flag, ShieldCheck } from "lucide-react";

interface VotersData {
  ok: boolean;
  data: {
    voters: Array<{
      id: string; identifier: string; fullName: string; email: string | null; phone: string | null;
      hasVoted: boolean; votedAt: string | null; flagged: boolean; flaggedReason: string | null;
    }>;
    stats: { total: number; voted: number; notVoted: number; turnoutPct: number };
  };
}

export function VotersTab({ electionId, canImport }: { electionId: string; canImport: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    return params.toString();
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading } = useQuery<VotersData>({
    queryKey: ["voters", electionId, queryString],
    queryFn: async () => (await fetch(`/api/dashboard/elections/${electionId}/voters?${queryString}`)).json(),
  });

  const qc = useQueryClient();
  const flagMut = useMutation({
    mutationFn: async ({ id, flagged, reason }: { id: string; flagged: boolean; reason?: string }) => {
      const res = await fetch(`/api/dashboard/voters/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flagged, flaggedReason: reason }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success(d.data.flagged ? "Voter flagged" : "Voter unflagged"); qc.invalidateQueries({ queryKey: ["voters", electionId] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  const voters = data?.data?.voters ?? [];
  const stats = data?.data?.stats;

  const exportUrl = `/api/dashboard/elections/${electionId}/export?format=csv`;

  return (
    <div className="flex flex-col gap-4">
      {/* stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Eligible", value: formatNumber(stats.total), icon: Users, tone: "text-muted-foreground" },
            { label: "Voted", value: formatNumber(stats.voted), icon: CheckCircle2, tone: "text-success" },
            { label: "Not voted", value: formatNumber(stats.notVoted), icon: Clock, tone: "text-warning" },
            { label: "Turnout", value: `${stats.turnoutPct.toFixed(1)}%`, icon: CheckCircle2, tone: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="vw-interactive">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className={cn("size-3.5", s.tone)} />
                </div>
                <div className="vw-stat mt-1 text-xl">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* search + filter + export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, email…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {[
            { value: "", label: "All" },
            { value: "voted", label: "Voted" },
            { value: "not_voted", label: "Not voted" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={exportUrl} download>
            <Download className="size-3.5" /> Export CSV
          </a>
        </Button>
      </div>

      {/* voter list */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading voters…</div>
      ) : voters.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="No voters found" description={canImport ? "Import voters in DRAFT status." : "Adjust your search or filter."} />
      ) : (
        <div className="overflow-x-auto votewise-scroll rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background-subtle">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Voter</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Identifier</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {voters.map((v) => (
                <tr key={v.id} className={cn("border-t border-border hover:bg-muted/30", v.flagged && "bg-destructive/5")}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {v.flagged && <Flag className="size-3.5 text-destructive" />}
                      <Link href={`/dashboard/voters/${v.id}`} className="font-medium hover:text-primary hover:underline">
                        {v.fullName}
                      </Link>
                    </div>
                    {v.flagged && v.flaggedReason && (
                      <div className="text-xs text-destructive">{v.flaggedReason}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 vw-mono text-xs hidden sm:table-cell">{v.identifier}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                    {v.email ?? v.phone ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {v.hasVoted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                        <CheckCircle2 className="size-3" /> Voted
                        {v.votedAt && <span className="hidden lg:inline opacity-60">· {formatDateTime(v.votedAt)}</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <Clock className="size-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {v.flagged ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-success hover:text-success"
                        disabled={flagMut.isPending}
                        onClick={() => flagMut.mutate({ id: v.id, flagged: false })}
                      >
                        <ShieldCheck className="size-3.5" /> Unflag
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={flagMut.isPending || v.hasVoted}
                        onClick={() => {
                          const reason = prompt("Reason for flagging this voter? (optional)");
                          flagMut.mutate({ id: v.id, flagged: true, reason: reason || "Flagged by admin" });
                        }}
                      >
                        <Flag className="size-3.5" /> Flag
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
