# Pin to Win refinement

- Retained the RFDS navy, cream and orange identity and original Australia map.
- Reworked the opening layout with short numbered instructions and a direct start button.
- Added all eight NT destinations to the shared data source (28 remote destinations total).
- Added map zoom, fit, pan mode and arrow-key pin adjustment (Shift for precision).
- Moved pin markers into SVG coordinates so they remain registered when zooming or rotating.
- Replaced blocking registration alerts with inline validation; added dialog focus containment and Escape dismissal.
- Reduced dispatch to 650 ms; eliminated the multi-second score sequence and respected reduced motion.
- Added a result map comparing the guess and destination, a prize-qualification message and a clear final leaderboard action.
- Prevented double confirmations, answer-route disclosure during resize, and incomplete leaderboard submissions.
- Preserved the `rfds_demo_board` key, existing completed scores, the EOI backup key, API routes, admin and Supabase configuration.
- Kept the best completed score per player name. Existing name-based identity behavior remains.
- Consolidated the repeated inline style patches into `public/app.css`.

## Validation

Browser checks covered eight NT coordinates through map click/projection/scoring; a complete three-flight game; registration errors; keyboard pin placement; zoom/reset/pan; legacy score retention; no incomplete score saves; duplicate confirmation protection; leaderboard reopening; and desktop, iPad, phone and landscape layouts. No application JavaScript errors were observed.

EOI network responses were stubbed in local browser checks. Live Supabase writes and the deployed admin require the existing production environment and were not exercised.

See `NT_LOCATIONS.md` for the Tiwi interpretation and the approximate Mt Doreen station coordinate.

## Deployment

Upload the project contents to the existing repository/deployment. Vercel settings remain: Framework **Other**, no build command, no output directory. Keep the same site origin on the event iPad to retain its browser-local leaderboard. No database migration or new environment variables are required for this refinement.
