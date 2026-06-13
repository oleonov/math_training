import { describe, it, expect } from "vitest";
import {
  targetIntervalDays,
  overdueScore,
  newCardScore,
  computePriority,
  weightedPick,
  pickNextCard,
  orient,
  type CardWithStats,
} from "./selection";
import type { CardStats } from "./stats";

const now = new Date("2026-06-04T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

function stats(overrides: Partial<CardStats>): CardStats {
  return {
    attemptsCount: 5,
    fastCorrectCount: 0,
    slowCorrectCount: 0,
    wrongCount: 0,
    averageScore: 0.5,
    recentAverageScore: 0.5,
    averageResponseTimeMs: 2000,
    lastAskedAt: now,
    ...overrides,
  };
}

function item(cardId: number, s: CardStats | null): CardWithStats {
  return { cardId, a: 2, b: 3, stats: s };
}

/** Deterministic rng yielding a fixed sequence (loops if exhausted). */
function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("targetIntervalDays", () => {
  it("maps knowledge level to a review interval", () => {
    expect(targetIntervalDays(0.2)).toBe(1); // плохо
    expect(targetIntervalDays(0.6)).toBe(3); // средне
    expect(targetIntervalDays(0.9)).toBe(7); // хорошо
    expect(targetIntervalDays(0.99)).toBe(14); // отлично
  });
});

describe("overdueScore", () => {
  it("is maximal (1) for a card that was never asked", () => {
    expect(overdueScore(null, now)).toBe(1);
    expect(overdueScore(stats({ lastAskedAt: null }), now)).toBe(1);
  });

  it("grows with time and saturates at 1", () => {
    // weak card -> interval 1 day; asked 3 days ago -> clamped to 1
    expect(overdueScore(stats({ recentAverageScore: 0.2, lastAskedAt: daysAgo(3) }), now)).toBe(1);
    // asked half its interval ago -> 0.5
    expect(overdueScore(stats({ recentAverageScore: 0.2, lastAskedAt: daysAgo(0.5) }), now)).toBeCloseTo(0.5, 6);
    // just asked -> 0
    expect(overdueScore(stats({ recentAverageScore: 0.2, lastAskedAt: now }), now)).toBe(0);
  });
});

describe("newCardScore", () => {
  it("is 1 for a brand-new card and decays to 0 by the third attempt", () => {
    expect(newCardScore(null)).toBe(1);
    expect(newCardScore(stats({ attemptsCount: 0 }))).toBe(1);
    expect(newCardScore(stats({ attemptsCount: 1 }))).toBeCloseTo(2 / 3, 6);
    expect(newCardScore(stats({ attemptsCount: 3 }))).toBe(0);
    expect(newCardScore(stats({ attemptsCount: 10 }))).toBe(0);
  });
});

describe("computePriority", () => {
  it("gives a brand-new card the full new/weak/overdue weight", () => {
    // (1-0)*60 + 1*25 + 1*30 + 0*10 = 115
    expect(computePriority(item(1, null), now, 0)).toBeCloseTo(115, 6);
  });

  it("gives a perfectly-known, just-asked card near-zero priority", () => {
    const known = stats({ recentAverageScore: 1, attemptsCount: 10, lastAskedAt: now });
    expect(computePriority(item(1, known), now, 0)).toBeCloseTo(0, 6);
  });

  it("ranks a weakly-known card above a well-known one", () => {
    const weak = item(1, stats({ recentAverageScore: 0.2, attemptsCount: 10, lastAskedAt: now }));
    const strong = item(2, stats({ recentAverageScore: 0.9, attemptsCount: 10, lastAskedAt: now }));
    expect(computePriority(weak, now, 0)).toBeGreaterThan(computePriority(strong, now, 0));
  });

  it("adds the random jitter term (0..10)", () => {
    const known = stats({ recentAverageScore: 1, attemptsCount: 10, lastAskedAt: now });
    expect(computePriority(item(1, known), now, 1)).toBeCloseTo(10, 6);
  });
});

describe("weightedPick", () => {
  it("selects an index proportional to weight", () => {
    expect(weightedPick([1, 3], 0)).toBe(0);
    expect(weightedPick([1, 3], 0.1)).toBe(0); // 0.4 of total 4 -> first bucket
    expect(weightedPick([1, 3], 0.5)).toBe(1); // 2.0 of total 4 -> second bucket
    expect(weightedPick([1, 3], 0.99)).toBe(1);
  });

  it("falls back to uniform selection when all weights are zero", () => {
    expect(weightedPick([0, 0], 0.7)).toBe(1);
    expect(weightedPick([0, 0, 0], 0.1)).toBe(0);
  });
});

describe("pickNextCard", () => {
  const items = [item(1, stats({})), item(2, stats({})), item(3, stats({}))];

  it("never returns a card that is in the recent (anti-repeat) list", () => {
    const picked = pickNextCard(items, [1, 2], now, seq([0.5]));
    expect(picked.cardId).toBe(3);
  });

  it("falls back to the full deck when every card was asked recently", () => {
    const picked = pickNextCard(items, [1, 2, 3], now, seq([0.5]));
    expect([1, 2, 3]).toContain(picked.cardId);
  });
});

describe("orient", () => {
  it("shows the card in the given order or flipped, based on rng", () => {
    expect(orient(3, 8, 0.2)).toEqual([3, 8]);
    expect(orient(3, 8, 0.8)).toEqual([8, 3]);
  });
});
