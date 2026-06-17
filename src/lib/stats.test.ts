import { describe, it, expect } from "vitest";
import { updateStats, EMA_ALPHA, type CardStats } from "./stats";

const askedAt = new Date("2026-06-04T10:00:00Z");

describe("updateStats — first attempt on a new card (prev = null)", () => {
  it("records a fast correct answer", () => {
    const s = updateStats(null, {
      score: 1,
      isCorrect: true,
      isAfterTimeout: false,
      responseTimeMs: 2000,
      hinted: false,
    }, askedAt);

    expect(s).toEqual<CardStats>({
      attemptsCount: 1,
      fastCorrectCount: 1,
      slowCorrectCount: 0,
      wrongCount: 0,
      averageScore: 1,
      recentAverageScore: 1,
      averageResponseTimeMs: 2000,
      solvedUnaided: true,
      lastAskedAt: askedAt,
    });
  });

  it("records a wrong answer", () => {
    const s = updateStats(null, {
      score: 0,
      isCorrect: false,
      isAfterTimeout: false,
      responseTimeMs: 5000,
      hinted: false,
    }, askedAt);
    expect(s.wrongCount).toBe(1);
    expect(s.averageScore).toBe(0);
    expect(s.recentAverageScore).toBe(0);
    expect(s.solvedUnaided).toBe(false);
  });
});

describe("updateStats — accumulating attempts", () => {
  const first = updateStats(null, {
    score: 1,
    isCorrect: true,
    isAfterTimeout: false,
    responseTimeMs: 2000,
    hinted: false,
  }, askedAt);

  it("updates the running mean of score and response time", () => {
    const second = updateStats(first, {
      score: 0,
      isCorrect: false,
      isAfterTimeout: false,
      responseTimeMs: 4000,
      hinted: false,
    }, askedAt);

    expect(second.attemptsCount).toBe(2);
    expect(second.averageScore).toBeCloseTo(0.5, 10);
    expect(second.averageResponseTimeMs).toBeCloseTo(3000, 10);
  });

  it("blends recentAverageScore as an EMA", () => {
    const second = updateStats(first, {
      score: 0,
      isCorrect: false,
      isAfterTimeout: false,
      responseTimeMs: 4000,
      hinted: false,
    }, askedAt);
    // EMA: alpha*new + (1-alpha)*prev = 0.3*0 + 0.7*1
    expect(second.recentAverageScore).toBeCloseTo(EMA_ALPHA * 0 + (1 - EMA_ALPHA) * 1, 10);
  });

  it("counts slow-correct answers separately", () => {
    const second = updateStats(first, {
      score: 0.5,
      isCorrect: true,
      isAfterTimeout: true,
      responseTimeMs: 7000,
      hinted: false,
    }, askedAt);
    expect(second.slowCorrectCount).toBe(1);
    expect(second.fastCorrectCount).toBe(1);
  });

  it("advances lastAskedAt", () => {
    const later = new Date("2026-06-05T10:00:00Z");
    const second = updateStats(first, {
      score: 1,
      isCorrect: true,
      isAfterTimeout: false,
      responseTimeMs: 1500,
      hinted: false,
    }, later);
    expect(second.lastAskedAt).toEqual(later);
  });
});

describe("updateStats — solvedUnaided (the 'освоено' flag)", () => {
  const wrong = { score: 0, isCorrect: false, isAfterTimeout: false, responseTimeMs: 5000, hinted: false };
  const correctUnaided = { score: 1, isCorrect: true, isAfterTimeout: false, responseTimeMs: 2000, hinted: false };
  const correctHinted = { score: 1, isCorrect: true, isAfterTimeout: false, responseTimeMs: 2000, hinted: true };

  it("is set by a first-try correct answer (no hint)", () => {
    expect(updateStats(null, correctUnaided, askedAt).solvedUnaided).toBe(true);
  });

  it("is NOT set by a correct answer that was hinted (a retry)", () => {
    // Wrong, then correct but with the answer shown as a hint — does not count.
    const afterWrong = updateStats(null, wrong, askedAt);
    expect(afterWrong.solvedUnaided).toBe(false);
    const afterHintedCorrect = updateStats(afterWrong, correctHinted, askedAt);
    expect(afterHintedCorrect.solvedUnaided).toBe(false);
  });

  it("stays set once earned, even after a later wrong answer (sticky)", () => {
    const mastered = updateStats(null, correctUnaided, askedAt);
    expect(mastered.solvedUnaided).toBe(true);
    const afterSlip = updateStats(mastered, wrong, askedAt);
    expect(afterSlip.solvedUnaided).toBe(true);
  });

  it("counts a card solved unaided only once toward mastery", () => {
    // Shown three times, answered correctly unaided once — still just mastered.
    let s = updateStats(null, wrong, askedAt);
    s = updateStats(s, correctUnaided, askedAt);
    s = updateStats(s, correctHinted, askedAt);
    expect(s.solvedUnaided).toBe(true);
    expect(s.attemptsCount).toBe(3);
  });
});
