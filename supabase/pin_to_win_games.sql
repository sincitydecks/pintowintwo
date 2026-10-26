-- Run once in Supabase SQL Editor, in the existing Pin to Win project.
-- Does not delete or alter EOI records or legacy device leaderboards.
begin;
create table if not exists public.pin_to_win_games (
  id uuid primary key,
  event_id text not null,
  event_day date not null,
  timezone text not null,
  player_id text not null,
  full_name text not null,
  email text,
  mission_ids text[] not null check (cardinality(mission_ids) = 3),
  guesses jsonb not null default '[]'::jsonb check (jsonb_typeof(guesses) = 'array' and jsonb_array_length(guesses) <= 3),
  score integer not null default 0 check (score between 0 and 4200),
  total_distance double precision not null default 0,
  completed boolean not null default false,
  source text not null default 'online' check (source in ('online','offline')),
  revision integer not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not completed or jsonb_array_length(guesses) = 3)
);
alter table public.pin_to_win_games enable row level security;
revoke all on public.pin_to_win_games from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on public.pin_to_win_games to service_role;
create index if not exists pin_to_win_games_day_score on public.pin_to_win_games(event_id,event_day,score desc) where completed;

create or replace function public.pin_to_win_daily_board(event_key text, day_key date)
returns table(id uuid, name text, score integer, total_distance double precision, source text)
language sql stable security invoker set search_path = '' as $$
  select b.id,b.full_name as name,b.score,b.total_distance,b.source
  from (
    select distinct on (g.player_id) g.id,g.full_name,g.score,g.total_distance,g.source,g.started_at
    from public.pin_to_win_games g
    where g.event_id=event_key and g.event_day=day_key and g.completed
    order by g.player_id,g.score desc,g.total_distance asc,g.started_at asc,g.id
  ) b
  order by b.score desc,b.total_distance asc,b.started_at asc,b.id
  limit 20;
$$;
revoke all on function public.pin_to_win_daily_board(text,date) from public, anon, authenticated;
grant execute on function public.pin_to_win_daily_board(text,date) to service_role;
commit;
notify pgrst, 'reload schema';
