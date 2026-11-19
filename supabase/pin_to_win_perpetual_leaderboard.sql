-- Restore the supplied Top 20 as the starting perpetual leaderboard.
-- Apply after pin_to_win_games.sql and pin_to_win_moderation.sql.
-- New completed game attempts compete with this baseline in the same all-time RPC.
-- The baseline rows are preserved as distinct entries because the CSV has no player IDs.

begin;

create table if not exists public.pin_to_win_perpetual_leaderboard (
  rank integer primary key check (rank between 1 and 20),
  name text not null,
  score integer not null check (score >= 0),
  total_distance_km double precision not null check (total_distance_km >= 0),
  source text not null default 'online' check (source in ('online', 'offline')),
  imported_at timestamptz not null default now()
);

alter table public.pin_to_win_perpetual_leaderboard enable row level security;

drop policy if exists "Public can read perpetual leaderboard"
  on public.pin_to_win_perpetual_leaderboard;

create policy "Public can read perpetual leaderboard"
  on public.pin_to_win_perpetual_leaderboard
  for select
  to anon, authenticated
  using (true);

grant select on public.pin_to_win_perpetual_leaderboard to anon, authenticated, service_role;

insert into public.pin_to_win_perpetual_leaderboard
  (rank, name, score, total_distance_km, source)
values
  (1, 'Andrew B', 3236, 213.566837, 'online'),
  (2, 'Gogo', 3126, 174.191676, 'online'),
  (3, 'James2', 2845, 354.064549, 'online'),
  (4, 'Emmalee Tranebo', 2823, 426.752048, 'online'),
  (5, 'Veronica', 2726, 374.116050, 'online'),
  (6, 'Will Park', 2725, 475.118281, 'online'),
  (7, 'Flynn John', 2715, 485.634238, 'online'),
  (8, 'Karl', 2661, 487.994828, 'online'),
  (9, 'Karl', 2627, 572.174254, 'online'),
  (10, 'Jess', 2603, 646.140303, 'online'),
  (11, 'yo', 2593, 707.080662, 'online'),
  (12, 'PAUL BELL', 2582, 568.477823, 'online'),
  (13, 'Katie', 2581, 618.345813, 'online'),
  (14, 'Sara', 2568, 681.842238, 'online'),
  (15, 'Lapunzel', 2512, 637.727922, 'online'),
  (16, 'Teilk', 2467, 633.447807, 'online'),
  (17, 'Robyn', 2425, 924.715459, 'online'),
  (18, 'Evi b', 2377, 722.875549, 'online'),
  (19, 'Laura', 2353, 747.783660, 'online'),
  (20, 'Karl', 2341, 859.426623, 'online')
on conflict (rank) do nothing;

create or replace function public.pin_to_win_all_time_board(event_key text)
returns table(id uuid, name text, score integer, total_distance double precision, source text)
language sql
stable
security invoker
set search_path = ''
as $$
  with game_best as (
    select distinct on (g.player_id)
      g.id,
      g.full_name as name,
      g.score,
      g.total_distance,
      g.source,
      g.started_at
    from public.pin_to_win_games g
    where g.event_id = event_key
      and g.completed
      and g.hidden_at is null
    order by
      g.player_id,
      g.score desc,
      g.total_distance asc,
      g.started_at asc,
      g.id
  ),
  restored_baseline as (
    -- The original CSV is the starting baseline for the established perpetual board.
    -- A deliberately different event key continues to have its own separate board.
    select
      pg_catalog.md5('pin-to-win-perpetual-seed:' || s.rank::text)::uuid as id,
      s.name,
      s.score,
      s.total_distance_km as total_distance,
      s.source,
      s.imported_at as started_at
    from public.pin_to_win_perpetual_leaderboard s
    where event_key = 'rfds-conference'
  ),
  candidates as (
    select id, name, score, total_distance, source, started_at from game_best
    union all
    select id, name, score, total_distance, source, started_at from restored_baseline
  )
  select c.id, c.name, c.score, c.total_distance, c.source
  from candidates c
  order by c.score desc, c.total_distance asc, c.started_at asc, c.id
  limit 20;
$$;

revoke all on function public.pin_to_win_all_time_board(text) from public, anon, authenticated;
grant execute on function public.pin_to_win_all_time_board(text) to service_role;

commit;
notify pgrst, 'reload schema';
