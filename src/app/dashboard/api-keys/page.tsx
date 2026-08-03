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
import { Key, Plus, Trash2, Copy, CheckCircle2, Power, AlertCircle, Code } from "lucide-react";

interface ApiKeysData {
  ok: boolean;
  data: {
    keys: Array<{
      id: string; name: string; keyPrefix: string; scopes: string[]; environment: string;
      isActive: boolean; lastUsedAt: string | null; expiresAt: string | null; createdAt: string;
    }>;
    availableScopes: string[];
  };
}

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:elections", "read:results"]);
  const [environment, setEnvironment] = useState("production");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ApiKeysData>({
    queryKey: ["api-keys"],
    queryFn: async () => (await fetch("/api/dashboard/api-keys")).json(),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, scopes: selectedScopes, environment }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) {
        setNewKey(d.data.fullKey);
        setShowForm(false);
        setName("");
        setSelectedScopes(["read:elections", "read:results"]);
        qc.invalidateQueries({ queryKey: ["api-keys"] });
        toast.success("API key created");
      } else toast.error(d.error?.message ?? "Failed");
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      return res.json();
    },
    onSuccess: () => { toast.success("Key updated"); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/dashboard/api-keys", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      return res.json();
    },
    onSuccess: (d) => { if (d.ok) { toast.success("Key deleted"); qc.invalidateQueries({ queryKey: ["api-keys"] }); } },
  });

  if (isLoading) return <PageLoader label="Loading API keys" />;
  const keys = data?.data?.keys ?? [];
  const availableScopes = data?.data?.availableScopes ?? [];

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">API Keys</h1>
          <p className="text-sm text-muted-foreground">Programmatic access to your VoteWise data.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" /> {showForm ? "Cancel" : "New key"}
        </Button>
      </div>

      {/* new key display (shown once) */}
      {newKey && (
        <Card className="mb-6 vw-fade-up border-success/30 bg-success/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-success">API key created</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Copy this key now — it won't be shown again.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="vw-mono flex-1 rounded-md bg-background p-3 text-sm break-all">{newKey}</code>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied"); }}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewKey(null)}>Dismiss</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* create form */}
      {showForm && (
        <Card className="mb-6 vw-fade-up">
          <CardContent className="p-6">
            <h3 className="vw-display text-base mb-4">Create API key</h3>
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Key name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production integration" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="env">Environment</Label>
                  <select
                    id="env"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                  >
                    <option value="production">Production</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Scopes</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableScopes.map((scope) => (
                    <label key={scope} className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors",
                      selectedScopes.includes(scope) ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                    )}>
                      <input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} className="accent-primary" />
                      <code className="vw-mono">{scope}</code>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => createMut.mutate()} disabled={!name || selectedScopes.length === 0 || createMut.isPending}>
                  {createMut.isPending ? "Creating…" : "Create key"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* key list */}
      {keys.length === 0 ? (
        <EmptyState icon={<Key className="size-8" />} title="No API keys" description="Create an API key to enable programmatic access." />
      ) : (
        <div className="flex flex-col gap-3">
          {keys.map((key) => (
            <Card key={key.id} className={cn("vw-interactive", !key.isActive && "opacity-60")}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("grid size-8 place-items-center rounded-md", key.environment === "production" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning")}>
                        <Key className="size-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-medium">{key.name}</h3>
                        <code className="vw-mono text-xs text-muted-foreground">{key.keyPrefix}…</code>
                      </div>
                    </div>
                    {/* scopes */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {key.scopes.map((s) => (
                        <code key={s} className="vw-mono rounded bg-muted px-1.5 py-0.5 text-[10px]">{s}</code>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={cn("rounded px-1.5 py-0.5 font-medium", key.environment === "production" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning")}>
                        {key.environment}
                      </span>
                      <span>Created {timeAgo(key.createdAt)}</span>
                      {key.lastUsedAt && <span>· Last used {timeAgo(key.lastUsedAt)}</span>}
                      {key.expiresAt && <span>· Expires {timeAgo(key.expiresAt)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: key.id, isActive: !key.isActive })}>
                      <Power className={cn("size-3.5", key.isActive ? "text-success" : "text-muted-foreground")} />
                      {key.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(key.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* usage example */}
      <Card className="mt-6 vw-card-subtle">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Code className="size-4 text-muted-foreground" /> Usage example
          </h3>
          <div className="rounded-md bg-background p-3 overflow-x-auto votewise-scroll">
            <code className="vw-mono text-xs text-muted-foreground">
              <span className="text-success">curl</span> https://votewise.com.ng/api/v1/elections \
              <br />
              {"  "}<span className="text-info">-H</span> "Authorization: Bearer vw_live_your_key_here"
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
