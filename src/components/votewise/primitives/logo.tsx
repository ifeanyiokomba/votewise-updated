import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

/**
 * VoteWise brand logo — an original design.
 *
 * Concept: A shield (security/trust) containing a ballot box with a
 * checkmark (verified vote). The shield has a subtle gradient from
 * deep emerald to bright mint, with the accent dot forming the
 * "i" in VoteWise (the brand period).
 *
 * This is an original SVG — not derived from any existing logo.
 */
export function VoteWiseLogo({ className, size = 32, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vw-shield-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id="vw-inner-grad" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--primary)" stopOpacity="0.15" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Shield outline */}
        <path
          d="M20 2L4 8v12c0 9.6 6.8 16.4 16 18c9.2-1.6 16-8.4 16-18V8L20 2z"
          fill="url(#vw-shield-grad)"
        />
        {/* Inner shield */}
        <path
          d="M20 5.5L7.5 10.2v9.8c0 7.8 5.4 13.2 12.5 14.5c7.1-1.3 12.5-6.7 12.5-14.5v-9.8L20 5.5z"
          fill="var(--card)"
          fillOpacity="0.95"
        />
        {/* Ballot box */}
        <rect x="13" y="13" width="14" height="11" rx="1.5" fill="url(#vw-inner-grad)" stroke="var(--primary)" strokeWidth="1.2" />
        {/* Ballot slot */}
        <rect x="16" y="11" width="8" height="3" rx="0.5" fill="var(--primary)" />
        {/* Checkmark */}
        <path
          d="M16 19l2.5 2.5L23 16.5"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Base line */}
        <line x1="14" y1="27" x2="26" y2="27" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      </svg>

      {showWordmark && (
        <span className="vw-display text-lg tracking-tight">
          VoteWise<span className="text-accent">.</span>
        </span>
      )}
    </span>
  );
}
