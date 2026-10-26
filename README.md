# RFDS Pin to Win — conference edition

Three flights across a shared pool of 28 Australian destinations. A name is required; email is optional. The game links an orange departure node to the briefing panel, then plays a six-second flight and distance reveal after each pin is locked.

## Deploy

This is static HTML/CSS/JavaScript with Vercel Node.js API functions.

- Framework preset: **Other**
- Root directory: repository root
- Build command: none
- Output directory: none
- Game: `/`
- Staff dashboard: `/admin.html`

Existing variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` — private server key, never a browser key
- `PIN_TO_WIN_ADMIN_PASSWORD` — private staff password
- `PIN_TO_WIN_ADMIN_SESSION_SECRET` — stable private signing secret

Optional conference configuration:

- `PIN_TO_WIN_EVENT_ID` — default `rfds-conference`. Change for a new conference.
- `PIN_TO_WIN_TIMEZONE` — default `Australia/Adelaide`. Set the conference's timezone explicitly if different, e.g. `Australia/Darwin`.

Daily boards switch at midnight in this timezone. A game belongs to the date it **started**. Prior dates stay archived; no scheduled deletion or reset job is needed.

## Database setup

The existing production Supabase project was configured on 26 October 2026 (migration `20261026024124_pin_to_win_daily_conference_scores`). For another project, apply `supabase/pin_to_win_games.sql` once in its SQL Editor. It adds only the new game table, index, and daily board function. It does not alter or delete EOI records. The script can be safely run again.

The existing EOI schema is in `supabase/pin_to_win_eois.sql`. Browser/public database roles cannot read or write either private table. The public leaderboard API returns names and scores, never email addresses, player identifiers or tokens. Staff access requires the configured admin password; there is no built-in default password.

## Persistence and recovery

- The server issues an online session and destinations, signs a session token and recalculates all scores from submitted guesses.
- Every locked pin is journalled before its animation. Online progress is saved after each flight; only three-flight completions rank.
- Partial games can be resumed on the same device after refresh or closure.
- If a game begins offline, it keeps its local plan and original start timestamp. Completed offline games are recalculated on the server and marked `recovered offline` when the connection returns. Recovery accepts starts up to 14 days ago and allows five minutes of clock skew.
- Unique game IDs and immutable locked guesses prevent retries from duplicating scores. A failed record does not stop other valid queued records from syncing.
- Blank-email players receive separate guest identities even when names match. An email, if provided, identifies a player's best score within each day using a server-side HMAC identifier.
- The board refreshes every 20 seconds. It reports cached/device-only data and pending scores explicitly when cloud access fails.
- In the staff dashboard, choose a date to view/export all games for that day, including partial games. Export the full device journal before clearing browser data.

Local keys:

- `rfds_pin_to_win_rounds_v2`: dated progress, queued submissions and session credentials
- `rfds_pin_to_win_config_v2`: conference timezone/event settings
- `rfds_pin_to_win_board_v2`: last synced board
- `rfds_pin_to_win_eois`: preserved EOI backup
- `rfds_demo_board`: preserved legacy undated leaderboard; never cleared or assigned an invented date

Do not clear site data on the conference iPad while unsynced records remain. A local backup belongs to its browser and site origin; cloud records can be read from any event device.

## Local checks

`npm test` runs the backend scoring, validation, idempotency, timezone and privacy checks without credentials. `npm start` serves a static preview on port 3000; live API routes require Vercel.

NT location references and the representative Mt Doreen station coordinate are documented in `NT_LOCATIONS.md`.
