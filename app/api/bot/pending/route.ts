import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/bearer";
import { getBotToken } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { pendingQuerySchema } from "@/lib/schemas";
import { claimPending } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let botToken: string;
  try {
    botToken = getBotToken();
  } catch (error) {
    log("bot.pending.config_error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("Server is not configured", 500);
  }

  if (!(await verifyBearer(request.headers.get("authorization"), botToken))) {
    log("bot.pending.unauthorized");
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const parsed = pendingQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("Invalid limit", 400);
  }

  try {
    const messages = await claimPending(parsed.data.limit ?? 20);
    log("bot.pending", { claimed: messages.length });
    return NextResponse.json({ messages });
  } catch (error) {
    log("bot.pending.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("Failed to claim pending messages", 500);
  }
}
