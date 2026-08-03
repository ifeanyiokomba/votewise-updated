"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { timeAgo, formatDateTime, cn } from "@/lib/utils";
import { Flag, ShieldAlert, AlertTriangle, CheckCircle2, Eye } from "lucide-react";

interface IncidentsData {
  ok: boolean;
  data: {
    incidents: Array<{
      id: string; type: string; severity: string; status: string; title: string;
      description: string; reporterName: string; createdAt: string; resolvedAt: string | null;
      resolution: string | null; election?: { name: string } | null; electionId: string;
    }>;
  };
}

const SEVERITY_TONE: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-info/10 text-info",
  HIGH: "bg-warning/10 text-warning",
  CRITICAL: "bg-destructive/10 text-destructive",
};

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-warning/10 text-warning",
  INVESTIGATING: "bg-info/10 text-info",
  RESOLVED: "bg-success/10 text-success",
  DISMISSED: "bg-muted text-muted-foreground",
};

const TYPE_ICON: Record<string, typeof Flag> = {
  VOTER_INTIMIDATION: ShieldAlert,
  SYSTEM_MALFUNCTION: AlertTriangle,
  IRREGULARITY: Flag,
  DISPUTE: AlertTriangle,
  TECHNICAL_ISSUE: AlertTriangle,
  OTHER: Flag,
};

export default function IncidentsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");

  const { data, isLoading } = useQuery<IncidentsData>({
    queryKey: ["all-incidents"],
    queryFn: async () => (await fetch("/api/dashboard/incidents")).json(),
    refetchInterval: 15_000,
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/dashboard/incidents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success("Incident updated"); qc.invalidateQueries({ queryKey: ["all-incidents"] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading incidents" />;
  const incidents = data?.data?.incidents ?? [];
  const filtered = filter === "ALL" ? incidents : incidents.filter((i) => i.status === filter);

  const counts = {
    ALL: incidents.length,
    OPEN: incidents.filter((i) => i.status === "OPEN").length,
    INVESTIGATING: incidents.filter((i) => i.status === "INVESTIGATING").length,
    RESOLVED: incidents.filter((i) => i.status === "RESOLVED").length,
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="vw-display text-2xl">Incident reports</h1>
        <p className="text-sm text-muted-foreground">All election incidents across your organization.</p>
      </div>

      {/* filter tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto votewise-scroll">
        {Object.entries(counts).map(([key, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {key === "ALL" ? "All" : key.charAt(0) + key.slice(1).toLowerCase()} <span className="opacity-60">({count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Flag className="size-8" />} title="No incidents" description="Incident reports from observers will appear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((inc) => {
            const Icon = TYPE_ICON[inc.type] ?? Flag;
            return (
              <Card key={inc.id} className="vw-interactive">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", SEVERITY_TONE[inc.severity] ?? SEVERITY_TONE.LOW)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{inc.title}</h3>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[inc.status] ?? STATUS_TONE.OPEN)}>{inc.status}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", SEVERITY_TONE[inc.severity] ?? SEVERITY_TONE.LOW)}>{inc.severity}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{inc.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{inc.type.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>{inc.election?.name ?? "Unknown election"}</span>
                        <span>·</span>
                        <span>by {inc.reporterName}</span>
                        <span>·</span>
                        <span>{timeAgo(inc.createdAt)}</span>
                      </div>
                      {inc.resolution && (
                        <div className="mt-2 rounded-lg bg-success/5 p-2 text-xs text-success">
                          <CheckCircle2 className="mr-1 inline size-3" />{inc.resolution}
                        </div>
                      )}
                      {/* quick actions */}
                      <div className="mt-3 flex gap-2">
                        {inc.status === "OPEN" && (
                          <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: inc.id, status: "INVESTIGATING" })}>
                            <Eye className="size-3.5" /> Start investigating
                          </Button>
                        )}
                        {inc.status === "INVESTIGATING" && (
                          <>
                            <Button size="sm" variant="outline" className="text-success" onClick={() => updateMut.mutate({ id: inc.id, status: "RESOLVED" })}>
                              <CheckCircle2 className="size-3.5" /> Resolve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: inc.id, status: "DISMISSED" })}>
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
