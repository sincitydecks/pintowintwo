const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
  "const rad = Math.atan2(dx, dy);",
  "const rad = Math.atan2(dy, dx);"
);
html = html.replace(
  "const pinX = Math.sin(rad) * distRatio;",
  "const pinX = Math.cos(rad) * distRatio;"
);
html = html.replace(
  "const pinY = -Math.cos(rad) * distRatio; // -y goes up",
  "const pinY = -Math.sin(rad) * distRatio; // -y goes up"
);

fs.writeFileSync('index.html', html);
