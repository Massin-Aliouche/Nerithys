/* build-css.js — No-op: CSS is written manually (no Tailwind build needed) */
const fs = require('fs');
const path = require('path');

const cssFile = path.resolve(__dirname, '../css/style.css');
if (fs.existsSync(cssFile)) {
  console.log('CSS already up to date:', cssFile);
} else {
  console.warn('Warning: css/style.css not found');
}
process.exit(0);
