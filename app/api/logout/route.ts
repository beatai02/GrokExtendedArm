import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  log("auth.logout");
  return response;
}
