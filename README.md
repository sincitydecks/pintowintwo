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

- `PIN_TO_WIN_EVENT_ID` — default `rfds-conference`. Keep this value stable across conferences to preserve the same perpetual leaderboard. Changing it deliberately starts a separate board; prior records remain stored.
- `PIN_TO_WIN_TIMEZONE` — default `Australia/Adelaide`. Set the conference's timezone explicitly if different, e.g. `Australia/Darwin`.

The public board shows the top 20 all-time best scores with **no daily reset or automatic expiry**. Scores are saved in Supabase across devices and conferences. Each completed three-flight game is a high-score attempt, not an accumulating points total. Dates and the configured timezone are retained for staff exports and daily archives.

## Database setup

The existing production Supabase project was configured on 26 October 2026 (migration `20261026024124_pin_to_win_daily_conference_scores`). For another project, apply `supabase/pin_to_win_games.sql` once in its SQL Editor. It adds the game table, indexes, and daily/all-time board functions. The perpetual board was added on 26 October 2026 without changing existing scores. It does not alter or delete EOI records. The script can be safely run again.

The existing EOI schema is in `supabase/pin_to_win_eois.sql`. Browser/public database roles cannot read or write either private table. The public leaderboard API returns names and scores, never email addresses, player identifiers or tokens. Staff access requires the configured admin password; there is no built-in default password.

## Persistence and recovery

- The server issues an online session and destinations, signs a session token and recalculates all scores from submitted guesses.
- Every locked pin is journalled before its animation. Online progress is saved after each flight; only three-flight completions rank.
- Partial games can be resumed on the same device after refresh or closure.
- If a game begins offline, it keeps its local plan and original start timestamp. Completed offline games are recalculated on the server and marked `recovered offline` when the connection returns. Recovery accepts starts up to 14 days ago and allows five minutes of clock skew.
- Unique game IDs and immutable locked guesses prevent retries from duplicating scores. A failed record does not stop other valid queued records from syncing.
- Blank-email players receive separate guest identities even when names match. An email, if provided, identifies a player's best score across all dates using a server-side HMAC identifier.
- The board refreshes every 20 seconds. It reports cached/device-only data and pending scores explicitly when cloud access fails.
- In the staff dashboard, choose a date to view/export all games for that day, including partial games. Export the full device journal before clearing browser data.

Local keys:

- `rfds_pin_to_win_rounds_v2`: dated progress, queued submissions and session credentials
- `rfds_pin_to_win_config_v2`: conference timezone/event settings
- `rfds_pin_to_win_board_all_time_v1`: last synced all-time board (separate from the older daily cache)
- `rfds_pin_to_win_eois`: preserved EOI backup
- `rfds_demo_board`: preserved legacy undated leaderboard; never cleared or assigned an invented date

Do not clear site data on the conference iPad while unsynced records remain. A local backup belongs to its browser and site origin; cloud records can be read from any event device.

## Local checks

`npm test` runs the backend scoring, validation, idempotency, timezone and privacy checks without credentials. `npm start` serves a static preview on port 3000; live API routes require Vercel.

NT location references and the representative Mt Doreen station coordinate are documented in `NT_LOCATIONS.md`.

## Landscape iPad use

The conference layout keeps the full RFDS SA/NT SVG logo above a side-by-side map and briefing. Touch controls are at least 48 px, map controls are 52 px, and the map supports tap/drag pin placement, two-finger zoom/pan, and explicit Fit/Move map controls. Two-finger gestures preserve the existing guess. Safe-area padding and the visual viewport account for browser bars and the registration keyboard. Screen-size checks covered 1024×768, a reduced 1024×650 browser viewport, 1133×744, 1180×820, 1366×1024, and narrow Split View. These were automated touch/browser emulation checks; a physical iPad Safari check remains recommended before the event.
