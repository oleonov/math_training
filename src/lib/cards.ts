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
