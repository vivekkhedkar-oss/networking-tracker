-- Database-level proof that RLS isolates rows between two users, run
-- directly in the Neon SQL editor. This is independent of the app: it
-- proves the *policies*, not just that the UI happens to behave.
--
-- Before running: confirm how auth.user_id() reads the caller's identity on
-- your project with:
--   select pg_get_functiondef('auth.user_id()'::regproc);
-- It reads the `sub` claim of `request.jwt.claims` (the PostgREST/Neon Data
-- API convention). If your project's definition differs, adjust the
-- set_config calls below to match.

begin;

-- Seed one row per (fake) user, bypassing RLS as the table owner.
insert into public.contacts (user_id, name, priority)
values
  ('user-a-fake-id', 'Contact belonging to A', 'high'),
  ('user-b-fake-id', 'Contact belonging to B', 'medium');

-- Impersonate user A: authenticated role + a JWT whose `sub` is user A's id.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'user-a-fake-id', 'role', 'authenticated')::text,
  true
);

-- Expect exactly one row: A's own contact.
select 'A sees only own rows' as check, count(*) = 1 as pass
from public.contacts;

-- Expect 0 rows affected: A cannot update B's row.
with attempt as (
  update public.contacts
  set notes = 'hacked by A'
  where name = 'Contact belonging to B'
  returning 1
)
select 'A cannot update B row' as check, count(*) = 0 as pass from attempt;

-- Expect 0 rows affected: A cannot delete B's row.
with attempt as (
  delete from public.contacts
  where name = 'Contact belonging to B'
  returning 1
)
select 'A cannot delete B row' as check, count(*) = 0 as pass from attempt;

-- Expect failure: the WITH CHECK clause raises 42501 (row-level security
-- violation) rather than silently filtering, unlike the read/update/delete
-- checks above — so this runs inside a savepoint to keep the transaction
-- usable afterward.
savepoint before_reassign;
do $$
begin
  update public.contacts
  set user_id = 'user-b-fake-id'
  where name = 'Contact belonging to A';
  raise exception 'expected RLS to block this reassignment, but it succeeded';
exception
  when insufficient_privilege then
    raise notice 'A cannot reassign own row to B: pass (blocked by WITH CHECK, code 42501)';
end $$;
rollback to savepoint before_reassign;

-- Switch to user B and confirm the mirror image holds.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'user-b-fake-id', 'role', 'authenticated')::text,
  true
);

select 'B sees only own rows' as check, count(*) = 1 as pass
from public.contacts;

rollback; -- discard the seed rows and any (failed) impersonated writes
