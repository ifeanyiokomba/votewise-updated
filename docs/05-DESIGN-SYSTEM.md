# VoteWise — Design System (Phase 5)

> An original design system for a **Voting Operating System**. Principles are informed by studying
> termii.com (typography, spacing, hierarchy, restraint) but **no branding, colors, logos,
> illustrations, or proprietary assets are copied**. The result is tuned for trust, legibility,
> and the gravity an election platform deserves.

---

## 1. Design philosophy

| Principle | What it means |
|---|---|
| **Ledger, not billboard** | The UI reads like a document of record — calm, precise, high-contrast type. No marketing theatrics inside the product. |
| **Warm neutral foundation** | Backgrounds are warm off-whites / warm near-blacks, never pure `#fff`/`#000`. Reduces glare, feels printed. |
| **One accent, used sparingly** | A single emerald accent for the "brand period" and active states. Status colors (amber/red/green) are reserved for state, never decoration. |
| **Restraint over decoration** | No gradients on cards. No drop shadows on flat surfaces. Borders are hairlines. Whitespace does the separating. |
| **Data as design** | Big numbers use lighter weight (400–500), tabular figures, negative tracking. Numbers read as fact, not hype. |
| **Dark mode first** | Dark is the default; light is an explicit choice. Both are fully tokenised. |
| **Accessibility is the floor** | WCAG 2.1 AA contrast in both themes. Focus rings are 2px and visible. Reduced-motion respected. Three a11y modes (high-contrast, large-text, reduced-motion) as user toggles. |

---

## 2. Color tokens (OKLCH)

OKLCH gives perceptually uniform lightness — critical for a system where status colors must read
consistently across light/dark.

### 2.1 Dark theme (default)

```
--background:        oklch(0.16 0.012 160)   /* warm near-black, green undertone */
--background-subtle: oklch(0.19 0.012 160)
--foreground:        oklch(0.96 0.008 160)   /* warm near-white */
--muted-foreground:  oklch(0.68 0.015 160)
--card:              oklch(0.20 0.012 160)
--card-foreground:   oklch(0.96 0.008 160)
--border:            oklch(1 0 0 / 8%)
--border-strong:     oklch(1 0 0 / 14%)

--primary:           oklch(0.72 0.14 155)    /* emerald — the one accent */
--primary-foreground:oklch(0.16 0.012 160)
--accent:            oklch(0.75 0.13 75)     /* warm gold — used ONLY for the "brand period" */
--ring:              oklch(0.72 0.14 155)

--success:           oklch(0.72 0.16 150)
--warning:           oklch(0.78 0.15 75)
--destructive:       oklch(0.64 0.21 25)
--info:              oklch(0.70 0.10 220)
```

### 2.2 Light theme

```
--background:        oklch(0.985 0.006 160)  /* warm off-white */
--background-subtle: oklch(0.965 0.008 160)
--foreground:        oklch(0.21 0.015 160)
--muted-foreground:  oklch(0.50 0.015 160)
--card:              oklch(0.997 0.004 160)
--card-foreground:   oklch(0.21 0.015 160)
--border:            oklch(0.90 0.008 160)
--border-strong:     oklch(0.84 0.010 160)

--primary:           oklch(0.45 0.11 158)    /* deep forest emerald */
--primary-foreground:oklch(0.985 0.006 160)
--accent:            oklch(0.62 0.13 70)
--ring:              oklch(0.45 0.11 158)

--success:           oklch(0.55 0.15 150)
--warning:           oklch(0.70 0.16 70)
--destructive:       oklch(0.55 0.22 25)
--info:              oklch(0.50 0.12 230)
```

### 2.3 Status semantics

| Token | Meaning | Examples |
|---|---|---|
| `success` | confirmed, certified, live | "Vote recorded", "Election certified" |
| `warning` | needs attention, paused | "Election paused", "OTP low delivery" |
| `destructive` | error, revoked, cancelled | "Double vote detected", "Election cancelled" |
| `info` | neutral notice | "Results hidden until close" |

### 2.4 Chart palette (harmonised, 5 series)

```
--chart-1: emerald   (primary)
--chart-2: gold      (accent)
--chart-3: teal
--chart-4: terracotta
--chart-5: sage
```

---

## 3. Typography

### 3.1 Typeface

