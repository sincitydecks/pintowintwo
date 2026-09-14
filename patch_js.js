const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add haptics and Touch Offset to pointerdown
html = html.replace(
  "mapCanvas.addEventListener('pointerdown',e=>{mapCanvas.setPointerCapture?.(e.pointerId);setGuessFromPointer(e);});",
  "mapCanvas.addEventListener('pointerdown',e=>{ if(navigator.vibrate) navigator.vibrate(15); mapCanvas.setPointerCapture?.(e.pointerId); setGuessFromPointer(e, true); });"
);

html = html.replace(
  "function setGuessFromPointer(e){",
  "function setGuessFromPointer(e, isDown=false){\n  let clientY = e.clientY;\n  if(e.pointerType === 'touch') clientY = Math.max(0, clientY - 45);"
);
html = html.replace(
  "p=svgPointFromClient(svg,e.clientX,e.clientY);",
  "p=svgPointFromClient(svg,e.clientX,clientY);"
);

// 2. Change `accuracyStatus` ratings
// Currently returns ['BULLSEYE', 'route-great'] etc.
const oldAccuracy = `function accuracyStatus(km){
  if(km<=25) return ['PINPOINT ACCURACY','route-great'];
  if(km<=100) return ['IN THE AREA','route-good'];
  if(km<=250) return ['COURSE CORRECTION','route-ok'];
  return ['OFF TARGET','route-bad'];
}`;
const newAccuracy = `function accuracyStatus(km){
  if(km<=10) return ['BULLSEYE / PINPOINT', 'route-great'];
  if(km<=25) return ['DIRECT HIT', 'route-great'];
  if(km<=50) return ['ON SECTOR', 'route-good'];
  if(km<=100) return ['PRIZE ZONE REACHED', 'route-good'];
  if(km<=250) return ['PERIMETER APPROACH', 'route-ok'];
  return ['OFF TARGET', 'route-bad'];
}`;
if (html.includes('function accuracyStatus(km)')) {
  html = html.replace(/function accuracyStatus\(km\)[\s\S]*?\n\}/, newAccuracy);
}

fs.writeFileSync('index.html', html);
