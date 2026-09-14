const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
  /\$\('top-flights'\).textContent=`\$\{state.flights.length\} \/ 10`;/g,
  "$('top-flights').textContent=`${state.flights.length} / 3`;"
);

html = html.replace(
  /flights:10/g,
  "flights:3"
);

// update startGame
html = html.replace(
  /function startGame\(\)\{.*?\n\}/s,
  `function startGame(){
  const name=($('player-name').value||'').trim().slice(0,80);
  const email=($('player-email').value||'').trim().slice(0,120);
  state.player = name || 'Anonymous Participant';
  state.email = email;
  state.score = 0;
  state.flights = [];
  state.currentIndex = 0;
  state.plan = pickPlan();
  dispatchStart();
}`
);

// update loadMission
html = html.replace(
  /function loadMission\(\)\{.*?\n\}/s,
  `function loadMission(){
  state.current=state.plan[state.currentIndex]; state.guess=null;
  $('task-number').textContent=String(state.currentIndex+1);
  $('task-question-big').textContent=\`Where is ‘\${state.current.d.name}’? \`;
  $('task-base').textContent=state.current.base.name;
  
  $('guess-dot').style.display='none';$('actual-dot').style.display='none';$('route-path').setAttribute('d','');
  $('confirm-btn').disabled=true;
  $('origin-dot').style.display='none';
  updateTop();
}`
);

// update pickPlan to pick 3 instead of 10
html = html.replace(
  /return p\.slice\(0,10\)\.map/g,
  "return p.slice(0,3).map"
);

// update keydown listener from player-first-name, player-surname, player-email to just player-name and player-email
html = html.replace(
  /\['player-first-name','player-surname','player-email'\].forEach\(id=>\$\(id\)\.addEventListener\('keydown',e=>\{if\(e\.key==='Enter'\)startGame;\}\)\);/g,
  "['player-name','player-email'].forEach(id=>$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')startGame();}));"
);

// ensure openRegistration focuses player-name
html = html.replace(
  /\$\('player-first-name'\).focus\(\)/g,
  "$('player-name').focus()"
);

// Game over check should be 3 not 10
html = html.replace(
  /if\(state\.currentIndex<9\)/g,
  "if(state.currentIndex<2)"
);
html = html.replace(
  /if\(state\.flights\.length===10\)/g,
  "if(state.flights.length===3)"
);

fs.writeFileSync('index.html', html);
