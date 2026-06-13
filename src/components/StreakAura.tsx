"use client";

import { useEffect, useRef } from "react";

// Streak "rage mode" aura around the training card. A run of fast-and-on-time
// answers builds an escalating effect (0→10):
//   level 1-2 — coloured glow + a light sparkle halo, a burst on every answer
//   level 3+  — a dense, lively sparkle halo + a gentle card shake (the "вау")
//   level 7+  — flickering lightning arcs around the card
// A wrong answer resets to 0 and the effect fades; a correct-but-late ("slow")
// answer keeps the streak (handled by the caller).
//
// A CSS glow layer (cheap, size-independent backbone) plus a <canvas> for
// sparkles/lightning, both BEHIND the opaque card. Over the near-white card,
// sparkles are invisible anyway, so the visible halo lives in the MARGIN band
// around the card — kept generous so the effect reads clearly on a big card.
// Particle count is bounded for steady performance. Respects
// prefers-reduced-motion: only the static glow remains.

const MAX_LEVEL = 10;
const MARGIN = 48; // px the sparkle canvas extends beyond the card — the halo band

// Cool → hot colour ramp. Ends on hot pink, NOT pure red, so a long streak's
// "heat" never reads as the red "wrong" feedback colour.
const RAMP = ["#2f6df6", "#22d3ee", "#16a34a", "#f59e0b", "#f97316", "#ff2d95"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (r: number[]) =>
  "#" + r.map((v) => clamp(v | 0, 0, 255).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) =>
  rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
const heat = (t: number) => {
  const s = clamp(t, 0, 1) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(s));
  return mix(RAMP[i], RAMP[i + 1], s - i);
};

interface HaloParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; fade: number; sz: number; color: string;
}

interface Props {
  level: number; // 0..10 current streak strength
  pulseKey: number; // increments on each fast-correct answer → fires a burst
  children: React.ReactNode; // the training card
}

