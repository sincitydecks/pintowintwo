/* RFDS Flight Crew Challenge — standalone Vercel prototype */

const REMOTE = DESTINATIONS.filter(d=>d.role==='remote');
const BASES = DESTINATIONS.filter(d=>d.role==='base');
const MAP_BOUNDS={minLon:112,maxLon:154,minLat:-44,maxLat:-10};
const MAP_SVG={w:1120,h:1029.4};
const state={firstName:'',surname:'',email:'',player:'',score:0,flights:[],plan:[],currentIndex:0,current:null,guess:null,dispatching:false,eoiClientId:'',roundConfirmed:false,roundId:'',zoom:1,panMode:false,revealing:false,session:null,revealFrame:0};

// Persistent EOI capture. This uses a NEW storage key and never touches
// the existing rfds_demo_board leaderboard key. The local copy is a
// safety net in case conference Wi-Fi drops during submission.
const PIN_TO_WIN_EOI_KEY='rfds_pin_to_win_eois';
function makeEoiClientId(){
  if (window.crypto && typeof window.crypto.randomUUID==='function') return window.crypto.randomUUID();
  const bytes=new Uint8Array(16);if(window.crypto?.getRandomValues)crypto.getRandomValues(bytes);else bytes.forEach((_,i)=>bytes[i]=Math.floor(Math.random()*256));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function saveLocalEoi(record){
  try{
    const stored=JSON.parse(localStorage.getItem(PIN_TO_WIN_EOI_KEY)||'[]');
    const list=Array.isArray(stored)?stored:[];
    if(!list.some(x=>x.clientId===record.clientId)) list.push(record);
    localStorage.setItem(PIN_TO_WIN_EOI_KEY,JSON.stringify(list.slice(-5000)));
    return true;
  }catch(err){
    console.warn('Local EOI backup failed:',err);
    return false;
  }
}
async function syncEoi(record){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    const response=await fetch('/api/eoi',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(record),credentials:'same-origin',signal:controller.signal});
    clearTimeout(timeout);
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.ok) throw new Error(result.error||'EOI could not be saved to the server.');
    try{
      const stored=JSON.parse(localStorage.getItem(PIN_TO_WIN_EOI_KEY)||'[]');
      if(Array.isArray(stored)){
        const updated=stored.map(x=>x.clientId===record.clientId?Object.assign({},x,{synced:true}):x);
        localStorage.setItem(PIN_TO_WIN_EOI_KEY,JSON.stringify(updated));
      }
    }catch(err){}
    return true;
  }catch(err){
    console.warn('EOI server sync pending; local backup retained:',err);
    return false;
  }
}
function captureEoi(name,email){
  const record={clientId:makeEoiClientId(),submittedAt:new Date().toISOString(),fullName:name||'Anonymous Pilot',email:email||'',sourceUrl:window.location.href,synced:false};
  state.eoiClientId=record.clientId;
  saveLocalEoi(record);
  syncEoi(record);
  return record;
}

const $=id=>document.getElementById(id);
const screens={start:$('screen-start'),game:$('screen-game'),result:$('screen-result'),board:$('screen-board')};
function showScreen(k){
  Object.entries(screens).forEach(([key,el])=>el.classList.toggle('active',key===k));
  document.body.dataset.screen=k;
  window.scrollTo?.(0,0);
  if(k!=='start') requestAnimationFrame(()=>{const heading=screens[k].querySelector('h2,.result-title');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}});
  if(k==='game'){
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        if(state.current && $('game-map-svg') && $('origin-dot')){
          setSvgCircle($('origin-dot'),state.current.base.lat,state.current.base.lon,$('game-map-svg'));
          $('origin-dot').style.display='block';
        }
        if(state.guess && $('game-map-svg') && $('guess-dot')){
          setSvgCircle($('guess-dot'),state.guess.lat,state.guess.lon,$('game-map-svg'));
          $('guess-dot').style.display='block';
        }
      });
    });
  }
}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(window.__rfdsToast);window.__rfdsToast=setTimeout(()=>el.classList.remove('show'),1800);}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function updateTop(){$('top-flights').textContent=`${state.flights.length} / 3`;$('top-score').textContent=state.score.toLocaleString();}

/* The Careers map uses the same projection as its base/waypoint coordinates.
   This affine transform is fitted from the supplied Careers HTML's exact map nodes. */
