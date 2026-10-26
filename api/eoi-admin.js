const {COOKIE,TTL:DEFAULT_EXPIRY_SECONDS,password:getPassword,secret:getSecret,sign,authOk}=require('../lib/admin-auth');
const {json,clean,db,config,eventDay}=require('../lib/game');

module.exports = async function handler(req, res) {
  const action = clean((req.query && req.query.action) || 'list', 20).toLowerCase();

  if (action === 'login') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    let body = req.body;
    try {
      if (typeof body === 'string') body = JSON.parse(body);
    } catch {
      body = null;
    }

    if(!getPassword()||!getSecret())return json(res,503,{ok:false,error:'Configure the admin password and session secret in Vercel.'});
    const password = clean(body && body.password, 200);
    if (!password || password !== getPassword()) {
      return json(res, 401, { ok: false, error: 'Incorrect password.' });
    }

    const token = sign({ exp: Math.floor(Date.now() / 1000) + DEFAULT_EXPIRY_SECONDS });
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DEFAULT_EXPIRY_SECONDS}`);
    return json(res, 200, { ok: true });
  }

  if (action === 'logout') {
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed.'});
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    return json(res, 200, { ok: true });
  }

  if (!authOk(req)) {
    return json(res, 401, { ok: false, error: 'Unauthorised.' });
  }

  if(action==='scores'){
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed.'});
    const conf=config(),day=clean(req.query.day||eventDay(),10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return json(res,400,{ok:false,error:'Invalid date.'});
    try{const rows=await db(`pin_to_win_games?event_id=eq.${encodeURIComponent(conf.eventId)}&event_day=eq.${day}&select=id,full_name,score,total_distance,completed,source,started_at,email&order=score.desc,total_distance.asc&limit=10000`);return json(res,200,{ok:true,rows,day,...conf});}
    catch{return json(res,503,{ok:false,error:'Run supabase/pin_to_win_games.sql in the Supabase SQL Editor, then refresh.'});}
  }

  if (action === 'list') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return json(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    if (!supabaseUrl || !supabaseSecretKey) {
      return json(res, 500, { ok: false, error: 'Database service is not configured.' });
    }

    const offset=Number(req.query?.offset||0);
    if(!Number.isSafeInteger(offset)||offset<0)return json(res,400,{ok:false,error:'Invalid page.'});
    const query = encodeURIComponent('id,client_id,submitted_at,full_name,email,source_url');
    const response = await fetch(`${supabaseUrl}/rest/v1/pin_to_win_eois?select=${query}&order=submitted_at.desc,id.desc&offset=${offset}&limit=501`, {
      headers: {
        'Accept': 'application/json',
        'apikey': supabaseSecretKey,
        ...(supabaseSecretKey.startsWith('eyJ')?{Authorization:`Bearer ${supabaseSecretKey}`}:{})
      }
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('PIN TO WIN admin Supabase read failed:', response.status, details);
      return json(res, 502, { ok: false, error: 'Could not load captured entries.' });
    }

    const rows = await response.json();
    return json(res, 200, { ok: true, rows: Array.isArray(rows) ? rows.slice(0,500) : [], hasMore: Array.isArray(rows)&&rows.length>500 });
  }

  return json(res, 400, { ok: false, error: 'Unknown action.' });
};
