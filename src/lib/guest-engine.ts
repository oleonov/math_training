// Fully client-side training engine for "guest" mode. It mirrors the server's
// training-service.ts orchestration but runs entirely in the browser, reusing
// the same pure logic (card deck, selection, scoring, stats). Nothing is sent to
// the server and per-card stats live only for the lifetime of this tab.
//
// Records ARE remembered — in the browser. Keyed by the same pair the user picks
// before a session (answer time limit + training duration), the best averageScore
// is kept in localStorage, so a guest can still chase (and celebrate) a personal
// best across visits, exactly like a logged-in user does against the DB.

import { evaluateAnswer } from "./scoring";
import { updateStats } from "./stats";
import { pickNextCard, orient, overdueScore, type CardWithStats } from "./selection";
import { isNewRecord } from "./records";
import { generateCards, filterCardsByNumbers, normalizeNumbers } from "./cards";
import {
  ANSWER_TIME_LIMITS_SEC,
  TRAINING_DURATIONS_MIN,
  ANTI_REPEAT_WINDOW,
  SUMMARY_LIST_SIZE,
} from "./config";
import type { CardSummaryEntry, NextCard, SessionSummary } from "./api-types";
import type { AnswerRequest, TrainingApi } from "./training-api";

const MS_PER_DAY = 86_400_000;

// Browser-stored guest records: { "<limit>:<duration>": bestAverageScore }.
const RECORDS_KEY = "mc_guest_records_v1";

const recordKey = (answerTimeLimitSec: number, trainingDurationMin: number) =>
  `${answerTimeLimitSec}:${trainingDurationMin}`;

function readRecords(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeRecords(records: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Ignore quota / private-mode failures — records are a nice-to-have here.
  }
}

interface GuestSession {
  answerTimeLimitSec: number;
  trainingDurationMin: number;
  totalAnswers: number;
  fastCorrectCount: number;
  slowCorrectCount: number;
  wrongCount: number;
  averageScore: number;
  recentCardIds: number[]; // most-recent first, capped at ANTI_REPEAT_WINDOW
  pool: CardWithStats[]; // the cards this session draws from (filtered by tables)
}

/**
 * Create an independent guest training engine. Per-card stats accumulate across
 * sessions within this instance (one browser tab), giving meaningful "weakest"
 * and "overdue" summaries, but are never persisted. Records go to localStorage.
 */
