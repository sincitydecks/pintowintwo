-- Restore previously archived completed scores to the public all-time leaderboard.
-- This only clears the moderation flag; it does not delete or rewrite game records.
-- Keep the event key aligned with PIN_TO_WIN_EVENT_ID (default: rfds-conference).
begin;
update public.pin_to_win_games
set hidden_at = null
where event_id = 'rfds-conference'
  and completed = true
  and hidden_at is not null;
commit;
notify pgrst, 'reload schema';
