const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const confirmGuessNew = `function confirmGuess(){
  if(!state.guess||!state.current)return;
  if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
  $('confirm-btn').disabled=true;
  
  const panel = document.querySelector('.game-panel');
  if(panel) panel.style.opacity = '0';
  
  const d=state.current.d;
  setSvgCircle($('actual-dot'),d.lat,d.lon,$('game-map-svg'));
  $('actual-dot').style.display='block'; 
  
  const dist=haversineKm(state.guess,{lat:d.lat,lon:d.lon});
  const scoring=scoreFor(dist);
  const priorTotal=state.score; state.score+=scoring.total;
  state.flights.push({destination:d.name,distanceKm:dist,score:scoring.total,base:scoring.base,bonus:scoring.bonus});

  const dx = state.guess.lon - d.lon;
  const dy = state.guess.lat - d.lat;
  const rad = Math.atan2(dx, dy); 
  const distRatio = Math.min(50, (dist / 100) * 20); // 100km = 20% radius (which is 40% diameter). Max 50% radius (100% width).
  const pinX = Math.sin(rad) * distRatio;
  const pinY = -Math.cos(rad) * distRatio; // -y goes up

  const [statusText]=accuracyStatus(dist);
  $('result-destination').innerHTML=\`\${d.name.toUpperCase()}<span>, \${d.state}</span>\`;
  $('route-origin').textContent=state.current.base.name.toUpperCase(); $('route-dest').textContent=d.name.toUpperCase();
  $('result-flight-label').textContent=\`FLIGHT \${String(state.currentIndex+1).padStart(2,'0')}\`;
  $('result-distance').textContent='0 KM'; $('result-score').textContent='+0'; $('result-total').textContent=priorTotal.toLocaleString();
  $('result-base-points').textContent='+0';$('result-bonus-points').textContent='+0';$('result-flight-total').textContent='+0';
  $('accuracy-label').textContent='CALCULATING';$('accuracy-status').textContent='CALCULATING';
  
  if ($('radar-pin')) {
    $('radar-pin').style.left = \`calc(50% + \${pinX}%)\`;
    $('radar-pin').style.top = \`calc(50% + \${pinY}%)\`;
    $('radar-pin').style.transform = 'scale(0)';
  }
  
  $('personal-best').textContent='Personal best: calculating...';
  $('leader-shift').textContent='UPDATING LEADERBOARD';

  drawRoute();
  const path = $('route-path');
  const pathLen = path.getTotalLength ? path.getTotalLength() : 1000;
  path.style.strokeDasharray = pathLen;
  path.style.strokeDashoffset = pathLen;
  path.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
  void path.offsetWidth;
  path.style.strokeDashoffset = '0';
  
  const tensionEl = document.createElement('div');
  tensionEl.className = 'tension-counter';
  $('game-screen').appendChild(tensionEl);
  tensionEl.style.opacity = '1';
  animateNumber(tensionEl, 0, dist, 1500, '', ' KM');
  
  setTimeout(() => {
     if(panel) panel.style.opacity = '1';
     tensionEl.style.opacity = '0';
     setTimeout(() => tensionEl.remove(), 200);
     showScreen('result');
     
     setTimeout(()=>{$('result-distance').textContent=\`\${dist.toFixed(1)} KM\`;$('accuracy-status').textContent=statusText;},260);
     setTimeout(()=>{animateNumber($('result-base-points'),0,scoring.base,650,'+');},520);
     setTimeout(()=>{animateNumber($('result-bonus-points'),0,scoring.bonus,500,'+');},850);
     setTimeout(()=>{
       const el=$('result-score');el.classList.remove('flash-score');void el.offsetWidth;el.classList.add('flash-score');
       animateNumber(el,0,scoring.total,900,'+');
     },1120);
     setTimeout(()=>{
       const el=$('result-flight-total');animateNumber(el,0,scoring.total,650,'+');
       animateNumber($('result-total'),priorTotal,state.score,900,'');
       $('accuracy-label').textContent=statusText;
       if ($('radar-pin')) $('radar-pin').style.transform = 'scale(1)';
       const best=Math.min(...state.flights.map(f=>f.distanceKm));
       $('personal-best').innerHTML=\`Personal best: <strong>\${best.toFixed(1)} KM</strong>\`;
       $('leader-shift').textContent=state.flights.length===1?'FIRST FLIGHT COMPLETE':'SCORE UPDATED';
     },1450);
  }, 1600);
}`;

html = html.replace(/function confirmGuess\(\)[\s\S]*?(?=function nextFlight\(\))/m, confirmGuessNew + "\n");
fs.writeFileSync('index.html', html);
