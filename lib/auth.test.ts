import { describe, expect, it } from "vitest";
import { verifyBearer } from "@/lib/bearer";
import { safeEqual } from "@/lib/crypto";
import {
  SESSION_TTL_MS,
  signSession,
  verifySession,
} from "@/lib/session";

const SECRET = "test-session-secret-value";
const OTHER_SECRET = "other-session-secret-value";

describe("cookie signing", () => {
  it("signs and verifies a session cookie", async () => {
    const now = Date.parse("2026-01-15T10:00:00.000Z");
    const token = await signSession(SECRET, now);
    expect(await verifySession(token, SECRET, now)).toBe(true);
  });

  it("rejects a tampered cookie", async () => {
    const now = Date.parse("2026-01-15T10:00:00.000Z");
    const token = await signSession(SECRET, now);
    const tampered = `${token.slice(0, -2)}aa`;
    expect(await verifySession(tampered, SECRET, now)).toBe(false);
  });

  it("rejects a cookie signed with a different secret", async () => {
    const now = Date.parse("2026-01-15T10:00:00.000Z");
    const token = await signSession(SECRET, now);
    expect(await verifySession(token, OTHER_SECRET, now)).toBe(false);
  });

  it("rejects an expired cookie", async () => {
    const issuedAt = Date.parse("2026-01-15T10:00:00.000Z");
    const token = await signSession(SECRET, issuedAt);
    expect(await verifySession(token, SECRET, issuedAt + SESSION_TTL_MS + 1)).toBe(
      false,
    );
  });

  it("rejects a missing cookie", async () => {
    expect(await verifySession(undefined, SECRET)).toBe(false);
  });
});

describe("bearer check", () => {
  it("accepts a matching bearer token", async () => {
    expect(await verifyBearer("Bearer secret-bot-token", "secret-bot-token")).toBe(
      true,
    );
  });

  it("rejects a mismatched bearer token", async () => {
    expect(await verifyBearer("Bearer wrong-token", "secret-bot-token")).toBe(
      false,
    );
  });

  it("rejects a missing authorization header", async () => {
    expect(await verifyBearer(null, "secret-bot-token")).toBe(false);
  });

  it("rejects a non-bearer scheme", async () => {
    expect(await verifyBearer("Basic secret-bot-token", "secret-bot-token")).toBe(
      false,
    );
  });

  it("compares secrets in constant-time via hashed equality", async () => {
    expect(await safeEqual("alpha", "alpha")).toBe(true);
    expect(await safeEqual("alpha", "beta")).toBe(false);
    expect(await safeEqual("short", "much-longer-value")).toBe(false);
  });
});
