"use client";

// Dev preview of the FULL final results screen (real SummaryScreen): celebration
// + tap-to-launch fireworks, score, stat tiles, the new mastery heatmap, and the
// weakest/overdue lists together — so the overall composition can be judged.
// Visit /preview/summary. Safe to delete — it imports only mock data.

import { useState } from "react";
import SummaryScreen from "@/components/SummaryScreen";
import type { CardSummaryEntry, MasteryEntry, SessionSummary } from "@/lib/api-types";

// Seeded PRNG so the first paint is identical on server and client (no hydration
// mismatch). The buttons reshuffle with Math.random after mount.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

type Mode = "full" | "subset48" | "empty";

// Every ordered pair (a, b) with a, b in 2..9 is its own card — 64 total.
// "subset48" simulates a child who has only ever trained the ×4 and ×8 tables.
function buildMastery(mode: Mode, rand: () => number): MasteryEntry[] {
  const out: MasteryEntry[] = [];
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      const inScope = mode === "full" || (mode === "subset48" && (a === 4 || b === 4 || a === 8 || b === 8));
      if (mode === "empty" || !inScope) {
        out.push({ a, b, recentAverageScore: 0, attempts: 0 });
        continue;
      }
      const difficulty = ((a * b) / 81) * 0.6 + (a >= 7 || b >= 7 ? 0.18 : 0);
      const recentAverageScore = clamp(1 - difficulty + (rand() - 0.5) * 0.5);
      const attempts = rand() < 0.1 ? 0 : 1 + Math.floor(rand() * 12);
      out.push({ a, b, recentAverageScore, attempts });
    }
  }
  return out;
}

function buildSummary(mode: Mode, rand: () => number): SessionSummary {
  const mastery = buildMastery(mode, rand);
  const seen = mastery.filter((m) => m.attempts > 0);

  const toEntry = (m: MasteryEntry, days: number | null): CardSummaryEntry => ({
    a: m.a,
    b: m.b,
    answer: m.a * m.b,
    recentAverageScore: m.recentAverageScore,
    daysSinceLastAsked: days,
  });

  const weakest = [...seen]
    .sort((x, y) => x.recentAverageScore - y.recentAverageScore)
    .slice(0, 5)
    .map((m) => toEntry(m, rand() * 2));

  const overdue = [...seen]
    .sort(() => rand() - 0.5)
    .slice(0, 5)
    .map((m) => toEntry(m, 1 + Math.floor(rand() * 20)));

  const total = 40;
  const wrong = 2 + Math.floor(rand() * 3);
  const slow = 6 + Math.floor(rand() * 5);
  const fast = total - wrong - slow;
  const averageScore = (fast * 1 + slow * 0.5) / total;

  return {
    totalAnswers: total,
    fastCorrectCount: fast,
    slowCorrectCount: slow,
    wrongCount: wrong,
    averageScore,
    weakest,
    overdue,
    mastery,
    isNewRecord: true,
    previousBestScore: averageScore - 0.06,
  };
}

export default function PreviewSummaryPage() {
  const [summary, setSummary] = useState<SessionSummary>(() => buildSummary("full", mulberry32(7)));
  // Remount key: replays the celebration (Celebration only fires once on mount).
  const [runKey, setRunKey] = useState(0);

  const show = (mode: Mode) => {
    setSummary(buildSummary(mode, Math.random));
    setRunKey((k) => k + 1);
  };

  const Btn = ({ mode, label }: { mode: Mode; label: string }) => (
    <button
      type="button"
      onClick={() => show(mode)}
      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink shadow ring-1 ring-black/5 active:scale-95"
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-dvh px-4 py-8">
      {/* Preview-only controls (not part of the real screen). */}
      <div className="mx-auto mb-6 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted">
          Превью финального экрана — реальные компоненты, тестовые данные
        </span>
        <div className="flex flex-wrap gap-2">
          <Btn mode="full" label="🎲 Полный + салют" />
          <Btn mode="subset48" label="Только ×4 и ×8" />
          <Btn mode="empty" label="Новичок (пусто)" />
        </div>
      </div>

      <SummaryScreen
        key={runKey}
        summary={summary}
        animationsEnabled
        onRestart={() => show("full")}
      />
    </div>
  );
}
