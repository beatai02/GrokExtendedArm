import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { getAppPassword, getSessionSecret } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  signSession,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!limited.ok) {
    log("auth.login.rate_limited");
    return NextResponse.json(
      { error: "Too many login attempts" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid password", 400);
  }

  let expected: string;
  let secret: string;
  try {
    expected = getAppPassword();
    secret = getSessionSecret();
  } catch (error) {
    log("auth.login.config_error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("Server is not configured", 500);
  }

  if (!(await safeEqual(parsed.data.password, expected))) {
    log("auth.login.failed");
    return jsonError("Invalid password", 401);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await signSession(secret),
    sessionCookieOptions(),
  );
  log("auth.login.success");
  return response;
}
