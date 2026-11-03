import { DEFAULT_CONVERSATION_ID } from "@/lib/constants";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppPassword(): string {
  return required("APP_PASSWORD");
}

export function getSessionSecret(): string {
  return required("SESSION_SECRET");
}

export function getBotToken(): string {
  return required("BOT_TOKEN");
}

export function getSupabaseUrl(): string {
  return required("SUPABASE_URL");
}

export function getSupabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

export function getConversationId(): string {
  return process.env.CONVERSATION_ID || DEFAULT_CONVERSATION_ID;
}
