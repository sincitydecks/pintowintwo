const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(__dirname));

app.listen(3000, '0.0.0.0', () => {
  console.log('Static server running on port 3000');
});
