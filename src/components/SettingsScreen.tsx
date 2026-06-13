"use client";

import { useState } from "react";
import {
  ANSWER_TIME_LIMITS_SEC,
  TRAINING_DURATIONS_MIN,
  DEFAULT_ANSWER_TIME_LIMIT_SEC,
  DEFAULT_TRAINING_DURATION_MIN,
} from "@/lib/config";

interface Props {
  onStart: (answerTimeLimitSec: number, trainingDurationMin: number) => Promise<void>;
}

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await onStart(limit, duration);
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

      {error && <p className="mt-5 text-center font-semibold text-wrong">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="mt-8 w-full rounded-2xl bg-brand py-4 font-display text-2xl text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Загрузка…" : "Начать тренировку"}
      </button>
    </div>
  );
}
