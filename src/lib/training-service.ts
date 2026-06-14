import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { evaluateAnswer } from "./scoring";
import { updateStats, type CardStats } from "./stats";
import {
  pickNextCard,
  orient,
  overdueScore,
  type CardWithStats,
} from "./selection";
import { filterCardsByNumbers, normalizeNumbers, parseNumbers, serializeNumbers } from "./cards";
import { HttpError } from "./http";
import { isNewRecord } from "./records";
import {
  ANSWER_TIME_LIMITS_SEC,
  TRAINING_DURATIONS_MIN,
  ANTI_REPEAT_WINDOW,
  SUMMARY_LIST_SIZE,
} from "./config";
import type {
  NextCard,
  StartResult,
  AnswerResult,
  CardSummaryEntry,
  SessionSummary,
} from "./api-types";

const rng = () => Math.random();

type StatsRow = {
  attemptsCount: number;
  fastCorrectCount: number;
  slowCorrectCount: number;
  wrongCount: number;
  averageScore: number;
  recentAverageScore: number;
  averageResponseTimeMs: number;
  lastAskedAt: Date | null;
};

function toCardStats(row: StatsRow | null | undefined): CardStats | null {
  if (!row) return null;
  return {
    attemptsCount: row.attemptsCount,
    fastCorrectCount: row.fastCorrectCount,
    slowCorrectCount: row.slowCorrectCount,
    wrongCount: row.wrongCount,
    averageScore: row.averageScore,
    recentAverageScore: row.recentAverageScore,
    averageResponseTimeMs: row.averageResponseTimeMs,
    lastAskedAt: row.lastAskedAt,
  };
}

async function loadCardsWithStats(prisma: PrismaClient, userId: number): Promise<CardWithStats[]> {
  const [cards, stats] = await Promise.all([
    prisma.card.findMany(),
    prisma.userCardStats.findMany({ where: { userId } }),
  ]);
  const byCard = new Map(stats.map((s) => [s.cardId, s]));
  return cards.map((c) => ({
    cardId: c.id,
    a: c.a,
    b: c.b,
    stats: toCardStats(byCard.get(c.id)),
  }));
}

function chooseNext(
  items: CardWithStats[],
  recentCardIds: number[],
  isFirst: boolean,
): NextCard {
  const card = pickNextCard(items, recentCardIds, new Date(), rng);
  const [shownA, shownB] = orient(card.a, card.b, rng());
  return {
    cardId: card.cardId,
    shownA,
    shownB,
    isFirst,
    answerLength: String(card.a * card.b).length,
  };
}

export async function startSession(
  userId: number,
  answerTimeLimitSec: number,
  trainingDurationMin: number,
  numbers: number[],
  prisma: PrismaClient = defaultPrisma,
): Promise<StartResult> {
  if (!ANSWER_TIME_LIMITS_SEC.includes(answerTimeLimitSec as never)) {
    throw new HttpError(400, "Invalid answerTimeLimitSec");
  }
  if (!TRAINING_DURATIONS_MIN.includes(trainingDurationMin as never)) {
    throw new HttpError(400, "Invalid trainingDurationMin");
  }

  // The selected tables (2..9); empty/all is stored as null and skips filtering.
  const selectedNumbers = normalizeNumbers(numbers);
  const session = await prisma.session.create({
    data: {
      userId,
      answerTimeLimitSec,
      trainingDurationMin,
      numbers: serializeNumbers(selectedNumbers),
    },
  });

  const items = filterCardsByNumbers(await loadCardsWithStats(prisma, userId), selectedNumbers);
  return {
    sessionId: session.id,
    answerTimeLimitSec,
    durationSec: trainingDurationMin * 60,
    card: chooseNext(items, [], true),
  };
}

export interface AnswerInput {
  sessionId: number;
  cardId: number;
  shownA: number;
  shownB: number;
  userAnswer: number | null;
  responseTimeMs: number;
}

