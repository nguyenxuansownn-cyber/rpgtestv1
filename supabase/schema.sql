-- KNIGHT online account saves (Supabase SQL Editor)
-- Each authenticated account can access only its own save row.
create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint game_saves_data_is_object check (jsonb_typeof(save_data) = 'object')
);

alter table public.game_saves enable row level security;

revoke all on table public.game_saves from anon, authenticated;
grant select, insert, update on table public.game_saves to authenticated;

drop policy if exists "Players can read own save" on public.game_saves;
create policy "Players can read own save"
  on public.game_saves for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players can create own save" on public.game_saves;
create policy "Players can create own save"
  on public.game_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update own save" on public.game_saves;
create policy "Players can update own save"
  on public.game_saves for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
