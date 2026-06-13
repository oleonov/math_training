import { cookies } from "next/headers";
import { SESSION_COOKIE, signSession, verifySession } from "./auth";

const MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

/** Returns the logged-in userId from the request cookie, or null. */
export async function getUserId(): Promise<number | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, secret());
}

export async function setSession(userId: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(userId, secret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
