const s = require('fs').readFileSync('gen_makalah.js', 'utf8');
console.log('U+FFFD count:', (s.match(/\uFFFD/g) || []).length);
console.log('mojibake Ã:', (s.match(/Ã/g) || []).length);
console.log('mojibake â:', (s.match(/â/g) || []).length);
const i = s.indexOf('data–model');
console.log('dash sample ok:', i !== -1);
