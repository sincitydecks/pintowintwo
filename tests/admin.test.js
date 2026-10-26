const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SECRET_KEY='test-only-not-a-credential';process.env.PIN_TO_WIN_ADMIN_SESSION_SECRET='admin-test-only-secret';process.env.PIN_TO_WIN_ADMIN_PASSWORD='test-only-password';process.env.PIN_TO_WIN_EVENT_ID='test-conference';
const {sign,COOKIE}=require('../lib/admin-auth'),handler=require('../api/admin-scores'),entryHandler=require('../api/eoi-admin');
let requests=[];const cookie=()=>`${COOKIE}=${encodeURIComponent(sign({exp:Math.floor(Date.now()/1000)+60}))}`;
async function call(action,{method='GET',body,query={},authenticated=true,headers={},api=handler}={}){let status=200,data,responseHeaders={};const res={status(value){status=value;return this},setHeader(k,v){responseHeaders[k]=v;return this},end(value){data=JSON.parse(value)}};await api({method,query:{action,...query},body,headers:{host:'pin.example',...(authenticated?{cookie:cookie()}:{}),...headers}},res);return {status,data,headers:responseHeaders};}
const post={method:'POST',headers:{'x-pin-to-win-admin':'1','content-type':'application/json',origin:'https://pin.example'}};
beforeEach(()=>{requests=[];global.fetch=async(url,opts)=>{requests.push({url,opts});return Response.json([])};});
test('private lists, exports and moderation reject anonymous and expired sessions',async()=>{
 for(const action of ['session','list','board','hide','restore','clear'])assert.equal((await call(action,{authenticated:false})).status,401);
 const expired=sign({exp:1});assert.equal((await call('list',{headers:{cookie:`${COOKIE}=${expired}`}})).status,401);assert.equal(requests.length,0);
});
test('admin lists page scores without exposing game credentials and always scopes queries to the configured board',async()=>{
 global.fetch=async(url,opts)=>{requests.push({url,opts});return Response.json(Array.from({length:101},(_,i)=>({id:i})));};
 const r=await call('list',{query:{offset:'100',visibility:'hidden',day:'2026-10-26'}});assert.equal(r.status,200);assert.equal(r.data.rows.length,100);assert.equal(r.data.hasMore,true);const u=new URL(requests[0].url);assert.equal(u.searchParams.get('offset'),'100');assert.equal(u.searchParams.get('event_id'),'eq.test-conference');assert.equal(u.searchParams.get('hidden_at'),'not.is.null');assert.equal(u.searchParams.get('event_day'),'eq.2026-10-26');assert(!u.searchParams.get('select').includes('player_id'));assert(!u.searchParams.get('select').includes('mission_ids'));
 for(const query of [{offset:-1},{offset:'invalid'},{visibility:'unknown'},{asOf:'invalid'},{day:'invalid'}])assert.equal((await call('list',{query})).status,400);
});
test('score changes require POST, same-origin intent and a valid game ID',async()=>{
 const id='00000000-0000-4000-8000-000000000001';assert.equal((await call('hide')).status,400);assert.equal((await call('hide',{method:'POST',body:{id}})).status,403);assert.equal((await call('hide',{...post,body:{id},headers:{...post.headers,origin:'https://evil.example'}})).status,403);assert.equal((await call('hide',{...post,body:{id:'invalid'}})).status,400);assert.equal(requests.length,0);
 const r=await call('hide',{...post,body:{id}});assert.equal(r.status,200);let q=new URL(requests[0].url);assert.equal(q.searchParams.get('id'),'eq.'+id);assert.equal(q.searchParams.get('event_id'),'eq.test-conference');assert.equal(requests[0].opts.method,'PATCH');assert(JSON.parse(requests[0].opts.body).hidden_at);await call('restore',{...post,body:{id}});assert.equal(JSON.parse(requests[1].opts.body).hidden_at,null);
});
test('clear is an archive operation requiring exact confirmation and a snapshot cutoff; it never deletes games',async()=>{
 const asOf=new Date().toISOString();assert.equal((await call('clear',{...post,body:{asOf}})).status,400);assert.equal((await call('clear',{...post,body:{confirm:'CLEAR LEADERBOARD',asOf:'bad'}})).status,400);assert.equal(requests.length,0);
 assert.equal((await call('clear',{...post,body:{confirm:'CLEAR LEADERBOARD',asOf}})).status,200);const r=requests[0],q=new URL(r.url);assert.equal(r.opts.method,'PATCH');assert.deepEqual(Object.keys(JSON.parse(r.opts.body)),['hidden_at']);assert.equal(q.searchParams.get('event_id'),'eq.test-conference');assert.equal(q.searchParams.get('completed'),'eq.true');assert.equal(q.searchParams.get('hidden_at'),'is.null');assert.equal(q.searchParams.get('updated_at'),'lte.'+asOf);
});
test('staff login uses configured password and an HttpOnly secure cookie; GET cannot sign out',async()=>{
 assert.equal((await call('login',{api:entryHandler,method:'POST',authenticated:false,body:{password:'wrong'}})).status,401);
 const r=await call('login',{api:entryHandler,method:'POST',authenticated:false,body:{password:'test-only-password'}});assert.equal(r.status,200);assert.match(r.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);assert.equal((await call('logout',{api:entryHandler})).status,405);assert.equal((await call('logout',{api:entryHandler,method:'POST'})).status,200);
});
test('cloud failure never reports moderation success',async()=>{global.fetch=async()=>Response.json({code:'failure'},{status:500});const r=await call('hide',{...post,body:{id:'00000000-0000-4000-8000-000000000001'}});assert.equal(r.status,503);assert.equal(r.data.ok,false);});
