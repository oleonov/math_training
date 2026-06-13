"use client";

// Dev preview of the final results screen with a beaten record, so the
// celebration + tap-to-launch fireworks can be tested without playing a whole
// session. Visit /preview/summary. Safe to delete — it imports only mock data.

import { useState } from "react";
import SummaryScreen from "@/components/SummaryScreen";
import type { SessionSummary } from "@/lib/api-types";

const MOCK: SessionSummary = {
  totalAnswers: 42,
  fastCorrectCount: 33,
  slowCorrectCount: 6,
  wrongCount: 3,
  averageScore: 0.91,
  isNewRecord: true,
  previousBestScore: 0.84,
  weakest: [
    { a: 7, b: 8, answer: 56, recentAverageScore: 0.42, daysSinceLastAsked: 2 },
    { a: 6, b: 9, answer: 54, recentAverageScore: 0.55, daysSinceLastAsked: 0.5 },
    { a: 8, b: 8, answer: 64, recentAverageScore: 0.6, daysSinceLastAsked: null },
  ],
  overdue: [
    { a: 9, b: 9, answer: 81, recentAverageScore: 0.7, daysSinceLastAsked: 5 },
    { a: 4, b: 7, answer: 28, recentAverageScore: 0.8, daysSinceLastAsked: 3 },
  ],
};

export default function PreviewSummaryPage() {
  // Re-mount SummaryScreen on "Ещё раз" to replay the big celebration.
  const [runKey, setRunKey] = useState(0);
  return (
    <div className="min-h-dvh px-4 py-8">
      <SummaryScreen key={runKey} summary={MOCK} onRestart={() => setRunKey((k) => k + 1)} />
    </div>
  );
}