export function createGuestApi(): TrainingApi {
  // The 36-card deck, cardId = stable index. Stats build up across sessions.
  const cards: CardWithStats[] = generateCards().map((c, i) => ({
    cardId: i,
    a: c.a,
    b: c.b,
    stats: null,
  }));
  const cardById = new Map(cards.map((c) => [c.cardId, c]));
  const rng = () => Math.random();

  let session: GuestSession | null = null;

  function chooseNext(pool: CardWithStats[], recentCardIds: number[], isFirst: boolean): NextCard {
    const card = pickNextCard(pool, recentCardIds, new Date(), rng);
    const [shownA, shownB] = orient(card.a, card.b, rng());
    return {
      cardId: card.cardId,
      shownA,
      shownB,
      isFirst,
      answerLength: String(card.a * card.b).length,
    };
  }

  return {
    async start(answerTimeLimitSec, trainingDurationMin, numbers) {
      if (!ANSWER_TIME_LIMITS_SEC.includes(answerTimeLimitSec as never)) {
        throw new Error("Invalid answerTimeLimitSec");
      }
      if (!TRAINING_DURATIONS_MIN.includes(trainingDurationMin as never)) {
        throw new Error("Invalid trainingDurationMin");
      }
      // Draw only from the selected tables; empty/all uses the whole deck. The
      // pool holds references into `cards`, so stats still accumulate per-card.
      const pool = filterCardsByNumbers(cards, normalizeNumbers(numbers));
      session = {
        answerTimeLimitSec,
        trainingDurationMin,
        totalAnswers: 0,
        fastCorrectCount: 0,
        slowCorrectCount: 0,
        wrongCount: 0,
        averageScore: 0,
        recentCardIds: [],
        pool,
      };
      return {
        sessionId: 1, // synthetic: only one guest session is live at a time
        answerTimeLimitSec,
        durationSec: trainingDurationMin * 60,
        card: chooseNext(pool, [], true),
      };
    },

    async answer(input: AnswerRequest) {
      if (!session) throw new Error("No active session");
      const card = cardById.get(input.cardId);
      if (!card) throw new Error("Card not found");

      const isFirst = session.totalAnswers === 0;
      const correctAnswer = card.a * card.b;
      const ev = evaluateAnswer({
        correctAnswer,
        userAnswer: input.userAnswer,
        responseTimeMs: input.responseTimeMs,
        answerTimeLimitSec: session.answerTimeLimitSec,
        isFirst,
      });

      // Fold into the per-card stats (kept for the tab) and session aggregates.
      card.stats = updateStats(
        card.stats,
        { ...ev, responseTimeMs: input.responseTimeMs },
        new Date(),
      );

      const newTotal = session.totalAnswers + 1;
      session.averageScore =
        (session.averageScore * session.totalAnswers + ev.score) / newTotal;
      session.totalAnswers = newTotal;
      session.fastCorrectCount += ev.isCorrect && !ev.isAfterTimeout ? 1 : 0;
      session.slowCorrectCount += ev.isCorrect && ev.isAfterTimeout ? 1 : 0;
      session.wrongCount += ev.isCorrect ? 0 : 1;
      session.recentCardIds = [input.cardId, ...session.recentCardIds].slice(
        0,
        ANTI_REPEAT_WINDOW,
      );

      return {
        result: {
          isCorrect: ev.isCorrect,
          isAfterTimeout: ev.isAfterTimeout,
          score: ev.score,
          correctAnswer,
        },
        next: chooseNext(session.pool, session.recentCardIds, false),
      };
    },

    async finish() {
      if (!session) throw new Error("No active session");

      // Personal record from the browser, keyed by the session parameters.
      const records = readRecords();
      const key = recordKey(session.answerTimeLimitSec, session.trainingDurationMin);
      const previousBestScore = key in records ? records[key] : null;
      const newRecord = isNewRecord(
        session.averageScore,
        session.totalAnswers,
        previousBestScore,
      );
      if (
        session.totalAnswers > 0 &&
        (previousBestScore === null || session.averageScore > previousBestScore)
      ) {
        records[key] = session.averageScore;
        writeRecords(records);
      }

      const now = Date.now();
      const answered = cards.filter((c) => c.stats && c.stats.attemptsCount > 0);
      const toEntry = (c: CardWithStats): CardSummaryEntry => ({
        a: c.a,
        b: c.b,
        answer: c.a * c.b,
        recentAverageScore: c.stats!.recentAverageScore,
        daysSinceLastAsked: c.stats!.lastAskedAt
          ? (now - c.stats!.lastAskedAt.getTime()) / MS_PER_DAY
          : null,
      });

      const weakest = [...answered]
        .sort((x, y) => x.stats!.recentAverageScore - y.stats!.recentAverageScore)
        .slice(0, SUMMARY_LIST_SIZE)
        .map(toEntry);

      const overdue = [...answered]
        .sort(
          (x, y) => overdueScore(y.stats, new Date(now)) - overdueScore(x.stats, new Date(now)),
        )
        .slice(0, SUMMARY_LIST_SIZE)
        .map(toEntry);

      const summary: SessionSummary = {
        totalAnswers: session.totalAnswers,
        fastCorrectCount: session.fastCorrectCount,
        slowCorrectCount: session.slowCorrectCount,
        wrongCount: session.wrongCount,
        averageScore: session.averageScore,
        weakest,
        overdue,
        isNewRecord: newRecord,
        previousBestScore,
      };
      session = null;
      return summary;
    },
  };
}
