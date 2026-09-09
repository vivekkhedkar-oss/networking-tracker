-- Run once in the Neon SQL editor after enabling Managed Better Auth and the
-- Data API. Requires the Data API's "authenticated" and "anonymous" roles to
-- already exist (Neon creates them when you enable the Data API).

create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null default (auth.user_id()),
  name        text        not null,
  company     text,
  role        text,
  where_met   text,
  notes       text,
  priority    text        not null default 'medium',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint contacts_name_not_blank check (btrim(name) <> ''),
  constraint contacts_name_len       check (char_length(name) <= 120),
  constraint contacts_priority_valid check (priority in ('high', 'medium', 'low'))
);

create index if not exists contacts_user_id_idx on public.contacts (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row
  execute function public.set_updated_at();

-- Row Level Security ---------------------------------------------------

alter table public.contacts enable row level security;
alter table public.contacts force row level security;

drop policy if exists contacts_select_own on public.contacts;
create policy contacts_select_own on public.contacts
  for select
  to authenticated
  using (auth.user_id() = user_id);

drop policy if exists contacts_insert_own on public.contacts;
create policy contacts_insert_own on public.contacts
  for insert
  to authenticated
  with check (auth.user_id() = user_id);

-- `using` restricts which existing rows an UPDATE may target (must already
-- be yours); `with check` restricts what the row may become after the
-- update (must still be yours) — this is the clause that prevents a user
-- from re-assigning one of their rows to someone else.
drop policy if exists contacts_update_own on public.contacts;
create policy contacts_update_own on public.contacts
  for update
  to authenticated
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

drop policy if exists contacts_delete_own on public.contacts;
create policy contacts_delete_own on public.contacts
  for delete
  to authenticated
  using (auth.user_id() = user_id);

-- Grants -----------------------------------------------------------------
-- The Data API's "Grant public schema access" setting normally does this for
-- you, but it's declared explicitly here so the schema file is self
-- contained and the anonymous role is explicitly locked out.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
revoke all on public.contacts from anonymous;
