const {test,beforeEach}=require('node:test');const assert=require('node:assert/strict');
// Dummy, non-production values. No credentials are needed to run these tests.
process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SECRET_KEY='test-only-not-a-credential';process.env.PIN_TO_WIN_TIMEZONE='Australia/Adelaide';process.env.PIN_TO_WIN_EVENT_ID='test-conference';
const game=require('../lib/game'),handler=require('../api/game');const {randomUUID}=require('node:crypto');
let records,requests;
function mockCloud(url,opts={}){
  requests.push({url,opts});const parsed=new URL(url),path=parsed.pathname,body=opts.body?JSON.parse(opts.body):null;
  if(path.endsWith('/rpc/pin_to_win_daily_board')||path.endsWith('/rpc/pin_to_win_all_time_board')){
    const best=new Map();for(const row of [...records.values()].filter(r=>r.event_id===body.event_key&&(!body.day_key||r.event_day===body.day_key)&&r.completed).sort((a,b)=>b.score-a.score||a.total_distance-b.total_distance||a.started_at.localeCompare(b.started_at)||a.id.localeCompare(b.id)))if(!best.has(row.player_id))best.set(row.player_id,row);
    return Promise.resolve(Response.json([...best.values()].slice(0,20).map(r=>({id:r.id,name:r.full_name,score:r.score,total_distance:r.total_distance,source:r.source}))));
  }
  const id=parsed.searchParams.get('id')?.slice(3),revision=parsed.searchParams.get('revision')?.slice(3);
  if(opts.method==='POST'){
    if(records.has(body.id)){if(opts.headers.Prefer?.includes('ignore-duplicates'))return Promise.resolve(new Response(null,{status:201}));return Promise.resolve(Response.json({code:'23505'},{status:409}));}
    records.set(body.id,{guesses:[],revision:0,score:0,total_distance:0,completed:false,...body});return Promise.resolve(new Response(null,{status:201}));
  }
  if(opts.method==='PATCH'){
    const old=records.get(id);if(!old||old.revision!==Number(revision))return Promise.resolve(Response.json([]));records.set(id,{...old,...body});return Promise.resolve(Response.json([records.get(id)]));
  }
  return Promise.resolve(Response.json(records.has(id)?[records.get(id)]:[]));
}
async function call(action,body,method=body?'POST':'GET',query={}){let status=200,data,headers={};const res={status(code){status=code;return this},setHeader(k,v){headers[k]=v;return this},end(v){data=JSON.parse(v)}};await handler({method,query:{action,...query},body,headers:{}},res);return {status,data,headers};}
beforeEach(()=>{records=new Map();requests=[];global.fetch=mockCloud});
test('timezone boundary uses the conference calendar, including Adelaide daylight saving',()=>{assert.equal(game.eventDay(new Date('2026-10-26T13:29:59Z')),'2026-10-26');assert.equal(game.eventDay(new Date('2026-10-26T13:30:00Z')),'2026-10-27');assert.equal(game.eventDay(new Date('2026-10-26T14:29:59Z'),'Australia/Darwin'),'2026-10-26');});
test('optional email starts a server-issued game and keeps secrets off the response',async()=>{const r=await call('start',{id:randomUUID(),name:'Test Pilot',email:''});assert.equal(r.status,200);assert.equal(r.data.plan.length,3);assert.equal(new Set(r.data.plan).size,3);assert(r.data.token);assert(!JSON.stringify(r.data).includes(process.env.SUPABASE_SECRET_KEY));assert.equal([...records.values()][0].email,null)});
test('provided malformed email is rejected',async()=>{assert.equal((await call('start',{id:randomUUID(),name:'Pilot',email:'bad'})).status,400);assert.equal(records.size,0)});
test('scores are recomputed; each flight is saved, locked guesses cannot change, and duplicate completion is idempotent',async()=>{const id=randomUUID(),start=await call('start',{id,name:'Pilot'});const guesses=start.data.plan.map(id=>{const d=require('../data/destinations').find(d=>d.id===id);return {lat:d.lat,lon:d.lon}});let r=await call('progress',{id,token:start.data.token,guesses:guesses.slice(0,1),score:999999});assert.equal(r.data.score,1400);assert.equal(r.data.completed,false);const day=records.get(id).event_day;
  assert.equal((await call('board',null,'GET',{day})).data.rows.length,0);
  r=await call('progress',{id,token:start.data.token,guesses});assert.equal(r.data.score,4200);assert.equal(r.data.completed,true);
  assert.equal((await call('progress',{id,token:start.data.token,guesses})).status,200);assert.equal(records.size,1);
  const changed=guesses.map(g=>({...g}));changed[0].lat+=1;assert.equal((await call('progress',{id,token:start.data.token,guesses:changed})).status,409);
  const board=await call('board',null,'GET',{day});assert.equal(board.data.rows.length,1);assert(!('email' in board.data.rows[0]));assert(!('player_id' in board.data.rows[0]));
});
test('forged token is rejected and games cannot be overwritten through recovery',async()=>{const id=randomUUID(),r=await call('start',{id,name:'Pilot'});assert.equal((await call('progress',{id,token:'forged',guesses:[]})).status,401);assert.equal((await call('start',{id,name:'Someone else'})).status,409);const plan=r.data.plan,guesses=plan.map(id=>{const d=require('../data/destinations').find(d=>d.id===id);return {lat:d.lat,lon:d.lon}});assert.equal((await call('recover',{id,name:'Pilot',plan,guesses,startedAt:new Date().toISOString()})).status,409);});
test('offline recovery retains the original day, recomputes score and accepts exact retries once',async()=>{const plan=game.pickPlan(),startedAt=new Date(Date.now()-86400000).toISOString(),guesses=plan.map(id=>{const d=require('../data/destinations').find(d=>d.id===id);return {lat:d.lat,lon:d.lon}});const payload={id:randomUUID(),name:'Offline Pilot',email:'',plan,guesses,startedAt,score:999999};const first=await call('recover',payload);assert.equal(first.status,200);assert.equal(first.data.day,game.eventDay(new Date(startedAt)));assert.equal(first.data.score,4200);assert.equal((await call('recover',payload)).status,200);assert.equal(records.size,1);assert.equal((await call('recover',{...payload,name:'Different Pilot'})).status,409);});
test('same names without email remain distinct participants',async()=>{for(let i=0;i<2;i++){const id=randomUUID(),r=await call('start',{id,name:'Alex Smith'});await call('progress',{id,token:r.data.token,guesses:r.data.plan.map(id=>{const d=require('../data/destinations').find(d=>d.id===id);return {lat:d.lat,lon:d.lon}})});}const r=await call('board');assert.equal(r.data.rows.length,2);});
test('default board spans dates, keeps each player’s best score, and preserves explicit daily archives',async()=>{
  const fixtures=[
    {id:'old-best',player_id:'returning',event_day:'2026-10-20',score:4200,total_distance:0},
    {id:'new-lower',player_id:'returning',event_day:'2026-10-26',score:3000,total_distance:30},
    {id:'other-guest',player_id:'guest:other',event_day:'2026-10-26',score:3500,total_distance:20},
    {id:'partial',player_id:'partial',event_day:'2026-10-26',score:1400,total_distance:0,completed:false},
    {id:'other-event',player_id:'other',event_day:'2026-10-20',score:4200,total_distance:0,event_id:'different-board'}
  ];
  for(const row of fixtures)records.set(row.id,{event_id:'test-conference',completed:true,full_name:'Pilot',source:'online',started_at:row.event_day+'T00:00:00Z',...row});
  const board=await call('board');assert.equal(board.status,200);assert.equal(board.data.scope,'all-time');assert.deepEqual(board.data.rows.map(r=>r.id),['old-best','other-guest']);assert(!('day' in board.data));assert(requests[0].url.endsWith('/rpc/pin_to_win_all_time_board'));
  const daily=await call('board',null,'GET',{day:'2026-10-26'});assert.equal(daily.data.scope,'daily');assert.deepEqual(daily.data.rows.map(r=>r.id),['other-guest','new-lower']);
  assert.equal((await call('board',null,'GET',{day:'invalid'})).status,400);
});
test('database failure responds explicitly without claiming cloud persistence',async()=>{global.fetch=async()=>Response.json({code:'PGRST205'},{status:404});const r=await call('board');assert.equal(r.status,503);assert.equal(r.data.setupRequired,true);});
