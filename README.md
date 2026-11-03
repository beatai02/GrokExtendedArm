# Private Chat

Minimal single-user Next.js chat app. The browser never talks to Supabase. All database access happens in server-only code with the service role key. An external bot polls the bot API and writes replies — there is no LLM in this app.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Install dependencies: `npm install`
3. Run the app: `npm run dev`
4. Open `http://localhost:3000` and sign in with `APP_PASSWORD`.

The schema in `supabase/migrations/0001_init.sql` is already applied on the existing Supabase project. Commit this file as the source of truth; do not re-apply it unless you are setting up a new database.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `APP_PASSWORD` | yes | Password for the single-user login gate |
| `SESSION_SECRET` | yes | HMAC secret for the signed session cookie |
| `BOT_TOKEN` | yes | Bearer token for `/api/bot/*` |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only service role key. Never expose this to the browser. |
| `CONVERSATION_ID` | no | Fixed conversation UUID. Defaults to `a0000000-0000-4000-8000-000000000001` |

The session cookie is `httpOnly`, `Secure`, and `SameSite=Lax`. It is HMAC-signed with `SESSION_SECRET` and expires in 30 days. Next.js request middleware (`proxy.ts`) protects `/` and `/api/chat/*`. `/login` and `/api/bot/*` are public (bot routes use the bearer token).

## Endpoints

### User API (session cookie)

`POST /api/chat/send`

```json
{ "content": "Hello" }
```

Inserts a `role=user` row with `status=pending` on the fixed conversation.

`GET /api/chat/messages?since=2026-01-01T00:00:00.000Z`

Returns that conversation's messages ordered by `created_at`. `since` is optional.

`POST /api/login` with `{ "password": "..." }` sets the session cookie.

`POST /api/logout` clears it.

### Bot API (`Authorization: Bearer BOT_TOKEN`)

`GET /api/bot/pending?limit=20`

Calls `claim_pending(max_n)` and returns the claimed rows.

`POST /api/bot/reply`

```json
{
  "message_id": "11111111-1111-4111-8111-111111111111",
  "content": "Hello back",
  "status": "done"
}
```

`status` is optional and defaults to `done`. Allowed values: `done`, `error`. Inserts a `role=bot` row with `reply_to=message_id` and the same `conversation_id`, then marks the original message with that status and `processed_at=now()`. Returns `404` if `message_id` is not found.

## Bot curl examples

Replace `$APP_URL` and `$BOT_TOKEN`.

Claim pending user messages:

```bash
curl -sS "$APP_URL/api/bot/pending?limit=5" \
  -H "Authorization: Bearer $BOT_TOKEN"
```

Reply to a claimed message:

```bash
curl -sS -X POST "$APP_URL/api/bot/reply" \
  -H "Authorization: Bearer $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message_id":"MESSAGE_ID","content":"Done.","status":"done"}'
```

Mark the original as an error:

```bash
curl -sS -X POST "$APP_URL/api/bot/reply" \
  -H "Authorization: Bearer $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message_id":"MESSAGE_ID","content":"The bot failed.","status":"error"}'
```

## Scripts

- `npm run dev` — local Next.js server
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Deploy

This app is meant to run on Vercel later. Set the environment variables above on the project. Do not put secrets in the repo or in `NEXT_PUBLIC_*` variables.
