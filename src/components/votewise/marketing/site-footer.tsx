import Link from "next/link";
import { ShieldCheck, Lock, FileCheck, Eye } from "lucide-react";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Overview", href: "/#platform" },
      { label: "How it works", href: "/#how" },
      { label: "Security", href: "/#security" },
      { label: "Live results", href: "/#results" },
    ],
  },
  {
    title: "For voters",
    links: [
      { label: "Find your election", href: "/o/achema" },
      { label: "Verify a receipt", href: "/o/achema/verify" },
      { label: "Voter guide", href: "/#how" },
    ],
  },
  {
    title: "For organizations",
    links: [
      { label: "Get started", href: "/register" },
      { label: "Sign in", href: "/login" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Trust & security", href: "/#trust" },
      { label: "Compliance", href: "/#trust" },
      { label: "Contact", href: "mailto:hello@votewise.com.ng" },
    ],
  },
];

const BADGES = [
  { icon: Lock, label: "AES-256-GCM encrypted" },
  { icon: FileCheck, label: "Hash-chained audit" },
  { icon: Eye, label: "Observer-verifiable" },
  { icon: ShieldCheck, label: "Receipt-anchored" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background-subtle">
      <div className="vw-section py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <span className="vw-display text-lg">
                VoteWise<span className="text-accent">.</span>
              </span>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
              The Voting Operating System. Verifiable, tamper-evident elections for any organization.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {BADGES.map((b) => (
                <span key={b.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <b.icon className="size-3.5 text-primary" />
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-foreground">{col.title}</h3>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VoteWise. Built for trust.
          </p>
          <p className="text-xs text-muted-foreground">
            A next-generation rebuild — architecture, design &amp; engineering documentation in <code className="vw-mono text-foreground/80">/docs</code>.
          </p>
        </div>
      </div>
    </footer>
  );
}
