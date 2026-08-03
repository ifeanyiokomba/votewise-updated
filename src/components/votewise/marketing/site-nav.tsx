"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown, Vote, ShieldCheck, BarChart3, Eye, FileText, Users, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/votewise/primitives/theme-toggle";
import { VoteWiseLogo } from "@/components/votewise/primitives/logo";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  icon: typeof Vote;
  title: string;
  description: string;
  href: string;
}

interface NavSection {
  label: string;
  items: MenuItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Platform",
    items: [
      { label: "Voting engine", icon: Vote, title: "Secure Voting Engine", description: "AES-256-GCM encrypted ballots with 8-step validation", href: "/#platform" },
      { label: "Live results", icon: BarChart3, title: "Real-time results", description: "WebSocket-powered live tally with O(1) per vote", href: "/#platform" },
      { label: "Audit trail", icon: ShieldCheck, title: "Hash-chained audit", description: "Tamper-evident SHA-256 chain with genesis anchor", href: "/#platform" },
      { label: "Observer mode", icon: Eye, title: "Independent monitoring", description: "Read-only access for election observers", href: "/#platform" },
    ],
  },
  {
    label: "How it works",
    items: [
      { label: "Setup", icon: FileText, title: "Create election", description: "Templates for SUG, board, AGM, and more", href: "/#how" },
      { label: "Voting", icon: Vote, title: "Cast a vote", description: "OTP auth → encrypted ballot → receipt", href: "/#how" },
      { label: "Verify", icon: CheckCircle2, title: "Verify receipts", description: "Public receipt verification without revealing choice", href: "/#how" },
      { label: "Certify", icon: ShieldCheck, title: "Certify results", description: "HMAC-signed certification with audit hash", href: "/#how" },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Encryption", icon: Lock, title: "5 SVE secrets", description: "AES-256-GCM, HMAC-SHA256, scrypt, peppers", href: "/#security" },
      { label: "Auth", icon: ShieldCheck, title: "JWT + 2FA", description: "15-min access tokens, TOTP two-factor auth", href: "/#security" },
      { label: "Rate limiting", icon: BarChart3, title: "Layered limits", description: "Login, OTP, vote-cast, and public read limits", href: "/#security" },
      { label: "Accessibility", icon: Users, title: "WCAG 2.1 AA", description: "High contrast, large text, reduced motion modes", href: "/#security" },
    ],
  },
  {
    label: "Trust",
    items: [
      { label: "Receipts", icon: CheckCircle2, title: "Unlinkable receipts", description: "Prove participation without revealing choice", href: "/#trust" },
      { label: "Audit", icon: ShieldCheck, title: "Public audit", description: "Anyone can verify the hash chain independently", href: "/o/achema/audit" },
      { label: "Certification", icon: FileText, title: "Certification seals", description: "HMAC-signed, publicly verifiable seals", href: "/#trust" },
      { label: "RLA", icon: BarChart3, title: "Risk-limiting audit", description: "Statistical post-election audit", href: "/#trust" },
    ],
  },
];

function MegaMenu({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/40"
        aria-expanded={open}
      >
        {section.label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {/* Mega menu panel */}
      {open && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="vw-menu-enter rounded-xl border border-border bg-card shadow-lg p-2 min-w-[420px]">
            <div className="grid grid-cols-2 gap-1">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <item.icon className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-border mt-2 pt-2 px-3 pb-1">
              <Link
                href={section.items[0]?.href ?? "/"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Explore all <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 vw-blur border-b border-border">
      <div className="vw-section flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="VoteWise home">
          <VoteWiseLogo size={32} />
        </Link>

        {/* Desktop mega-menu nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV_SECTIONS.map((section) => (
            <MegaMenu key={section.label} section={section} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">Get started</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="flex flex-col gap-2 pt-6">
                <div className="flex items-center justify-between">
                  <VoteWiseLogo size={28} />
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                    <X className="size-4" />
                  </Button>
                </div>
                <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                  {NAV_SECTIONS.map((section) => (
                    <Link
                      key={section.label}
                      href={section.items[0]?.href ?? "/"}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {section.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-6 flex flex-col gap-2">
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href="/register">Get started</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

// Re-export Logo for backward compatibility
export { VoteWiseLogo as Logo };
