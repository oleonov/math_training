"use client";

// Dev preview of the streak "rage mode" aura on a faithful copy of the real
// training card, so the escalating effect (glow → sparkle halo → lightning) can
// be checked without playing a session. Visit /preview/streak (optionally
// ?level=8 to start at a given strength for screenshots). Safe to delete.

import { useEffect, useState } from "react";
import CircularTimer from "@/components/CircularTimer";
import StreakAura from "@/components/StreakAura";

export default function PreviewStreakPage() {
  const [level, setLevel] = useState(0);
  const [pulse, setPulse] = useState(0);

  // Optional ?level=N to render a starting strength (handy for screenshots).
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("level"));
    if (Number.isFinite(n) && n > 0) setLevel(Math.min(10, Math.round(n)));
  }, []);

  const fast = () => {
    setLevel((l) => Math.min(10, l + 1));
    setPulse((p) => p + 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted">
          Серия: <b className="text-ink">{level}</b>/10
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fast}
            className="rounded-xl bg-correct px-4 py-2 text-sm font-bold text-white shadow active:scale-95"
          >
            ✓ Верно и вовремя
          </button>
          <button
            type="button"
            onClick={() => setPulse((p) => p)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slow shadow ring-1 ring-slow/30 active:scale-95"
          >
            ⏱ Верно, но поздно
          </button>
          <button
            type="button"
            onClick={() => setLevel(0)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-wrong shadow ring-1 ring-wrong/30 active:scale-95"
          >
            ✗ Ошибка
          </button>
        </div>
      </div>

      {/* Faithful copy of the real training card (TrainingScreen), wrapped in the aura. */}
      <StreakAura level={level} pulseKey={pulse}>
        <div className="flex flex-col gap-5 rounded-[2rem] bg-card px-4 py-8 shadow-xl shadow-brand/10 ring-1 ring-black/5 sm:gap-7 sm:p-10">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
            <CircularTimer durationSec={5} active={false} runKey={0} />
            <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-5">
              <div className="font-display text-7xl leading-none text-ink sm:text-8xl">7 × 8 =</div>
              <div className="flex w-40 items-center justify-center rounded-2xl border-4 border-brand-soft bg-white py-1 text-center font-display text-7xl text-brand-strong sm:w-44 sm:text-8xl">
                56
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-soft">
              <div className="h-full rounded-full bg-brand" style={{ width: "68%" }} />
            </div>
            <span className="font-display text-sm font-semibold leading-none tabular-nums text-muted">
              3:24
            </span>
          </div>
        </div>
      </StreakAura>

      <p className="text-center text-sm font-semibold text-muted">
        1–2: мягкое свечение · 3+: искристый ореол · 7+: молнии. «Поздно» держит серию,
        «Ошибка» сбрасывает.
      </p>
    </div>
  );
}
