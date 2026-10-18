-- Allot cloud sync: one JSON document per user + a private bucket for receipt photos.
-- Table is prefixed allot_ so it never collides with older tables in this project.
-- Every row/object is locked to its owner with Row Level Security.

create table if not exists public.allot_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.allot_user_data enable row level security;

drop policy if exists "allot_user_data_select_own" on public.allot_user_data;
create policy "allot_user_data_select_own" on public.allot_user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "allot_user_data_insert_own" on public.allot_user_data;
create policy "allot_user_data_insert_own" on public.allot_user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "allot_user_data_update_own" on public.allot_user_data;
create policy "allot_user_data_update_own" on public.allot_user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "allot_user_data_delete_own" on public.allot_user_data;
create policy "allot_user_data_delete_own" on public.allot_user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Server-side timestamp on every update.
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

drop trigger if exists allot_user_data_touch on public.allot_user_data;
create trigger allot_user_data_touch
  before update on public.allot_user_data
  for each row execute function public.allot_touch_updated_at();

-- Private bucket for original receipt photos, one folder per user: <user_id>/<receipt_id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "allot_receipts_select_own" on storage.objects;
create policy "allot_receipts_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "allot_receipts_insert_own" on storage.objects;
create policy "allot_receipts_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "allot_receipts_update_own" on storage.objects;
create policy "allot_receipts_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "allot_receipts_delete_own" on storage.objects;
create policy "allot_receipts_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
