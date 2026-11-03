import { hmacSha256, safeEqual } from "@/lib/crypto";

export const SESSION_COOKIE_NAME = "app_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

export async function signSession(secret: string, now = Date.now()): Promise<string> {
  const expiresAt = now + SESSION_TTL_MS;
  const payload = `v1.${now}.${expiresAt}`;
  return `${payload}.${await hmacSha256(secret, payload)}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) {
    await safeEqual("", secret);
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    await safeEqual(token, secret);
    return false;
  }

  const [version, issuedRaw, expiresRaw, signature] = parts;
  const payload = `${version}.${issuedRaw}.${expiresRaw}`;
  const expected = await hmacSha256(secret, payload);
  if (!(await safeEqual(signature, expected))) {
    return false;
  }

  const issuedAt = Number(issuedRaw);
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    return false;
  }
  if (issuedAt > now + 60_000) {
    return false;
  }
  return expiresAt > now;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
