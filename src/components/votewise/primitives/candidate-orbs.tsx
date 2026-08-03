"use client";

import { useEffect, useRef } from "react";

/**
 * CandidateOrbs — floating candidate headshot avatars that orbit and
 * drift across the hero section, giving a futuristic, "people-powered
 * democracy" feel. Uses canvas for smooth 60fps animation.
 *
 * Each orb is a circular avatar with a glowing ring, drifting along
 * gentle paths with slight rotation.
 */
export function CandidateOrbs() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    let animationId: number;

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Candidate names for initials
    const candidates = [
      { initials: "AB", color: "#48bb78" },
      { initials: "TO", color: "#f59e0b" },
      { initials: "GE", color: "#3b82f6" },
      { initials: "SM", color: "#ec4899" },
      { initials: "FA", color: "#8b5cf6" },
      { initials: "DA", color: "#06b6d4" },
      { initials: "CK", color: "#f97316" },
      { initials: "RA", color: "#10b981" },
    ];

    interface Orb {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      initials: string;
      color: string;
      phase: number;
      ringRotation: number;
    }

    const orbs: Orb[] = candidates.map((c, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 28 + Math.random() * 16,
      initials: c.initials,
      color: c.color,
      phase: Math.random() * Math.PI * 2,
      ringRotation: 0,
    }));

    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, width, height);

      orbs.forEach((orb, i) => {
        // Gentle drift with sine wave
        orb.phase += 0.008;
        orb.x += orb.vx + Math.sin(orb.phase) * 0.15;
        orb.y += orb.vy + Math.cos(orb.phase * 0.7) * 0.1;
        orb.ringRotation += 0.005;

        // Wrap around edges
        if (orb.x < -orb.size) orb.x = width + orb.size;
        if (orb.x > width + orb.size) orb.x = -orb.size;
        if (orb.y < -orb.size) orb.y = height + orb.size;
        if (orb.y > height + orb.size) orb.y = -orb.size;

        const breathScale = 1 + Math.sin(orb.phase * 2) * 0.03;
        const r = orb.size * breathScale;

        // Outer glow
        const glow = ctx.createRadialGradient(orb.x, orb.y, r * 0.5, orb.x, orb.y, r * 2);
        glow.addColorStop(0, orb.color + "30");
        glow.addColorStop(1, orb.color + "00");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r * 2, 0, Math.PI * 2);
        ctx.fill();

        // Rotating dashed ring
        ctx.save();
        ctx.translate(orb.x, orb.y);
        ctx.rotate(orb.ringRotation);
        ctx.strokeStyle = orb.color + "60";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Avatar circle with gradient
        const avatarGrad = ctx.createRadialGradient(
          orb.x - r * 0.3, orb.y - r * 0.3, 0,
          orb.x, orb.y, r
        );
        avatarGrad.addColorStop(0, orb.color);
        avatarGrad.addColorStop(1, orb.color + "CC");
        ctx.fillStyle = avatarGrad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(orb.x - r * 0.3, orb.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Initials text
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = `600 ${r * 0.5}px Geist, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(orb.initials, orb.x, orb.y);
      });

      // Draw subtle connections between nearby orbs
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const dx = orbs[i]!.x - orbs[j]!.x;
          const dy = orbs[i]!.y - orbs[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.08;
            ctx.strokeStyle = `rgba(100, 200, 150, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(orbs[i]!.x, orbs[i]!.y);
            ctx.lineTo(orbs[j]!.x, orbs[j]!.y);
            ctx.stroke();
          }
        }
      }

      frame++;
      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.5 }}
      aria-hidden
    />
  );
}
