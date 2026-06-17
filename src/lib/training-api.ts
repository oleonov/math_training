// The training "engine" the UI talks to, abstracted so the same screens
// (Trainer / TrainingScreen / SummaryScreen) can run either against the server
// (logged-in user, persisted to the DB) or fully client-side (guest mode — see
// guest-engine.ts — with nothing saved server-side and records kept in the
// browser). Both implementations return the exact same shapes.

import { postJson } from "./api-client";
import type { AnswerResult, SessionSummary, StartResult } from "./api-types";

/** The body the client sends for a single answer. */
export interface AnswerRequest {
  sessionId: number;
  cardId: number;
  shownA: number;
  shownB: number;
  userAnswer: number | null;
  responseTimeMs: number;
  /** The correct answer was shown as a hint (a retry after a previous mistake). */
  hinted: boolean;
}

export interface TrainingApi {
  /** `numbers` are the selected tables (2..9); empty means "all tables". */
  start(
    answerTimeLimitSec: number,
    trainingDurationMin: number,
    numbers: number[],
  ): Promise<StartResult>;
  answer(input: AnswerRequest): Promise<AnswerResult>;
  finish(sessionId: number): Promise<SessionSummary>;
}

/** Server-backed engine: plain calls to the existing API routes. */
export const serverTrainingApi: TrainingApi = {
  start: (answerTimeLimitSec, trainingDurationMin, numbers) =>
    postJson<StartResult>("/api/session/start", {
      answerTimeLimitSec,
      trainingDurationMin,
      numbers,
    }),
  answer: (input) => postJson<AnswerResult>("/api/session/answer", input),
  finish: (sessionId) => postJson<SessionSummary>("/api/session/finish", { sessionId }),
};
