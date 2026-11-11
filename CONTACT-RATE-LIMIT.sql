-- Contact page messages, kept so /api/contact can rate-limit (3 per 10 minutes,
-- 20 per 24 hours per account). Run once in the Supabase SQL editor. Safe to
-- run again. Until it is run, /api/contact still sends email, without a limit.

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  message    text not null check (char_length(message) between 1 and 2000)
);

create index if not exists contact_messages_user_created_idx
  on public.contact_messages (user_id, created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages insert own" on public.contact_messages;
create policy "contact_messages insert own" on public.contact_messages
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "contact_messages select own" on public.contact_messages;
create policy "contact_messages select own" on public.contact_messages
  for select to authenticated using (user_id = auth.uid());
