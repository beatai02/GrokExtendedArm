import { NextResponse } from "next/server";
import { getConversationId } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { sendSchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid content", 400);
  }

  const conversationId = getConversationId();
  const { data, error } = await getSupabase()
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.data.content,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    log("chat.send.failed", { code: error?.code ?? "unknown" });
    return jsonError("Failed to send message", 500);
  }

  const message = data as Message;
  log("chat.send", {
    messageId: message.id,
    contentLength: parsed.data.content.length,
  });
  return NextResponse.json({ message });
}