- **Sans (body + UI):** Geist — variable, designed for screens, excellent tabular figures.
- **Display (headings):** Space Grotesk — geometric, slightly technical, pairs with Geist.
- **Mono (code, receipt codes, IDs):** Geist Mono.

### 3.2 Type scale

| Role | Size | Weight | Line-height | Tracking | Family |
|---|---|---|---|---|---|
| Display XL (hero H1) | clamp(2.5rem, 5vw, 3.5rem) | 500 | 1.05 | -0.03em | Space Grotesk |
| Display L (page H1) | clamp(2rem, 3.5vw, 2.75rem) | 500 | 1.1 | -0.025em | Space Grotesk |
| Display M (section H2) | 1.75rem | 500 | 1.2 | -0.02em | Space Grotesk |
| Display S (card title) | 1.25rem | 500 | 1.3 | -0.015em | Space Grotesk |
| Body L (lead) | 1.125rem | 400 | 1.6 | 0 | Geist |
| Body | 1rem | 400 | 1.55 | 0 | Geist |
| Body S (meta) | 0.875rem | 400 | 1.5 | 0 | Geist |
| Label / eyebrow | 0.75rem | 500 | 1.4 | 0.08em uppercase | Geist |
| Stat number | clamp(2rem, 4vw, 3rem) | 400 | 1 | -0.04em tabular | Space Grotesk |
| Code / receipt | 0.875rem | 500 | 1.4 | 0.02em | Geist Mono |

### 3.3 Rules

- Headings never exceed weight 500. Heavier weights read as "marketing", not "system of record".
- Stat numbers use **weight 400** with `tabular-nums` — they read as data, not hype.
- The **brand period**: section/page headings may end with a `.` colored `--accent`. This is the
  single signature flourish. Used at most once per section.
- Body text minimum 1rem (16px). Inputs forced to 16px to prevent iOS zoom.

---

## 4. Spacing & layout

### 4.1 Spacing scale (4px base)

`0 · 1 (4px) · 2 (8px) · 3 (12px) · 4 (16px) · 5 (20px) · 6 (24px) · 8 (32px) · 10 (40px) · 12 (48px) · 16 (64px) · 24 (96px)`

### 4.2 Layout

| Container | Max width | Side padding |
|---|---|---|
| `vw-section` (page content) | 1152px | 24px (mobile) / 40px (desktop) |
| `vw-prose` (long-form) | 720px | 24px |
| `vw-wide` (tables, dashboards) | 1440px | 24px / 32px |

### 4.3 Section rhythm

- Vertical section padding: `clamp(4rem, 8vw, 7rem)` top and bottom.
- Alternating backgrounds: `--background` / `--background-subtle` to create rhythm without rules.
- Section header pattern: eyebrow → H2 → supporting paragraph → optional divider.

---

## 5. Radius & elevation

### 5.1 Radius

```
--radius-sm: 8px    /* inputs, pills */
--radius:    12px   /* buttons, small cards */
--radius-lg: 16px   /* cards, dialogs */
--radius-xl: 20px   /* large panels, mega-menu */
--radius-full: 9999px /* avatars, toggle */
```

### 5.2 Elevation (used sparingly)

| Level | Use | Value |
|---|---|---|
| none | flat cards, tables | 1px hairline border only |
| `vw-lift` | hover on interactive cards | `translateY(-2px)` + subtle border strengthen |
| `vw-pop` | dropdowns, popovers, dialogs | `0 8px 24px oklch(0 0 0 / 0.12)` |
| `vw-floating` | floating action, nav blur | `backdrop-blur(12px)` + translucent bg |

**Rule:** cards on a flat page have **no shadow** — a hairline border + subtle background tint is
the separator. Shadows are reserved for elements that float above the page (menus, dialogs).

---

## 6. Components

### 6.1 Buttons

| Variant | When | Style |
|---|---|---|
| `primary` | main action per view | solid `--primary` bg, `--primary-foreground` text, radius 12px |
| `secondary` | alternate action | transparent bg, 1px `--border-strong`, foreground text |
| `ghost` | tertiary / nav | transparent, muted text, hover bg `--background-subtle` |
| `destructive` | irreversible | solid `--destructive` |
| `link` | inline action | foreground text, underline on hover |

