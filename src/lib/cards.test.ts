import { describe, it, expect } from "vitest";
import {
  generateCards,
  canonical,
  SELECTABLE_NUMBERS,
  normalizeNumbers,
  isAllNumbers,
  filterCardsByNumbers,
  serializeNumbers,
  parseNumbers,
} from "./cards";

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

describe("normalizeNumbers", () => {
  it("keeps only unique, sorted integers within 2..9", () => {
    expect(normalizeNumbers([8, 5, 5, 8])).toEqual([5, 8]);
    expect(normalizeNumbers(["3", 7, 3])).toEqual([3, 7]);
  });

  it("drops out-of-range, non-numeric and non-array input", () => {
    expect(normalizeNumbers([1, 10, 0, 9])).toEqual([9]);
    expect(normalizeNumbers(["x", null, undefined, 4])).toEqual([4]);
    expect(normalizeNumbers("nope")).toEqual([]);
    expect(normalizeNumbers(undefined)).toEqual([]);
  });
});

describe("isAllNumbers", () => {
  it("treats empty or full selections as 'all'", () => {
    expect(isAllNumbers([])).toBe(true);
    expect(isAllNumbers([...SELECTABLE_NUMBERS])).toBe(true);
  });

  it("is false for a partial selection", () => {
    expect(isAllNumbers([5, 8])).toBe(false);
  });
});

describe("filterCardsByNumbers", () => {
  const cards = generateCards();

  it("returns the full deck for empty/all selections", () => {
    expect(filterCardsByNumbers(cards, [])).toHaveLength(36);
    expect(filterCardsByNumbers(cards, [...SELECTABLE_NUMBERS])).toHaveLength(36);
  });

  it("keeps a card when either factor is selected", () => {
    const fives = filterCardsByNumbers(cards, [5]);
    expect(fives.every((c) => c.a === 5 || c.b === 5)).toBe(true);
    // The 5-times table: 5×5..5×9 plus 2×5,3×5,4×5 — eight cards.
    expect(fives).toHaveLength(8);
  });

  it("unions the selected tables (5 and 8)", () => {
    const picked = filterCardsByNumbers(cards, [5, 8]);
    expect(picked.every((c) => c.a === 5 || c.b === 5 || c.a === 8 || c.b === 8)).toBe(true);
    // 8 (fives) + 8 (eights) − 1 (the shared 5×8 card) = 15.
    expect(picked).toHaveLength(15);
  });

  it("never returns an empty result", () => {
    expect(filterCardsByNumbers(cards, [7]).length).toBeGreaterThan(0);
  });
});

describe("serializeNumbers / parseNumbers", () => {
  it("stores null for empty/all and round-trips a partial selection", () => {
    expect(serializeNumbers([])).toBeNull();
    expect(serializeNumbers([...SELECTABLE_NUMBERS])).toBeNull();
    expect(serializeNumbers([5, 8])).toBe("5,8");
    expect(parseNumbers("5,8")).toEqual([5, 8]);
    expect(parseNumbers(null)).toEqual([]);
    expect(parseNumbers(undefined)).toEqual([]);
  });
});
