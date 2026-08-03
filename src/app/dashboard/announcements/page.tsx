"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatDateTime, timeAgo, cn } from "@/lib/utils";
import { Megaphone, Plus, Info, AlertTriangle, AlertCircle } from "lucide-react";

interface AnnouncementsData {
  ok: boolean;
  data: {
    announcements: Array<{
      id: string; title: string; body: string; severity: string;
      publishedAt: string; electionId: string | null;
      election?: { name: string } | null;
    }>;
  };
}

const SEVERITY_META: Record<string, { icon: typeof Info; tone: string; bg: string }> = {
  INFO: { icon: Info, tone: "text-info", bg: "bg-info/10" },
  WARNING: { icon: AlertTriangle, tone: "text-warning", bg: "bg-warning/10" },
  CRITICAL: { icon: AlertCircle, tone: "text-destructive", bg: "bg-destructive/10" },
};

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", severity: "INFO" as string });

  const { data, isLoading } = useQuery<AnnouncementsData>({
    queryKey: ["announcements"],
    queryFn: async () => (await fetch("/api/dashboard/announcements")).json(),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) {
        toast.success("Announcement published");
        setShowForm(false);
        setForm({ title: "", body: "", severity: "INFO" });
        qc.invalidateQueries({ queryKey: ["announcements"] });
      } else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading announcements" />;
  const announcements = data?.data?.announcements ?? [];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">Announcements</h1>
          <p className="text-sm text-muted-foreground">Broadcast messages to your voters.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" /> {showForm ? "Cancel" : "New announcement"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4 vw-fade-up">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Voting opens at 9:00 AM" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Message</Label>
                <Textarea rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Details for your voters…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Severity</Label>
                <select
                  className="h-10 w-fit rounded-md border border-input bg-background px-3 text-sm"
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                >
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => createMut.mutate()} disabled={!form.title || !form.body || createMut.isPending}>
                  {createMut.isPending ? "Publishing…" : "Publish"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {announcements.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-8" />} title="No announcements" description="Publish messages to keep your voters informed." />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => {
            const meta = SEVERITY_META[a.severity] ?? SEVERITY_META.INFO;
            return (
              <Card key={a.id} className="vw-interactive">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", meta.bg, meta.tone)}>
                      <meta.icon className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{a.title}</h3>
                        <span className={cn("text-xs font-medium", meta.tone)}>{a.severity}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{timeAgo(a.publishedAt)}</span>
                        {a.election?.name && (<><span>·</span><span>{a.election.name}</span></>)}
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
