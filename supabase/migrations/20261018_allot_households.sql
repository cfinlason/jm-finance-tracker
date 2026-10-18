-- Allot cloud + family sharing.
--
-- Every account belongs to exactly one household. A household holds ONE budget document that all of its
-- members read and write (the "joint view"). A new account starts in its own household; it can invite others
-- with a code, or join someone else's with their code. Everything is locked down with Row Level Security;
-- membership changes only happen through the security-definer functions below.

create table if not exists public.allot_households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our budget',
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.allot_members (
  household_id uuid not null references public.allot_households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  email text,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id) -- one household per account
);

create table if not exists public.allot_invites (
  code text primary key,
  household_id uuid not null references public.allot_households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create index if not exists allot_invites_household_idx on public.allot_invites (household_id);
create index if not exists allot_households_created_by_idx on public.allot_households (created_by);
create index if not exists allot_invites_created_by_idx on public.allot_invites (created_by);

alter table public.allot_households enable row level security;
alter table public.allot_members enable row level security;
alter table public.allot_invites enable row level security; -- no policies: reachable only through the functions

-- The caller's household (null if none yet). Security definer so policies can use it without recursion.
create or replace function public.allot_my_household()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.allot_members where user_id = (select auth.uid()) limit 1;
$$;

revoke all on function public.allot_my_household() from public, anon;
grant execute on function public.allot_my_household() to authenticated;

drop policy if exists "allot_households_select_member" on public.allot_households;
create policy "allot_households_select_member" on public.allot_households
  for select to authenticated using (id = (select public.allot_my_household()));

drop policy if exists "allot_households_update_member" on public.allot_households;
create policy "allot_households_update_member" on public.allot_households
  for update to authenticated
  using (id = (select public.allot_my_household()))
  with check (id = (select public.allot_my_household()));

drop policy if exists "allot_members_select_same_household" on public.allot_members;
create policy "allot_members_select_same_household" on public.allot_members
  for select to authenticated using (household_id = (select public.allot_my_household()));

-- Server-side timestamp on every budget update.
create or replace function public.allot_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists allot_households_touch on public.allot_households;
create trigger allot_households_touch
  before update on public.allot_households
  for each row execute function public.allot_touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Household functions (called with supabase.rpc)
-- ---------------------------------------------------------------------------------------------

-- Returns the caller's household, creating a private one on first use.
create or replace function public.allot_ensure_household()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select household_id into hid from public.allot_members where user_id = uid;
  if hid is not null then return hid; end if;
  insert into public.allot_households (created_by) values (uid) returning id into hid;
  insert into public.allot_members (household_id, user_id, role, email)
    values (hid, uid, 'owner', (select email from auth.users where id = uid));
  return hid;
end;
$$;

-- Makes a short single-use code (valid 7 days) that lets someone else join the caller's household.
create or replace function public.allot_create_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
  c text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  hid := public.allot_ensure_household();
  delete from public.allot_invites where household_id = hid and (used_at is not null or expires_at < now());
  if (select count(*) from public.allot_invites where household_id = hid) >= 5 then raise exception 'too_many_invites'; end if;
  loop
    c := substr(replace(upper(gen_random_uuid()::text), '-', ''), 1, 8);
    exit when not exists (select 1 from public.allot_invites where code = c);
  end loop;
  insert into public.allot_invites (code, household_id, created_by) values (c, hid, uid);
  return c;
end;
$$;

-- Joins the household that issued the code. The caller's previous household is deleted if nobody else is in it.
create or replace function public.allot_join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  inv public.allot_invites%rowtype;
  old uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into inv from public.allot_invites
    where code = upper(trim(p_code)) and used_at is null and expires_at > now() for update;
  if not found then raise exception 'invalid_code'; end if;
  select household_id into old from public.allot_members where user_id = uid;
  if old = inv.household_id then return old; end if;
  if old is not null then
    delete from public.allot_members where user_id = uid;
    if not exists (select 1 from public.allot_members where household_id = old) then
      delete from public.allot_households where id = old;
    elsif not exists (select 1 from public.allot_members where household_id = old and role = 'owner') then
      update public.allot_members set role = 'owner'
        where household_id = old and user_id = (select user_id from public.allot_members where household_id = old order by joined_at limit 1);
    end if;
  end if;
  insert into public.allot_members (household_id, user_id, role, email)
    values (inv.household_id, uid, 'member', (select email from auth.users where id = uid));
  update public.allot_invites set used_by = uid, used_at = now() where code = inv.code;
  return inv.household_id;
end;
$$;

-- Leaves a shared household for a private one that starts as a copy of the shared budget.
create or replace function public.allot_leave_household()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  old uuid;
  nid uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select household_id into old from public.allot_members where user_id = uid;
  if old is null then return public.allot_ensure_household(); end if;
  if (select count(*) from public.allot_members where household_id = old) < 2 then return old; end if;
  insert into public.allot_households (name, data, created_by)
    select name, data, uid from public.allot_households where id = old returning id into nid;
  delete from public.allot_members where user_id = uid;
  if not exists (select 1 from public.allot_members where household_id = old and role = 'owner') then
    update public.allot_members set role = 'owner'
      where household_id = old and user_id = (select user_id from public.allot_members where household_id = old order by joined_at limit 1);
  end if;
  insert into public.allot_members (household_id, user_id, role, email)
    values (nid, uid, 'owner', (select email from auth.users where id = uid));
  return nid;
end;
$$;

-- Owner removes another member; that person gets a private copy of the budget so they lose nothing.
create or replace function public.allot_remove_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
  nid uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select household_id into hid from public.allot_members where user_id = uid and role = 'owner';
  if hid is null then raise exception 'not_owner'; end if;
  if p_user = uid then raise exception 'cannot_remove_self'; end if;
  if not exists (select 1 from public.allot_members where household_id = hid and user_id = p_user) then raise exception 'not_a_member'; end if;
  insert into public.allot_households (name, data, created_by)
    select name, data, p_user from public.allot_households where id = hid returning id into nid;
  delete from public.allot_members where user_id = p_user;
  insert into public.allot_members (household_id, user_id, role, email)
    values (nid, p_user, 'owner', (select email from auth.users where id = p_user));
end;
$$;

revoke all on function public.allot_ensure_household() from public, anon;
revoke all on function public.allot_create_invite() from public, anon;
revoke all on function public.allot_join_household(text) from public, anon;
revoke all on function public.allot_leave_household() from public, anon;
revoke all on function public.allot_remove_member(uuid) from public, anon;
grant execute on function public.allot_ensure_household() to authenticated;
grant execute on function public.allot_create_invite() to authenticated;
grant execute on function public.allot_join_household(text) to authenticated;
grant execute on function public.allot_leave_household() to authenticated;
grant execute on function public.allot_remove_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Receipt photos: private bucket, one folder per household: <household_id>/<receipt_id>.jpg
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "allot_receipts_select_household" on storage.objects;
create policy "allot_receipts_select_household" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.allot_my_household())::text);

drop policy if exists "allot_receipts_insert_household" on storage.objects;
create policy "allot_receipts_insert_household" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.allot_my_household())::text);

drop policy if exists "allot_receipts_update_household" on storage.objects;
create policy "allot_receipts_update_household" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.allot_my_household())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.allot_my_household())::text);

drop policy if exists "allot_receipts_delete_household" on storage.objects;
create policy "allot_receipts_delete_household" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.allot_my_household())::text);

-- Live updates: other members' devices hear about changes immediately.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'allot_households') then
    alter publication supabase_realtime add table public.allot_households;
  end if;
end $$;
