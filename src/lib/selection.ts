import type { CardStats } from "./stats";

const MS_PER_DAY = 86_400_000;

// Priority weights (from the spec).
const W_RECENT = 60;
const W_OVERDUE = 25;
const W_NEW = 30;
const W_RANDOM = 10;

const NEW_CARD_THRESHOLD = 3;

export interface CardWithStats {
  cardId: number;
  a: number;
  b: number;
  stats: CardStats | null;
}

/** Review interval target (in days) based on how well the card is known. */
export function targetIntervalDays(recentAverageScore: number): number {
  if (recentAverageScore < 0.5) return 1; // плохо
  if (recentAverageScore < 0.8) return 3; // средне
  if (recentAverageScore < 0.95) return 7; // хорошо
  return 14; // отлично
}

/** 0..1 — how overdue a card is relative to its target review interval. */
export function overdueScore(stats: CardStats | null, now: Date): number {
  if (!stats || !stats.lastAskedAt) return 1;
  const days = (now.getTime() - stats.lastAskedAt.getTime()) / MS_PER_DAY;
  const interval = targetIntervalDays(stats.recentAverageScore);
  return Math.min(1, Math.max(0, days / interval));
}

/** 0..1 — extra weight for cards attempted fewer than 3 times. */
export function newCardScore(stats: CardStats | null): number {
  const count = stats?.attemptsCount ?? 0;
  if (count >= NEW_CARD_THRESHOLD) return 0;
  return (NEW_CARD_THRESHOLD - count) / NEW_CARD_THRESHOLD;
}

/**
 * Priority score for a card. Higher => more likely to be shown.
 * rngValue is in [0, 1) and contributes the jitter term (0..10).
 */
export function computePriority(item: CardWithStats, now: Date, rngValue: number): number {
  const recent = item.stats?.recentAverageScore ?? 0;
  return (
    (1 - recent) * W_RECENT +
    overdueScore(item.stats, now) * W_OVERDUE +
    newCardScore(item.stats) * W_NEW +
    rngValue * W_RANDOM
  );
}

/**
 * Pick an index in proportion to `weights`, using r in [0, 1).
 * Falls back to uniform selection when all weights are zero.
 */
export function weightedPick(weights: number[], r: number): number {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total <= 0) {
    return Math.min(weights.length - 1, Math.floor(r * weights.length));
  }
  const threshold = r * total;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += Math.max(0, weights[i]);
    if (cumulative > threshold) return i;
  }
  return weights.length - 1;
}

/**
 * Choose the next card via weighted random over priority scores, excluding
 * cards seen in the last few questions (anti-repeat). `rng` returns [0, 1).
 */
export function pickNextCard(
  items: CardWithStats[],
  recentCardIds: number[],
  now: Date,
  rng: () => number,
): CardWithStats {
  const recent = new Set(recentCardIds);
  let candidates = items.filter((i) => !recent.has(i.cardId));
  if (candidates.length === 0) candidates = items;

  const weights = candidates.map((i) => computePriority(i, now, rng()));
  const index = weightedPick(weights, rng());
  return candidates[index];
}
