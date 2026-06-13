export interface AnswerEvaluation {
  isCorrect: boolean;
  isAfterTimeout: boolean;
  score: number; // 1 = fast correct, 0.5 = slow correct, 0 = wrong
}

export interface AnswerInput {
  correctAnswer: number;
  userAnswer: number | null;
  responseTimeMs: number;
  answerTimeLimitSec: number;
  /** The first example of a session has no active timer. */
  isFirst: boolean;
}

/**
 * Authoritative server-side scoring.
 * - correct before the timer  -> 1.0
 * - correct after the timer    -> 0.5
 * - wrong                      -> 0.0
 * The very first example of a session is never counted as after-timeout.
 */
export function evaluateAnswer(input: AnswerInput): AnswerEvaluation {
  const { correctAnswer, userAnswer, responseTimeMs, answerTimeLimitSec, isFirst } = input;

  const isCorrect = userAnswer !== null && userAnswer === correctAnswer;
  const isAfterTimeout = !isFirst && responseTimeMs > answerTimeLimitSec * 1000;

  let score = 0;
  if (isCorrect) {
    score = isAfterTimeout ? 0.5 : 1;
  }

  return { isCorrect, isAfterTimeout, score };
}
