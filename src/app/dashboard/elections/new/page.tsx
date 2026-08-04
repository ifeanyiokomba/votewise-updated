"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, LayoutTemplate, Users2, Building2, FileText, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS: Record<string, typeof Users2> = {
  executive: Users2,
  board: Building2,
  agm: Users,
  single: FileText,
  council: Users2,
};

export default function NewElectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    visibility: "PRIVATE" as "PUBLIC" | "PRIVATE",
    showLiveResults: true,
    hideResultsUntilEnd: false,
    requireAccreditation: false,
    notaEnabled: true,
    ballotRandomization: true,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { data: templatesData } = useQuery<{ ok: boolean; data: { templates: Array<{ key: string; name: string; description: string; category: string; positionsCount: number; positions: Array<{ title: string; maxVotes: number; candidateSlots: number }> }> } }>({
    queryKey: ["templates"],
    queryFn: async () => (await fetch("/api/dashboard/elections/from-template")).json(),
  });
  const templates = templatesData?.data?.templates ?? [];

  const templateMut = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch("/api/dashboard/elections/from-template", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateKey: key }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success(`Created from template`); router.push(`/dashboard/elections/${d.data.election.id}`); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  const submit = async () => {
    if (!form.name || form.name.length < 3) return toast.error("Name must be at least 3 characters");
    if (!form.startTime || !form.endTime) return toast.error("Set start and end times");
    if (new Date(form.endTime) <= new Date(form.startTime)) return toast.error("End must be after start");
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/elections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Election created");
        router.push(`/dashboard/elections/${json.data.election.id}`);
      } else {
        toast.error(json.error?.message ?? "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <Link href="/dashboard/elections" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to elections
      </Link>
      <h1 className="vw-display text-2xl">New election</h1>
      <p className="mb-6 text-sm text-muted-foreground">Start from a template or configure manually.</p>

      {/* templates */}
      {templates.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <LayoutTemplate className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Quick start templates</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const Icon = TEMPLATE_ICONS[t.key] ?? FileText;
              return (
                <Card key={t.key} className="vw-interactive vw-lift cursor-pointer" >
                  <button onClick={() => templateMut.mutate(t.key)} disabled={templateMut.isPending} className="w-full text-left p-5 disabled:opacity-50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{t.name}</h3>
                        <span className="text-xs text-muted-foreground">{t.positionsCount} positions</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {t.positions.slice(0, 3).map((p) => (
                        <code key={p.title} className="vw-mono rounded bg-muted px-1.5 py-0.5 text-[10px]">{p.title}</code>
                      ))}
                      {t.positions.length > 3 && <span className="text-xs text-muted-foreground">+{t.positions.length - 3}</span>}
                    </div>
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* manual form */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Or configure manually</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Card className="max-w-2xl"><CardContent className="p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Election name *</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="SUG General Elections 2025" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start">Start time *</Label>
            <Input id="start" type="datetime-local" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end">End time *</Label>
            <Input id="end" type="datetime-local" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vis">Visibility</Label>
          <select id="vis" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.visibility} onChange={(e) => set("visibility", e.target.value as "PUBLIC" | "PRIVATE")}>
            <option value="PRIVATE">Private — only eligible voters</option>
            <option value="PUBLIC">Public — anyone can view the portal</option>
          </select>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Settings</p>
          <div className="flex flex-col gap-3">
            {[
              { k: "showLiveResults" as const, label: "Show live results", desc: "Display per-candidate tally during the election" },
              { k: "hideResultsUntilEnd" as const, label: "Hide results until close", desc: "Only show turnout until voting ends" },
              { k: "requireAccreditation" as const, label: "Require accreditation", desc: "Voters must be accredited before voting" },
              { k: "notaEnabled" as const, label: "Enable NOTA", desc: "Allow 'None of the above' on every position" },
              { k: "ballotRandomization" as const, label: "Ballot randomization", desc: "Shuffle candidate order per voter" },
            ].map((s) => (
              <div key={s.k} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
                <Switch checked={form[s.k]} onCheckedChange={(v) => set(s.k, v)} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button asChild variant="ghost"><Link href="/dashboard/elections">Cancel</Link></Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create election"}</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
