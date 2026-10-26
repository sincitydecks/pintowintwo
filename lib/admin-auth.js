const crypto=require('node:crypto');
const COOKIE='pin_to_win_admin',TTL=8*60*60;
const password=()=>String(process.env.PIN_TO_WIN_ADMIN_PASSWORD||'').trim();
const secret=()=>process.env.PIN_TO_WIN_ADMIN_SESSION_SECRET||process.env.SUPABASE_SECRET_KEY||'';
function sign(payload){const data=Buffer.from(JSON.stringify(payload)).toString('base64url');return data+'.'+crypto.createHmac('sha256',secret()).update(data).digest('base64url');}
function authOk(req){try{if(!secret())return false;const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));const token=decodeURIComponent(cookie?.slice(COOKIE.length+1)||'');const [data,sig]=token.split('.');const expected=crypto.createHmac('sha256',secret()).update(data).digest('base64url');return sig?.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))&&JSON.parse(Buffer.from(data,'base64url').toString()).exp>Date.now()/1000;}catch{return false;}}
module.exports={COOKIE,TTL,password,secret,sign,authOk};
