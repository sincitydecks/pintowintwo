# Backend integration point

Recommended production endpoints:

- GET /api/game/start — create a player session and return a public task.
- POST /api/game/submit — accept task id + guessed lat/lon; calculate distance and score server-side; return reveal data.
- GET /api/leaderboard — return ranked scores.
- GET /api/flights — proxy the existing live FlightAware service without exposing its credentials.
