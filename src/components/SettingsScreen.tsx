"use client";

import { useEffect, useState } from "react";
import {
  ANSWER_TIME_LIMITS_SEC,
  TRAINING_DURATIONS_MIN,
  DEFAULT_ANSWER_TIME_LIMIT_SEC,
  DEFAULT_TRAINING_DURATION_MIN,
} from "@/lib/config";

interface Props {
  onStart: (
    answerTimeLimitSec: number,
    trainingDurationMin: number,
    animationsEnabled: boolean,
  ) => Promise<void>;
}

const ANIMATIONS_PREF_KEY = "mathcards:animations-enabled";

function Choice({
  label,
  unit,
  options,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  options: readonly number[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xl font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={selected}
              className={`min-w-[4.25rem] rounded-2xl border-2 px-5 py-3.5 text-xl font-bold transition active:scale-95 ${
                selected
                  ? "border-brand bg-brand text-white shadow-lg shadow-brand/30"
                  : "border-transparent bg-brand-soft text-brand-strong hover:bg-brand/10"
              }`}
            >
              {opt}
              <span className="ml-1 text-base font-semibold opacity-80">{unit}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function SettingsScreen({ onStart }: Props) {
  const [limit, setLimit] = useState<number>(DEFAULT_ANSWER_TIME_LIMIT_SEC);
  const [duration, setDuration] = useState<number>(DEFAULT_TRAINING_DURATION_MIN);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ANIMATIONS_PREF_KEY);
      if (saved === "0") setAnimationsEnabled(false);
      if (saved === "1") setAnimationsEnabled(true);
    } catch {
      // Ignore storage failures; the per-session default is animations on.
    }
  }, []);

  function changeAnimations(enabled: boolean) {
    setAnimationsEnabled(enabled);
    try {
      window.localStorage.setItem(ANIMATIONS_PREF_KEY, enabled ? "1" : "0");
    } catch {
      // The setting still applies to this session even if persistence is blocked.
    }
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await onStart(limit, duration, animationsEnabled);
    } catch {
      setError("Не получилось начать. Попробуй ещё раз.");
      setBusy(false);
    }
  }

  return (
    <div className="mc-rise mx-auto w-full max-w-xl rounded-[2rem] bg-card p-7 shadow-xl shadow-brand/10 ring-1 ring-black/5 sm:p-9">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Настройки тренировки</h1>
      <p className="mt-1 text-muted">Выбери, как тренируемся сегодня.</p>

      <div className="mt-7 space-y-7">
        <Choice
          label="Таймер на ответ"
          unit="с"
          options={ANSWER_TIME_LIMITS_SEC}
          value={limit}
          onChange={setLimit}
        />
        <Choice
          label="Время тренировки"
          unit="мин"
          options={TRAINING_DURATIONS_MIN}
          value={duration}
          onChange={setDuration}
        />
      </div>

      <label className="mt-6 inline-flex cursor-pointer items-center gap-3 text-lg font-extrabold text-ink sm:mt-7 sm:text-xl">
        <input
          type="checkbox"
          checked={animationsEnabled}
          onChange={(e) => changeAnimations(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-lg border-2 border-brand-soft bg-white text-transparent shadow-sm transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-checked:shadow-md peer-checked:shadow-brand/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          >
            <path d="M5 12.5l4.2 4.2L19 7" />
          </svg>
        </span>
        <span>Включить анимации</span>
      </label>

      {error && <p className="mt-5 text-center font-semibold text-wrong">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="mt-10 w-full rounded-2xl bg-brand py-4 font-display text-2xl text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60 sm:mt-12"
      >
        {busy ? "Загрузка…" : "Начать тренировку"}
      </button>
    </div>
  );
}
