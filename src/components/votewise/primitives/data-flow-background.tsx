"use client";

import { useEffect, useRef } from "react";

/**
 * DataFlowBackground — animated canvas showing packets of data
 * traveling along curved network paths, representing the flow of
 * encrypted vote data through the VoteWise infrastructure.
 *
 * Pure canvas, no dependencies. Respects prefers-reduced-motion.
 */
export function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    let animationId: number;

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Network nodes — scattered points that packets travel between
    const nodeCount = Math.min(Math.floor((width * height) / 25000), 18);
    const nodes: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      });
    }

    // Packets — travel from one node to another, then pick a new target
    interface Packet {
      fromIdx: number;
      toIdx: number;
      progress: number;
      speed: number;
      color: string;
      size: number;
      trail: Array<{ x: number; y: number; alpha: number }>;
    }

    const colors = [
      "rgba(72, 187, 120, ", // emerald
      "rgba(245, 158, 11, ", // amber
      "rgba(59, 130, 246, ", // blue
      "rgba(16, 185, 129, ", // green
    ];

    const packets: Packet[] = [];
    const maxPackets = 12;

    function spawnPacket() {
      if (packets.length >= maxPackets) return;
      const fromIdx = Math.floor(Math.random() * nodes.length);
      let toIdx = Math.floor(Math.random() * nodes.length);
      while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * nodes.length);
      packets.push({
        fromIdx,
        toIdx,
        progress: 0,
        speed: 0.003 + Math.random() * 0.005,
        color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
        size: 2 + Math.random() * 2,
        trail: [],
      });
    }

    // Spawn initial packets
    for (let i = 0; i < 5; i++) spawnPacket();

    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections between nearby nodes
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i]!.x - nodes[j]!.x;
          const dy = nodes[i]!.y - nodes[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const alpha = (1 - dist / 200) * 0.06;
            ctx.strokeStyle = `rgba(100, 200, 150, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i]!.x, nodes[i]!.y);
            ctx.lineTo(nodes[j]!.x, nodes[j]!.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        // Move
        node.x += node.vx;
        node.y += node.vy;
        // Bounce
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 8);
        gradient.addColorStop(0, "rgba(72, 187, 120, 0.4)");
        gradient.addColorStop(1, "rgba(72, 187, 120, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = "rgba(72, 187, 120, 0.6)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Spawn new packets periodically
      if (frame % 80 === 0) spawnPacket();

      // Draw + update packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]!;
        const from = nodes[p.fromIdx]!;
        const to = nodes[p.toIdx]!;

        p.progress += p.speed;

        if (p.progress >= 1) {
          // Packet arrived — remove and maybe spawn new one from target
          packets.splice(i, 1);
          if (Math.random() > 0.3) {
            const newToIdx = Math.floor(Math.random() * nodes.length);
            packets.push({
              fromIdx: p.toIdx,
              toIdx: newToIdx,
              progress: 0,
              speed: 0.003 + Math.random() * 0.005,
              color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
              size: 2 + Math.random() * 2,
              trail: [],
            });
          }
          continue;
        }

        // Curved path (bezier with slight offset)
        const midX = (from.x + to.x) / 2 + (to.y - from.y) * 0.15;
        const midY = (from.y + to.y) / 2 + (from.x - to.x) * 0.15;
        const t = p.progress;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;

        // Add to trail
        p.trail.push({ x, y, alpha: 1 });
        if (p.trail.length > 20) p.trail.shift();

        // Draw trail
        p.trail.forEach((point, idx) => {
          const trailAlpha = (idx / p.trail.length) * 0.5;
          ctx.fillStyle = p.color + trailAlpha + ")";
          ctx.beginPath();
          ctx.arc(point.x, point.y, p.size * (idx / p.trail.length), 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw packet head with glow
        const headGradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3);
        headGradient.addColorStop(0, p.color + "0.8)");
        headGradient.addColorStop(1, p.color + "0)");
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.color + "1)";
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
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
      style={{ opacity: 0.6 }}
      aria-hidden
    />
  );
}
