"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Full-screen "big celebration" overlay: fireworks + confetti, played once when
// the session beats a personal record. Pure <canvas>, no dependencies. The canvas
// never intercepts clicks (pointer-events: none) and the animation loop stops
// itself once every particle has burned out, so it costs nothing afterwards.
//
// After the big show, tapping anywhere keeps the party going: each tap launches a
// single firework from a random spot along the bottom, in a random colour and
// size. The loop restarts on demand and stops again once the screen is clear.
//
// Respects prefers-reduced-motion: users who opt out of motion get nothing.

const COLORS = ["#2f6df6", "#16a34a", "#f59e0b", "#ef4444", "#ffd700", "#ff7eb6", "#a855f7", "#22d3ee"];

// The burst shapes a rocket can explode into — picked at random per firework.
const FIREWORK_TYPES = ["peony", "ring", "willow", "glitter"] as const;

interface Confetto {
  x: number; y: number; vx: number; vy: number; g: number; drag: number;
  w: number; h: number; color: string; rot: number; vr: number;
  tilt: number; vtilt: number; life: number; fade: number; round: boolean;
}
interface Spark {
  x: number; y: number; vx: number; vy: number; g: number; drag: number;
  color: string; life: number; fade: number; size: number; twinkle?: boolean;
}
interface Rocket {
  x: number; y: number; vx: number; vy: number; g: number; color: string;
  trail: { x: number; y: number }[]; scale: number;
}