export default function StreakAura({ level, pulseKey, children }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const levelRef = useRef(level);
  const seenPulseRef = useRef(pulseKey); // last pulse the loop consumed
  const pendingPulseRef = useRef(pulseKey); // latest pulse from props
  const wakeRef = useRef<() => void>(() => {});

  // Drive the CSS glow from the level — cheap, size-independent, smooth via the
  // CSS transition, and the only thing that survives reduced-motion.
  useEffect(() => {
    levelRef.current = level;
    const glow = glowRef.current;
    if (glow) {
      if (level <= 0) {
        glow.style.boxShadow = "none";
      } else {
        const c = heat(level / MAX_LEVEL);
        const blur = 20 + level * 7; // soft outer bloom, up to ~90px
        const spread = 2 + level * 2; // up to ~22px
        // outer soft bloom + tighter inner bloom + a crisp coloured rim hugging the card
        glow.style.boxShadow =
          `0 0 ${blur}px ${spread}px ${c}80, ` +
          `0 0 ${blur * 0.45}px ${spread * 0.5}px ${c}cc, ` +
          `0 0 0 ${2 + level * 0.5}px ${c}`;
      }
    }
    wakeRef.current();
  }, [level]);

  // Record an incoming "hit" so the loop fires a burst (+ shake from level 3).
  useEffect(() => {
    pendingPulseRef.current = pulseKey;
    wakeRef.current();
  }, [pulseKey]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // CSS glow only
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!wrapper || !canvas || !card) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1; // canvas CSS size = card + 2*MARGIN
    const resize = () => {
      const r = wrapper.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width + MARGIN * 2;
      H = r.height + MARGIN * 2;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const halo: HaloParticle[] = [];

    // A point at perimeter distance `d` along the card's edge (inset by MARGIN),
    // plus its outward unit normal — used by sparkles and lightning so both hug
    // the card and shoot outward into the visible margin band.
    const onPerimeter = (d: number) => {
      const w = W - MARGIN * 2, h = H - MARGIN * 2;
      const left = MARGIN, top = MARGIN, right = W - MARGIN, bottom = H - MARGIN;
      if (d < w) return { x: left + d, y: top, nx: 0, ny: -1 };
      if (d < w + h) return { x: right, y: top + (d - w), nx: 1, ny: 0 };
      if (d < 2 * w + h) return { x: right - (d - w - h), y: bottom, nx: 0, ny: 1 };
      return { x: left, y: bottom - (d - 2 * w - h), nx: -1, ny: 0 };
    };
    const perim = () => 2 * (W - MARGIN * 2) + 2 * (H - MARGIN * 2);

    const spawnHalo = (lv: number) => {
      if (halo.length >= 220) return; // hard cap: burst + continuous can't pile up
      const p = onPerimeter(Math.random() * perim());
      const off = rand(0, 10);
      const speed = rand(0.35, 1.1) + lv * 0.05; // enough to travel across the band
      // Two thirds use the streak's current heat colour, the rest a random warm
      // tone — saturated and lively without being noisy.
      const color = Math.random() < 0.66 ? heat(lv / MAX_LEVEL) : heat(rand(0.35, 1));
      halo.push({
        x: p.x + p.nx * off, y: p.y + p.ny * off,
        vx: p.nx * speed + rand(-0.35, 0.35),
        vy: p.ny * speed + rand(-0.35, 0.35),
        life: 1, fade: rand(0.009, 0.018),
        sz: rand(3, 6.5), color,
      });
    };

    // A four-point star: a bright core dot plus perpendicular streaks.
    const sparkle = (x: number, y: number, s: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, s * 0.28);
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawLightning = (lv: number, color: string) => {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      for (let k = 0; k < (lv - 6) * 2; k++) {
        const p = onPerimeter(Math.random() * perim());
        const tx = -p.ny, ty = p.nx; // tangent, for the jagged jitter
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        const segs = 4;
        for (let s = 1; s <= segs; s++) {
          const out = (MARGIN * 0.9 * s) / segs; // march outward into the band
          const jit = rand(-9, 9);
          ctx.lineTo(p.x + p.nx * out + tx * jit, p.y + p.ny * out + ty * jit);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    let raf = 0;
    let running = false;
    let shake = 0;
    let tick = 0;

    const frame = () => {
      tick++;
      const lv = levelRef.current;

      // Consume a pending hit → a burst of sparkles (every level) + a shake (3+).
      if (pendingPulseRef.current !== seenPulseRef.current) {
        seenPulseRef.current = pendingPulseRef.current;
        if (lv >= 1) {
          const burst = Math.min(30, 6 + lv * 2);
          for (let i = 0; i < burst; i++) spawnHalo(lv);
        }
        if (lv >= 3) shake = Math.min(7, lv * 0.9);
      }

      ctx.clearRect(0, 0, W, H);
      const c = heat(lv / MAX_LEVEL);

      // Continuous halo from level 1 — bounded density that grows with the streak
      // (level 3+ is where it gets genuinely dense and "вау").
      if (lv >= 1) {
        const target = Math.min(150, lv * 15);
        let budget = 5; // cap new particles per frame for a smooth build-up
        while (halo.length < target && budget-- > 0) spawnHalo(lv);
      }
      for (let i = halo.length - 1; i >= 0; i--) {
        const p = halo[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.fade;
        if (p.life <= 0) { halo.splice(i, 1); continue; }
        sparkle(p.x, p.y, p.sz * (0.4 + 0.6 * p.life), p.color, Math.max(0, p.life));
      }

      // Lightning from level 7 — flickers (drawn on a fraction of frames).
      if (lv >= 7 && tick % 2 === 0) drawLightning(lv, c);

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Only the card shakes; the halo stays put so the sparkles don't smear.
      if (shake > 0.15) {
        card.style.transform = `translate(${rand(-shake, shake)}px, ${rand(-shake, shake)}px)`;
        shake *= 0.82;
      } else if (card.style.transform) {
        card.style.transform = "";
        shake = 0;
      }

      // Idle out when there is nothing to animate; wake() restarts the loop.
      if (lv < 1 && halo.length === 0 && shake <= 0.15) {
        ctx.clearRect(0, 0, W, H);
        running = false;
        return;
      }
      raf = window.requestAnimationFrame(frame);
    };

    const wake = () => {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(frame);
    };
    wakeRef.current = wake;
    if (levelRef.current >= 1 || pendingPulseRef.current !== seenPulseRef.current) wake();

    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(raf);
      wakeRef.current = () => {};
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Glow + sparkles render BEHIND the opaque card (z-0); the card is on top (z-10). */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[2rem] transition-[box-shadow] duration-300 ease-out"
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute z-0"
        style={{ left: -MARGIN, top: -MARGIN }}
      />
      <div ref={cardRef} className="relative z-10">
        {children}
      </div>
    </div>
  );
}
