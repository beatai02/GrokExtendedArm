const REDACTED_KEYS = new Set([
  "password",
  "app_password",
  "session_secret",
  "bot_token",
  "authorization",
  "cookie",
  "token",
  "secret",
  "key",
  "supabase_service_role_key",
  "content",
]);

function sanitize(value: unknown, key?: string): unknown {
  if (key && REDACTED_KEYS.has(key.toLowerCase())) {
    return "[redacted]";
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nextKey, nextValue]) => [
        nextKey,
        sanitize(nextValue, nextKey),
      ]),
    );
  }
  return value;
}

export function log(
  event: string,
  fields: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...((sanitize(fields) as Record<string, unknown>) ?? {}),
    }),
  );
}
