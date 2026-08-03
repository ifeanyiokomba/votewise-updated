"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/votewise/primitives/theme-toggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { label: "Platform", href: "/#platform" },
  { label: "How it works", href: "/#how" },
  { label: "Security", href: "/#security" },
  { label: "Trust", href: "/#trust" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className ?? ""}`} aria-label="VoteWise home">
      <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheck className="size-4" />
      </span>
      <span className="vw-display text-lg tracking-tight">
        VoteWise<span className="text-accent">.</span>
      </span>
    </Link>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 vw-blur border-b border-border">
      <div className="vw-section flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/40"
            >
              {item.label}
            </Link>
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
                  <Logo />
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                    <X className="size-4" />
                  </Button>
                </div>
                <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {item.label}
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
