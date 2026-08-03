import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionHeader, Stat } from "@/components/votewise/primitives/section";
import {
  ShieldCheck, Lock, FileCheck, Eye, Vote, BarChart3, Users, Clock,
  Fingerprint, ScrollText, Bell, Smartphone, ArrowRight, CheckCircle2,
} from "lucide-react";

/* ---- Trust strip ---- */
export function TrustStrip() {
  return (
    <section className="border-y border-border bg-background-subtle">
      <div className="vw-section py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <Stat value="0" label="Votes lost" sub="Transactional, receipt-anchored" />
          <Stat value="AES-256" label="Vote encryption" sub="GCM authenticated" />
          <Stat value="15m" label="Access TTL" sub="Rotating JWT sessions" />
          <Stat value="WCAG 2.1" label="Accessibility" sub="AA in both themes" />
        </div>
      </div>
    </section>
  );
}

/* ---- Feature bento ---- */
const FEATURES = [
  {
    icon: Vote,
    title: "One voting engine, one path",
    body: "Every ballot flows through the same atomic, 8-step-validated recorder. No legacy routes, no bypass bugs — structurally impossible.",
    span: "md:col-span-2",
  },
  {
    icon: Lock,
    title: "Encrypted by default",
    body: "AES-256-GCM authenticated encryption. Choices are only decrypted after the election closes.",
  },
  {
    icon: FileCheck,
    title: "Unlinkable receipts",
    body: "Every voter gets a receipt code that proves participation without revealing the choice.",
  },
  {
    icon: Eye,
    title: "Observer-verifiable",
    body: "Designated observers monitor turnout, file incidents, and audit the chain — read-only, always.",
  },
  {
    icon: ScrollText,
    title: "Hash-chained audit log",
    body: "Every privileged action is appended to a tamper-evident chain with a genesis anchor. Breaking a link breaks the chain.",
    span: "md:col-span-2",
  },
];

