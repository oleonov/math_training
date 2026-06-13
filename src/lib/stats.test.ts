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
    }, askedAt);

    expect(s).toEqual<CardStats>({
      attemptsCount: 1,
      fastCorrectCount: 1,
      slowCorrectCount: 0,
      wrongCount: 0,
      averageScore: 1,
      recentAverageScore: 1,
      averageResponseTimeMs: 2000,
      lastAskedAt: askedAt,
    });
  });

  it("records a wrong answer", () => {
    const s = updateStats(null, {
      score: 0,
      isCorrect: false,
      isAfterTimeout: false,
      responseTimeMs: 5000,
    }, askedAt);
    expect(s.wrongCount).toBe(1);
    expect(s.averageScore).toBe(0);
    expect(s.recentAverageScore).toBe(0);
  });
});

describe("updateStats — accumulating attempts", () => {
  const first = updateStats(null, {
    score: 1,
    isCorrect: true,
    isAfterTimeout: false,
    responseTimeMs: 2000,
  }, askedAt);

  it("updates the running mean of score and response time", () => {
    const second = updateStats(first, {
      score: 0,
      isCorrect: false,
      isAfterTimeout: false,
      responseTimeMs: 4000,
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
    }, later);
    expect(second.lastAskedAt).toEqual(later);
  });
});
