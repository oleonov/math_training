"use client";

import { useEffect, useState } from "react";

interface Props {
  durationSec: number;
  /** When false (the first example), the ring is idle and shows no countdown. */
  active: boolean;
  /** Change this to restart the countdown for a new question. */
  runKey: number;
}

const SIZE = 128;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function CircularTimer({ durationSec, active, runKey }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    if (!active) return;
    const totalMs = durationSec * 1000;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const e = t - start;
      if (e >= totalMs) {
        setElapsed(totalMs);
        return;
      }
      setElapsed(e);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, durationSec, runKey]);

  const totalMs = durationSec * 1000;
  const fraction = active ? Math.min(1, elapsed / totalMs) : 0;
  const timedOut = active && elapsed >= totalMs;
  const remainingSec = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));

  const color = !active
    ? "var(--color-muted)"
    : timedOut
      ? "var(--color-slow)"
      : "var(--color-brand)";

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      aria-hidden
    >
      <svg width={SIZE} height={SIZE} className="block -rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--color-brand-soft)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * fraction}
          style={{ transition: "stroke 0.25s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {!active ? (
          <span className="font-display text-xl text-muted">{durationSec}с</span>
        ) : timedOut ? (
          <span className="font-display text-3xl" style={{ color: "var(--color-slow)" }}>
            0
          </span>
        ) : (
          <span
            className="font-display text-4xl tabular-nums"
            style={{ color: "var(--color-brand-strong)" }}
          >
            {remainingSec}
          </span>
        )}
      </div>
    </div>
  );
}
