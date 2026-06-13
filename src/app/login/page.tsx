"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postJson, ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/login", { name, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="mc-rise w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-brand font-display text-4xl text-white shadow-lg shadow-brand/30">
            ×
          </div>
          <h1 className="font-display text-3xl text-ink">Таблица умножения</h1>
          <p className="mt-1 text-muted">Войди, чтобы тренироваться</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-[2rem] bg-card p-7 shadow-xl shadow-brand/10 ring-1 ring-black/5"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink">Имя</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full rounded-xl border-2 border-brand-soft bg-white px-4 py-3 text-lg outline-none focus:border-brand"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border-2 border-brand-soft bg-white px-4 py-3 text-lg outline-none focus:border-brand"
            />
          </label>

          {error && <p className="text-center font-semibold text-wrong">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand py-3.5 font-display text-xl text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Вход…" : "Войти"}
          </button>
        </form>

        {/* Secondary entry: a guest can train without an account. Styled as a
            plain underlined link (not a button) — progress isn't saved and there
            are no fireworks history, only browser-local records. */}
        <p className="mt-5 text-center text-sm text-muted">
          Нет аккаунта?{" "}
          <Link
            href="/guest"
            className="font-medium text-brand underline decoration-from-font underline-offset-2 transition hover:text-brand-strong"
          >
            Войти как гость
          </Link>
        </p>
      </div>
    </div>
  );
}
