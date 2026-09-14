const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add JetBrains Mono Font
if (!html.includes('JetBrains+Mono')) {
  html = html.replace('<link rel="stylesheet" href="https://use.typekit.net/xup3mwo.css">',
                      '<link rel="stylesheet" href="https://use.typekit.net/xup3mwo.css">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">');
}

// 2. Add Monospace classes and Radar CSS, and Tension Counter CSS
const cssToAdd = `
  .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
  
  .radar-debrief {
    position: relative;
    width: 100%;
    max-width: 280px;
    margin: 16px auto;
    aspect-ratio: 1;
    background: #00205b;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 4px 20px rgba(0,0,0,0.5);
  }
  .radar-ring {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
  }
  .radar-ring.prize-zone {
    border: 1px dashed rgba(240, 91, 34, 0.6);
    background: rgba(240, 91, 34, 0.05);
  }
  .radar-center {
    position: absolute;
    width: 6px; height: 6px;
    background: #fff;
    border-radius: 50%;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 10px rgba(255,255,255,0.8);
  }
  .radar-pin {
    position: absolute;
    width: 10px; height: 10px;
    background: #f05b22;
    border-radius: 50%;
    top: 50%; left: 50%;
    margin: -5px 0 0 -5px;
    box-shadow: 0 0 0 3px rgba(240, 91, 34, 0.3);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: scale(0);
  }
  .radar-label {
    text-align: center;
    color: rgba(255,255,255,0.7);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 8px;
    font-weight: 700;
  }
  .tension-counter {
    position: absolute;
    top: 25%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 48px;
    font-weight: 800;
    color: #f05b22;
    text-shadow: 0 4px 20px rgba(0,0,0,0.3);
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
    z-index: 100;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  /* Update score displays to use Mono */
  .live-distance, .live-points, .live-total, #top-score, #top-flights, .break-card strong, .score, .rank {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
  
  .game-panel {
    transition: opacity 0.3s ease;
  }
`;

if (!html.includes('.radar-debrief {')) {
  html = html.replace('</style>', cssToAdd + '\n</style>');
}

// 3. Replace Accuracy Meter with Radar Debrief
const accuracyHTML = `<div class="accuracy-live">
            <div class="accuracy-live-head"><span>Navigation accuracy</span><strong id="accuracy-label">CALCULATING</strong></div>
            <div class="accuracy-live-track"><div id="accuracy-live-fill" class="accuracy-live-fill"></div></div>
            <div class="accuracy-live-caption">Closer to the target = higher score. Accuracy bonuses reward precision.</div>
          </div>`;
          
const newRadarHTML = `<div class="score-breakdown-panel">
          <div class="radar-container">
            <div class="radar-debrief" id="radar-debrief">
              <div class="radar-ring" style="width:100%; height:100%;"></div>
              <div class="radar-ring" style="width:75%; height:75%;"></div>
              <div class="radar-ring prize-zone" style="width:40%; height:40%;"></div>
              <div class="radar-center"></div>
              <div class="radar-pin" id="radar-pin"></div>
            </div>
            <div class="radar-label" id="accuracy-label">CALCULATING</div>
          </div>`;

if (html.includes(accuracyHTML)) {
  html = html.replace(accuracyHTML, newRadarHTML.replace('<div class="score-breakdown-panel">', ''));
} else {
  // Try a more robust regex replacement if whitespace varies
  html = html.replace(/<div class="accuracy-live">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, newRadarHTML.replace('<div class="score-breakdown-panel">', '') + '</div>');
  html = html.replace(/<div class="accuracy-live">[\s\S]*?<\/div>[\s]*<\/div>[\s]*<div class="breakdown-grid"/, `<div class="radar-container">
            <div class="radar-debrief" id="radar-debrief">
              <div class="radar-ring" style="width:100%; height:100%;"></div>
              <div class="radar-ring" style="width:75%; height:75%;"></div>
              <div class="radar-ring prize-zone" style="width:40%; height:40%;"></div>
              <div class="radar-center"></div>
              <div class="radar-pin" id="radar-pin"></div>
            </div>
            <div class="radar-label" id="accuracy-label">CALCULATING</div>
          </div><div class="breakdown-grid"`);
}

// Write the file temporarily to check progress
fs.writeFileSync('index.html', html);