const GEO_X={a:-2735.18218625,b:24.6920924,c:-0.04367975};
const GEO_Y={a:-223.34059445,b:-0.00419334,c:-27.1108143};
function latLonToSvg(lat,lon){return {x:GEO_X.a+GEO_X.b*lon+GEO_X.c*lat,y:GEO_Y.a+GEO_Y.b*lon+GEO_Y.c*lat};}
const geoInv=(function(){
  const det=GEO_X.b*GEO_Y.c-GEO_X.c*GEO_Y.b;
  return {
    lonFrom:(x,y)=>((x-GEO_X.a)*GEO_Y.c-(y-GEO_Y.a)*GEO_X.c)/det,
    latFrom:(x,y)=>(GEO_X.b*(y-GEO_Y.a)-GEO_Y.b*(x-GEO_X.a))/det
  };
})();
function svgPointFromClient(svg,clientX,clientY){
  const pt=svg.createSVGPoint();pt.x=clientX;pt.y=clientY;
  const inv=svg.getScreenCTM()?.inverse(); if(!inv) return null;
  return pt.matrixTransform(inv);
}
function haversineKm(a,b){
  const R=6371,rad=v=>v*Math.PI/180;
  const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function scoreFor(km){
  const base=Math.max(0,Math.round(1000-km));
  let bonus=0;
  if(km<=5) bonus=400;
  else if(km<=10) bonus=300;
  else if(km<=25) bonus=200;
  else if(km<=50) bonus=150;
  else if(km<=100) bonus=100;
  return {base,bonus,total:base+bonus};
}
function accuracyStatus(km){
  if(km<=10) return ['PRECISION NAVIGATION','PRECISION NAVIGATION'];
  if(km<=25) return ['ON COURSE','ON COURSE'];
  if(km<=50) return ['GOOD NAVIGATION','GOOD NAVIGATION'];
  if(km<=100) return ['IN THE AREA','IN THE AREA'];
  if(km<=250) return ['COURSE CORRECTION','COURSE CORRECTION'];
  return ['OFF COURSE','OFF COURSE'];
}
function scenarioFor(d){
  if(d.state==='NT')return {mission:'Locate the Northern Territory destination',terrain:d.area,copy:'Find the destination on the map.'};
  if(d.section==='SA_NT' && ['andamooka','marree'].includes(d.id)) return {
    eyebrow:'BUSH RUN // TASK RECEIVED', type:'PRIMARY & ALLIED HEALTH — BUSH RUN', mission:'Scheduled primary & allied health clinic', vehicle:'Pilatus PC-12',
    crew:'Multidisciplinary visiting health team', terrain:'Remote South Australian outback',
    copy:`A scheduled RFDS Bush Run is heading into remote South Australia. A multidisciplinary team of primary and allied health practitioners is travelling to provide a clinic for the local community.`
  };
  if(d.section==='VIC_TAS') {
    if(d.state==='VIC') return {eyebrow:'ROAD TASK // TASK RECEIVED',type:'ROAD PATIENT TRANSPORT',mission:'Non-emergency patient transport',vehicle:'RFDS patient transport ambulance',crew:'RFDS Patient Transport crew',terrain:'Regional Victoria',copy:`An RFDS Patient Transport crew has been tasked with a scheduled regional transfer. The patient is ready for collection and the crew needs to reach the correct destination.`};
    return {eyebrow:'REGIONAL TASK // TASK RECEIVED',type:'REGIONAL TRANSFER',mission:'Regional patient transfer',vehicle:'Regional RFDS transfer operation',crew:'RFDS transfer crew',terrain:'Bass Strait / Tasmanian regional network',copy:`A regional transfer task has been assigned across the southern network. Your job is to identify the destination before the operational leg begins.`};
  }
  if(d.section==='WA') return {eyebrow:'AEROMEDICAL // TASK RECEIVED',type:'PATIENT RETRIEVAL',mission:'Remote patient retrieval',vehicle:'Pilatus PC-12',crew:'RFDS aeromedical crew',terrain:'Remote Western Australian country',copy:`A medical request has been received from a remote community. The RFDS crew is tasked to retrieve the patient and connect them with appropriate further care.`};
  if(d.section==='QLD') return {eyebrow:'AEROMEDICAL // TASK RECEIVED',type:'PATIENT TRANSFER',mission:'Remote patient transfer',vehicle:'Pilatus PC-12',crew:'RFDS aeromedical crew',terrain:'Queensland outback',copy:`A patient requires transport from an outback community so they can continue their care. The crew is tasked and the destination must be located.`};
  return {eyebrow:'AEROMEDICAL // TASK RECEIVED',type:'PATIENT TRANSFER',mission:'Aeromedical retrieval / transfer',vehicle:'Pilatus PC-12',crew:'RFDS aeromedical crew',terrain:'Remote South Eastern Section country',copy:`A patient transfer has been requested from a remote community. The crew must navigate to the correct destination and connect the patient with further care.`};
}

function sectionLabel(s){return ({WA:'Western Australia',SA_NT:'South Australia / Northern Territory',QLD:'Queensland',NSW_SE:'South Eastern Section / NSW',VIC_TAS:'Victoria / Tasmania'})[s]||s;}
function terrain(d){return d.difficulty>=5?'Very remote country':d.difficulty>=4?'Remote country':'Regional country';}
function pickPlan(){
  const bySection={WA:[],SA_NT:[],QLD:[],NSW_SE:[],VIC_TAS:[]};
  REMOTE.forEach(d=>bySection[d.section].push(d));
  Object.values(bySection).forEach(arr=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}});
  const ordered=['WA','SA_NT','QLD','NSW_SE','VIC_TAS'];
  const chosen=ordered.flatMap(s=>bySection[s].slice(0,2));
  const p=[...chosen];
  for(let i=p.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  return p.slice(0,3).map((d,i)=>{const s=scenarioFor(d);return {id:`mission-${Date.now()}-${i}`,destinationId:d.id,d,base:BASES.find(b=>b.name===d.base || b.id===d.base)||BASES[0],scenario:s};});
}
function setSvgCircle(el,lat,lon,svg){
  if(!el||!svg)return;
  const p=latLonToSvg(lat,lon);el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);
  if(el.id==='origin-dot'){$('origin-halo').setAttribute('cx',p.x);$('origin-halo').setAttribute('cy',p.y);}
  const matrix=svg.getScreenCTM();if(matrix&&matrix.a)el.setAttribute('r',(el.id==='origin-dot'?6:9)/Math.abs(matrix.a));
  if(el.id==='origin-dot'&&matrix?.a)$('origin-halo').setAttribute('r',15/Math.abs(matrix.a));
}
function drawRoute(){
  const svg=$('game-map-svg'),path=$('route-path'); if(!svg||!state.current||!state.guess||!state.roundConfirmed||state.revealing)return;
  const d=state.current.d, origin=latLonToSvg(state.current.base.lat,state.current.base.lon), dest=latLonToSvg(d.lat,d.lon), guess=latLonToSvg(state.guess.lat,state.guess.lon);
  const mx=(origin.x+dest.x)/2,my=Math.min(origin.y,dest.y)-Math.max(70,Math.abs(origin.x-dest.x)*.12);
  path.setAttribute('d',`M ${origin.x} ${origin.y} Q ${mx} ${my} ${dest.x} ${dest.y}`);
}
function loadMission(){
  state.current=state.plan[state.currentIndex]; state.guess=null;state.roundConfirmed=false;state.revealing=false;
  cancelAnimationFrame(state.revealFrame);$('reveal-panel').setAttribute('aria-live','off');$('reveal-phase').setAttribute('role','status');$('reveal-panel').hidden=true;$('reveal-continue').hidden=true;
  $('task-panel').classList.remove('is-revealing');$('map-canvas').inert=false;resetMap();$('flight-plane').style.display='none';$('origin-halo').style.display='block';
  $('task-number').textContent=String(state.currentIndex+1);
  $('task-question-big').textContent=state.current.d.name;
  $('task-region').textContent=state.current.d.state==='NT'?'Northern Territory':sectionLabel(state.current.d.section);
  $('map-section-pill').textContent=state.current.d.state;
  $('pin-status').textContent='Place a pin to continue.';
  $('map-hint').textContent=matchMedia('(pointer: coarse)').matches?'Tap to pin · drag to refine · pinch to zoom':'Tap the map to place your pin';
  [...$('flight-steps').children].forEach((el,i)=>{el.className=i<state.currentIndex?'done':i===state.currentIndex?'current':'';});
  $('task-base').textContent=state.current.base.name;$('map-base-name').textContent=state.current.base.name;
  
  $('guess-dot').style.display='none';$('actual-dot').style.display='none';$('route-path').setAttribute('d','');
  $('confirm-btn').disabled=true;
  
  requestAnimationFrame(()=>{
    if(state.current && $('game-map-svg') && $('origin-dot')){
      setSvgCircle($('origin-dot'),state.current.base.lat,state.current.base.lon,$('game-map-svg'));
      $('origin-dot').style.display='block';
    }
  });
  updateTop();
}
function openRegistration(){
  $('registration-error').textContent='';
  $('registration-modal').classList.add('open');$('registration-modal').setAttribute('aria-hidden','false');
  document.querySelectorAll('.screen,.topbar').forEach(el=>el.inert=true);
  $('player-name').focus();
}
function closeRegistration(){
  $('registration-modal').classList.remove('open');$('registration-modal').setAttribute('aria-hidden','true');
  document.querySelectorAll('.screen,.topbar').forEach(el=>el.inert=false);
  $('open-start-btn').focus();
}
function dispatchStart(){
  state.dispatching=true;closeRegistration();
  const overlay=$('dispatch-overlay');overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
  $('dispatch-scramble').textContent='Ready for take-off.';$('dispatch-status').textContent='Your first destination is ready.';
  setTimeout(()=>{overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');state.dispatching=false;loadMission();showScreen('game');},matchMedia('(prefers-reduced-motion: reduce)').matches?0:650);
}
async function startGame(){
  if(state.dispatching)return;
  $('registration-error').textContent='';
  ['player-name','player-email'].forEach(id=>$(id).removeAttribute('aria-invalid'));
  const name=($('player-name').value||'').trim().slice(0,80);
  const email=($('player-email').value||'').trim().slice(0,120);
  if(!name){
    $('registration-error').textContent='Enter your name to join the leaderboard.';$('player-name').setAttribute('aria-invalid','true');
    $('player-name')?.focus();
    return;
  }
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    $('registration-error').textContent='Enter a valid email address, such as you@example.com.';$('player-email').setAttribute('aria-invalid','true');
    $('player-email')?.focus();
    return;
  }
  state.dispatching=true;$('start-btn').disabled=true;$('start-btn').textContent='Preparing your flight…';
  state.player = name;
  state.email = email;
  captureEoi(state.player,email);
  state.score = 0;
  state.flights = [];
  state.currentIndex = 0;
  state.plan = pickPlan();state.roundId=makeEoiClientId();
  await beginSession();
  $('start-btn').disabled=false;$('start-btn').textContent='Let’s fly →';
  dispatchStart();
}
function setGuessFromPointer(e){
  const svg=$('game-map-svg'), p=svgPointFromClient(svg,e.clientX,e.clientY); if(!p)return;
  if(p.x<0||p.x>MAP_SVG.w||p.y<0||p.y>MAP_SVG.h)return;
  const lon=geoInv.lonFrom(p.x,p.y),lat=geoInv.latFrom(p.x,p.y);
  if(lon<MAP_BOUNDS.minLon-2||lon>MAP_BOUNDS.maxLon+2||lat<MAP_BOUNDS.minLat-2||lat>MAP_BOUNDS.maxLat+2)return;
  if(state.roundConfirmed)return;
  state.guess={lat,lon};
  setSvgCircle($('guess-dot'),lat,lon,svg);
  $('guess-dot').style.display='block';
  $('map-hint').textContent='Pin placed — refine then confirm';
  $('confirm-btn').disabled=false;
  $('pin-status').textContent='Pin placed. Ready when you are.';
}
function animateNumber(el,from,to,duration=250,prefix=''){duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.min(duration,900);const start=performance.now();function tick(now){const p=duration===0?1:Math.min(1,(now-start)/duration);const e=1-Math.pow(1-p,3);const v=Math.round(from+(to-from)*e);el.textContent=prefix+v.toLocaleString();if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}
function accuracyPosition(km){
  const stops=[[0,1],[25,.8],[100,.55],[250,.25],[1000,0]];
  if(km>=1000)return 0;
  for(let i=1;i<stops.length;i++)if(km<=stops[i][0]){const [lo,lp]=stops[i-1],[hi,hp]=stops[i];return lp+(hp-lp)*(km-lo)/(hi-lo);}
  return 0;
}
function accuracyColour(km){return km<=25?'#59ddb2':km<=100?'#2dc995':km<=250?'#ffc568':'#ff8068';}
function confirmGuess(){
  if(!state.guess||!state.current||state.roundConfirmed)return;
  state.roundConfirmed=true;state.revealing=true;
  const d=state.current.d,dist=haversineKm(state.guess,d),scoring=scoreFor(dist),priorTotal=state.score;
  state.score+=scoring.total;state.flights.push({destination:d.name,distanceKm:dist,score:scoring.total,base:scoring.base,bonus:scoring.bonus,guess:{...state.guess}});
  persistProgress(); // Save first; the theatre never controls whether a flight survives.
  resetMap();setSvgCircle($('guess-dot'),state.guess.lat,state.guess.lon,mapSvg);
  $('task-panel').classList.add('is-revealing');$('reveal-panel').hidden=false;$('map-canvas').inert=true;
  document.querySelectorAll('.map-controls button').forEach(el=>el.disabled=true);$('confirm-btn').disabled=true;
  $('reveal-phase').textContent='Pin locked';$('reveal-km').textContent='—';$('reveal-caption').textContent='Your location is locked in.';$('map-hint').textContent='Flight plan confirmed';
  const origin=latLonToSvg(state.current.base.lat,state.current.base.lon),guess=latLonToSvg(state.guess.lat,state.guess.lon);
  const control={x:(origin.x+guess.x)/2,y:Math.min(origin.y,guess.y)-Math.min(120,Math.abs(origin.x-guess.x)*.12+35)};
  const path=$('route-path');path.setAttribute('d',`M ${origin.x} ${origin.y} Q ${control.x} ${control.y} ${guess.x} ${guess.y}`);
  const pathLength=path.getTotalLength();path.style.strokeDasharray=String(pathLength);path.style.strokeDashoffset=String(pathLength);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let previousPhase=-1,shownTarget=false;
  const start=performance.now(),duration=reduced?900:6200;
  const maxKm=Math.max(3000,Math.ceil(dist/500)*500+500);
  function tick(now){
    if(!state.revealing)return;
    const elapsed=Math.min(6200,(now-start)/duration*6200),phase=elapsed<500?0:elapsed<2000?1:elapsed<4700?2:3;
    if(phase!==previousPhase){previousPhase=phase;$('reveal-phase').textContent=['Pin locked','Flight underway','Revealing your accuracy','Destination located'][phase];$('reveal-caption').textContent=['Flight plan confirmed.','Following the route to your pin.','Distance reveal · final reading locks at the end.',''][phase];}
    const flightP=clamp((elapsed-500)/1500,0,1),q=path.getPointAtLength(pathLength*flightP),next=path.getPointAtLength(Math.min(pathLength,pathLength*flightP+1));
    if(!reduced){const scale=1/Math.abs(mapSvg.getScreenCTM()?.a||1);$('flight-plane').style.display=phase===1?'block':'none';$('flight-plane').setAttribute('transform',`translate(${q.x} ${q.y}) rotate(${Math.atan2(next.y-q.y,next.x-q.x)*180/Math.PI+90}) scale(${scale})`);path.style.strokeDashoffset=String(pathLength*(1-flightP));}
    if(phase>=2){const p=clamp((elapsed-2000)/2700,0,1),eased=1-Math.pow(1-p,3),km=maxKm+(dist-maxKm)*eased;$('reveal-km').textContent=p>=1?dist.toFixed(1):Math.round(km).toLocaleString();$('proximity-pointer').style.left=`${accuracyPosition(km)*100}%`;$('proximity-pointer').style.background=accuracyColour(km);}
    if(phase===3&&!shownTarget){shownTarget=true;path.style.strokeDasharray='';path.style.strokeDashoffset='';setSvgCircle($('actual-dot'),d.lat,d.lon,mapSvg);$('actual-dot').style.display='block';$('reveal-caption').textContent=accuracyStatus(dist)[0].toLowerCase()+' · +'+scoring.total.toLocaleString()+' points';$('reveal-continue').hidden=false;$('reveal-continue').onclick=finish;$('map-hint').textContent=`Your pin is ${dist.toFixed(1)} km from ${d.name}`;}
    if(elapsed>=6200){finish();return;}state.revealFrame=requestAnimationFrame(tick);
  }
  function finish(){
    if(!state.revealing)return;state.revealing=false;cancelAnimationFrame(state.revealFrame);$('flight-plane').style.display='none';path.style.strokeDasharray='';path.style.strokeDashoffset='';drawRoute();
    showFlightResult(d,dist,scoring,priorTotal);
  }
  state.revealFrame=requestAnimationFrame(tick);
}
function showFlightResult(d,dist,scoring,priorTotal){
  const [statusText]=accuracyStatus(dist);
  $('result-destination').innerHTML=`${escapeHtml(d.name)}<span>, ${d.state}</span>`;
  $('route-origin').textContent=state.current.base.name;$('route-dest').textContent=d.name;
  $('result-flight-label').textContent=`Flight ${state.currentIndex+1} of 3`;
  $('next-btn').textContent=state.currentIndex===2?'See all-time high scores':'Next flight →';
  $('result-feedback').textContent=dist<=25?'Precision pin. Beautiful navigation.':dist<=100?'On course. A well-placed pin.':dist<=250?'Close — keep refining your navigation.':'A little off course. Every flight is a fresh start.';
  $('result-feedback').style.color=accuracyColour(dist);renderResultMap();
  $('result-distance').textContent=`${dist.toFixed(1)} km`;$('accuracy-status').textContent=statusText;
  $('result-base-points').textContent='+'+scoring.base.toLocaleString();$('result-bonus-points').textContent='+'+scoring.bonus.toLocaleString();$('result-flight-total').textContent='+'+scoring.total.toLocaleString();
  animateNumber($('result-score'),0,scoring.total,700,'+');animateNumber($('result-total'),priorTotal,state.score,900);
  $('accuracy-label').textContent=statusText;$('accuracy-live-fill').style.transform=`scaleX(${Math.max(.015,accuracyPosition(dist))})`;$('accuracy-live-fill').style.background=accuracyColour(dist);
  $('personal-best').textContent=`Closest pin: ${Math.min(...state.flights.map(f=>f.distanceKm)).toFixed(1)} km`;
  $('leader-shift').textContent=`${state.flights.length} of 3 flights complete`;updateTop();showScreen('result');
}
function nextFlight(){
  if(!state.roundConfirmed||state.revealing)return;
  if(state.currentIndex>=state.plan.length-1){saveCompletedScore();populateBoard();showScreen('board');return;}
  state.currentIndex++;loadMission();showScreen('game');
}
/* Touch/mouse interaction */
const mapCanvas=$('map-canvas');
const mapPointers=new Map();let drag=null,pinch=null,multiTouch=false,touchStart=null;
function touchPoints(){return [...mapPointers.values()];}
function beginPinch(){
  const [a,b]=touchPoints();if(!a||!b)return;
  const centre={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  pinch={centre,anchor:svgPointFromClient(mapSvg,centre.x,centre.y),distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),view:{...mapView},zoom:state.zoom,scale:Math.abs(mapSvg.getScreenCTM()?.a||1)};
  multiTouch=true;drag=null;
  // A second finger begins a map gesture; it never leaves a new accidental pin.
  if(touchStart){state.guess=touchStart.guess;if(state.guess){setSvgCircle($('guess-dot'),state.guess.lat,state.guess.lon,mapSvg);$('guess-dot').style.display='block';}else{$('guess-dot').style.display='none';$('confirm-btn').disabled=true;$('pin-status').textContent='Place a pin to continue.';}}
}
mapCanvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||state.revealing)return;e.preventDefault();mapCanvas.focus({preventScroll:true});mapCanvas.setPointerCapture?.(e.pointerId);
  mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(mapPointers.size>1){beginPinch();return;}
  touchStart={x:e.clientX,y:e.clientY,guess:state.guess?{...state.guess}:null};
  if(state.panMode)drag={p:svgPointFromClient(mapSvg,e.clientX,e.clientY)};
  else if(e.pointerType!=='touch')setGuessFromPointer(e);
});
mapCanvas.addEventListener('pointermove',e=>{
  if(!mapPointers.has(e.pointerId)||state.revealing)return;
  mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&mapPointers.size>=2){
    const [a,b]=touchPoints(),centre={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const zoom=clamp(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,1,4),ratio=(1120/zoom)/pinch.view.w;
    mapView={x:pinch.anchor.x-(pinch.anchor.x-pinch.view.x)*ratio-(centre.x-pinch.centre.x)/pinch.scale*ratio,y:pinch.anchor.y-(pinch.anchor.y-pinch.view.y)*ratio-(centre.y-pinch.centre.y)/pinch.scale*ratio,w:1120/zoom,h:1029.4/zoom};state.zoom=zoom;applyMapView();return;
  }
  if(multiTouch)return;
  if(state.panMode&&drag){const p=svgPointFromClient(mapSvg,e.clientX,e.clientY);mapView.x+=drag.p.x-p.x;mapView.y+=drag.p.y-p.y;applyMapView();}
  else if(e.pointerType!=='touch'||Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y)>5)setGuessFromPointer(e);
});
function finishMapPointer(e){
  if(!mapPointers.has(e.pointerId))return;
  if(e.type==='pointerup'&&e.pointerType==='touch'&&!multiTouch&&!state.panMode&&!state.revealing)setGuessFromPointer(e);
  mapPointers.delete(e.pointerId);
  if(mapPointers.size===0){drag=null;pinch=null;multiTouch=false;touchStart=null;}
}
mapCanvas.addEventListener('pointerup',finishMapPointer);mapCanvas.addEventListener('pointercancel',finishMapPointer);mapCanvas.addEventListener('lostpointercapture',finishMapPointer);
$('open-start-btn').addEventListener('click',openRegistration);$('registration-form').addEventListener('submit',e=>{e.preventDefault();startGame();});$('registration-close').addEventListener('click',closeRegistration);$('registration-modal').addEventListener('click',e=>{if(e.target.id==='registration-modal')closeRegistration();});
$('confirm-btn').addEventListener('click',confirmGuess);
$('next-btn').addEventListener('click',nextFlight);
$('start-board-btn').addEventListener('click',()=>{populateBoard();showScreen('board');});

