/** Smoothing factor for the recent-average EMA (~last 5-10 attempts). */
export const EMA_ALPHA = 0.3;

/** Denormalized per-user-per-card statistics (DB keys handled separately). */
export interface CardStats {
  attemptsCount: number;
  fastCorrectCount: number;
  slowCorrectCount: number;
  wrongCount: number;
  averageScore: number; // running mean over all attempts, 0..1
  recentAverageScore: number; // EMA, 0..1
  averageResponseTimeMs: number; // running mean
  lastAskedAt: Date | null;
}

export interface AttemptOutcome {
  score: number;
  isCorrect: boolean;
  isAfterTimeout: boolean;
  responseTimeMs: number;
}

/**
 * Fold a single attempt outcome into the card's statistics.
 * Pure: takes the previous stats (or null for a brand-new card) and returns
 * the next stats. recentAverageScore is an exponential moving average.
 */
export function updateStats(
  prev: CardStats | null,
  outcome: AttemptOutcome,
  askedAt: Date,
): CardStats {
  const n = prev?.attemptsCount ?? 0;
  const newCount = n + 1;

  const prevAvgScore = prev?.averageScore ?? 0;
  const prevAvgRt = prev?.averageResponseTimeMs ?? 0;

  const averageScore = (prevAvgScore * n + outcome.score) / newCount;
  const averageResponseTimeMs = (prevAvgRt * n + outcome.responseTimeMs) / newCount;

  const recentAverageScore =
    prev === null
      ? outcome.score
      : EMA_ALPHA * outcome.score + (1 - EMA_ALPHA) * prev.recentAverageScore;

  const fast = outcome.isCorrect && !outcome.isAfterTimeout;
  const slow = outcome.isCorrect && outcome.isAfterTimeout;

  return {
    attemptsCount: newCount,
    fastCorrectCount: (prev?.fastCorrectCount ?? 0) + (fast ? 1 : 0),
    slowCorrectCount: (prev?.slowCorrectCount ?? 0) + (slow ? 1 : 0),
    wrongCount: (prev?.wrongCount ?? 0) + (outcome.isCorrect ? 0 : 1),
    averageScore,
    recentAverageScore,
    averageResponseTimeMs,
    lastAskedAt: askedAt,
  };
}
