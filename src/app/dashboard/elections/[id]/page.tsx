"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { ElectionMonitor } from "@/components/votewise/dashboard/election-monitor";
import { formatNumber, formatPercent, formatDateTime } from "@/lib/utils";
import { Play, Pause, X, CheckCircle2, CalendarClock, Plus, Trash2, Users, Vote, Settings, Activity } from "lucide-react";

interface ElectionData {
  ok: boolean;
  data: {
    election: {
      id: string; name: string; description: string | null; status: string; visibility: string;
      startTime: string; endTime: string; showLiveResults: boolean; hideResultsUntilEnd: boolean;
      requireAccreditation: boolean; notaEnabled: boolean; ballotRandomization: boolean; certifiedAt: string | null;
    };
    positions: Array<{ id: string; title: string; description: string | null; maxVotes: number; displayOrder: number; _count?: { candidates: number } }>;
    stats: { totalVotes: number; totalEligible: number; turnoutPct: number };
  };
}

const NEXT_ACTION: Record<string, { action: string; label: string; icon: typeof Play; tone: string }> = {
  DRAFT: { action: "schedule", label: "Publish / schedule", icon: CalendarClock, tone: "default" },
  SCHEDULED: { action: "open", label: "Open voting", icon: Play, tone: "success" },
  LIVE: { action: "close", label: "Close voting", icon: Pause, tone: "warning" },
  PAUSED: { action: "resume", label: "Resume voting", icon: Play, tone: "success" },
  CLOSED: { action: "certify", label: "Certify results", icon: CheckCircle2, tone: "success" },
};

