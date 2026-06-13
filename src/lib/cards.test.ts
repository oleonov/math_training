import { describe, it, expect } from "vitest";
import { generateCards, canonical } from "./cards";

describe("canonical", () => {
  it("orders a pair so the smaller factor comes first", () => {
    expect(canonical(8, 3)).toEqual([3, 8]);
    expect(canonical(3, 8)).toEqual([3, 8]);
    expect(canonical(5, 5)).toEqual([5, 5]);
  });
});

describe("generateCards", () => {
  const cards = generateCards();

  it("produces exactly 36 cards (pairs 2..9 with a <= b)", () => {
    expect(cards).toHaveLength(36);
  });

  it("keeps every factor in range 2..9 with a <= b", () => {
    for (const c of cards) {
      expect(c.a).toBeGreaterThanOrEqual(2);
      expect(c.b).toBeLessThanOrEqual(9);
      expect(c.a).toBeLessThanOrEqual(c.b);
    }
  });

  it("computes the correct answer for each card", () => {
    const card = cards.find((c) => c.a === 7 && c.b === 8);
    expect(card?.answer).toBe(56);
  });

  it("excludes multiplication by 1 and by 10", () => {
    expect(cards.some((c) => c.a === 1 || c.b === 1)).toBe(false);
    expect(cards.some((c) => c.a === 10 || c.b === 10)).toBe(false);
  });

  it("treats 3x8 and 8x3 as a single card (only the canonical form exists)", () => {
    const matches = cards.filter(
      (c) => (c.a === 3 && c.b === 8) || (c.a === 8 && c.b === 3),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ a: 3, b: 8 });
  });

  it("has no duplicate pairs", () => {
    const keys = cards.map((c) => `${c.a}x${c.b}`);
    expect(new Set(keys).size).toBe(cards.length);
  });
});
