export type MessageRole = "user" | "bot";
export type MessageStatus = "pending" | "processing" | "done" | "error";

export type Message = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  reply_to: string | null;
  created_at: string;
  claimed_at: string | null;
  processed_at: string | null;
};