function returnToHome(){
  state.revealing=false;cancelAnimationFrame(state.revealFrame);persistProgress();
  state.session=null;
  state.score=0;
  state.flights=[];
  state.currentIndex=0;
  state.current=null;
  state.guess=null;
  state.dispatching=false;
  const nameInput=$('player-name'); if(nameInput) nameInput.value='';
  const emailInput=$('player-email'); if(emailInput) emailInput.value='';
  if($('guess-dot')) $('guess-dot').style.display='none';
  if($('actual-dot')) $('actual-dot').style.display='none';
  if($('origin-dot')) $('origin-dot').style.display='none';
  if($('route-path')) $('route-path').setAttribute('d','');
  if($('confirm-btn')) $('confirm-btn').disabled=true;
  updateTop();
  showScreen('start');offerResume();
  $('open-start-btn').focus();
}
$('board-home-btn')?.addEventListener('click',returnToHome);
$('board-home-footer-btn')?.addEventListener('click',returnToHome);
$('brand-badge')?.addEventListener('click',()=>{
  if(screens.board?.classList.contains('active') || screens.result?.classList.contains('active')){
    returnToHome();
  } else if(!screens.start?.classList.contains('active')){
    if(confirm('Return to the start screen? Your locked flights are saved on this device.')){
      returnToHome();
    }
  }
});
$('brand-badge')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('brand-badge').click();}});

