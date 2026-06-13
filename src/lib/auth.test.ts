import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "./auth";

const SECRET = "test-secret-at-least-32-characters-long!!";

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("12345");
    expect(hash).not.toBe("12345");
    expect(await verifyPassword("12345", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("session cookie", () => {
  const t0 = 1_000_000_000_000;

  it("round-trips a userId through sign/verify", () => {
    const token = signSession(7, SECRET, t0);
    expect(verifySession(token, SECRET, t0 + 1000)).toBe(7);
  });

  it("rejects a tampered token", () => {
    const token = signSession(7, SECRET, t0);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifySession(tampered, SECRET, t0 + 1000)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession(7, SECRET, t0);
    expect(verifySession(token, "another-secret-entirely-different-key!!", t0 + 1000)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signSession(7, SECRET, t0, 1000);
    expect(verifySession(token, SECRET, t0 + 2000)).toBeNull();
  });

  it("rejects malformed or missing tokens", () => {
    expect(verifySession(undefined, SECRET, t0)).toBeNull();
    expect(verifySession("", SECRET, t0)).toBeNull();
    expect(verifySession("garbage", SECRET, t0)).toBeNull();
    expect(verifySession("a.b.c.d", SECRET, t0)).toBeNull();
  });
});
