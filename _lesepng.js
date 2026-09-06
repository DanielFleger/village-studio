// Kleiner PNG-Leser fuer die vorhandenen Skins: nur was gebraucht wird -
// 8 Bit, RGB oder RGBA, keine Palette, kein Interlace.
const zlib = require('zlib');
function lesePng(buf) {
  let p = 8, breite = 0, hoehe = 0, farbart = 6, teile = [];
  while (p < buf.length) {
    const laenge = buf.readUInt32BE(p);
    const art = buf.toString('ascii', p + 4, p + 8);
    const daten = buf.subarray(p + 8, p + 8 + laenge);
    if (art === 'IHDR') { breite = daten.readUInt32BE(0); hoehe = daten.readUInt32BE(4); farbart = daten[9]; }
    if (art === 'IDAT') teile.push(daten);
    p += 12 + laenge;
  }
  const roh = zlib.inflateSync(Buffer.concat(teile));
  const kanaele = farbart === 6 ? 4 : farbart === 2 ? 3 : 1;
  const zeile = breite * kanaele;
  const out = Buffer.alloc(breite * hoehe * 4);
  let vorher = Buffer.alloc(zeile);
  for (let y = 0; y < hoehe; y++) {
    const filter = roh[y * (zeile + 1)];
    const jetzt = Buffer.from(roh.subarray(y * (zeile + 1) + 1, (y + 1) * (zeile + 1)));
    for (let i = 0; i < zeile; i++) {
      const a = i >= kanaele ? jetzt[i - kanaele] : 0, b = vorher[i], c = i >= kanaele ? vorher[i - kanaele] : 0;
      if (filter === 1) jetzt[i] = (jetzt[i] + a) & 255;
      else if (filter === 2) jetzt[i] = (jetzt[i] + b) & 255;
      else if (filter === 3) jetzt[i] = (jetzt[i] + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        jetzt[i] = (jetzt[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    for (let x = 0; x < breite; x++) {
      const s = x * kanaele, d = (y * breite + x) * 4;
      out[d] = jetzt[s]; out[d+1] = jetzt[s + (kanaele > 1 ? 1 : 0)]; out[d+2] = jetzt[s + (kanaele > 2 ? 2 : 0)];
      out[d+3] = kanaele === 4 ? jetzt[s+3] : 255;
    }
    vorher = jetzt;
  }
  return { breite, hoehe, rgba: out };
}
module.exports = { lesePng };
