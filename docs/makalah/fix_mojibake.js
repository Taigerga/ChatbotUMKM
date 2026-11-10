const fs = require('fs');
let s = fs.readFileSync('gen_makalah.js', 'utf8');
const before = (s.match(/\?{2,}/g) || []).length;
// quoted phrases: runs of ? ... ? -> Indonesian-style quoted with curly quotes
s = s.replace(/\?{2,}([^?"\n]{1,140}?)\?{2,}/g, '“$1”');
// remaining runs -> en dash with spaces
s = s.replace(/\?{2,}/g, ' — ');
fs.writeFileSync('gen_makalah.js', s, 'utf8');
console.log('runs fixed:', before);
console.log('remaining runs:', (s.match(/\?{2,}/g) || []).length);
