create extension if not exists pgcrypto;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  role text not null check (role in ('user','bot')),
  content text not null,
  status text not null default 'pending' check (status in ('pending','processing','done','error')),
  reply_to uuid null references public.messages(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz null,
  processed_at timestamptz null
);
create index messages_role_status_created_idx on public.messages(role, status, created_at);
create index messages_conv_created_idx on public.messages(conversation_id, created_at);
alter table public.messages enable row level security;
-- no policies: only service role access
create or replace function public.claim_pending(max_n int default 20) returns setof public.messages language sql as $$
  update public.messages set status='pending', claimed_at=null
  where role='user' and status='processing' and claimed_at < now() - interval '30 minutes';
  update public.messages m set status='processing', claimed_at=now()
  where m.id in (select id from public.messages where role='user' and status='pending' order by created_at limit max_n for update skip locked)
  returning m.*;
$$;
revoke execute on function public.claim_pending(int) from public, anon, authenticated;
