export interface CardSpec {
  a: number;
  b: number;
  answer: number;
}

/** Order two factors so the smaller comes first (canonical form: a <= b). */
export function canonical(x: number, y: number): [number, number] {
  return x <= y ? [x, y] : [y, x];
}

/**
 * The full deck: every multiplication pair with 2 <= a <= b <= 9.
 * Excludes x1 and x10 (out of range) and treats e.g. 3x8 / 8x3 as one card.
 * Exactly 36 cards.
 */
export function generateCards(): CardSpec[] {
  const cards: CardSpec[] = [];
  for (let a = 2; a <= 9; a++) {
    for (let b = a; b <= 9; b++) {
      cards.push({ a, b, answer: a * b });
    }
  }
  return cards;
}

/** The multiplication tables a child can pick to train (2..9). */
export const SELECTABLE_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Normalize an arbitrary "selected tables" input to a clean, sorted list of
 * unique integers within 2..9. Anything out of range is dropped. An empty result
 * means "no filter" — callers treat that as "all tables".
 */
export function normalizeNumbers(input: unknown): number[] {
  const arr = Array.isArray(input) ? input : [];
  const set = new Set<number>();
  for (const v of arr) {
    const n = Math.trunc(Number(v));
    if (Number.isFinite(n) && n >= 2 && n <= 9) set.add(n);
  }
  return [...set].sort((x, y) => x - y);
}

/** True when the selection is empty or already covers every selectable table. */
export function isAllNumbers(numbers: number[]): boolean {
  return numbers.length === 0 || numbers.length >= SELECTABLE_NUMBERS.length;
}

/**
 * Keep only cards whose `a` OR `b` is among the selected tables — e.g. {5, 8}
 * yields the 5- and 8-times tables. An empty/all selection is a no-op, and the
 * result is never empty (any single table has at least its own row of cards).
 */
export function filterCardsByNumbers<T extends { a: number; b: number }>(
  items: T[],
  numbers: number[],
): T[] {
  if (isAllNumbers(numbers)) return items;
  const set = new Set(numbers);
  const filtered = items.filter((c) => set.has(c.a) || set.has(c.b));
  return filtered.length > 0 ? filtered : items;
}

/** Serialize a selection for storage ("5,8"); null means "all tables". */
export function serializeNumbers(numbers: number[]): string | null {
  return isAllNumbers(numbers) ? null : numbers.join(",");
}

/** Parse stored numbers ("5,8") back to a list; null/empty => [] (all tables). */
export function parseNumbers(stored: string | null | undefined): number[] {
  return stored ? normalizeNumbers(stored.split(",")) : [];
}
