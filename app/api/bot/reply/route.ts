import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/bearer";
import { getBotToken } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { replySchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let botToken: string;
  try {
    botToken = getBotToken();
  } catch (error) {
    log("bot.reply.config_error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("Server is not configured", 500);
  }

  if (!(await verifyBearer(request.headers.get("authorization"), botToken))) {
    log("bot.reply.unauthorized");
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid reply payload", 400);
  }

  const status = parsed.data.status ?? "done";
  const supabase = getSupabase();

  const { data: original, error: lookupError } = await supabase
    .from("messages")
    .select("*")
    .eq("id", parsed.data.message_id)
    .maybeSingle();

  if (lookupError) {
    log("bot.reply.lookup_failed", { code: lookupError.code });
    return jsonError("Failed to load source message", 500);
  }

  if (!original) {
    log("bot.reply.not_found");
    return jsonError("Message not found", 404);
  }

  const source = original as Message;
  const { data: reply, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: source.conversation_id,
      role: "bot",
      content: parsed.data.content,
      status: "done",
      reply_to: source.id,
    })
    .select("*")
    .single();

  if (insertError || !reply) {
    log("bot.reply.insert_failed", { code: insertError?.code ?? "unknown" });
    return jsonError("Failed to insert reply", 500);
  }

  const { error: updateError } = await supabase
    .from("messages")
    .update({
      status,
      processed_at: new Date().toISOString(),
    })
    .eq("id", source.id);

  if (updateError) {
    log("bot.reply.update_failed", { code: updateError.code });
    return jsonError("Failed to update source message", 500);
  }

  log("bot.reply", {
    messageId: source.id,
    replyId: (reply as Message).id,
    status,
  });
  return NextResponse.json({ message: reply as Message });
}
