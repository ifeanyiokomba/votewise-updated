"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader, EmptyState } from "@/components/votewise/primitives/section";
import { formatDateTime, timeAgo, cn, initials, colorFromString } from "@/lib/utils";
import { UserPlus, Shield, Eye, Crown, MoreVertical, Ban, CheckCircle2, KeyRound, Copy } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MembersData {
  ok: boolean;
  data: {
    members: Array<{
      id: string; email: string; name: string; role: string; status: string;
      lastLoginAt: string | null; createdAt: string; totpEnabled: boolean;
    }>;
    currentMemberId: string;
  };
}

const ROLE_META: Record<string, { label: string; icon: typeof Crown; tone: string }> = {
  PLATFORM_ADMIN: { label: "Platform Admin", icon: Crown, tone: "text-primary" },
  ORG_OWNER: { label: "Owner", icon: Crown, tone: "text-primary" },
  ORG_ADMIN: { label: "Admin", icon: Shield, tone: "text-info" },
  OBSERVER: { label: "Observer", icon: Eye, tone: "text-muted-foreground" },
};

export default function MembersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "OBSERVER" as string });
  const [tempCreds, setTempCreds] = useState<{ email: string; password: string } | null>(null);

  const { data, isLoading } = useQuery<MembersData>({
    queryKey: ["members"],
    queryFn: async () => (await fetch("/api/dashboard/members")).json(),
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) {
        toast.success("Member invited");
        setTempCreds({ email: d.data.member.email, password: d.data.tempPassword });
        setShowForm(false);
        setForm({ name: "", email: "", role: "OBSERVER" });
        qc.invalidateQueries({ queryKey: ["members"] });
      } else toast.error(d.error?.message ?? "Failed");
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, role, status }: { id: string; role?: string; status?: string }) => {
      const res = await fetch("/api/dashboard/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, role, status }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) { toast.success("Member updated"); qc.invalidateQueries({ queryKey: ["members"] }); }
      else toast.error(d.error?.message ?? "Failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading members" />;
  const members = data?.data?.members ?? [];
  const currentMemberId = data?.data?.currentMemberId;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vw-display text-2xl">Team members</h1>
          <p className="text-sm text-muted-foreground">Manage who has access to your organization.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus className="size-4" /> {showForm ? "Cancel" : "Invite member"}
        </Button>
      </div>

      {/* invite form */}
      {showForm && (
        <Card className="mb-4 vw-fade-up">
          <CardContent className="p-6">
            <h3 className="vw-display text-base mb-4">Invite a new member</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Prof. Jane Smith" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@achema.edu" />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="h-10 w-fit rounded-md border border-input bg-background px-3 text-sm"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="OBSERVER">Observer — monitor & report incidents</option>
                <option value="ORG_ADMIN">Admin — manage elections & voters</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => inviteMut.mutate()} disabled={!form.name || !form.email || inviteMut.isPending}>
                {inviteMut.isPending ? "Inviting…" : "Send invitation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* temp credentials display (demo) */}
      {tempCreds && (
        <Card className="mb-4 vw-fade-up border-info/30 bg-info/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <KeyRound className="size-5 text-info shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-info">Member created (demo credentials)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  In production, an invitation email would be sent. For this demo, share these credentials:
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md bg-background p-3">
                    <div className="text-xs text-muted-foreground">Email</div>
                    <code className="vw-mono text-sm">{tempCreds.email}</code>
                  </div>
                  <div className="rounded-md bg-background p-3">
                    <div className="text-xs text-muted-foreground">Temp password</div>
                    <div className="flex items-center gap-2">
                      <code className="vw-mono text-sm">{tempCreds.password}</code>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(tempCreds.password); toast.success("Copied"); }}>
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTempCreds(null)}>Dismiss</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* member list */}
      {members.length === 0 ? (
        <EmptyState icon={<UserPlus className="size-8" />} title="No members yet" description="Invite team members to help manage elections." />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const meta = ROLE_META[m.role] ?? ROLE_META.OBSERVER;
            const isCurrentUser = m.id === currentMemberId;
            return (
              <Card key={m.id} className={cn("vw-interactive", m.status === "SUSPENDED" && "opacity-60")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="size-10" style={{ backgroundColor: colorFromString(m.name) }}>
                    <AvatarFallback className="text-white text-xs font-medium">{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{m.name}</span>
                      {isCurrentUser && <span className="text-xs text-muted-foreground">(you)</span>}
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted", meta.tone)}>
                        <meta.icon className="size-3" /> {meta.label}
                      </span>
                      {m.status === "SUSPENDED" && <span className="text-xs text-destructive">Suspended</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.lastLoginAt ? `Last active ${timeAgo(m.lastLoginAt)}` : "Never logged in"}
                    </div>
                  </div>
                  {!isCurrentUser && m.role !== "ORG_OWNER" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Member actions">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Role</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateMut.mutate({ id: m.id, role: "ORG_ADMIN" })}>
                          <Shield className="size-3.5" /> Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateMut.mutate({ id: m.id, role: "OBSERVER" })}>
                          <Eye className="size-3.5" /> Make Observer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {m.status === "ACTIVE" ? (
                          <DropdownMenuItem className="text-destructive" onClick={() => updateMut.mutate({ id: m.id, status: "SUSPENDED" })}>
                            <Ban className="size-3.5" /> Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-success" onClick={() => updateMut.mutate({ id: m.id, status: "ACTIVE" })}>
                            <CheckCircle2 className="size-3.5" /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
