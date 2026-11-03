import { NextResponse } from "next/server";
import { getConversationId } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { messagesQuerySchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = messagesQuerySchema.safeParse({
    since: url.searchParams.get("since") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("Invalid since timestamp", 400);
  }

  const conversationId = getConversationId();
  let query = getSupabase()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (parsed.data.since) {
    query = query.gt("created_at", parsed.data.since);
  }

  const { data, error } = await query;
  if (error) {
    log("chat.messages.failed", { code: error.code });
    return jsonError("Failed to load messages", 500);
  }

  const messages = (data ?? []) as Message[];
  log("chat.messages", {
    count: messages.length,
    hasSince: Boolean(parsed.data.since),
  });
  return NextResponse.json({ messages });
}
