"use client";

// Dev preview of the real <MasteryMap> on the app design, with switchable
// scenarios (full progress, only ×4 and ×8, brand-new user). Visit
// /preview/mastery. Safe to delete.

import { useState } from "react";
import MasteryMap from "@/components/MasteryMap";
import type { MasteryEntry } from "@/lib/api-types";

// Seeded PRNG so the first paint matches between server and client.
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

// The map is cumulative across all sessions. "subset48" simulates a child who
// has only ever trained the ×4 and ×8 tables: just the cards touching 4 or 8
// have data, everything else stays unseen (grey). Every ordered pair (a, b) is
// its own card — 64 in total.
function buildEntries(mode: Mode, rand: () => number): MasteryEntry[] {
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

export default function PreviewMasteryPage() {
  const [entries, setEntries] = useState<MasteryEntry[]>(() => buildEntries("full", mulberry32(7)));

  const Button = ({ mode, label }: { mode: Mode; label: string }) => (
    <button
      type="button"
      onClick={() => setEntries(buildEntries(mode, Math.random))}
      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink shadow ring-1 ring-black/5 active:scale-95"
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted">
          Превью карты освоения — реальный компонент, тестовые данные
        </span>
        <div className="flex flex-wrap gap-2">
          <Button mode="full" label="🎲 Полный прогресс" />
          <Button mode="subset48" label="Только ×4 и ×8" />
          <Button mode="empty" label="Новичок (пусто)" />
        </div>
      </div>

      <MasteryMap entries={entries} />

      <p className="text-center text-sm font-semibold text-muted">
        Карта накопительная — по всем тренировкам. Каждая клетка — свой пример
        (7×8 и 8×7 считаются отдельно), всего 64. Если ребёнок учил только ×4 и ×8,
        подсвечиваются лишь строки/столбцы 4 и 8, остальное серое.
        Нажми на клетку — покажется пример.
      </p>
    </div>
  );
}
