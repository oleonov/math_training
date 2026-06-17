// Response shapes shared between the API and the client. No server-only imports
// here so client components can import these types freely.

export interface NextCard {
  cardId: number;
  shownA: number;
  shownB: number;
  isFirst: boolean;
  /** Number of digits in the answer — lets the client auto-submit without Enter. */
  answerLength: number;
}

export interface StartResult {
  sessionId: number;
  answerTimeLimitSec: number;
  durationSec: number;
  card: NextCard;
}

export interface AnswerResult {
  result: {
    isCorrect: boolean;
    isAfterTimeout: boolean;
    score: number;
    correctAnswer: number;
  };
  next: NextCard;
}

export interface CardSummaryEntry {
  a: number;
  b: number;
  answer: number;
  recentAverageScore: number;
  daysSinceLastAsked: number | null;
}

/** One ordered card's lifetime mastery, for the heatmap (a, b in 2..9; 7×8 and
 *  8×7 are separate). */
export interface MasteryEntry {
  a: number;
  b: number;
  recentAverageScore: number; // EMA, 0..1
  attempts: number;
}

export interface SessionSummary {
  totalAnswers: number;
  fastCorrectCount: number;
  slowCorrectCount: number;
  wrongCount: number;
  averageScore: number;
  weakest: CardSummaryEntry[];
  overdue: CardSummaryEntry[];
  /** Lifetime mastery of every ordered card (64), for the heatmap. */
  mastery?: MasteryEntry[];
  /** True when this session beat the best averageScore for the same
   *  (answerTimeLimitSec, trainingDurationMin) pair. Drives the celebration. */
  isNewRecord: boolean;
  /** Best averageScore among earlier finished sessions with the same parameter
   *  pair, or null when this is the first such session. */
  previousBestScore: number | null;
}