export default function ManageElectionPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [newPos, setNewPos] = useState({ title: "", description: "", maxVotes: 1 });
  const [newCand, setNewCand] = useState<Record<string, { name: string; slogan: string }>>({});
  const [voterCsv, setVoterCsv] = useState("identifier,fullName,email\nVOT/2025001,Jane Doe,jane@org.edu");

  const { data, isLoading } = useQuery<ElectionData>({
    queryKey: ["election-manage", params.id],
    queryFn: async () => (await fetch(`/api/dashboard/elections/${params.id}`)).json(),
  });

  const lifecycle = useMutation({
    mutationFn: async (action: string) => {
      const res = await fetch(`/api/dashboard/elections/${params.id}/lifecycle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success(`Status: ${d.data.status}`); qc.invalidateQueries({ queryKey: ["election-manage", params.id] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  const addPosition = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/elections/${params.id}/positions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newPos),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success("Position added"); setNewPos({ title: "", description: "", maxVotes: 1 }); qc.invalidateQueries({ queryKey: ["election-manage", params.id] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  const addCandidate = useMutation({
    mutationFn: async (positionId: string) => {
      const c = newCand[positionId] ?? { name: "", slogan: "" };
      const res = await fetch(`/api/dashboard/elections/${params.id}/candidates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionId, ...c }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success("Candidate added"); setNewCand({}); qc.invalidateQueries({ queryKey: ["election-manage", params.id] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  const importVoters = useMutation({
    mutationFn: async () => {
      const lines = voterCsv.trim().split("\n").slice(1);
      const voters = lines.map((line) => {
        const [identifier, fullName, email] = line.split(",").map((s) => s?.trim() ?? "");
        return { identifier, fullName, email: email || "" };
      }).filter((v) => v.identifier && v.fullName);
      const res = await fetch(`/api/dashboard/elections/${params.id}/voters`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voters }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success(`Imported ${d.data.imported} voters`); qc.invalidateQueries({ queryKey: ["election-manage", params.id] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading election" />;
  if (!data?.ok) return <div className="p-8"><EmptyState title="Election not found" /></div>;

  const { election, positions, stats } = data.data;
  const next = NEXT_ACTION[election.status];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="vw-display text-2xl">{election.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${election.status === "LIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {election.status === "LIVE" && <span className="votewise-live-dot mr-1.5" style={{ width: 6, height: 6 }} />}
              {election.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(election.startTime)} → {formatDateTime(election.endTime)}
          </p>
        </div>
        {next && (
          <Button
            onClick={() => lifecycle.mutate(next.action)}
            disabled={lifecycle.isPending}
            className={next.tone === "success" ? "bg-success text-success-foreground hover:bg-success/90" : next.tone === "warning" ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}
          >
            <next.icon className="size-4" /> {next.label}
          </Button>
        )}
      </div>

      {/* stats strip */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Votes</div><div className="vw-stat text-xl">{formatNumber(stats.totalVotes)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Eligible</div><div className="vw-stat text-xl">{formatNumber(stats.totalEligible)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Turnout</div><div className="vw-stat text-xl">{formatPercent(stats.turnoutPct)}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions"><Vote className="size-3.5 mr-1" /> Positions</TabsTrigger>
          <TabsTrigger value="monitor"><Activity className="size-3.5 mr-1" /> Monitor</TabsTrigger>
          <TabsTrigger value="voters"><Users className="size-3.5 mr-1" /> Voters</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="size-3.5 mr-1" /> Settings</TabsTrigger>
        </TabsList>

        {/* positions + candidates */}
        <TabsContent value="positions" className="mt-4">
          {election.status !== "DRAFT" && (
            <div className="mb-4 rounded-lg bg-warning/10 p-3 text-xs text-warning">
              Positions and candidates are locked because the election is {election.status}.
            </div>
          )}
          <div className="flex flex-col gap-4">
            {positions.map((pos) => (
              <Card key={pos.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="vw-display text-base">{pos.title}</h3>
                      <p className="text-xs text-muted-foreground">{pos._count?.candidates ?? 0} candidates · max {pos.maxVotes} vote(s)</p>
                    </div>
                  </div>
                  {pos.description && <p className="mt-2 text-sm text-muted-foreground">{pos.description}</p>}
                  {/* add candidate (draft only) */}
                  {election.status === "DRAFT" && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Candidate name"
                          value={(newCand[pos.id] ?? { name: "" }).name}
                          onChange={(e) => setNewCand((c) => ({ ...c, [pos.id]: { name: e.target.value, slogan: c[pos.id]?.slogan ?? "" } }))}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Slogan (optional)"
                          value={(newCand[pos.id] ?? { slogan: "" }).slogan}
                          onChange={(e) => setNewCand((c) => ({ ...c, [pos.id]: { name: c[pos.id]?.name ?? "", slogan: e.target.value } }))}
                        />
                      </div>
                      <Button size="sm" onClick={() => addCandidate.mutate(pos.id)} disabled={!(newCand[pos.id]?.name)}>
                        <Plus className="size-3.5" /> Add
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {positions.length === 0 && <EmptyState title="No positions yet" description="Add your first contested position below." />}

            {/* add position (draft only) */}
            {election.status === "DRAFT" && (
              <Card className="border-dashed">
                <CardContent className="p-5">
                  <h3 className="vw-display text-sm mb-3">Add a position</h3>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Label htmlFor="ptitle">Title</Label>
                      <Input id="ptitle" value={newPos.title} onChange={(e) => setNewPos((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. President" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pmax">Max votes</Label>
                      <Input id="pmax" type="number" min={1} max={10} value={newPos.maxVotes} onChange={(e) => setNewPos((p) => ({ ...p, maxVotes: Number(e.target.value) }))} className="w-24" />
                    </div>
                    <Button onClick={() => addPosition.mutate()} disabled={!newPos.title || addPosition.isPending}>
                      <Plus className="size-4" /> Add position
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* monitor */}
        <TabsContent value="monitor" className="mt-4">
          <ElectionMonitor electionId={election.id} />
        </TabsContent>

        {/* voters */}
        <TabsContent value="voters" className="mt-4">
          {election.status === "DRAFT" ? (
            <Card><CardContent className="p-5">
              <h3 className="vw-display text-sm mb-2">Import voters (CSV)</h3>
              <p className="mb-3 text-xs text-muted-foreground">Header: identifier,fullName,email</p>
              <Textarea rows={8} value={voterCsv} onChange={(e) => setVoterCsv(e.target.value)} className="vw-mono text-xs" />
              <Button className="mt-3" onClick={() => importVoters.mutate()} disabled={importVoters.isPending}>
                <Users className="size-4" /> {importVoters.isPending ? "Importing…" : "Import voters"}
              </Button>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="p-5 text-sm text-muted-foreground">
              {formatNumber(stats.totalEligible)} voters are eligible for this election. Voter import is locked.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* settings */}
        <TabsContent value="settings" className="mt-4">
          <Card><CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Visibility", value: election.visibility },
                { label: "Show live results", value: election.showLiveResults ? "Yes" : "No" },
                { label: "Hide until close", value: election.hideResultsUntilEnd ? "Yes" : "No" },
                { label: "Require accreditation", value: election.requireAccreditation ? "Yes" : "No" },
                { label: "NOTA enabled", value: election.notaEnabled ? "Yes" : "No" },
                { label: "Ballot randomization", value: election.ballotRandomization ? "Yes" : "No" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
              {election.certifiedAt && (
                <div className="col-span-2 flex items-center justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">Certified at</span>
                  <span className="font-medium">{formatDateTime(election.certifiedAt)}</span>
                </div>
              )}
            </div>
            {election.status === "DRAFT" && (
              <Button variant="outline" className="mt-4 text-destructive" onClick={() => lifecycle.mutate("cancel")}>
                <Trash2 className="size-4" /> Cancel election
              </Button>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