export default function Celebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Portal the canvas into <body>. As a direct child of <body> its `fixed`
  // positioning is guaranteed to be relative to the VIEWPORT. When rendered in
  // place inside SummaryScreen it sat under `.mc-rise`, whose persisted
  // `transform` (animation-fill-mode: both leaves translateY(0) applied) makes
  // it the containing block for fixed descendants — so the full-width canvas was
  // anchored to that centered `max-w-2xl` box and every firework flew right,
  // into and past the screen edge. document.body has no such transform.
  useEffect(() => setContainer(document.body), []);

  useEffect(() => {
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1;
    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      // <canvas> is a replaced element: `fixed inset-0` does NOT stretch it, so
      // without an explicit CSS size it displays at its backing-store size
      // (W*DPR) and the DPR transform doubles every drawn coordinate — pushing
      // half the fireworks off the right edge. Pin the CSS size to the viewport.
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: readonly T[]): T => arr[(Math.random() * arr.length) | 0];

    const confetti: Confetto[] = [];
    const sparks: Spark[] = [];
    const rockets: Rocket[] = [];

    const confettiBurst = (x: number, y: number, count: number, angleDeg: number, spreadDeg: number, power: number) => {
      for (let i = 0; i < count; i++) {
        const a = ((angleDeg + rand(-spreadDeg, spreadDeg)) * Math.PI) / 180;
        const v = power * rand(0.45, 1);
        confetti.push({
          x, y,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: 0.16, drag: 0.986,
          w: rand(6, 11), h: rand(9, 15),
          color: pick(COLORS),
          rot: rand(0, Math.PI * 2), vr: rand(-0.22, 0.22),
          tilt: rand(0, Math.PI * 2), vtilt: rand(0.06, 0.13),
          life: 1, fade: rand(0.004, 0.0075),
          round: Math.random() < 0.22,
        });
      }
    };

    const confettiCannons = () => {
      confettiBurst(0, H, 70, -65, 28, 17);
      confettiBurst(W, H, 70, -115, 28, 17);
      timers.push(window.setTimeout(() => {
        confettiBurst(0, H, 45, -60, 30, 15);
        confettiBurst(W, H, 45, -120, 30, 15);
      }, 220));
    };

    const launchRocket = (targetX: number, targetY: number, color: string, scale = 1) => {
      rockets.push({
        x: targetX, y: H + 6,
        vx: rand(-0.5, 0.5),
        vy: -Math.sqrt(2 * 0.07 * (H - targetY)),
        g: 0.07, color, trail: [], scale,
      });
    };

    const explode = (x: number, y: number, color: string, scale = 1) => {
      // Variety of firework styles. Particle SIZES stay small and crisp — `scale`
      // only adds particles and widens the burst, it never enlarges the dots
      // (a big dot under the glow reads as blur). `spread` shapes the burst:
      // 0 = a clean ring, 1 = a fully filled disk.
      const type = pick(FIREWORK_TYPES);
      const multi = type === "glitter" || Math.random() < 0.35;

      let baseN: number, ringSpeed: number, g: number, drag: number;
      let fadeLo: number, fadeHi: number, sizeLo: number, sizeHi: number;
      let spread: number, twinkle: boolean, coreCount: number;
      switch (type) {
        case "ring": // tight, crisp expanding ring, barely any core
          baseN = rand(140, 200); ringSpeed = rand(4, 6.5);
          g = 0.03; drag = 0.97; fadeLo = 0.007; fadeHi = 0.011;
          sizeLo = 1.8; sizeHi = 2.8; spread = 0.12; twinkle = false; coreCount = 12;
          break;
        case "willow": // heavy droop, long graceful hang (often gold)
          baseN = rand(110, 170); ringSpeed = rand(2.8, 4.6);
          g = 0.10; drag = 0.985; fadeLo = 0.0035; fadeHi = 0.006;
          sizeLo = 1.6; sizeHi = 2.6; spread = 0.5; twinkle = false; coreCount = 20;
          break;
        case "glitter": // dense filled disk that twinkles
          baseN = rand(190, 270); ringSpeed = rand(2.6, 5);
          g = 0.04; drag = 0.95; fadeLo = 0.006; fadeHi = 0.012;
          sizeLo = 1.2; sizeHi = 2.2; spread = 0.85; twinkle = true; coreCount = 24;
          break;
        default: // peony — classic round burst
          baseN = rand(140, 220); ringSpeed = rand(3.6, 6.2);
          g = 0.045; drag = 0.965; fadeLo = 0.007; fadeHi = 0.012;
          sizeLo = 1.6; sizeHi = 3; spread = 0.45; twinkle = false; coreCount = 32;
      }
      const n = (baseN * scale) | 0;
      ringSpeed *= scale; // wider burst for bigger rockets — dots stay crisp
      const bodyColor = type === "willow" && !multi && Math.random() < 0.6 ? "#ffd700" : color;

      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.06, 0.06);
        const v = ringSpeed * (1 - spread * Math.random());
        sparks.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g, drag,
          color: multi ? pick(COLORS) : bodyColor,
          life: 1, fade: rand(fadeLo, fadeHi), size: rand(sizeLo, sizeHi),
          twinkle,
        });
      }
      for (let i = 0; i < coreCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = rand(0.4, 1.8);
        sparks.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: 0.02, drag: 0.95, color: "#ffffff",
          life: 1, fade: rand(0.02, 0.035), size: rand(2, 3.2),
        });
      }
    };

    const timers: number[] = [];
    let fireworksInterval = 0;
    let raf = 0;
    let launching = true;
    let running = true; // whether the rAF loop is currently scheduled

    // --- Orchestrate the "big celebration" ---
    const fireOne = () =>
      launchRocket(rand(W * 0.15, W * 0.85), rand(H * 0.12, H * 0.45), pick(COLORS), rand(1.1, 1.9));
    confettiCannons();
    fireOne();
    fireworksInterval = window.setInterval(() => {
      fireOne();
      if (Math.random() < 0.35) timers.push(window.setTimeout(fireOne, 120));
    }, 480);
    timers.push(window.setTimeout(() => confettiBurst(W / 2, -10, 80, 90, 55, 9), 600)); // rain from top
    timers.push(window.setTimeout(confettiCannons, 2600));
    timers.push(window.setTimeout(() => {
      window.clearInterval(fireworksInterval);
      launching = false;
    }, 5200));

    const frame = () => {
      ctx.clearRect(0, 0, W, H);

      ctx.globalCompositeOperation = "lighter";
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += r.g; r.x += r.vx; r.y += r.vy;
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 8) r.trail.shift();
        for (let t = 0; t < r.trail.length; t++) {
          const p = r.trail[t];
          ctx.globalAlpha = (t / r.trail.length) * 0.8;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (r.vy >= -0.4) {
          explode(r.x, r.y, r.color, r.scale);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= s.drag;
        s.vy = s.vy * s.drag + s.g;
        s.x += s.vx; s.y += s.vy;
        s.life -= s.fade;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        // Twinkling sparks (glitter) randomly dim each frame for a strobe shimmer.
        ctx.globalAlpha = Math.max(0, s.life) * (s.twinkle && Math.random() < 0.4 ? 0.25 : 1);
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.vx *= c.drag;
        c.vy = c.vy * c.drag + c.g;
        c.x += c.vx; c.y += c.vy;
        c.rot += c.vr; c.tilt += c.vtilt;
        c.life -= c.fade;
        if (c.life <= 0 || c.y > H + 40) { confetti.splice(i, 1); continue; }
        const sway = Math.cos(c.tilt) * (c.w * 0.5);
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, c.life * 1.5));
        ctx.fillStyle = c.color;
        if (c.round) {
          ctx.beginPath();
          ctx.ellipse(0, 0, c.w * 0.45, c.h * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-Math.abs(sway) * 0.5, -c.h / 2, Math.max(1.5, Math.abs(sway)), c.h);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // Stop the loop once the show is over and nothing is left on screen.
      // ensureRunning() can wake it again when a tap launches a new firework.
      if (!launching && !confetti.length && !sparks.length && !rockets.length) {
        ctx.clearRect(0, 0, W, H);
        running = false;
        return;
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);

    // Tap-to-launch: one firework per tap, from a random spot along the bottom,
    // in a random colour and size. Restarts the loop if it had gone idle.
    const ensureRunning = () => {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(frame);
    };
    const spawnFirework = () => {
      const x = rand(W * 0.1, W * 0.9);
      const targetY = rand(H * 0.12, H * 0.5);
      launchRocket(x, targetY, pick(COLORS), rand(1, 2.2));
      ensureRunning();
    };
    const onPointerDown = () => spawnFirework();
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
      window.cancelAnimationFrame(raf);
      window.clearInterval(fireworksInterval);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [container]);

  if (!container) return null;
  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden
      // h-screen/w-screen give this replaced element a real CSS size (the
      // viewport); `fixed inset-0` alone does NOT stretch a <canvas>.
      className="pointer-events-none fixed inset-0 z-50 h-screen w-screen"
    />,
    container,
  );
}
