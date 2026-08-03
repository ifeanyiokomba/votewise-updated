"use client";

/**
 * Animated spiral background — concentric rings that rotate slowly,
 * plus floating colored orbs. Inspired by Termii's approach of using
 * subtle animated backgrounds behind hero sections, but with original
 * VoteWise geometry and colors.
 *
 * No external images. Pure CSS + SVG.
 */
export function SpiralBackground() {
  const rings = [
    { size: 200, duration: 40, delay: 0, opacity: 0.3 },
    { size: 400, duration: 60, delay: -5, opacity: 0.2 },
    { size: 600, duration: 80, delay: -10, opacity: 0.15 },
    { size: 800, duration: 100, delay: -15, opacity: 0.1 },
    { size: 1000, duration: 120, delay: -20, opacity: 0.08 },
  ];

  const orbs = [
    { size: 300, top: "10%", left: "70%", color: "var(--primary)", duration: 8, delay: 0 },
    { size: 200, top: "60%", left: "20%", color: "var(--accent)", duration: 10, delay: -3 },
    { size: 150, top: "30%", left: "85%", color: "var(--info)", duration: 12, delay: -6 },
  ];

  return (
    <div className="vw-spiral-bg" aria-hidden>
      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <div
          key={`orb-${i}`}
          className="vw-orb"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: orb.color,
            opacity: 0.12,
            animation: `vw-float ${orb.duration}s ease-in-out ${orb.delay}s infinite, vw-pulse-glow ${orb.duration * 2}s ease-in-out ${orb.delay}s infinite`,
          }}
        />
      ))}

      {/* Concentric rotating rings */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {rings.map((ring, i) => (
          <circle
            key={`ring-${i}`}
            cx="600"
            cy="400"
            r={ring.size}
            stroke="var(--border)"
            strokeWidth="1"
            opacity={ring.opacity}
            style={{
              transformOrigin: "600px 400px",
              animation: `vw-spin-slow ${ring.duration}s linear ${ring.delay}s infinite`,
            }}
            strokeDasharray={i % 2 === 0 ? "4 8" : "2 12"}
          />
        ))}
        {/* Dashed accent arcs */}
        <circle
          cx="600" cy="400" r="350"
          stroke="var(--primary)"
          strokeWidth="0.5"
          opacity="0.15"
          strokeDasharray="1 20"
          style={{
            transformOrigin: "600px 400px",
            animation: "vw-spin-reverse 50s linear infinite",
          }}
        />
        <circle
          cx="600" cy="400" r="500"
          stroke="var(--accent)"
          strokeWidth="0.5"
          opacity="0.1"
          strokeDasharray="1 30"
          style={{
            transformOrigin: "600px 400px",
            animation: "vw-spin-slow 70s linear infinite",
          }}
        />
      </svg>
    </div>
  );
}
