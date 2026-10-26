-- Add restorable leaderboard moderation to an existing installation. No scores are deleted.
begin;
alter table public.pin_to_win_games add column if not exists hidden_at timestamptz;
create or replace function public.pin_to_win_daily_board(event_key text, day_key date)
returns table(id uuid, name text, score integer, total_distance double precision, source text)
language sql stable security invoker set search_path = '' as $$
  select b.id,b.full_name as name,b.score,b.total_distance,b.source
  from (
    select distinct on (g.player_id) g.id,g.full_name,g.score,g.total_distance,g.source,g.started_at
    from public.pin_to_win_games g
    where g.event_id=event_key and g.event_day=day_key and g.completed and g.hidden_at is null
    order by g.player_id,g.score desc,g.total_distance asc,g.started_at asc,g.id
  ) b
  order by b.score desc,b.total_distance asc,b.started_at asc,b.id
  limit 20;
$$;
revoke all on function public.pin_to_win_daily_board(text,date) from public, anon, authenticated;
grant execute on function public.pin_to_win_daily_board(text,date) to service_role;
-- Retain daily archives; the main board ranks the best completed game per player across every date.

create or replace function public.pin_to_win_all_time_board(event_key text)
returns table(id uuid, name text, score integer, total_distance double precision, source text)
language sql stable security invoker set search_path = '' as $$
  select b.id,b.full_name as name,b.score,b.total_distance,b.source
  from (
    select distinct on (g.player_id) g.id,g.full_name,g.score,g.total_distance,g.source,g.started_at
    from public.pin_to_win_games g
    where g.event_id=event_key and g.completed and g.hidden_at is null
    order by g.player_id,g.score desc,g.total_distance asc,g.started_at asc,g.id
  ) b
  order by b.score desc,b.total_distance asc,b.started_at asc,b.id
  limit 20;
$$;
revoke all on function public.pin_to_win_all_time_board(text) from public, anon, authenticated;
grant execute on function public.pin_to_win_all_time_board(text) to service_role;
create index if not exists pin_to_win_games_visible_scores on public.pin_to_win_games(event_id,player_id,score desc,total_distance asc,started_at asc,id) where completed and hidden_at is null;
commit;
notify pgrst, 'reload schema';