export function FeatureBento() {
  return (
    <section id="platform" className="vw-section py-20 md:py-28">
      <SectionHeader
        eyebrow="The platform"
        title={<>Built like infrastructure, not a survey tool</>}
        subtitle="VoteWise treats an election as a ledger of record — calm, precise, and reproducible. Every layer is designed to survive election day."
        className="mb-12"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`vw-card vw-interactive vw-card-enter flex flex-col gap-3 ${f.span ?? ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="size-5" />
            </span>
            <h3 className="vw-display text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- How it works ---- */
const STEPS = [
  { icon: Users, title: "Set up the election", body: "Create your organization, add positions and candidates, import your voter roll. A wizard guides every step." },
  { icon: Fingerprint, title: "Voters authenticate", body: "Voters verify their identity with a one-time password delivered by email or SMS. No passwords to leak." },
  { icon: Vote, title: "Cast an encrypted ballot", body: "Each voter sees a shuffled, signed ballot. Selections are encrypted client-trusted and recorded atomically." },
  { icon: FileCheck, title: "Keep the receipt", body: "Every voter gets an unlinkable receipt code. Anyone can verify a receipt without learning the choice." },
  { icon: BarChart3, title: "Watch results live", body: "Real-time turnout and tally via WebSocket — O(1) per vote, not a full-table scan." },
  { icon: ShieldCheck, title: "Certify with proof", body: "On close, the tally is signed with an integrity hash. The certification seal is publicly verifiable." },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-border bg-background-subtle">
      <div className="vw-section py-20 md:py-28">
        <SectionHeader
          eyebrow="How it works"
          title={<>From setup to certified results in six steps</>}
          subtitle="A complete, auditable lifecycle — no spreadsheets, no manual tallying, no disputed counts."
          align="center"
          className="mb-14"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="vw-card vw-interactive vw-card-enter relative flex flex-col gap-3" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="vw-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="vw-display text-base">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Security ---- */
const SECURITY = [
  { icon: Lock, title: "5 SVE secrets", body: "Vote encryption, voter-hash pepper, HMAC, ballot pepper, voter pepper — all required at boot, no fallbacks." },
  { icon: ShieldCheck, title: "Defense in depth", body: "Caddy WAF → middleware headers → per-route guards → org-scoped queries → DB constraints." },
  { icon: Clock, title: "Rate-limited everywhere", body: "Login, OTP, vote-cast, and public reads are all bucketed. Redis-ready interface for scale." },
  { icon: Bell, title: "Lockout & alerts", body: "5 failed logins locks an account for 15 minutes. Suspicious events feed the integrity stream." },
  { icon: Fingerprint, title: "Per-election anonymity", body: "voterHash includes the electionId — cross-election correlation is impossible even if the voter table leaks." },
  { icon: Smartphone, title: "Accessible by design", body: "High-contrast, large-text, and reduced-motion modes. Keyboard-only voting works end-to-end." },
];

export function SecuritySection() {
  return (
    <section id="security" className="vw-section py-20 md:py-28">
      <SectionHeader
        eyebrow="Security architecture"
        title={<>Security is the product</>}
        subtitle="An election platform that can't explain its own integrity has no business running one. Here's ours."
        className="mb-12"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECURITY.map((s, i) => (
          <div key={s.title} className="vw-card-subtle vw-interactive vw-card-enter flex flex-col gap-3" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="grid size-9 place-items-center rounded-lg bg-card text-primary">
              <s.icon className="size-4" />
            </span>
            <h3 className="text-sm font-medium">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- Trust / compliance ---- */
export function TrustSection() {
  return (
    <section id="trust" className="border-t border-border bg-background-subtle">
      <div className="vw-section py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Trust & compliance"
              title={<>Proof, not promises</>}
              subtitle="Every claim VoteWise makes is backed by a verifiable artifact — a receipt, an audit hash, a certification seal."
            />
            <ul className="flex flex-col gap-3">
              {[
                "Receipt verification never reveals the candidate chosen",
                "Audit log is hash-chained with a genesis anchor",
                "Tally is reproducible from the encrypted vote log",
                "Certification seals are HMAC-signed and publicly checkable",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="vw-card vw-pop p-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="text-xs text-muted-foreground">Certification seal</div>
                <div className="vw-mono text-sm text-foreground">VW-2025-751601</div>
              </div>
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Integrity score</div>
                <div className="vw-stat text-2xl text-success">98.7</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Turnout</div>
                <div className="vw-stat text-2xl">72.4%</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Audit hash</div>
                <div className="vw-mono truncate text-xs text-foreground/80">a3f9c2e8b1d4…7k2m</div>
              </div>
              <div className="col-span-2 rounded-lg bg-success/10 p-3 text-xs text-success">
                <CheckCircle2 className="mr-1 inline size-3.5" />
                Chain integrity verified · 4,812 entries
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- Voter education guide ---- */
const GUIDE_STEPS = [
  { step: "01", title: "Check your eligibility", body: "Enter your voter ID on your organization's portal to confirm you're registered for the election.", icon: Fingerprint },
  { step: "02", title: "Receive your OTP", body: "A one-time password is sent to your email or phone. Enter it to securely access your ballot.", icon: Bell },
  { step: "03", title: "Review the candidates", body: "Browse candidate profiles, manifestos, and slogans before making your choice.", icon: Users },
  { step: "04", title: "Cast your vote", body: "Select your candidates, review your selections, and confirm. Your vote is encrypted instantly.", icon: Vote },
  { step: "05", title: "Keep your receipt", body: "You'll receive a unique receipt code. Save it — it proves your vote was recorded.", icon: FileCheck },
  { step: "06", title: "Verify anytime", body: "Use your receipt code to independently verify your vote exists on the public ledger.", icon: ShieldCheck },
];

export function VoterGuide() {
  return (
    <section id="guide" className="vw-section py-20 md:py-28">
      <SectionHeader
        eyebrow="Voter guide"
        title={<>How to cast your vote in 6 simple steps</>}
        subtitle="Designed for first-time voters. No technical knowledge required — if you can send a text message, you can vote on VoteWise."
        align="center"
        className="mb-14"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDE_STEPS.map((s, i) => (
          <div
            key={s.step}
            className="vw-card vw-interactive vw-card-enter relative flex flex-col gap-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <span className="vw-mono text-2xl font-light text-muted-foreground/30">{s.step}</span>
            </div>
            <h3 className="vw-display text-base">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- Animated stats counter ---- */
export function StatsCounter() {
  return (
    <section className="border-y border-border bg-background-subtle">
      <div className="vw-section py-16 md:py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: "0", label: "Votes lost", sub: "Transactional guarantee", icon: ShieldCheck, color: "text-success" },
            { value: "AES-256", label: "Encryption", sub: "GCM authenticated", icon: Lock, color: "text-primary" },
            { value: "99.99%", label: "Uptime SLA", sub: "Enterprise plan", icon: Clock, color: "text-info" },
            { value: "WCAG 2.1", label: "Accessibility", sub: "AA compliant", icon: Smartphone, color: "text-accent" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center vw-card-enter"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className={`grid size-12 place-items-center rounded-xl bg-card mb-3 ${stat.color}`}>
                <stat.icon className="size-6" />
              </span>
              <div className="vw-stat text-3xl md:text-4xl">{stat.value}</div>
              <div className="mt-1 text-sm font-medium">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Final CTA ---- */
export function CTASection() {
  return (
    <section className="vw-section py-20 md:py-28">
      <div className="vw-card vw-pop relative overflow-hidden p-10 md:p-16 text-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-20 blur-3xl"
          style={{ background: "radial-gradient(ellipse at center, var(--primary), transparent 70%)" }}
          aria-hidden
        />
        <h2 className="vw-display text-3xl md:text-4xl tracking-tight">
          Run your next election on trust<span className="text-accent">.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Set up an organization in minutes. Import your voters. Open the polls. Certify with proof.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="group">
            <Link href="/register">
              Create your organization
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/o/achema">Explore the demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
