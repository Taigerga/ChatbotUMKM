const fs = require('fs');
const raw = fs.readFileSync('gen_makalah.js', 'utf8');
const cp1252 = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F
};
const bytes = [];
for (const ch of raw) {
  const c = ch.charCodeAt(0);
  if (c === 0xFEFF) continue;            // drop BOM char left from bad roundtrip
  if (c < 128) bytes.push(c);
  else if (cp1252[ch] !== undefined) bytes.push(cp1252[ch]);
  else if (c >= 0x80 && c <= 0x9F) bytes.push(c);   // undefined in cp1252: raw byte pass-through
  else if (c >= 0xA0 && c <= 0xFF) bytes.push(c);
  else throw new Error('unmapped char: ' + JSON.stringify(ch) + ' U+' + c.toString(16));
}
const fixed = Buffer.from(bytes).toString('utf8');
fs.writeFileSync('gen_makalah.js', fixed, 'utf8');
const bad = [...new Set([...fixed].filter(c => c.charCodeAt(0) > 127))];
console.log('remaining non-ascii:', JSON.stringify(bad));
