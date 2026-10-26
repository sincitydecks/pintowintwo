/* Conference persistence: every locked pin has a local journal and an idempotent cloud snapshot. */
const ROUNDS_KEY='rfds_pin_to_win_rounds_v2', CONFIG_KEY='rfds_pin_to_win_config_v2', BOARD_CACHE_KEY='rfds_pin_to_win_board_v2';
function readStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function writeStored(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('Device backup could not save. Keep this game open.');return false;}}
let conference=readStored(CONFIG_KEY,{timezone:'Australia/Adelaide',eventId:'rfds-conference'}),cloudAvailable=false,syncBusy=false;
function conferenceDay(value=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:conference.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));const p=k=>parts.find(x=>x.type===k).value;return `${p('year')}-${p('month')}-${p('day')}`;}
async function gameRequest(action,body,timeout=7000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch('/api/game?action='+action,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','Accept':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok||!data.ok){const error=new Error(data.error||'Cloud connection unavailable.');error.setupRequired=!!data.setupRequired;error.status=response.status;throw error;}return data;}finally{clearTimeout(timer);}
}
function savedRounds(){const list=readStored(ROUNDS_KEY,[]);return Array.isArray(list)?list:[];}
function storeRound(record){const records=savedRounds();const index=records.findIndex(r=>r.id===record.id);if(index<0)records.push(record);else records[index]=record;writeStored(ROUNDS_KEY,records);}
function persistProgress(){
  if(!state.session||(state.session.completed&&state.flights.length<3))return;
  state.session.guesses=state.flights.map(f=>f.guess);
  state.session.score=state.score;state.session.completed=state.flights.length===3;state.session.synced=false;state.session.updatedAt=new Date().toISOString();storeRound(state.session);syncPending();
}
async function beginSession(){
  const startedAt=new Date().toISOString();const originalId=state.roundId;
  let record={id:originalId,name:state.player,email:state.email,plan:state.plan.map(p=>p.d.id),day:conferenceDay(startedAt),eventId:conference.eventId,timezone:conference.timezone,startedAt,guesses:[],completed:false,synced:false,source:'offline'};
  try{
    const data=await gameRequest('start',{id:originalId,name:state.player,email:state.email,eventId:conference.eventId},3500);
    conference={timezone:data.timezone,eventId:data.eventId};writeStored(CONFIG_KEY,conference);
    record={...record,token:data.token,plan:data.plan,day:data.day,eventId:data.eventId,timezone:data.timezone,source:'online',synced:true};
    state.plan=planFromIds(data.plan);cloudAvailable=true;
  }catch{
    // The first request may have reached the server even if its response was lost.
    // A fresh ID keeps the independent offline game from colliding with that empty session.
    record.id=makeEoiClientId();state.roundId=record.id;cloudAvailable=false;
  }
  state.session=record;storeRound(record);
}
function planFromIds(ids){return ids.map((id,i)=>{const d=REMOTE.find(x=>x.id===id);if(!d)throw new Error('Unknown saved destination.');return {destinationId:id,d,base:BASES.find(b=>b.name===d.base)||BASES[0],scenario:scenarioFor(d)};});}
async function syncPending(){
  if(syncBusy||!navigator.onLine)return;syncBusy=true;
  try{
    for(const snapshot of savedRounds().filter(r=>!r.synced&&r.eventId===conference.eventId&&(r.token||r.completed)).slice(0,20)){
      try{
        const data=await gameRequest(snapshot.token?'progress':'recover',{...snapshot},7000);
        const latest=savedRounds().find(r=>r.id===snapshot.id);
        if(latest&&latest.guesses.length===snapshot.guesses.length){latest.synced=true;latest.day=data.day;latest.lastError='';storeRound(latest);if(state.session?.id===latest.id)state.session={...latest};}
        cloudAvailable=true;
      }catch(error){cloudAvailable=false;const latest=savedRounds().find(r=>r.id===snapshot.id);if(latest){latest.lastError=error.message;storeRound(latest);}if(!error.status||error.status>=500)break;}
    }
  }finally{syncBusy=false;}
}
function saveCompletedScore(){persistProgress();}
function sortRows(rows){return rows.sort((a,b)=>b.score-a.score||(a.total_distance||0)-(b.total_distance||0)||String(a.startedAt||'').localeCompare(String(b.startedAt||''))||String(a.id).localeCompare(String(b.id)));}
function localBoard(day){
  const rows=savedRounds().filter(r=>r.completed&&r.day===day&&r.eventId===conference.eventId).map(r=>({id:r.id,name:r.name,score:r.score,total_distance:r.guesses.reduce((sum,g,i)=>sum+haversineKm(g,REMOTE.find(d=>d.id===r.plan[i])),0),source:r.source,pending:!r.synced,local:true,startedAt:r.startedAt,playerKey:r.email?r.email.toLowerCase():r.id}));
  const best=new Map();for(const row of sortRows(rows))if(!best.has(row.playerKey))best.set(row.playerKey,row);return [...best.values()].slice(0,20);
}
function renderBoard(rows,label,day=conferenceDay()){
  $('board-rows').innerHTML=rows.length?rows.map((r,i)=>`<div class="board-row ${r.id===state.session?.id?'is-you':''}"><div class="rank">${i+1}</div><div class="pilot">${escapeHtml(r.name)}<small>3 flights${r.pending?' · awaiting sync':r.source==='offline'?' · recovered offline':''}${r.id===state.session?.id?' · You':''}</small></div><div class="score">${Number(r.score).toLocaleString()}</div></div>`).join(''):'<p class="board-empty">No completed flights today. Set the first score.</p>';
  $('board-sync-status').textContent=label;
  $('board-event-stat').textContent=`${day} · ${conference.timezone.replace('Australia/','')} time`;
}
let boardLoad=0;
async function populateBoard(){
  const request=++boardLoad,day=conferenceDay();
  const cache=readStored(BOARD_CACHE_KEY,null),cached=cache?.day===day&&cache?.eventId===conference.eventId?cache.rows:[];
  const local=localBoard(day);renderBoard(cached?.length?cached:local,'Checking today’s cloud leaderboard…');
  await syncPending();
  try{
    const data=await gameRequest('board');if(request!==boardLoad)return;
    conference={timezone:data.timezone,eventId:data.eventId};writeStored(CONFIG_KEY,conference);cloudAvailable=true;
    writeStored(BOARD_CACHE_KEY,{eventId:data.eventId,day:data.day,rows:data.rows});
    renderBoard(data.rows,'Daily cloud leaderboard · refreshes automatically',data.day);
    const pending=localBoard(data.day).filter(r=>r.pending).length;
    if(pending)$('board-sync-status').textContent+=` · ${pending} device score${pending===1?'':'s'} awaiting sync`;
    if(state.session?.completed&&state.session.day!==data.day)$('board-sync-status').textContent+=` · Your game belongs to ${state.session.day}`;
  }catch(error){if(request!==boardLoad)return;cloudAvailable=false;renderBoard(cached?.length?cached:localBoard(day),(error.setupRequired?'Cloud setup pending. ':'Offline. ')+(cached?.length?'Showing last synced board. ':'Showing this device’s scores. ')+'New scores stay on this device until synced.');}
}
async function retryEois(){for(const entry of readStored(PIN_TO_WIN_EOI_KEY,[]).filter(x=>!x.synced).slice(0,20))if(!await syncEoi(entry))break;}
function offerResume(){
  const record=savedRounds().filter(r=>!r.completed&&r.eventId===conference.eventId&&r.guesses?.length<3).at(-1);
  $('resume-panel').hidden=!record;if(!record)return;
  $('resume-label').textContent=`Saved on this device: ${record.name} · ${record.guesses.length} of 3 flights`;
  $('resume-btn').onclick=()=>{
    state.session=record;state.roundId=record.id;state.player=record.name;state.email=record.email||'';state.plan=planFromIds(record.plan);
    state.flights=record.guesses.map((guess,i)=>{const d=state.plan[i].d,km=haversineKm(guess,d),p=scoreFor(km);return {destination:d.name,distanceKm:km,score:p.total,base:p.base,bonus:p.bonus,guess};});
    state.score=state.flights.reduce((sum,f)=>sum+f.score,0);state.currentIndex=state.flights.length;loadMission();showScreen('game');
  };
}
window.addEventListener('online',()=>{syncPending().then(()=>{if(screens.board.classList.contains('active'))populateBoard();});retryEois();});
setInterval(()=>{if(screens.board.classList.contains('active'))populateBoard();else syncPending();},20000);
(async()=>{try{const data=await gameRequest('config',null,3500);conference={timezone:data.timezone,eventId:data.eventId};writeStored(CONFIG_KEY,conference);}catch{}offerResume();syncPending();retryEois();})();
