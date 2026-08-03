import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------- formatting (single source — no duplication) ---------- */

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatPercent(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "0%";
  return `${n.toFixed(digits)}%`;
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function timeAgo(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const sec = Math.round(diff / 1000);
  if (Math.abs(sec) < 60) return rtf.format(-sec, "second");
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 30) return rtf.format(-day, "day");
  const mon = Math.round(day / 30);
  if (Math.abs(mon) < 12) return rtf.format(-mon, "month");
  return rtf.format(-Math.round(mon / 12), "year");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

/** Deterministic colour from a string — for avatars / chart chips */
export function colorFromString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 55% 45%)`;
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
