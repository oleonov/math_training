"use client";

import type { CardSummaryEntry, SessionSummary } from "@/lib/api-types";
import Celebration from "./Celebration";

interface Props {
  summary: SessionSummary;
  animationsEnabled: boolean;
  onRestart: () => void;
}

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow ring-1 ring-black/5">
      <div className="font-display text-3xl" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function CardList({
  title,
  emptyText,
  entries,
  render,
}: {
  title: string;
  emptyText: string;
  entries: CardSummaryEntry[];
  render: (e: CardSummaryEntry) => string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-black/5">
      <h3 className="mb-3 font-bold text-ink">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={`${e.a}x${e.b}`} className="flex items-center justify-between gap-3">
              <span className="font-display text-xl text-ink">
                {e.a} × {e.b} = {e.answer}
              </span>
              <span className="text-sm font-semibold text-muted">{render(e)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SummaryScreen({ summary, animationsEnabled, onRestart }: Props) {
  const avgPct = Math.round(summary.averageScore * 100);
  const prevPct =
    summary.previousBestScore === null ? null : Math.round(summary.previousBestScore * 100);

  return (
    <div className={`${animationsEnabled ? "mc-rise" : ""} mx-auto w-full max-w-2xl space-y-5`}>
      {animationsEnabled && summary.isNewRecord && <Celebration />}
      <div className="rounded-[2rem] bg-card p-7 text-center shadow-xl shadow-brand/10 ring-1 ring-black/5 sm:p-9">
        <h1 className="font-display text-4xl text-ink">Готово! 🎉</h1>
        <p className="mt-1 text-muted">Средний балл за тренировку</p>
        <div className="my-2 font-display text-7xl text-brand-strong">{avgPct}%</div>

        {summary.isNewRecord && (
          <div className={`${animationsEnabled ? "mc-badge" : ""} mx-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#ffd700] to-[#f59e0b] px-4 py-2 font-display text-lg font-bold text-[#5b3b00] shadow-lg`}>
            🏆 Новый рекорд!
            {prevPct !== null && <span className="font-semibold opacity-75">было {prevPct}%</span>}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={summary.totalAnswers} label="Всего" color="var(--color-ink)" />
          <Stat value={summary.fastCorrectCount} label="Быстрых" color="var(--color-correct)" />
          <Stat value={summary.slowCorrectCount} label="Медленных" color="var(--color-slow)" />
          <Stat value={summary.wrongCount} label="Ошибок" color="var(--color-wrong)" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CardList
          title="Самые слабые карточки"
          emptyText="Пока нет данных."
          entries={summary.weakest}
          render={(e) => `${Math.round(e.recentAverageScore * 100)}%`}
        />
        <CardList
          title="Давно не повторяли"
          emptyText="Пока нет данных."
          entries={summary.overdue}
          render={(e) =>
            e.daysSinceLastAsked === null
              ? "—"
              : e.daysSinceLastAsked < 1
                ? "сегодня"
                : `${Math.floor(e.daysSinceLastAsked)} дн. назад`
          }
        />
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="w-full rounded-2xl bg-brand py-4 font-display text-2xl text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong active:scale-[0.98]"
      >
        Ещё раз
      </button>
    </div>
  );
}
