import { NextResponse } from "next/server";
import { getUserId } from "./session-server";
import { HttpError } from "./http";

/** Returns the authenticated userId or throws a 401 HttpError. */
export async function requireUserId(): Promise<number> {
  const userId = await getUserId();
  if (!userId) throw new HttpError(401, "Требуется вход");
  return userId;
}

/** Maps thrown errors to JSON responses. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
}

/** Coerce an unknown value to a finite number, or null. */
export function toNumberOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
