"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, CheckCircle2, Vote, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { TypingText } from "@/components/votewise/primitives/typing-text";
import { DataFlowBackground } from "@/components/votewise/primitives/data-flow-background";
import { FlyingHeadshots } from "@/components/votewise/primitives/flying-headshots";

const PIPELINE = [
  { label: "Voter verified", icon: ShieldCheck, color: "text-success" },
  { label: "Ballot encrypted", icon: Lock, color: "text-info" },
  { label: "Vote recorded", icon: Vote, color: "text-primary" },
  { label: "Receipt issued", icon: CheckCircle2, color: "text-success" },
];

const ROTATING_WORDS = ["actually trust", "verify", "audit", "prove"];

/** Deterministic 8-char hex from a label — stable across SSR and client. */
function hashLabel(label: string): string {
  let h = 2166136261;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

function Lock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function Hero() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (PIPELINE.length + 1)), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative votewise-hero-bg overflow-hidden">
      {/* Data flow + flying candidate headshots */}
      <DataFlowBackground />
      <FlyingHeadshots />
      <div className="votewise-grid-bg absolute inset-0 opacity-15" aria-hidden />

      <div className="vw-section relative py-12 md:min-h-[calc(100vh-4rem)] md:flex md:items-center md:py-16 lg:py-20">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 items-center w-full">
          {/* Left: copy */}
          <div className="flex flex-col gap-6 vw-fade-up">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs">
              <span className="votewise-live-dot" />
              <span className="text-muted-foreground">Election-grade infrastructure</span>
            </div>

            <h1 className="vw-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Elections you can
              <br />
              <TypingText
                words={ROTATING_WORDS}
                className="text-primary"
                typingSpeed={70}
                deletingSpeed={35}
                pauseDuration={2000}
              />
              <span className="text-accent">.</span>
            </h1>

            <p className="max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
              VoteWise is the Voting Operating System for organizations that take integrity
              seriously. Encrypted ballots, unlinkable receipts, real-time results, and a
              hash-chained audit trail — built for universities, cooperatives, and institutions.
            </p>

            <div className="flex gap-2 sm:gap-3">
              <Button asChild className="group flex-1 text-sm sm:text-base shadow-lg shadow-primary/20">
                <Link href="/register">
                  Start now
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 text-sm sm:text-base">
                <Link href="/o/achema">Live demo</Link>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> No vote loss, ever</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> WCAG 2.1 AA accessible</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Observer-verifiable</span>
            </div>
          </div>

          {/* Right: animated ballot pipeline mockup */}
          <div className="relative vw-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="vw-card vw-pop relative overflow-hidden p-6 md:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="text-xs text-muted-foreground">SUG General Elections 2025</div>
                  <div className="vw-display text-lg">Achema State University</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  <span className="votewise-live-dot" /> LIVE
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {PIPELINE.map((p, idx) => {
                  const active = idx <= step;
                  return (
                    <div
                      key={p.label}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all duration-300 ${
                        active
                          ? "border-border-strong bg-background-subtle opacity-100"
                          : "border-border opacity-40"
                      }`}
                    >
                      <span className={`grid size-8 place-items-center rounded-md ${active ? "bg-primary/10" : "bg-muted"}`}>
                        <p.icon className={`size-4 ${active ? p.color : "text-muted-foreground"}`} />
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{p.label}</div>
                        <div className="vw-mono text-xs text-muted-foreground">
                          {active ? "0x" + hashLabel(p.label) : "pending"}
                        </div>
                      </div>
                      {active && idx === step && (
                        <CheckCircle2 className="size-4 text-success" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-lg bg-background-subtle p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BarChart3 className="size-3.5" />
                  Live turnout
                </div>
                <div className="vw-stat text-xl text-foreground">72.4%</div>
              </div>

              <div className="mt-3 text-center">
                <span className="vw-mono text-[10px] text-muted-foreground">
                  Receipt: VW-2025-A7K9M2XP · integrity verified
                </span>
              </div>
            </div>

            {/* floating accent orb */}
            <div
              className="pointer-events-none absolute -right-8 -top-8 -z-10 size-40 rounded-full opacity-30 blur-2xl"
              style={{ background: "var(--primary)", animation: "vw-float 6s ease-in-out infinite" }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}
