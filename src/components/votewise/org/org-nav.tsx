"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/votewise/primitives/theme-toggle";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoteWiseLogo } from "@/components/votewise/primitives/logo";

const TABS = [
  { label: "Portal", href: "" },
  { label: "Candidates", href: "/candidates" },
  { label: "Results", href: "/results" },
  { label: "Archive", href: "/archive" },
  { label: "Audit", href: "/audit" },
  { label: "Observe", href: "/observe" },
  { label: "Check", href: "/check" },
  { label: "Verify", href: "/verify" },
];

export function OrgNav({ subdomain, orgName }: { subdomain: string; orgName: string }) {
  const pathname = usePathname();
  const base = `/o/${subdomain}`;

  return (
    <header className="sticky top-0 z-50 vw-blur border-b border-border">
      <div className="vw-section flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground" aria-label="Back to home">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            <VoteWiseLogo size={24} showWordmark={false} />
            <span className="vw-display text-sm">{orgName}</span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Org sections">
          {TABS.map((tab) => {
            const href = base + tab.href;
            const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="md:hidden">
            <Link href={`${base}/vote`}>Vote</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* mobile tab strip */}
      <div className="vw-section flex gap-1 overflow-x-auto pb-2 md:hidden votewise-scroll">
        {TABS.map((tab) => {
          const href = base + tab.href;
          const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
                active ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
