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

  it("produces exactly 64 cards (every ordered pair 2..9)", () => {
    expect(cards).toHaveLength(64);
  });

  it("keeps every factor in range 2..9", () => {
    for (const c of cards) {
      expect(c.a).toBeGreaterThanOrEqual(2);
      expect(c.a).toBeLessThanOrEqual(9);
      expect(c.b).toBeGreaterThanOrEqual(2);
      expect(c.b).toBeLessThanOrEqual(9);
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

  it("treats 3×8 and 8×3 as two distinct cards (both orientations exist)", () => {
    const matches = cards.filter(
      (c) => (c.a === 3 && c.b === 8) || (c.a === 8 && c.b === 3),
    );
    expect(matches).toHaveLength(2);
    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ a: 3, b: 8 }),
        expect.objectContaining({ a: 8, b: 3 }),
      ]),
    );
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
    expect(filterCardsByNumbers(cards, [])).toHaveLength(64);
    expect(filterCardsByNumbers(cards, [...SELECTABLE_NUMBERS])).toHaveLength(64);
  });

  it("keeps a card when either factor is selected", () => {
    const fives = filterCardsByNumbers(cards, [5]);
    expect(fives.every((c) => c.a === 5 || c.b === 5)).toBe(true);
    // The 5-times table, both orientations: 5×(2..9) is 8 and (2..9)×5 is 8,
    // minus the shared 5×5 counted once = 15 cards.
    expect(fives).toHaveLength(15);
  });

  it("unions the selected tables (5 and 8)", () => {
    const picked = filterCardsByNumbers(cards, [5, 8]);
    expect(picked.every((c) => c.a === 5 || c.b === 5 || c.a === 8 || c.b === 8)).toBe(true);
    // Every ordered pair touching 5 or 8: 64 total − 36 with neither factor in
    // {5,8} (a,b each from the other 6 numbers) = 28.
    expect(picked).toHaveLength(28);
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
