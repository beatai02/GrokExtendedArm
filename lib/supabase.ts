import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";
import type { Message } from "@/lib/types";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }

  client = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

export async function claimPending(maxN: number): Promise<Message[]> {
  const { data, error } = await getSupabase().rpc("claim_pending", {
    max_n: maxN,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as Message[];
}
