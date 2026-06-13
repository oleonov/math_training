import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const SESSION_COOKIE = "mc_session";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function hmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Build a signed session token of the form `userId.expiresAtMs.signature`.
 * The signature is an HMAC over the payload, so the token cannot be forged
 * without the secret.
 */
export function signSession(
  userId: number,
  secret: string,
  nowMs: number = Date.now(),
  maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): string {
  const exp = nowMs + maxAgeMs;
  const payload = `${userId}.${exp}`;
  return `${payload}.${hmac(payload, secret)}`;
}

/**
 * Verify a session token. Returns the userId if the signature is valid and the
 * token has not expired, otherwise null.
 */
export function verifySession(
  token: string | undefined | null,
  secret: string,
  nowMs: number = Date.now(),
): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userIdStr, expStr, sig] = parts;
  const expected = hmac(`${userIdStr}.${expStr}`, secret);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || nowMs > exp) return null;

  const userId = Number(userIdStr);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  return userId;
}
