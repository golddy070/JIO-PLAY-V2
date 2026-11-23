-- JIO-PLAY-V2 Supabase schema. Run once in Supabase SQL Editor.
-- RLS restricts cloud records to the configured Admin email.
create table if not exists public.jio_play_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.jio_play_slips (
  cloud_key text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.jio_play_state enable row level security;
alter table public.jio_play_slips enable row level security;
drop policy if exists "JIO PLAY admin can read state" on public.jio_play_state;
drop policy if exists "JIO PLAY admin can insert state" on public.jio_play_state;
drop policy if exists "JIO PLAY admin can update state" on public.jio_play_state;
drop policy if exists "JIO PLAY admin can read slips" on public.jio_play_slips;
drop policy if exists "JIO PLAY admin can insert slips" on public.jio_play_slips;
drop policy if exists "JIO PLAY admin can update slips" on public.jio_play_slips;
drop policy if exists "JIO PLAY admin can delete slips" on public.jio_play_slips;
create policy "JIO PLAY admin can read state" on public.jio_play_state for select to authenticated using ((auth.jwt() ->> 'email') = 'golddy070@gmail.com');
create policy "JIO PLAY admin can insert state" on public.jio_play_state for insert to authenticated with check ((auth.jwt() ->> 'email') = 'golddy070@gmail.com');
create policy "JIO PLAY admin can update state" on public.jio_play_state for update to authenticated using ((auth.jwt() ->> 'email') = 'golddy070@gmail.com') with check ((auth.jwt() ->> 'email') = 'golddy070@gmail.com');
create policy "JIO PLAY admin can read slips" on public.jio_play_slips for select to authenticated using ((auth.jwt() ->> 'email') = 'golddy070@gmail.com');
create policy "JIO PLAY admin can insert slips" on public.jio_play_slips for insert to authenticated with check ((auth.jwt() ->> 'email') = 'golddy070@gmail.com');
create policy "JIO PLAY admin can update slips" on public.jio_play_slips for update to authenticated using ((auth.jwt() ->> 'email') = 'golddy070@gmail.com') with check ((auth.jwt() ->> 'email') = 'golddy070@gmail.com');
create policy "JIO PLAY admin can delete slips" on public.jio_play_slips for delete to authenticated using ((auth.jwt() ->> 'email') = 'golddy070@gmail.com');
grant select, insert, update on public.jio_play_state to authenticated;
grant select, insert, update, delete on public.jio_play_slips to authenticated;
