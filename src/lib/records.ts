// Personal-record logic for a finished training session. A "record" is keyed by
// the two parameters the user picks before a session — the answer time limit and
// the training duration — so each (answerTimeLimitSec, trainingDurationMin) pair
// tracks its own best averageScore. The best is derived from the history of
// finished sessions, so there is no separate record table to keep in sync.

/**
 * True when the just-finished session is a new personal best for its parameter
 * pair. Requires a strictly higher score than the previous best; the very first
 * session with a given pair (previousBestScore === null) is never a record, since
 * there is nothing to beat. Sessions with no answers never count.
 */
export function isNewRecord(
  currentAverageScore: number,
  currentTotalAnswers: number,
  previousBestScore: number | null,
): boolean {
  if (currentTotalAnswers === 0) return false;
  if (previousBestScore === null) return false;
  return currentAverageScore > previousBestScore;
}
