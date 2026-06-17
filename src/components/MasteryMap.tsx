"use client";

import { Fragment, useState } from "react";
import type { MasteryEntry } from "@/lib/api-types";

// "Карта освоения таблицы": a full 8×8 heatmap over the tables 2..9. Each cell
// (a, b) is its OWN card — 7×8 and 8×7 are tracked separately, because a child
// may know one direction and stumble on the other. So the grid has 64 distinct
// cards (8 on the diagonal + 56 off it). Colour = recentAverageScore
// (red→amber→green); paleness = confidence (few attempts wash toward grey);
// unseen cards are grey.
//
// Tapping a cell reveals that example (e.g. "7 × 8 = 56 — освоено на 80%") in a
// strip under the grid. The tap is stopped from bubbling so it doesn't also fire
// the celebration's tap-to-launch firework on the results screen.

const NUMS = [2, 3, 4, 5, 6, 7, 8, 9] as const;
const TOTAL_CARDS = 64; // every ordered pair (a, b) with a, b in 2..9

const key = (a: number, b: number) => `${a},${b}`;

// Pastel anchors in the family of our --color-wrong / -slow / -correct tokens,
// softened for a kid-friendly heatmap.
const RED = [233, 127, 127];
const AMBER = [242, 191, 110];
const GREEN = [121, 199, 142];
const PALE = [237, 239, 242]; // wash target for low-confidence cells
const GRAY = [224, 227, 232]; // unseen cards

function mix(c1: number[], c2: number[], t: number): number[] {
  const k = Math.max(0, Math.min(1, t));
  return [0, 1, 2].map((i) => Math.round(c1[i] + (c2[i] - c1[i]) * k));
}
const rgb = (c: number[]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

function heat(score: number): number[] {
  return score < 0.5
    ? mix(RED, AMBER, score / 0.5)
    : mix(AMBER, GREEN, (score - 0.5) / 0.5);
}

function cellColor(score: number, attempts: number): string {
  if (attempts === 0) return rgb(GRAY);
  const confidence = Math.min(attempts / 4, 1); // ~4 attempts = full colour
  return rgb(mix(heat(score), PALE, (1 - confidence) * 0.55));
}

// A card counts as "освоено" once it has been answered correctly at least once
// WITHOUT a hint (solved on a first try, not on a post-mistake retry). Sticky:
// it stays counted afterwards. Each card contributes at most 1, regardless of
// how many times it was shown. The map colours are independent of this flag.
const isMastered = (e: MasteryEntry) => e.solvedUnaided;

// Russian plural: 1 попытка, 2 попытки, 5 попыток.
function plural(n: number, [one, few, many]: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-muted">
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-16 rounded-full ring-1 ring-black/5"
          style={{ backgroundImage: `linear-gradient(90deg, ${rgb(RED)}, ${rgb(AMBER)}, ${rgb(GREEN)})` }}
        />
        слабо → освоено
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-[4px] ring-1 ring-black/5" style={{ backgroundColor: rgb(GRAY) }} />
        ещё не решали
      </span>
    </div>
  );
}

export default function MasteryMap({ entries }: { entries: MasteryEntry[] }) {
  const byCard = new Map(entries.map((e) => [key(e.a, e.b), e]));
  const masteredCount = entries.filter(isMastered).length;

  const [selected, setSelected] = useState<string | null>(null);
  const selectedEntry = selected ? byCard.get(selected) : undefined;
  const selectedPair = selected ? selected.split(",").map(Number) : null;

  return (
    <div className="rounded-[2rem] bg-card p-6 shadow-xl shadow-brand/10 ring-1 ring-black/5 sm:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink sm:text-3xl">Карта освоения таблицы</h2>
        <div className="shrink-0 text-right">
          <div className="font-display text-3xl leading-none">
            <span className="text-correct">{masteredCount}</span>
            <span className="text-xl text-muted"> / {TOTAL_CARDS}</span>
          </div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">примеров освоено</div>
        </div>
      </div>

      <div
        className="mx-auto grid max-w-md gap-1.5"
        style={{ gridTemplateColumns: `1.5rem repeat(8, 1fr)` }}
      >
        {/* Column header (2..9) */}
        <div />
        {NUMS.map((n) => (
          <div key={`h${n}`} className="pb-0.5 text-center font-display text-sm font-semibold text-muted">
            {n}
          </div>
        ))}

        {/* Rows: a row label, then 8 cells. Each cell is its own card (a × b). */}
        {NUMS.map((r) => (
          <Fragment key={`r${r}`}>
            <div className="flex items-center justify-center font-display text-sm font-semibold text-muted">
              {r}
            </div>
            {NUMS.map((c) => {
              const k = key(r, c);
              const e = byCard.get(k);
              const score = e?.recentAverageScore ?? 0;
              const attempts = e?.attempts ?? 0;
              const isSel = selected === k;
              return (
                <button
                  key={k}
                  type="button"
                  // Stop the tap from reaching the celebration's window-level
                  // tap-to-launch firework handler on the results screen. The
                  // firework listens on a native `pointerdown`, so we must stop
                  // that one (not just the click) to keep cell taps firework-free.
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setSelected((prev) => (prev === k ? null : k));
                  }}
                  aria-label={`${r} × ${c}`}
                  className={`aspect-square rounded-[7px] ring-1 ring-black/5 transition ${
                    isSel ? "relative z-10 scale-110 shadow-md ring-2 ring-brand" : ""
                  }`}
                  style={{ backgroundColor: cellColor(score, attempts) }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Tap detail / hint — reserved height so the layout doesn't jump. */}
      <div className="mt-4 flex min-h-[3rem] items-center justify-center">
        {selectedPair ? (
          <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 rounded-xl bg-brand-soft px-4 py-2.5 text-center">
            <span className="font-display text-xl text-ink">
              {selectedPair[0]} × {selectedPair[1]} = {selectedPair[0] * selectedPair[1]}
            </span>
            <span className="text-sm font-semibold text-muted">
              {!selectedEntry || selectedEntry.attempts === 0
                ? "ещё не решали"
                : `освоено на ${Math.round(selectedEntry.recentAverageScore * 100)}% · ` +
                  `${selectedEntry.attempts} ${plural(selectedEntry.attempts, ["попытка", "попытки", "попыток"])}`}
            </span>
          </div>
        ) : (
          <p className="text-xs font-semibold text-muted">Нажми на клетку, чтобы посмотреть пример</p>
        )}
      </div>

      <Legend />
    </div>
  );
}
