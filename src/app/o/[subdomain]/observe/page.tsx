"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader, EmptyState, SectionHeader } from "@/components/votewise/primitives/section";
import { formatDateTime, timeAgo, cn } from "@/lib/utils";
import { Eye, AlertTriangle, Flag, CheckCircle2, Clock, ShieldAlert, FileText } from "lucide-react";

const INCIDENT_TYPES = [
  { value: "VOTER_INTIMIDATION", label: "Voter intimidation", icon: ShieldAlert },
  { value: "SYSTEM_MALFUNCTION", label: "System malfunction", icon: AlertTriangle },
  { value: "IRREGULARITY", label: "Electoral irregularity", icon: Flag },
  { value: "DISPUTE", label: "Dispute / conflict", icon: AlertTriangle },
  { value: "TECHNICAL_ISSUE", label: "Technical issue", icon: AlertTriangle },
  { value: "OTHER", label: "Other", icon: FileText },
];

const SEVERITY = [
  { value: "LOW", label: "Low", color: "text-muted-foreground" },
  { value: "MEDIUM", label: "Medium", color: "text-info" },
  { value: "HIGH", label: "High", color: "text-warning" },
  { value: "CRITICAL", label: "Critical", color: "text-destructive" },
];

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-warning/10 text-warning",
  INVESTIGATING: "bg-info/10 text-info",
  RESOLVED: "bg-success/10 text-success",
  DISMISSED: "bg-muted text-muted-foreground",
};

export default function ObservePage() {
  const params = useParams<{ subdomain: string }>();
  const sp = useSearchParams();
  const electionId = sp.get("election");
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "IRREGULARITY" as string, severity: "MEDIUM" as string, title: "", description: "", location: "" });

  // Note: observer page requires official login; if not logged in, show a login prompt
  const { data: meData } = useQuery<{ ok: boolean; data: { member: { id: string; name: string; role: string } | null } }>({
    queryKey: ["me"],
    queryFn: async () => (await fetch("/api/auth/me")).json(),
    retry: false,
  });

  const { data, isLoading } = useQuery<{ ok: boolean; data: { incidents: Array<any> } }>({
    queryKey: ["incidents", electionId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/elections/${electionId}/incidents`);
      if (!res.ok) return { ok: false, data: { incidents: [] } };
      return res.json();
    },
    enabled: !!electionId && !!meData?.data?.member,
    refetchInterval: 15_000,
  });

  const reportMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/elections/${electionId}/incidents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) {
        toast.success("Incident reported");
        setShowForm(false);
        setForm({ type: "IRREGULARITY", severity: "MEDIUM", title: "", description: "", location: "" });
        qc.invalidateQueries({ queryKey: ["incidents", electionId] });
      } else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (!electionId) {
    return <div className="vw-section py-20"><EmptyState title="Select an election" description="Choose an election from the portal to observe." /></div>;
  }

  if (meData && !meData.data?.member) {
    return (
      <div className="vw-section py-20">
        <Card className="mx-auto max-w-md">
          <CardContent className="p-8 text-center">
            <Eye className="mx-auto mb-3 size-10 text-muted-foreground" />
            <h1 className="vw-display text-xl">Observer login required</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in with your observer account to monitor this election and file incident reports.</p>
            <Button asChild className="mt-4"><a href="/login">Sign in</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <PageLoader label="Loading incidents" />;
  const incidents = data?.data?.incidents ?? [];

  return (
    <div className="vw-section py-10 md:py-14">
      <div className="vw-fade-up mb-8 flex items-start justify-between gap-4">
        <div>
          <span className="vw-eyebrow">Election observer</span>
          <h1 className="vw-display text-3xl md:text-4xl">Incident reports</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Monitor the election and report any irregularities. All reports are timestamped and audited.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Flag className="size-4" /> {showForm ? "Cancel" : "Report incident"}
        </Button>
      </div>

      {/* report form */}
      {showForm && (
        <Card className="mb-6 vw-fade-up">
          <CardContent className="p-6">
            <h3 className="vw-display text-base mb-4">New incident report</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                  <Label>Type</Label>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Severity</Label>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.severity}
                    onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                  >
                    {SEVERITY.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Location (optional)</Label>
                  <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Polling station / area" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief summary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What happened? Be specific and factual." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={() => reportMut.mutate()} disabled={!form.title || !form.description || reportMut.isPending}>
                  {reportMut.isPending ? "Submitting…" : "Submit report"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* incident list */}
      {incidents.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="size-8 text-success" />} title="No incidents reported" description="The election is proceeding smoothly. Reports will appear here when filed." />
      ) : (
        <div className="flex flex-col gap-3">
          {incidents.map((inc) => {
            const typeMeta = INCIDENT_TYPES.find((t) => t.value === inc.type);
            const sevMeta = SEVERITY.find((s) => s.value === inc.severity);
            return (
              <Card key={inc.id} className="vw-interactive">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-md",
                      inc.severity === "CRITICAL" ? "bg-destructive/10 text-destructive" :
                      inc.severity === "HIGH" ? "bg-warning/10 text-warning" :
                      inc.severity === "MEDIUM" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
                    )}>
                      {typeMeta ? <typeMeta.icon className="size-4" /> : <Flag className="size-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{inc.title}</h3>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[inc.status] ?? STATUS_TONE.OPEN)}>{inc.status}</span>
                        <span className={cn("text-xs font-medium", sevMeta?.color)}>{sevMeta?.label} severity</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{inc.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{typeMeta?.label ?? inc.type}</span>
                        <span>·</span>
                        <span>by {inc.reporterName}</span>
                        <span>·</span>
                        <span>{timeAgo(inc.createdAt)}</span>
                        {inc.location && (<><span>·</span><span>📍 {inc.location}</span></>)}
                      </div>
                      {inc.resolution && (
                        <div className="mt-2 rounded-lg bg-success/5 p-2 text-xs text-success">
                          <CheckCircle2 className="mr-1 inline size-3" />{inc.resolution}
                        </div>
                      )}
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
