const { config, eventDay, pickPlan, computeFlights, playerId, token, verifyToken, db, clean, json } = require('../lib/game');
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
module.exports = async function handler(req, res) {
  try {
    const conf = config(), today = eventDay();
    const action = clean(req.query?.action || (req.method === 'GET' ? 'board' : ''), 20);
    if (req.method === 'GET' && action === 'config') return json(res, 200, { ok: true, ...conf, today });
    if (req.method === 'GET' && action === 'board') {
      // The public board is perpetual. Explicit dates retain access to daily archives.
      if (!req.query?.day) {
        const rows = await db('rpc/pin_to_win_all_time_board', { method: 'POST', body: { event_key: conf.eventId } });
        return json(res, 200, { ok: true, ...conf, today, scope: 'all-time', rows: rows || [] });
      }
      const day = clean(req.query.day, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json(res, 400, { ok: false, error: 'Invalid conference date.' });
      const rows = await db('rpc/pin_to_win_daily_board', { method: 'POST', body: { event_key: conf.eventId, day_key: day } });
      return json(res, 200, { ok: true, ...conf, today, day, scope: 'daily', rows: rows || [] });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, error: 'Method not allowed.' }); }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || JSON.stringify(body).length > 18000 || !uuid(body.id) || (body.eventId && body.eventId !== conf.eventId)) return json(res, 400, { ok: false, error: 'Invalid game submission.' });
    if (action === 'start') {
      const name = clean(body.name, 80), email = clean(body.email).toLowerCase();
      if (!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return json(res, 400, { ok: false, error: 'Enter your name and a valid email if provided.' });
      // A start is idempotent but never returns an existing game's credentials.
      const existing = await db(`pin_to_win_games?id=eq.${body.id}&select=id`);
      if (existing?.length) return json(res, 409, { ok: false, error: 'Game already exists. Retry using its saved session.' });
      const game = { id: body.id, event_id: conf.eventId, event_day: today, timezone: conf.timezone, player_id: playerId(email), full_name: name, email: email || null, mission_ids: pickPlan(), started_at: new Date().toISOString(), source: 'online' };
      await db('pin_to_win_games', { method: 'POST', body: game, prefer: 'return=minimal' });
      return json(res, 200, { ok: true, token: token(game), plan: game.mission_ids, day: today, ...conf });
    }
    if (action === 'progress') {
      if (!verifyToken(body.token, body.id, conf.eventId)) return json(res, 401, { ok: false, error: 'Invalid game session.' });
      const [game] = await db(`pin_to_win_games?id=eq.${body.id}&event_id=eq.${encodeURIComponent(conf.eventId)}&select=*`);
      if (!game) return json(res, 404, { ok: false, error: 'Game session not found.' });
      const flights = computeFlights(game.mission_ids, body.guesses);
      const previous = game.guesses || [];
      // Queued snapshots may be retried out of order. Never erase or alter a locked guess.
      for (let i = 0; i < Math.min(previous.length, flights.length); i++) if (previous[i].lat !== flights[i].lat || previous[i].lon !== flights[i].lon) return json(res, 409, { ok: false, error: 'A locked pin cannot be changed.' });
      if (flights.length <= previous.length) return json(res, 200, { ok: true, day: game.event_day, completed: game.completed, score: game.score });
      const score = flights.reduce((sum, f) => sum + f.score, 0), completed = flights.length === 3;
      const updated = await db(`pin_to_win_games?id=eq.${body.id}&revision=eq.${game.revision}`, { method: 'PATCH', prefer: 'return=representation', body: { guesses: flights, score, total_distance: flights.reduce((sum, f) => sum + f.distanceKm, 0), completed, revision: game.revision + 1, updated_at: new Date().toISOString() } });
      if (!updated?.length) return json(res, 409, { ok: false, error: 'Game updated elsewhere. Retry your saved progress.' });
      return json(res, 200, { ok: true, day: game.event_day, completed, score });
    }
    if (action === 'recover') {
      const name = clean(body.name, 80), email = clean(body.email).toLowerCase(), started = new Date(body.startedAt);
      if (!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !Number.isFinite(started.getTime()) || started.getTime() > Date.now() + 300000 || started.getTime() < Date.now() - 14 * 86400000) return json(res, 400, { ok: false, error: 'Invalid offline session.' });
      const flights = computeFlights(body.plan, body.guesses);
      const existing = await db(`pin_to_win_games?id=eq.${body.id}&select=*`);
      if (existing?.length) {
        const old=existing[0];
        const exact=old.source==='offline' && old.full_name===name && (old.email||'')===email && JSON.stringify(old.mission_ids)===JSON.stringify(body.plan) && old.guesses.length===flights.length && old.guesses.every((g,i)=>g.lat===flights[i].lat&&g.lon===flights[i].lon);
        if(exact)return json(res,200,{ok:true,day:old.event_day,score:old.score,completed:true});
        return json(res,409,{ok:false,error:'This game ID is already in use. Staff can review the saved local backup.'});
      }
      const day = eventDay(started, conf.timezone), score = flights.reduce((sum, f) => sum + f.score, 0);
      if (flights.length !== 3) return json(res, 400, { ok: false, error: 'Complete three flights before recovering an offline game.' });
      const game = { id: body.id, event_id: conf.eventId, event_day: day, timezone: conf.timezone, player_id: playerId(email), full_name: name, email: email || null, mission_ids: body.plan, started_at: started.toISOString(), source: 'offline', guesses: flights, score, total_distance: flights.reduce((sum, f) => sum + f.distanceKm, 0), completed: true, revision: 3 };
      // On retry, the same UUID can only insert once. An exact replay returns its prior result.
      await db('pin_to_win_games', { method: 'POST', body: game, prefer: 'return=minimal,resolution=ignore-duplicates' });
      return json(res, 200, { ok: true, day, score, completed: true });
    }
    return json(res, 400, { ok: false, error: 'Unknown game action.' });
  } catch (error) {
    if (error.message?.startsWith('Invalid ')) return json(res, 400, { ok: false, error: error.message });
    const setupRequired = ['42P01', 'PGRST202', 'PGRST205', 'CONFIG_MISSING'].includes(error.code);
    console.error('Leaderboard request failed:', error.code || error.name);
    return json(res, 503, { ok: false, setupRequired, error: setupRequired ? 'Cloud leaderboard setup is pending. Local game progress is retained.' : 'Cloud leaderboard is temporarily unavailable. Your device backup will retry.' });
  }
};
