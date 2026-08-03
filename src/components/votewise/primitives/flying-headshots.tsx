"use client";

import { useEffect, useRef } from "react";

/**
 * FlyingHeadshots — real AI-generated candidate headshot photos that
 * float and drift across the hero section with a futuristic, premium
 * feel. Each photo is a circular avatar with a glowing ring, subtle
 * parallax drift, and a gentle "breathing" scale animation.
 *
 * Uses HTML img elements positioned absolutely (not canvas) so the
 * real photos render crisply at any resolution.
 */
export function FlyingHeadshots() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const container = containerRef.current;
    if (!container) return;

    const photos = container.querySelectorAll<HTMLImageElement>("[data-headshot]");
    if (photos.length === 0) return;

    let frame = 0;
    let rafId: number;

    // Each photo gets a unique drift pattern
    const orbits = Array.from(photos).map((img, i) => {
      const rect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        el: img,
        baseX: rect.left - containerRect.left,
        baseY: rect.top - containerRect.top,
        amplitudeX: 15 + Math.random() * 25,
        amplitudeY: 10 + Math.random() * 20,
        speed: 0.0003 + Math.random() * 0.0004,
        phase: (i / photos.length) * Math.PI * 2,
        rotationPhase: Math.random() * Math.PI * 2,
      };
    });

    function animate() {
      const t = frame * 16; // approx ms

      orbits.forEach((orbit) => {
        const offsetX = Math.sin(t * orbit.speed + orbit.phase) * orbit.amplitudeX;
        const offsetY = Math.cos(t * orbit.speed * 0.7 + orbit.phase) * orbit.amplitudeY;
        const scale = 1 + Math.sin(t * orbit.speed * 2 + orbit.phase) * 0.04;

        orbit.el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      });

      frame++;
      rafId = requestAnimationFrame(animate);
    }

    animate();

    return () => cancelAnimationFrame(rafId);
  }, []);

  // Position config for each headshot — spread across the hero
  const positions = [
    { top: "8%", left: "5%", size: 56, delay: 0, z: 2 },
    { top: "15%", left: "82%", size: 64, delay: 0.3, z: 3 },
    { top: "45%", left: "3%", size: 48, delay: 0.6, z: 1 },
    { top: "55%", left: "88%", size: 52, delay: 0.9, z: 2 },
    { top: "75%", left: "12%", size: 44, delay: 1.2, z: 1 },
    { top: "68%", left: "78%", size: 60, delay: 1.5, z: 2 },
  ];

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: pos.top,
            left: pos.left,
            zIndex: pos.z,
            opacity: 0,
            animation: `vw-fade-in 0.8s ease-out ${pos.delay}s forwards`,
          }}
        >
          {/* Glowing ring around the headshot */}
          <div
            className="relative rounded-full"
            style={{
              width: pos.size + 8,
              height: pos.size + 8,
              background: `linear-gradient(135deg, var(--primary), var(--accent))`,
              padding: 2,
              boxShadow: `0 0 ${pos.size * 0.3}px color-mix(in oklch, var(--primary) 30%, transparent)`,
            }}
          >
            {/* Rotating dashed ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px dashed color-mix(in oklch, var(--primary) 40%, transparent)",
                animation: `vw-spin-slow ${20 + i * 3}s linear infinite`,
              }}
            />
            {/* The actual headshot photo */}
            <img
              data-headshot
              src={`/headshots/candidate-${i + 1}.png`}
              alt=""
              className="rounded-full object-cover"
              style={{
                width: pos.size,
                height: pos.size,
                display: "block",
              }}
              loading="lazy"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
