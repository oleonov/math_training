import { describe, it, expect } from "vitest";
import { evaluateAnswer } from "./scoring";

const base = {
  correctAnswer: 56,
  answerTimeLimitSec: 4,
  isFirst: false,
};

describe("evaluateAnswer", () => {
  it("scores a correct answer before the timeout as 100%", () => {
    const r = evaluateAnswer({ ...base, userAnswer: 56, responseTimeMs: 2000 });
    expect(r).toEqual({ isCorrect: true, isAfterTimeout: false, score: 1 });
  });

  it("scores a correct answer after the timeout as 50%", () => {
    const r = evaluateAnswer({ ...base, userAnswer: 56, responseTimeMs: 6000 });
    expect(r).toEqual({ isCorrect: true, isAfterTimeout: true, score: 0.5 });
  });

  it("scores a wrong answer as 0% regardless of time", () => {
    const fast = evaluateAnswer({ ...base, userAnswer: 48, responseTimeMs: 1000 });
    expect(fast).toEqual({ isCorrect: false, isAfterTimeout: false, score: 0 });
    const slow = evaluateAnswer({ ...base, userAnswer: 48, responseTimeMs: 9000 });
    expect(slow).toEqual({ isCorrect: false, isAfterTimeout: true, score: 0 });
  });

  it("treats answering exactly at the limit as within time", () => {
    const r = evaluateAnswer({ ...base, userAnswer: 56, responseTimeMs: 4000 });
    expect(r.isAfterTimeout).toBe(false);
    expect(r.score).toBe(1);
  });

  it("never marks the first example as after-timeout, even if slow", () => {
    const r = evaluateAnswer({
      ...base,
      isFirst: true,
      userAnswer: 56,
      responseTimeMs: 60000,
    });
    expect(r).toEqual({ isCorrect: true, isAfterTimeout: false, score: 1 });
  });

  it("treats a blank (null) answer as incorrect", () => {
    const r = evaluateAnswer({ ...base, userAnswer: null, responseTimeMs: 1000 });
    expect(r).toEqual({ isCorrect: false, isAfterTimeout: false, score: 0 });
  });
});
