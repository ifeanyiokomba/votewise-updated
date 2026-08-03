"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/votewise/primitives/theme-toggle";
import { ShieldCheck, LayoutDashboard, Vote, Users, Settings, LogOut, ExternalLink, Megaphone, Flag, Menu, X, CreditCard, UserPlus, BarChart3, Webhook, Lock, Key, Eye, Bell, Globe, ScrollText, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from "@/components/ui/sheet";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Observer", href: "/dashboard/observer", icon: Eye },
  { label: "Elections", href: "/dashboard/elections", icon: Vote },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { label: "Incidents", href: "/dashboard/incidents", icon: Flag },
  { label: "Audit Log", href: "/dashboard/audit-log", icon: ScrollText },
  { label: "Members", href: "/dashboard/members", icon: UserPlus },
  { label: "Webhooks", href: "/dashboard/webhooks", icon: Webhook },
  { label: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { label: "Domains", href: "/dashboard/domains", icon: Globe },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Security", href: "/dashboard/security", icon: Lock },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data } = useQuery<{ ok: boolean; data: { member: { name: string; email: string; role: string }; organization: { name: string; subdomain: string } | null } }>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      return res.json();
    },
    retry: false,
  });

  const member = data?.data?.member;
  const org = data?.data?.organization;
  const isPlatformAdmin = member?.role === "PLATFORM_ADMIN";

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <span className="vw-display text-sm">VoteWise</span>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Dashboard">
          {NAV.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          {isPlatformAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              )}
            >
              <Settings className="size-4" />
              Platform admin
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-3">
          {org && (
            <a
              href={`/o/${org.subdomain}`}
              target="_blank"
              rel="noreferrer"
              className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent/50"
            >
              <ExternalLink className="size-3.5" />
              View public portal
            </a>
          )}
          {member && (
            <div className="mb-2 px-3">
              <div className="truncate text-xs font-medium">{member.name}</div>
              <div className="truncate text-xs text-muted-foreground">{member.email}</div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-14 items-center justify-between border-b border-border px-4">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
                      <ShieldCheck className="size-4" />
                    </span>
                    <span className="vw-display text-sm">VoteWise</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close">
                    <X className="size-4" />
                  </Button>
                </div>
                <nav className="flex-1 space-y-1 p-3" aria-label="Mobile dashboard">
                  {NAV.map((item) => {
                    const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                        )}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                {member && (
                  <div className="border-t border-border p-3">
                    <div className="mb-2 px-3">
                      <div className="truncate text-xs font-medium">{member.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start">
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
            <span className="vw-display text-sm">VoteWise</span>
          </div>
          <ThemeToggle />
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto votewise-scroll min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
