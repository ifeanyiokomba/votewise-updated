"use client";

import { useEffect, useRef, useState } from "react";

/**
 * FlyingHeadshots — small AI-generated candidate headshot photos that
 * float gently at the edges of the hero. Each has a vote counter that
 * increments over time, and the avatar pulses when a new vote comes in.
 *
 * Photos are kept small (28-36px) and positioned at screen edges so
 * they never cover the main content. The spinning ring accelerates
 * briefly when a vote is added.
 */

interface Candidate {
  src: string;
  name: string;
  votes: number;
  baseSize: number;
  position: { top: string; left: string; z: number };
  delay: number;
}

const CANDIDATES: Candidate[] = [
  { src: "/headshots/candidate-1.png", name: "Amina Bello", votes: 1247, baseSize: 22, position: { top: "4%", left: "1%", z: 2 }, delay: 0 },
  { src: "/headshots/candidate-2.png", name: "Tunde Okafor", votes: 983, baseSize: 22, position: { top: "8%", left: "90%", z: 2 }, delay: 0.3 },
  { src: "/headshots/candidate-3.png", name: "Grace Eze", votes: 756, baseSize: 20, position: { top: "40%", left: "0%", z: 1 }, delay: 0.6 },
  { src: "/headshots/candidate-4.png", name: "Sani Musa", votes: 612, baseSize: 20, position: { top: "50%", left: "91%", z: 1 }, delay: 0.9 },
  { src: "/headshots/candidate-5.png", name: "Funmi Adewale", votes: 445, baseSize: 18, position: { top: "78%", left: "2%", z: 1 }, delay: 1.2 },
  { src: "/headshots/candidate-6.png", name: "David Okon", votes: 321, baseSize: 18, position: { top: "72%", left: "89%", z: 1 }, delay: 1.5 },
];

export function FlyingHeadshots() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [voteCounts, setVoteCounts] = useState(() => CANDIDATES.map((c) => c.votes));
  const [pulseIndex, setPulseIndex] = useState(-1);

  // Animate vote counts increasing over time
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * CANDIDATES.length);
      setVoteCounts((prev) => {
        const next = [...prev];
        next[randomIdx] = (next[randomIdx] ?? 0) + Math.floor(Math.random() * 3) + 1;
        return next;
      });
      setPulseIndex(randomIdx);
      setTimeout(() => setPulseIndex(-1), 600);
    }, 2500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Gentle drift animation
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>("[data-headshot-item]");
    if (items.length === 0) return;

    let frame = 0;
    let rafId: number;

    const orbits = Array.from(items).map((el, i) => ({
      el,
      amplitudeX: 8 + Math.random() * 10,
      amplitudeY: 6 + Math.random() * 8,
      speed: 0.0003 + Math.random() * 0.0003,
      phase: (i / items.length) * Math.PI * 2,
    }));

    function animate() {
      const t = frame * 16;
      orbits.forEach((orbit) => {
        const offsetX = Math.sin(t * orbit.speed + orbit.phase) * orbit.amplitudeX;
        const offsetY = Math.cos(t * orbit.speed * 0.7 + orbit.phase) * orbit.amplitudeY;
        orbit.el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      });
      frame++;
      rafId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {CANDIDATES.map((candidate, i) => {
        const votes = voteCounts[i] ?? candidate.votes;
        const isPulsing = pulseIndex === i;
        const size = candidate.baseSize;

        return (
          <div
            key={i}
            data-headshot-item
            className="absolute"
            style={{
              top: candidate.position.top,
              left: candidate.position.left,
              zIndex: candidate.position.z,
              opacity: 0,
              animation: `votewise-fade-in 0.8s ease-out ${candidate.delay}s forwards`,
            }}
          >
            {/* Compact avatar + vote badge container */}
            <div className="flex flex-col items-center gap-1">
              {/* Avatar with ring */}
              <div
                className="relative rounded-full transition-transform duration-300"
                style={{
                  width: size + 6,
                  height: size + 6,
                  background: `linear-gradient(135deg, var(--primary), var(--accent))`,
                  padding: 1.5,
                  boxShadow: isPulsing
                    ? `0 0 ${size * 0.6}px color-mix(in oklch, var(--primary) 50%, transparent)`
                    : `0 0 ${size * 0.2}px color-mix(in oklch, var(--primary) 20%, transparent)`,
                  transform: isPulsing ? "scale(1.12)" : "scale(1)",
                }}
              >
                {/* Spinning dashed ring — speeds up on vote */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "1px dashed color-mix(in oklch, var(--primary) 50%, transparent)",
                    animation: `vw-spin-slow ${isPulsing ? 3 : 15 + i * 2}s linear infinite`,
                  }}
                />
                <img
                  src={candidate.src}
                  alt=""
                  className="rounded-full object-cover"
                  style={{ width: size, height: size, display: "block" }}
                  loading="lazy"
                />
              </div>

              {/* Vote count badge */}
              <div
                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium vw-mono tabular-nums transition-all duration-300"
                style={{
                  background: isPulsing ? "var(--primary)" : "color-mix(in oklch, var(--card) 90%, transparent)",
                  color: isPulsing ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                  backdropFilter: "blur(4px)",
                  transform: isPulsing ? "scale(1.1)" : "scale(1)",
                }}
              >
                {votes.toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
