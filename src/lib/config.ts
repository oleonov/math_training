// Shared training options (used by both the UI and the API validation).
export const ANSWER_TIME_LIMITS_SEC = [2, 3, 4, 5, 8] as const;
export const TRAINING_DURATIONS_MIN = [1, 2, 3, 5, 10, 15] as const;

export const DEFAULT_ANSWER_TIME_LIMIT_SEC = 4;
export const DEFAULT_TRAINING_DURATION_MIN = 5;

/** How many recent cards to avoid repeating. */
export const ANTI_REPEAT_WINDOW = 4;

/** How many cards to list in the session summary. */
export const SUMMARY_LIST_SIZE = 5;