/* SVG-native markers stay registered through zoom, pan, resize and rotation. */
const mapSvg=$('game-map-svg');
const svgNS='http://www.w3.org/2000/svg';
mapSvg.appendChild($('route-path'));
$('route-svg').remove();
for(const [id,r,fill,stroke] of [['origin-dot',6,'#f05b22','#fff'],['guess-dot',10,'#00b8e6','#fff'],['actual-dot',10,'#19a486','#fff']]){
  $(id).remove();const marker=document.createElementNS(svgNS,'circle');
  marker.id=id;marker.setAttribute('r',r);marker.setAttribute('fill',fill);marker.setAttribute('stroke',stroke);marker.setAttribute('stroke-width','2.5');marker.setAttribute('vector-effect','non-scaling-stroke');marker.style.display='none';marker.style.pointerEvents='none';mapSvg.appendChild(marker);
}
const halo=document.createElementNS(svgNS,'circle');halo.id='origin-halo';halo.setAttribute('class','origin-halo');halo.setAttribute('fill','none');halo.setAttribute('stroke','#f05b22');halo.setAttribute('stroke-width','2');halo.setAttribute('vector-effect','non-scaling-stroke');mapSvg.insertBefore(halo,$('origin-dot'));
const plane=document.createElementNS(svgNS,'g');plane.id='flight-plane';plane.innerHTML='<path d="M0 -12L3 -3L11 3L11 6L3 3L3 9L6 12L6 14L0 12L-6 14L-6 12L-3 9L-3 3L-11 6L-11 3L-3 -3Z" fill="#f05b22" stroke="#fff" stroke-width="1.2"/>';plane.style.display='none';plane.style.pointerEvents='none';mapSvg.appendChild(plane);
let mapView={x:0,y:0,w:1120,h:1029.4};
function applyMapView(){
  mapView.x=clamp(mapView.x,-30,1150-mapView.w);mapView.y=clamp(mapView.y,-30,1059.4-mapView.h);
  mapSvg.setAttribute('viewBox',`${mapView.x} ${mapView.y} ${mapView.w} ${mapView.h}`);
  const matrix=mapSvg.getScreenCTM();const scale=matrix?Math.abs(matrix.a):1;[['origin-dot',5],['guess-dot',9],['actual-dot',9]].forEach(([id,r])=>$(id).setAttribute('r',r/(scale||1)));
  $('origin-halo').setAttribute('r',15/(scale||1));
  $('zoom-in').disabled=state.revealing||state.zoom>=4;$('zoom-out').disabled=state.revealing||state.zoom<=1;
  $('map-reset').disabled=state.revealing;$('pan-toggle').disabled=state.revealing;
}
function resetMap(){
  state.zoom=1;state.panMode=false;mapView={x:0,y:0,w:1120,h:1029.4};applyMapView();
  $('pan-toggle').setAttribute('aria-pressed','false');mapCanvas.classList.remove('pan-mode');
}
function zoomMap(direction){
  const zoom=clamp(state.zoom*direction,1,4);const w=1120/zoom,h=1029.4/zoom;
  const pin=state.guess?latLonToSvg(state.guess.lat,state.guess.lon):null;
  const centre=pin&&pin.x>=mapView.x&&pin.x<=mapView.x+mapView.w&&pin.y>=mapView.y&&pin.y<=mapView.y+mapView.h?pin:{x:mapView.x+mapView.w/2,y:mapView.y+mapView.h/2};
  mapView={x:centre.x-w/2,y:centre.y-h/2,w,h};state.zoom=zoom;applyMapView();
}
$('zoom-in').addEventListener('click',()=>zoomMap(1.6));$('zoom-out').addEventListener('click',()=>zoomMap(1/1.6));$('map-reset').addEventListener('click',resetMap);
$('pan-toggle').addEventListener('click',()=>{if(state.revealing)return;state.panMode=!state.panMode;$('pan-toggle').setAttribute('aria-pressed',String(state.panMode));mapCanvas.classList.toggle('pan-mode',state.panMode);$('map-hint').textContent=state.panMode?'Drag to move the map. Switch off Move map to place a pin.':state.guess?'Pin placed — refine then confirm':'Tap the map to place your pin';});
mapCanvas.addEventListener('keydown',e=>{
  if(state.revealing){e.preventDefault();return;}
  if(['+','=','-','Home'].includes(e.key)){e.preventDefault();e.key==='Home'?resetMap():zoomMap(e.key==='-'?1/1.6:1.6);return;}
  const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!moves[e.key]||state.roundConfirmed)return;e.preventDefault();
  const p=state.guess?latLonToSvg(state.guess.lat,state.guess.lon):{x:mapView.x+mapView.w/2,y:mapView.y+mapView.h/2};
  const step=(e.shiftKey?2:12)/state.zoom;const delta=moves[e.key];const point=mapSvg.createSVGPoint();point.x=clamp(p.x+delta[0]*step,0,1120);point.y=clamp(p.y+delta[1]*step,0,1029.4);const client=point.matrixTransform(mapSvg.getScreenCTM());setGuessFromPointer({clientX:client.x,clientY:client.y});
});
$('registration-modal').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();closeRegistration();}
  if(e.key==='Tab'){const items=[...$('registration-modal').querySelectorAll('button,input')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
function renderResultMap(){
  const svg=mapSvg.cloneNode(true);svg.removeAttribute('id');svg.removeAttribute('class');svg.setAttribute('viewBox','0 0 1120 1029.4');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Your pin and the destination: ${state.current.d.name}`);
  svg.querySelector('#origin-dot')?.remove();svg.querySelector('#origin-halo')?.remove();svg.querySelector('#flight-plane')?.remove();
  svg.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  const circles=[...svg.querySelectorAll('circle')];circles.forEach(el=>el.setAttribute('r','24'));
  const a=latLonToSvg(state.guess.lat,state.guess.lon),b=latLonToSvg(state.current.d.lat,state.current.d.lon);
  const line=document.createElementNS(svgNS,'line');for(const [key,value] of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#c74413','stroke-width':4,'stroke-dasharray':'8 8'}))line.setAttribute(key,value);svg.querySelector('.route-path')?.remove();svg.insertBefore(line,svg.querySelector('circle'));
  $('result-map').replaceChildren(svg);
}

updateTop();

window.addEventListener('resize',()=>{
  if(screens.game?.classList.contains('active') && state.current && $('game-map-svg')){
    if($('origin-dot')?.style.display!=='none') setSvgCircle($('origin-dot'),state.current.base.lat,state.current.base.lon,$('game-map-svg'));
    if(state.guess && $('guess-dot')?.style.display!=='none') setSvgCircle($('guess-dot'),state.guess.lat,state.guess.lon,$('game-map-svg'));
    if($('actual-dot')?.style.display!=='none') setSvgCircle($('actual-dot'),state.current.d.lat,state.current.d.lon,$('game-map-svg'));
    drawRoute();
  }
});

/* CMS breakout protection retained from RFDS source */
(function unleashSandbox(){
  try{
    const sandbox=document.getElementById('rfds-sandbox');if(!sandbox)return;
    let parent=sandbox.parentElement;
    while(parent&&parent.tagName!=='BODY'&&parent.tagName!=='HTML'){
      const style=window.getComputedStyle(parent);
      if(style.overflow==='hidden'||style.overflow==='clip')parent.style.setProperty('overflow','visible','important');
      if(style.overflowX==='hidden'||style.overflowX==='clip')parent.style.setProperty('overflow-x','visible','important');
      if(style.maxWidth&&style.maxWidth!=='none'&&style.maxWidth!=='100%')parent.style.setProperty('max-width','none','important');
      parent=parent.parentElement;
    }
  }catch(e){console.warn('rfds-sandbox breakout restricted:',e);}
})();
