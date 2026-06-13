"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsScreen from "./SettingsScreen";
import TrainingScreen from "./TrainingScreen";
import SummaryScreen from "./SummaryScreen";
import { postJson, ApiError } from "@/lib/api-client";
import type { SessionSummary, StartResult } from "@/lib/api-types";

type Phase =
  | { name: "settings" }
  | { name: "training"; start: StartResult }
  | { name: "summary"; summary: SessionSummary };

export default function Trainer({ userName }: { userName: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "settings" });

  // "Сбросить память" modal state.
  const [showReset, setShowReset] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  async function startTraining(answerTimeLimitSec: number, trainingDurationMin: number) {
    const start = await postJson<StartResult>("/api/session/start", {
      answerTimeLimitSec,
      trainingDurationMin,
    });
    setPhase({ name: "training", start });
  }

  async function logout() {
    await postJson("/api/logout", {}).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  function openReset() {
    setResetCode("");
    setResetError(null);
    setResetDone(false);
    setShowReset(true);
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetBusy) return;
    setResetBusy(true);
    setResetError(null);
    try {
      await postJson("/api/reset", { password: resetCode });
      setShowReset(false);
      setResetBusy(false);
      setPhase({ name: "settings" });
      setResetDone(true);
      window.setTimeout(() => setResetDone(false), 3500);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Ошибка сброса");
      setResetBusy(false);
    }
  }

  return (
    <div className="min-h-dvh px-4 py-5 sm:py-8">
      <header className="mx-auto mb-6 flex w-full max-w-3xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-display text-xl text-brand-strong">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">×</span>
          <span className="hidden sm:inline">Таблица умножения</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={openReset}
            className="rounded-xl bg-white px-3 py-1.5 font-bold text-muted shadow ring-1 ring-black/5 transition hover:text-wrong active:scale-95"
            title="Сбросить весь прогресс (по коду)"
          >
            <span className="sm:hidden">Сброс</span>
            <span className="hidden sm:inline">Сбросить память</span>
          </button>
          <span className="hidden font-bold text-muted sm:inline">Привет, {userName}!</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl bg-white px-3 py-1.5 font-bold text-muted shadow ring-1 ring-black/5 transition hover:text-ink active:scale-95"
          >
            Выйти
          </button>
        </div>
      </header>

      {resetDone && (
        <div className="mx-auto mb-4 w-full max-w-3xl rounded-2xl bg-correct-soft px-4 py-3 text-center font-bold text-correct">
          Память очищена — можно начинать с нуля.
        </div>
      )}

      <main>
        {phase.name === "settings" && <SettingsScreen onStart={startTraining} />}
        {phase.name === "training" && (
          <TrainingScreen
            start={phase.start}
            onFinish={(summary) => setPhase({ name: "summary", summary })}
          />
        )}
        {phase.name === "summary" && (
          <SummaryScreen
            summary={phase.summary}
            onRestart={() => setPhase({ name: "settings" })}
          />
        )}
      </main>

      {showReset && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          onClick={() => !resetBusy && setShowReset(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmReset}
            className="mc-pop w-full max-w-sm rounded-[1.75rem] bg-card p-6 shadow-2xl ring-1 ring-black/5"
          >
            <h2 className="font-display text-2xl text-ink">Сбросить память</h2>
            <p className="mt-1 text-sm text-muted">
              Удалит весь прогресс {userName}: ответы, статистику и сессии. Карточки начнутся
              с нуля. Действие необратимо.
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-ink">Код подтверждения</span>
              <input
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                type="password"
                inputMode="numeric"
                autoFocus
                autoComplete="off"
                className="w-full rounded-xl border-2 border-brand-soft bg-white px-4 py-3 text-lg outline-none focus:border-wrong"
              />
            </label>
            {resetError && <p className="mt-3 text-center font-semibold text-wrong">{resetError}</p>}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowReset(false)}
                disabled={resetBusy}
                className="flex-1 rounded-xl bg-brand-soft py-3 font-bold text-brand-strong transition active:scale-95 disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={resetBusy}
                className="flex-1 rounded-xl bg-wrong py-3 font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
                style={{ boxShadow: "0 10px 20px -8px var(--color-wrong)" }}
              >
                {resetBusy ? "Сброс…" : "Сбросить"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
