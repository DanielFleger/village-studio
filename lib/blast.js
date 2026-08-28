// PKWare DCL "implode" Entpacker, Portierung von Mark Adlers blast.c
// Firefly packt damit die Abschnitte in .aiv und .map

const MAXBITS = 13;

function buildHuffman(rep) {
  // rep: je Byte = ((Anzahl-1) << 4) | Codelaenge
  const count = new Array(MAXBITS + 1).fill(0);
  for (const b of rep) count[b & 15] += (b >> 4) + 1;

  const offs = new Array(MAXBITS + 2).fill(0);
  for (let len = 1; len <= MAXBITS; len++) offs[len + 1] = offs[len] + count[len];

  const total = count.reduce((a, b) => a + b, 0);
  const symbol = new Int16Array(total);
  let sym = 0;
  for (const b of rep) {
    const left = (b >> 4) + 1;
    const len = b & 15;
    for (let i = 0; i < left; i++) symbol[offs[len]++] = sym++;
  }
  return { count, symbol };
}

const LITLEN = Uint8Array.from([
  11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8,
  9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11, 12, 6, 7, 22, 5,
  7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12,
  8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53, 8, 7, 24, 10, 27,
  44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45,
  44, 173]);
const LENLEN = Uint8Array.from([2, 35, 36, 53, 38, 23]);
const DISTLEN = Uint8Array.from([2, 20, 53, 230, 247, 151, 248]);

const BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
const EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

const litcode = buildHuffman(LITLEN);
const lencode = buildHuffman(LENLEN);
const distcode = buildHuffman(DISTLEN);

function blast(data) {
  let pos = 0, bitbuf = 0, bitcnt = 0;

  function bits(need) {
    let val = bitbuf;
    while (bitcnt < need) {
      val |= data[pos++] << bitcnt;
      bitcnt += 8;
    }
    bitbuf = val >>> need;
    bitcnt -= need;
    return val & ((1 << need) - 1);
  }

  function decode(h) {
    let code = 0, first = 0, index = 0, len = 1;
    let buf = bitbuf, left = bitcnt;
    for (;;) {
      while (left > 0) {
        left--;
        code |= (buf & 1) ^ 1;          // die Bits sind invertiert
        buf >>>= 1;
        const count = h.count[len];
        if (code < first + count) {
          bitbuf = buf;
          bitcnt = (bitcnt - len) & 7;
          return h.symbol[index + (code - first)];
        }
        index += count;
        first = (first + count) << 1;
        code <<= 1;
        len++;
      }
      left = (MAXBITS + 1) - len;
      if (left === 0) throw new Error('blast: ungültiger Code');
      buf = data[pos++];
      if (left > 8) left = 8;
    }
  }

  const lit = bits(8);
  if (lit > 1) throw new Error('blast: unbekannte Literal-Kennung ' + lit);
  const dict = bits(8);
  if (dict < 4 || dict > 6) throw new Error('blast: Wörterbuchgröße ' + dict);

  const out = [];
  for (;;) {
    if (bits(1)) {
      let sym = decode(lencode);
      const length = BASE[sym] + bits(EXTRA[sym]);
      if (length === 519) break;                 // Endmarke
      sym = length === 2 ? 2 : dict;
      let dist = decode(distcode) << sym;
      dist += bits(sym);
      dist += 1;
      if (dist > out.length) throw new Error('blast: Abstand zu groß');
      const start = out.length - dist;
      for (let i = 0; i < length; i++) out.push(out[start + i]);
    } else {
      out.push(lit ? decode(litcode) : bits(8));
    }
  }
  return Buffer.from(out);
}

module.exports = { blast };
