"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { timeAgo, cn } from "@/lib/utils";
import { Webhook, Plus, Trash2, Copy, CheckCircle2, XCircle, Power, ExternalLink } from "lucide-react";

interface WebhooksData {
  ok: boolean;
  data: {
    webhooks: Array<{
      id: string; url: string; secret: string; events: string; isActive: boolean;
      lastTriggeredAt: string | null; lastResponseStatus: number | null; failureCount: number; createdAt: string;
    }>;
    availableEvents: string[];
  };
}

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["vote.cast", "election.opened"]);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<WebhooksData>({
    queryKey: ["webhooks"],
    queryFn: async () => (await fetch("/api/dashboard/webhooks")).json(),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, events: selectedEvents }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) {
        toast.success("Webhook created");
        setShowForm(false);
        setUrl("");
        setRevealedSecrets(new Set([...revealedSecrets, d.data.webhook.id]));
        qc.invalidateQueries({ queryKey: ["webhooks"] });
      } else toast.error(d.error?.message ?? "Failed");
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch("/api/dashboard/webhooks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      return res.json();
    },
    onSuccess: () => { toast.success("Webhook updated"); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/dashboard/webhooks", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      return res.json();
    },
    onSuccess: (d) => { if (d.ok) { toast.success("Webhook deleted"); qc.invalidateQueries({ queryKey: ["webhooks"] }); } },
  });

  if (isLoading) return <PageLoader label="Loading webhooks" />;
  const webhooks = data?.data?.webhooks ?? [];
  const availableEvents = data?.data?.availableEvents ?? [];

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">Webhooks</h1>
          <p className="text-sm text-muted-foreground">Receive real-time event notifications at your endpoints.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" /> {showForm ? "Cancel" : "New webhook"}
        </Button>
      </div>

      {/* create form */}
      {showForm && (
        <Card className="mb-6 vw-fade-up">
          <CardContent className="p-6">
            <h3 className="vw-display text-base mb-4">Create webhook</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="url">Endpoint URL</Label>
                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/api/votewise/webhook" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Events to subscribe</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableEvents.map((event) => (
                    <label key={event} className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors",
                      selectedEvents.includes(event) ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                    )}>
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="accent-primary"
                      />
                      <code className="vw-mono">{event}</code>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => createMut.mutate()} disabled={!url || selectedEvents.length === 0 || createMut.isPending}>
                  {createMut.isPending ? "Creating…" : "Create webhook"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* webhook list */}
      {webhooks.length === 0 ? (
        <EmptyState icon={<Webhook className="size-8" />} title="No webhooks configured" description="Create a webhook to receive real-time election event notifications." />
      ) : (
        <div className="flex flex-col gap-3">
          {webhooks.map((wh) => {
            const events = JSON.parse(wh.events) as string[];
            const isRevealed = revealedSecrets.has(wh.id);
            return (
              <Card key={wh.id} className={cn("vw-interactive", !wh.isActive && "opacity-60")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("grid size-8 place-items-center rounded-md", wh.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                          <Webhook className="size-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <a href={wh.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium hover:text-primary truncate">
                            {wh.url} <ExternalLink className="size-3 shrink-0" />
                          </a>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{events.length} events</span>
                            {wh.lastTriggeredAt && <span>· Last triggered {timeAgo(wh.lastTriggeredAt)}</span>}
                            {wh.lastResponseStatus && (
                              <span className={cn("inline-flex items-center gap-1", wh.lastResponseStatus < 300 ? "text-success" : "text-destructive")}>
                                · {wh.lastResponseStatus < 300 ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                                {wh.lastResponseStatus}
                              </span>
                            )}
                            {wh.failureCount > 0 && <span className="text-destructive">· {wh.failureCount} failures</span>}
                          </div>
                        </div>
                      </div>
                      {/* events */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {events.map((e) => (
                          <code key={e} className="vw-mono rounded bg-muted px-1.5 py-0.5 text-[10px]">{e}</code>
                        ))}
                      </div>
                      {/* secret */}
                      <div className="mt-3 flex items-center gap-2">
                        <code className="vw-mono text-xs text-muted-foreground truncate max-w-[300px]">
                          {isRevealed ? wh.secret : "••••••••••••••••••••"}
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (!isRevealed) { setRevealedSecrets(new Set([...revealedSecrets, wh.id])); }
                          else { const next = new Set(revealedSecrets); next.delete(wh.id); setRevealedSecrets(next); }
                        }}>
                          {isRevealed ? "Hide" : "Reveal"}
                        </Button>
                        {isRevealed && (
                          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(wh.secret); toast.success("Secret copied"); }}>
                            <Copy className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: wh.id, isActive: !wh.isActive })}>
                        <Power className={cn("size-3.5", wh.isActive ? "text-success" : "text-muted-foreground")} />
                        {wh.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(wh.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-lg bg-info/5 border border-info/20 p-4 text-xs text-muted-foreground">
        <Webhook className="mr-1.5 inline size-3.5 text-info" />
        Webhooks are signed with HMAC-SHA256 using the secret. Verify the <code className="vw-mono">X-VoteWise-Signature</code> header on your endpoint.
      </div>
    </div>
  );
}
