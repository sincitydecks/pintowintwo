# Conference game update

- Optional email registration with required leaderboard name; invalid supplied emails are still rejected.
- Orange glowing departure node, matching map label and orange departure name in the right panel, including on phones.
- A locked pin begins a 6.2-second sequence: confirmation, aircraft route to the player's guess, distance countdown with red/amber/green proximity bands, destination reveal, then animated points.
- The true destination is hidden until the reveal reaches its final stage, including during viewport changes. Input is locked throughout the sequence. Reduced-motion mode uses a brief, stationary reveal.
- No tangible-reward claims appear in the experience.
- Daily cloud leaderboard with event-timezone dates, server-issued online sessions, server-calculated scores, progress saved per flight and name-safe guest identities.
- Device journal, resumable incomplete games, idempotent retries and offline recovery with explicit pending/recovered labels.
- Staff date selection, daily game export and complete device-backup export.
- Preserved EOI records, API integration and legacy browser leaderboard without attributing undated scores to today.

## Validation

Eight automated backend checks cover optional email, invalid email, accurate scoring, partial/completed distinction, locked-guess immutability, duplicate retries, forged sessions, same-name players, offline date retention, midnight timezone boundaries and database failure responses.

A local PostgreSQL-compatible engine verified that the migration applies twice, the daily function selects the best score per participant, equal names remain separate, ties use distance, prior days remain separate, and anonymous roles cannot read the table or invoke the function.

Browser checks covered desktop, iPad, portrait phones down to 320px, landscape phones, the full six-second reveal, the hidden destination, reduced motion, refresh/resume, a complete three-flight offline game, queued sync and an online server-issued plan. No application JavaScript errors were observed.

Production verification completed on 26 October 2026: the additive scores migration was applied to the existing Supabase project; the deployed configuration and leaderboard endpoints returned successfully; a live game with blank email saved its first flight and the server calculated 1,400 points. The temporary incomplete verification game was removed without appearing on the public board. Database checks verified daily separation, best-score selection and restricted public access. Daily boundaries currently use Australia/Adelaide.
