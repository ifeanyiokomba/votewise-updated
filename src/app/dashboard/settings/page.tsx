"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader, SectionHeader } from "@/components/votewise/primitives/section";
import { Building2, Palette, Save, Globe, Clock } from "lucide-react";

interface OrgData {
  ok: boolean;
  data: {
    organization: {
      id: string; name: string; subdomain: string; category: string; plan: string; status: string;
      locale: string; timezone: string;
    };
  };
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<OrgData>({
    queryKey: ["me"],
    queryFn: async () => (await fetch("/api/auth/me")).json(),
  });

  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");

  // load brand
  useQuery({
    queryKey: ["brand"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/settings/brand");
      const json = await res.json();
      if (json.ok) {
        setTagline(json.data.brand?.tagline ?? "");
        setPrimaryColor(json.data.brand?.primaryColor ?? "");
        setAccentColor(json.data.brand?.accentColor ?? "");
      }
      return json;
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/settings/brand", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tagline, primaryColor, accentColor }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["brand"] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (isLoading || !data?.data) return <PageLoader label="Loading settings" />;
  const org = data.data.organization;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="vw-display text-2xl">Organization settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization profile and branding.</p>
      </div>

      {/* org info */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Organization</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Name", value: org.name, icon: Building2 },
              { label: "Subdomain", value: org.subdomain, icon: Globe },
              { label: "Type", value: org.category, icon: Building2 },
              { label: "Plan", value: org.plan, icon: Building2 },
              { label: "Status", value: org.status, icon: Building2 },
              { label: "Timezone", value: org.timezone, icon: Clock },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><s.icon className="size-3" /> {s.label}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* branding */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Branding</h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Secure elections, verified results." />
              <p className="text-xs text-muted-foreground">Shown on your public portal.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="primary">Primary color</Label>
                <div className="flex items-center gap-2">
                  <Input id="primary" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#163D2E" className="flex-1" />
                  {primaryColor && <div className="size-8 rounded-md border border-border" style={{ backgroundColor: primaryColor }} />}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accent">Accent color</Label>
                <div className="flex items-center gap-2">
                  <Input id="accent" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#00C48C" className="flex-1" />
                  {accentColor && <div className="size-8 rounded-md border border-border" style={{ backgroundColor: accentColor }} />}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                <Save className="size-4" /> {saveMut.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
