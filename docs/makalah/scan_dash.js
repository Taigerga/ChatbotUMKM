const s = require('fs').readFileSync('gen_makalah.js', 'utf8');
const idxs = [...s.matchAll(/ — /g)].map(m => m.index);
console.log('count', idxs.length);
idxs.forEach(i => console.log(i, JSON.stringify(s.slice(i - 45, i + 40))));
