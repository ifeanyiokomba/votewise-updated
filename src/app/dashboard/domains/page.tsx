"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/votewise/primitives/section";
import { Globe, CheckCircle2, ExternalLink, AlertCircle, Copy } from "lucide-react";

interface DomainData {
  ok: boolean;
  data: {
    organization: { id: string; name: string; subdomain: string; customDomain: string | null; category: string; status: string };
    subdomainUrl: string;
    customDomainUrl: string | null;
  };
}

export default function DomainsPage() {
  const qc = useQueryClient();
  const [customDomain, setCustomDomain] = useState("");

  const { data, isLoading } = useQuery<DomainData>({
    queryKey: ["domains"],
    queryFn: async () => (await fetch("/api/dashboard/domains")).json(),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/domains", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customDomain: customDomain || null }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success("Domain updated"); qc.invalidateQueries({ queryKey: ["domains"] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading domains" />;
  if (!data?.ok) return <div className="p-8 text-sm text-muted-foreground">Failed to load.</div>;
  const { organization, subdomainUrl, customDomainUrl } = data.data;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="vw-display text-2xl">Domain management</h1>
        <p className="text-sm text-muted-foreground">Manage how voters access your election portal.</p>
      </div>

      {/* subdomain (default) */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Globe className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-medium">Default subdomain</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Your portal is accessible at this address.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="vw-mono text-sm text-primary">{subdomainUrl}</code>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`https://${subdomainUrl}`); toast.success("Copied"); }}>
                    <Copy className="size-3.5" />
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={`https://${subdomainUrl}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success shrink-0">
              <CheckCircle2 className="size-3" /> Active
            </span>
          </div>
        </CardContent>
      </Card>

      {/* custom domain */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground shrink-0">
              <Globe className="size-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-sm font-medium">Custom domain</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use your own domain (e.g. <code className="vw-mono">vote.yourorg.edu</code>) for white-label access.
              </p>
            </div>
          </div>

          {customDomainUrl ? (
            <div className="rounded-lg bg-success/5 border border-success/20 p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="size-4 text-success" />
                <span className="text-sm font-medium text-success">Custom domain active</span>
              </div>
              <code className="vw-mono text-sm">{customDomainUrl}</code>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="size-4" />
                No custom domain configured.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-3">
            <Label htmlFor="domain">Set custom domain</Label>
            <Input
              id="domain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
              placeholder="vote.yourorg.edu"
            />
            <p className="text-xs text-muted-foreground">
              Enter the domain without https://. You'll need to point a CNAME record to <code className="vw-mono">votewise.com.ng</code>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending || !customDomain}>
              {updateMut.isPending ? "Saving…" : "Save domain"}
            </Button>
            {customDomainUrl && (
              <Button variant="outline" onClick={() => { setCustomDomain(""); updateMut.mutate(); }}>
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DNS instructions */}
      <Card className="vw-card-subtle">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium mb-3">DNS configuration</h3>
          <p className="text-xs text-muted-foreground mb-3">
            To use a custom domain, add the following DNS record with your domain provider:
          </p>
          <div className="overflow-x-auto votewise-scroll rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background-subtle">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-2"><code className="vw-mono text-xs">CNAME</code></td>
                  <td className="px-3 py-2"><code className="vw-mono text-xs">vote</code></td>
                  <td className="px-3 py-2"><code className="vw-mono text-xs text-primary">votewise.com.ng</code></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            <span>DNS propagation may take 24-48 hours. SSL certificates are automatically provisioned via Let's Encrypt once the DNS is verified.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
