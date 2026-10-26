const crypto = require('node:crypto');
const destinations = require('../data/destinations');
const remotes = destinations.filter(d => d.role === 'remote');
function config() {
  const timezone = process.env.PIN_TO_WIN_TIMEZONE || 'Australia/Adelaide';
  new Intl.DateTimeFormat('en-AU', { timeZone: timezone }).format();
  return { timezone, eventId: process.env.PIN_TO_WIN_EVENT_ID || 'rfds-conference' };
}
function eventDay(date = new Date(), timezone = config().timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function distance(a, b) {
  const r = x => x * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function scoring(km) {
  const base = Math.max(0, Math.round(1000 - km));
  const bonus = km <= 5 ? 400 : km <= 10 ? 300 : km <= 25 ? 200 : km <= 50 ? 150 : km <= 100 ? 100 : 0;
  return { base, bonus, total: base + bonus };
}
function validatePlan(ids) {
  return Array.isArray(ids) && ids.length === 3 && new Set(ids).size === 3 && ids.every(id => remotes.some(d => d.id === id));
}
function pickPlan() {
  // Match the game's section-balanced selection; sampling without replacement.
  const candidates = [...new Set(remotes.map(d => d.section))].flatMap(section => {
    const pool = remotes.filter(d => d.section === section);
    for (let i = pool.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 2);
  });
  for (let i = candidates.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
  return candidates.slice(0, 3).map(d => d.id);
}
function computeFlights(ids, guesses) {
  if (!validatePlan(ids) || !Array.isArray(guesses) || guesses.length > 3) throw new Error('Invalid game.');
  return guesses.map((g, i) => {
    if (!g || !Number.isFinite(g.lat) || !Number.isFinite(g.lon) || g.lat < -46 || g.lat > -8 || g.lon < 110 || g.lon > 156) throw new Error('Invalid map coordinate.');
    const d = remotes.find(d => d.id === ids[i]);
    const distanceKm = distance(g, d), points = scoring(distanceKm);
    return { destinationId: d.id, lat: g.lat, lon: g.lon, distanceKm, base: points.base, bonus: points.bonus, score: points.total };
  });
}
function secret() {
  const value = process.env.PIN_TO_WIN_ADMIN_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!value) throw new Error('Session signing is not configured.');
  return value;
}
function token(game) {
  const payload = Buffer.from(JSON.stringify({ id: game.id, event: game.event_id })).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}
function verifyToken(value, id, event) {
  try {
    const [data, sig] = String(value || '').split('.');
    const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
    if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return payload.id === id && payload.event === event;
  } catch { return false; }
}
function playerId(email) { return email ? 'email:' + crypto.createHmac('sha256', secret()).update(email.toLowerCase()).digest('hex') : 'guest:' + crypto.randomUUID(); }
class DatabaseError extends Error { constructor(status, code) { super('Cloud leaderboard is unavailable.'); this.status = status; this.code = code; } }
async function db(route, { method = 'GET', body, prefer } = {}) {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, ''), key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new DatabaseError(503, 'CONFIG_MISSING');
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', apikey: key };
  // New sb_secret keys belong in apikey; only legacy JWT service keys are Bearer tokens.
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(url + '/rest/v1/' + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(7000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new DatabaseError(response.status, data?.code || 'DATABASE_ERROR');
  return data;
}
function clean(value, max = 120) { return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max); }
function json(res, status, body) { res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
module.exports = { config, eventDay, distance, scoring, validatePlan, pickPlan, computeFlights, playerId, token, verifyToken, db, clean, json, DatabaseError };
