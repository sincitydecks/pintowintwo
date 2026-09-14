const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Top left pill
html = html.replace(
  '<div class="brand-badge"><span class="brand-dot"></span><span class="brand-text">RFDS Flight Crew Challenge</span></div>',
  '<div class="brand-badge">PIN TO WIN</div>'
);

// Top right pill - update /10 to /3
html = html.replace(
  '<strong id="top-flights">0 / 10</strong>',
  '<strong id="top-flights">0 / 3</strong>'
);

// 2. Middle pill
html = html.replace(
  '<span class="eyebrow">RFDS // FLIGHT OPERATIONS</span>',
  ''
);

// 3. Landing page copy
html = html.replace(
  /<h1>Know the country.<br><span>Fly the mission.<\/span><\/h1>\s*<p class="lead">.*?<\/p>\s*<div class="start-actions"><button class="primary-btn start-cta" id="open-start-btn">Start the challenge<\/button><\/div>/s,
  `<h1>Fly the mission.<br><span>Pin to win.</span></h1>
        <p class="lead"><strong>You’ve been tasked.</strong><br>
        1. Set your flight mission and get your target town.<br>
        2. Pin it as accurately as you can on the map.<br>
        3. Get within 100km and win a prize.</p>
        <div class="start-actions"><button class="primary-btn start-cta" id="open-start-btn">Start challenge</button></div>`
);

// 4. Registration modal
html = html.replace(
  /<p>Enter your details before you join the flight crew.*?<\/div>\s*<div class="form-note">.*?<\/div>/s,
  `<p>Enter your name to appear on our leaderboard.</p>
      <div class="modal-grid">
        <div class="form-field full"><label for="player-name">Full Name</label><input id="player-name" maxlength="80" autocomplete="name" placeholder="Full Name"></div>
        <div class="form-field full"><label for="player-email">Email (optional)</label><input id="player-email" maxlength="120" type="email" autocomplete="email" placeholder="Email address"></div>
      </div>`
);

// 5. Destination Chart
html = html.replace(
  /<div class="task-kicker">.*?<\/div>\s*<\/aside>/s,
  `<div class="task-kicker"><span>Task: <strong id="task-number">1</strong> / 3</span></div>
          <div class="task-heading-block" style="margin-top:24px; padding-bottom:12px;"><div id="task-question-big" class="task-question-big" style="margin-top:0; font-size:18px;">Where is 'location'?</div></div>
          <div class="task-data" style="margin-bottom:24px;">
            <div class="task-data-row"><span>Departure Base</span><strong id="task-base">Port Augusta</strong></div>
          </div>
          <button id="confirm-btn" class="confirm-btn" disabled style="margin-top:auto;">Confirm location</button>
        </div>
      </aside>`
);

// 7. Conference name
html = html.replace(
  '<p>RFDS Conference</p>',
  '<p>National Rural Health Alliance Conference</p>'
);

fs.writeFileSync('index.html', html);