- Height: `sm` 32px / `md` 40px / `lg` 44px (touch minimum).
- Padding asymmetric where an arrow icon sits: more trailing space.
- Focus: 2px `--ring` outline offset 2px.
- Disabled: 50% opacity, `cursor-not-allowed`.

### 6.2 Cards

```
.vw-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;            /* 24px */
}
.vw-card--subtle { background: var(--background-subtle); }
.vw-card--interactive { transition: border-color .15s, transform .15s; }
.vw-card--interactive:hover { border-color: var(--border-strong); }
```

### 6.3 Tables

- Hairline borders only (horizontal), header row `--background-subtle`.
- `tabular-nums` on numeric columns.
- Mobile: horizontally scrollable with a faint scroll affordance (edge gradient).

### 6.4 Forms

- Label above input, 0.875rem, weight 500.
- Helper text below, 0.8125rem, `--muted-foreground`.
- Error text below, 0.8125rem, `--destructive`, with icon.
- Inputs: 40px height, 12px radius, 1px border, focus ring 2px.
- All forms use `react-hook-form` + `zod` — client validation mirrors server.

### 6.5 Status pills

```
status: LIVE      → success bg/10%, success text, dot pulse
status: SCHEDULED → info bg/10%, info text
status: CLOSED    → muted bg/10%, muted text
status: CERTIFIED → success solid, primary-foreground
status: DRAFT     → muted bg/10%, muted text, dashed border
```

---

## 7. Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Page/section entrance: `opacity 0→1, translateY(8px→0)` over 300ms, staggered 40ms.
- Hover lifts: 150ms ease.
- Live dot pulse: 2s ease-in-out infinite (disabled in reduced-motion).
- Number count-up on stat cards: 800ms ease-out (disabled in reduced-motion).
- **Never** scroll-jack, never autoplay video, never parallax.

---

## 8. Iconography

- **Lucide React** (already in shadcn/ui) — 1.5px stroke, 16/20/24px sizes.
- Icon-only buttons require `aria-label`.
- Status icons paired with text, never alone (colorblind safety).

---

## 9. Accessibility modes (user toggles)

Three classes on `<html>`, combinable, persisted via next-themes:

```css
.high-contrast {
  --background: oklch(0 0 0);
  --foreground: oklch(1 0 0);
  --border: oklch(1 0 0 / 30%);
  --primary: oklch(0.75 0.18 150);  /* brighter for contrast */
  :focus-visible { outline: 3px solid oklch(0.85 0.2 90); }
}
.large-text {
  font-size: 1.125rem;             /* base 18px */
  /* headings scale 1.15x */
}
.reduce-motion {
  /* same as prefers-reduced-motion above, force-on */
}
```

A ThemeToggle in the nav exposes: Light / Dark / System / High contrast / Large text / Reduced motion.

---

## 10. Navigation patterns

### 10.1 Marketing nav

- Fixed, 64px, translucent `--background` at 85% + `backdrop-blur(12px)` + 1px hairline bottom border.
- Left: wordmark logo. Center: nav links. Right: Sign in + Get started + theme toggle.
- Mobile: collapses to logo + hamburger (sheet).

### 10.2 Org portal nav

- Sticky, 56px, solid bg.
- Left: org name + back-to-home. Center: contextual tabs (Portal · Candidates · Results · Verify).
- Right: theme toggle.

### 10.3 Dashboard sidebar

- Fixed 240px sidebar (collapsible to 64px icon-rail on desktop, drawer on mobile).
- Sections: Workspace (Overview, Elections, Voters), Org (Settings, Audit), collapsed by default.
- Active item: `--primary` text, left 2px `--primary` bar.

---

## 11. Voice & microcopy

- **Direct, second person.** "Cast your vote" not "Voting functionality".
- **State over instruction.** "Vote recorded" not "Your vote has been successfully submitted".
- **Receipts are sacred.** Always show the full receipt code in mono, with a copy button. Never
  truncate.
- **Errors are actionable.** "Election hasn't opened yet. It starts in 2 hours." not "Error 409".
- **No exclamation marks** in the product UI. Ever.

---

## 12. Token export

All tokens live in `src/app/globals.css` as CSS custom properties, mapped into Tailwind v4 via
`@theme inline`. Components consume `bg-background`, `text-foreground`, `border-border`, etc. —
never raw hex. This guarantees theme switching works everywhere with no per-component overrides.
