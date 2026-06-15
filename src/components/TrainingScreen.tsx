"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CircularTimer from "./CircularTimer";
import StreakAura from "./StreakAura";
import { ApiError } from "@/lib/api-client";
import type { TrainingApi } from "@/lib/training-api";
import type { NextCard, SessionSummary, StartResult } from "@/lib/api-types";

type Kind = "fast" | "slow" | "wrong";

interface HistoryEntry {
  key: number;
  shownA: number;
  shownB: number;
  correctAnswer: number;
  userAnswer: number | null;
  kind: Kind;
  score: number;
}

interface Props {
  api: TrainingApi;
  start: StartResult;
  animationsEnabled: boolean;
  onFinish: (summary: SessionSummary) => void;
}

const FLASH_MS = 450;

const KIND_STYLES: Record<Kind, string> = {
  fast: "bg-correct-soft text-correct",
  slow: "bg-slow-soft text-slow",
  wrong: "bg-wrong-soft text-wrong",
};

const FLASH_RING: Record<Kind, string> = {
  fast: "ring-correct",
  slow: "ring-slow",
  wrong: "ring-wrong",
};

export default function TrainingScreen({ api, start, animationsEnabled, onFinish }: Props) {
  const router = useRouter();
  const totalMs = start.durationSec * 1000;

  const [card, setCard] = useState<NextCard>(start.card);
  const [qIndex, setQIndex] = useState(0);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flash, setFlash] = useState<Kind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [retry, setRetry] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(totalMs);
  const [error, setError] = useState<string | null>(null);

  // "Rage mode" streak: consecutive fast-and-on-time answers strengthen an aura
  // around the card (0→10). A wrong answer resets it; a slow-but-correct answer
  // keeps it where it is. `streakPulse` bumps on every fast answer to fire a burst.
  const [streak, setStreak] = useState(0);
  const [streakPulse, setStreakPulse] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const shownAtRef = useRef(0);
  const sessionEndRef = useRef(0);
  const submittingRef = useRef(false); // synchronous guard against double submit

  // The very first presentation (qIndex 0) has no timer — matches the server,
  // which treats the first answer of a session as never-after-timeout.
  const timerActive = qIndex > 0;

  // Overall session clock.
  useEffect(() => {
    sessionEndRef.current = Date.now() + totalMs;
    const id = setInterval(() => {
      const left = sessionEndRef.current - Date.now();
      setTimeLeftMs(Math.max(0, left));
      if (left <= 0) setTimeUp(true);
    }, 250);
    return () => clearInterval(id);
  }, [totalMs]);

  // On every new presentation: reset the answer timer and focus the input.
  useEffect(() => {
    shownAtRef.current = performance.now();
    inputRef.current?.focus();
  }, [qIndex]);

  async function finish() {
    setFinishing(true);
    try {
      const summary = await api.finish(start.sessionId);
      onFinish(summary);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return router.push("/login");
      setError("Не получилось завершить тренировку.");
      setFinishing(false);
    }
  }

  async function submit(answerStr: string) {
    if (submittingRef.current || finishing) return;
    const trimmed = answerStr.trim();
    if (trimmed === "") return;
    const userAnswer = Number(trimmed);
    if (Number.isNaN(userAnswer)) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    const responseTimeMs = Math.round(performance.now() - shownAtRef.current);
    const answered = card; // capture the card being answered

    try {
      const res = await api.answer({
        sessionId: start.sessionId,
        cardId: answered.cardId,
        shownA: answered.shownA,
        shownB: answered.shownB,
        userAnswer,
        responseTimeMs,
      });

      const kind: Kind = res.result.isCorrect
        ? res.result.isAfterTimeout
          ? "slow"
          : "fast"
        : "wrong";

      setHistory((h) =>
        [
          {
            key: qIndex,
            shownA: answered.shownA,
            shownB: answered.shownB,
            correctAnswer: res.result.correctAnswer,
            userAnswer,
            kind,
            score: res.result.score,
          },
          ...h,
        ].slice(0, 12),
      );
      setFlash(kind);

      if (animationsEnabled) {
        // Update the streak/"rage mode". Fast → grow (and pulse a burst); wrong →
        // reset; slow (correct but after the timer) → leave it untouched.
        if (kind === "fast") {
          setStreak((s) => Math.min(10, s + 1));
          setStreakPulse((p) => p + 1);
        } else if (kind === "wrong") {
          setStreak(0);
        }
      }

      const next = res.next;
      window.setTimeout(() => {
        setFlash(null);
        setValue("");
        submittingRef.current = false;
        setSubmitting(false);

        // Once the session time is up, finish after the current answer
        // (correct or wrong) — don't trap the child in endless retries.
        if (Date.now() >= sessionEndRef.current) {
          finish();
          return;
        }

        if (kind === "wrong") {
          // Stay on the SAME example until it's answered correctly.
          setRetry(true);
          setQIndex((i) => i + 1);
        } else {
          setRetry(false);
          setCard(next);
          setQIndex((i) => i + 1);
        }
      }, FLASH_MS);
    } catch (err) {
      submittingRef.current = false;
      if (err instanceof ApiError && err.status === 401) return router.push("/login");
      setError("Ошибка отправки ответа. Попробуй ещё раз.");
      setSubmitting(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
    setValue(cleaned);
    // Auto-submit once the typed length matches the answer's length (no Enter).
    if (!submittingRef.current && !finishing && card.answerLength > 0 && cleaned.length === card.answerLength) {
      submit(cleaned);
    }
  }

  const answered = history.length;
  const avgPct =
    answered === 0
      ? 0
      : Math.round((history.reduce((s, h) => s + h.score, 0) / answered) * 100);
  const recent = history.slice(0, 5);
  const timeFraction = Math.max(0, Math.min(1, timeLeftMs / totalMs));
  const secLeft = Math.ceil(timeLeftMs / 1000);
  const cardPanel = (
    <div
      className={`flex flex-col gap-5 rounded-[2rem] bg-card px-4 py-8 shadow-xl shadow-brand/10 ring-1 sm:gap-7 sm:p-10 ${
        animationsEnabled ? "transition" : ""
      } ${flash ? `ring-4 ${FLASH_RING[flash]}` : "ring-black/5"}`}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
        <CircularTimer
          durationSec={start.answerTimeLimitSec}
          active={timerActive}
          runKey={qIndex}
        />

        {/* Stacked on phones (each element large), inline on wider screens. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
          className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-5"
        >
          <div className="font-display text-7xl leading-none text-ink sm:text-8xl">
            {card.shownA} × {card.shownB} =
          </div>
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label="Ответ"
            // On a retry (the previous answer was wrong) the box shows the correct
            // answer as a faint grey hint, so a child who misses the row of recent
            // answers above still sees what to type. It vanishes as they type.
            placeholder={retry ? String(card.shownA * card.shownB) : undefined}
            // Intentionally never disabled/readOnly during the transition: on
            // iOS/iPadOS losing focus (or disabling) dismisses the on-screen
            // keyboard, and a programmatic refocus afterwards won't reopen it.
            // Double-submit is prevented by submittingRef in submit()/handleChange.
            className="w-40 rounded-2xl border-4 border-brand-soft bg-white py-1 text-center font-display text-7xl text-brand-strong caret-brand outline-none placeholder:text-muted/25 focus:border-brand sm:w-44 sm:text-8xl"
          />
        </form>
      </div>

      {/* Session countdown — kept inside the card so it stays on screen while
          typing; the on-screen keyboard scrolls the page's top bar away.
          Thin bar on the full width, compact time on the right (no label),
          turning amber in the final minute to nudge a hurry. */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-soft">
          <div
            className={`h-full rounded-full ${
              animationsEnabled ? "transition-[width,background-color] duration-300 ease-linear" : ""
            } ${secLeft <= 60 ? "bg-slow" : "bg-brand"}`}
            style={{ width: `${timeFraction * 100}%` }}
          />
        </div>
        <span className="font-display text-sm font-semibold leading-none tabular-nums text-muted">
          {Math.floor(secLeft / 60)}:{String(secLeft % 60).padStart(2, "0")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {/* Top bar: score + end button. The session countdown now lives inside the
          card (bottom strip) so it stays visible when the on-screen keyboard
          scrolls this row off the top on tablets. */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-muted">
          Ответов: {answered} · Балл: {avgPct}%
        </span>
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-muted shadow ring-1 ring-black/5 transition hover:text-ink active:scale-95 disabled:opacity-60"
        >
          Завершить
        </button>
      </div>

      {/* History of recent answers */}
      <div className="flex min-h-9 flex-wrap items-center justify-center gap-2">
        {recent.map((h) => (
          <span
            key={h.key}
            className={`${animationsEnabled ? "mc-pop" : ""} rounded-full px-3.5 py-1.5 text-base font-bold ${KIND_STYLES[h.kind]}`}
          >
            {h.shownA} × {h.shownB} ={" "}
            {h.kind === "wrong" ? (
              <>
                {h.userAnswer ?? "—"} ✗ <span className="opacity-70">→ {h.correctAnswer}</span>
              </>
            ) : (
              h.correctAnswer
            )}
          </span>
        ))}
      </div>

      {/* Main card, optionally wrapped in the streak aura (glow + sparkles behind it). */}
      {animationsEnabled ? (
        <StreakAura level={streak} pulseKey={streakPulse}>
          {cardPanel}
        </StreakAura>
      ) : (
        cardPanel
      )}

      {/* Hints */}
      <div className="text-center text-base font-semibold text-muted">
        {qIndex === 0 ? (
          "Первый пример — без таймера. Ответ примется сам."
        ) : timeUp ? (
          <span className="text-slow">Время вышло — закончим после этого ответа.</span>
        ) : retry ? (
          <span className="text-wrong">Не верно — попробуй ещё раз, это тот же пример.</span>
        ) : (
          "Просто набери ответ — пример сменится сам."
        )}
      </div>

      {error && <p className="text-center font-semibold text-wrong">{error}</p>}
    </div>
  );
}