export async function recordAnswer(
  userId: number,
  input: AnswerInput,
  prisma: PrismaClient = defaultPrisma,
): Promise<AnswerResult> {
  const session = await prisma.session.findUnique({ where: { id: input.sessionId } });
  if (!session || session.userId !== userId) throw new HttpError(404, "Session not found");
  if (session.finishedAt) throw new HttpError(409, "Session already finished");

  const card = await prisma.card.findUnique({ where: { id: input.cardId } });
  if (!card) throw new HttpError(404, "Card not found");

  const isFirst = session.totalAnswers === 0;
  const ev = evaluateAnswer({
    correctAnswer: card.answer,
    userAnswer: input.userAnswer,
    responseTimeMs: input.responseTimeMs,
    answerTimeLimitSec: session.answerTimeLimitSec,
    isFirst,
  });

  const now = new Date();

  await prisma.attempt.create({
    data: {
      userId,
      cardId: card.id,
      sessionId: session.id,
      shownA: input.shownA,
      shownB: input.shownB,
      correctAnswer: card.answer,
      userAnswer: input.userAnswer,
      isCorrect: ev.isCorrect,
      isAfterTimeout: ev.isAfterTimeout,
      score: ev.score,
      responseTimeMs: input.responseTimeMs,
    },
  });

  // Update per-card stats.
  const prevRow = await prisma.userCardStats.findUnique({
    where: { userId_cardId: { userId, cardId: card.id } },
  });
  const next = updateStats(toCardStats(prevRow), { ...ev, responseTimeMs: input.responseTimeMs }, now);
  await prisma.userCardStats.upsert({
    where: { userId_cardId: { userId, cardId: card.id } },
    create: { userId, cardId: card.id, ...next },
    update: next,
  });

  // Update session aggregates.
  const newTotal = session.totalAnswers + 1;
  await prisma.session.update({
    where: { id: session.id },
    data: {
      totalAnswers: newTotal,
      fastCorrectCount: session.fastCorrectCount + (ev.isCorrect && !ev.isAfterTimeout ? 1 : 0),
      slowCorrectCount: session.slowCorrectCount + (ev.isCorrect && ev.isAfterTimeout ? 1 : 0),
      wrongCount: session.wrongCount + (ev.isCorrect ? 0 : 1),
      averageScore: (session.averageScore * session.totalAnswers + ev.score) / newTotal,
    },
  });

  // Choose the next card, avoiding the last few asked in this session.
  const recentAttempts = await prisma.attempt.findMany({
    where: { sessionId: session.id },
    orderBy: { id: "desc" },
    take: ANTI_REPEAT_WINDOW,
    select: { cardId: true },
  });
  const recentCardIds = recentAttempts.map((a) => a.cardId);
  // Pick the next card from the SAME subset of tables this session was started with.
  const items = filterCardsByNumbers(
    await loadCardsWithStats(prisma, userId),
    parseNumbers(session.numbers),
  );

  return {
    result: {
      isCorrect: ev.isCorrect,
      isAfterTimeout: ev.isAfterTimeout,
      score: ev.score,
      correctAnswer: card.answer,
    },
    next: chooseNext(items, recentCardIds, false),
  };
}

export async function finishSession(
  userId: number,
  sessionId: number,
  prisma: PrismaClient = defaultPrisma,
): Promise<SessionSummary> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw new HttpError(404, "Session not found");

  if (!session.finishedAt) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { finishedAt: new Date() },
    });
  }

  // Personal record: the best averageScore among earlier *finished* sessions
  // with the same parameter pair (answer time limit + duration). Derived from
  // history — no separate record table to keep in sync.
  const best = await prisma.session.aggregate({
    _max: { averageScore: true },
    where: {
      userId,
      id: { not: sessionId },
      finishedAt: { not: null },
      totalAnswers: { gt: 0 },
      answerTimeLimitSec: session.answerTimeLimitSec,
      trainingDurationMin: session.trainingDurationMin,
    },
  });
  const previousBestScore = best._max.averageScore;
  const newRecord = isNewRecord(session.averageScore, session.totalAnswers, previousBestScore);

  const stats = await prisma.userCardStats.findMany({
    where: { userId, attemptsCount: { gt: 0 } },
    include: { card: true },
  });

  const now = Date.now();
  const toEntry = (s: (typeof stats)[number]): CardSummaryEntry => ({
    a: s.card.a,
    b: s.card.b,
    answer: s.card.answer,
    recentAverageScore: s.recentAverageScore,
    daysSinceLastAsked: s.lastAskedAt
      ? (now - s.lastAskedAt.getTime()) / 86_400_000
      : null,
  });

  const weakest = [...stats]
    .sort((x, y) => x.recentAverageScore - y.recentAverageScore)
    .slice(0, SUMMARY_LIST_SIZE)
    .map(toEntry);

  const overdue = [...stats]
    .sort((x, y) => overdueScore(toCardStats(y), new Date(now)) - overdueScore(toCardStats(x), new Date(now)))
    .slice(0, SUMMARY_LIST_SIZE)
    .map(toEntry);

  return {
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
}
