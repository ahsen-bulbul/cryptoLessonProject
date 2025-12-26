import CryptoJS from 'crypto-js';

const normalizeKey = (key) => (key || '').toString();

const caesarEncrypt = (text, shift) => {
  const s = parseInt(shift, 10) || 0;
  let out = '';
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      const base = ch >= 'a' && ch <= 'z' ? 97 : 65;
      const code = ch.charCodeAt(0) - base;
      out += String.fromCharCode(((code + s) % 26 + 26) % 26 + base);
    } else {
      out += ch;
    }
  }
  return out;
};

const caesarDecrypt = (text, shift) => caesarEncrypt(text, -(parseInt(shift, 10) || 0));

const vigenereEncrypt = (text, key) => {
  const k = normalizeKey(key).toUpperCase() || 'KEY';
  let out = '';
  let idx = 0;
  for (const ch of text.toUpperCase()) {
    if (/[A-Z]/.test(ch)) {
      const shift = k.charCodeAt(idx % k.length) - 65;
      out += String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65);
      idx += 1;
    } else {
      out += ch;
    }
  }
  return out;
};

const vigenereDecrypt = (text, key) => {
  const k = normalizeKey(key).toUpperCase() || 'KEY';
  let out = '';
  let idx = 0;
  for (const ch of text.toUpperCase()) {
    if (/[A-Z]/.test(ch)) {
      const shift = k.charCodeAt(idx % k.length) - 65;
      out += String.fromCharCode(((ch.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
      idx += 1;
    } else {
      out += ch;
    }
  }
  return out;
};

const railFenceEncrypt = (text, rails) => {
  const r = parseInt(rails, 10) || 3;
  const fence = Array.from({ length: r }, () => Array(text.length).fill(''));
  let row = 0;
  let down = false;
  for (let i = 0; i < text.length; i += 1) {
    fence[row][i] = text[i];
    if (row === 0 || row === r - 1) {
      down = !down;
    }
    row += down ? 1 : -1;
  }
  return fence.map((rline) => rline.join('')).join('');
};

const railFenceDecrypt = (text, rails) => {
  const r = parseInt(rails, 10) || 3;
  const fence = Array.from({ length: r }, () => Array(text.length).fill(''));
  let row = 0;
  let down = false;
  for (let i = 0; i < text.length; i += 1) {
    fence[row][i] = '*';
    if (row === 0 || row === r - 1) {
      down = !down;
    }
    row += down ? 1 : -1;
  }
  let idx = 0;
  for (let i = 0; i < r; i += 1) {
    for (let j = 0; j < text.length; j += 1) {
      if (fence[i][j] === '*' && idx < text.length) {
        fence[i][j] = text[idx];
        idx += 1;
      }
    }
  }
  let out = '';
  row = 0;
  down = false;
  for (let i = 0; i < text.length; i += 1) {
    out += fence[row][i];
    if (row === 0 || row === r - 1) {
      down = !down;
    }
    row += down ? 1 : -1;
  }
  return out;
};

const playfairMatrix = (key) => {
  const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
  const combined = (normalizeKey(key).toUpperCase() + alphabet);
  let matrixKey = '';
  for (const ch of combined) {
    if (/[A-Z]/.test(ch) && !matrixKey.includes(ch)) {
      matrixKey += ch;
    }
  }
  const matrix = [];
  for (let i = 0; i < 25; i += 5) {
    matrix.push(matrixKey.slice(i, i + 5).split(''));
  }
  return matrix;
};

const playfairFind = (matrix, ch) => {
  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      if (matrix[i][j] === ch) return [i, j];
    }
  }
  return [0, 0];
};

const playfairPrepare = (text) => {
  const t = text.toUpperCase().replace(/J/g, 'I');
  let out = '';
  let i = 0;
  while (i < t.length) {
    const a = t[i];
    const b = i + 1 < t.length ? t[i + 1] : 'X';
    if (a === b) {
      out += a + 'X';
      i += 1;
    } else {
      out += a + b;
      i += 2;
    }
  }
  if (out.length % 2 !== 0) out += 'X';
  return out;
};

const playfairEncrypt = (text, key) => {
  const matrix = playfairMatrix(key);
  const prepared = playfairPrepare(text);
  let out = '';
  for (let i = 0; i < prepared.length; i += 2) {
    const a = prepared[i];
    const b = prepared[i + 1];
    const [r1, c1] = playfairFind(matrix, a);
    const [r2, c2] = playfairFind(matrix, b);
    if (r1 === r2) {
      out += matrix[r1][(c1 + 1) % 5] + matrix[r2][(c2 + 1) % 5];
    } else if (c1 === c2) {
      out += matrix[(r1 + 1) % 5][c1] + matrix[(r2 + 1) % 5][c2];
    } else {
      out += matrix[r1][c2] + matrix[r2][c1];
    }
  }
  return out;
};

const playfairDecrypt = (text, key) => {
  const matrix = playfairMatrix(key);
  let out = '';
  for (let i = 0; i < text.length; i += 2) {
    const a = text[i];
    const b = text[i + 1];
    const [r1, c1] = playfairFind(matrix, a);
    const [r2, c2] = playfairFind(matrix, b);
    if (r1 === r2) {
      out += matrix[r1][(c1 + 4) % 5] + matrix[r2][(c2 + 4) % 5];
    } else if (c1 === c2) {
      out += matrix[(r1 + 4) % 5][c1] + matrix[(r2 + 4) % 5][c2];
    } else {
      out += matrix[r1][c2] + matrix[r2][c1];
    }
  }
  return out;
};

const routeEncrypt = (text, rows) => {
  const r = parseInt(rows, 10) || 4;
  const cols = Math.ceil(text.length / r);
  const matrix = Array.from({ length: r }, () => Array(cols).fill(''));
  let k = 0;
  for (let i = 0; i < r; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      if (k < text.length) {
        matrix[i][j] = text[k];
        k += 1;
      }
    }
  }
  let out = '';
  for (let j = 0; j < cols; j += 1) {
    for (let i = 0; i < r; i += 1) {
      out += matrix[i][j];
    }
  }
  return out;
};

const routeDecrypt = (text, rows) => {
  const r = parseInt(rows, 10) || 4;
  const cols = Math.ceil(text.length / r);
  const matrix = Array.from({ length: r }, () => Array(cols).fill(''));
  let k = 0;
  for (let j = 0; j < cols; j += 1) {
    for (let i = 0; i < r; i += 1) {
      if (k < text.length) {
        matrix[i][j] = text[k];
        k += 1;
      }
    }
  }
  return matrix.map((row) => row.join('')).join('');
};

const affineParseKey = (key) => {
  const parts = normalizeKey(key).replace(/:/g, ',').replace(/\s+/g, ',').split(',').filter(Boolean);
  if (parts.length !== 2) throw new Error('Affine key format: a,b');
  return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
};

const modInv = (a, m) => {
  for (let x = 1; x < m; x += 1) {
    if ((a * x) % m === 1) return x;
  }
  throw new Error('Mod inverse not found');
};

const affineEncrypt = (text, key) => {
  const [a, b] = affineParseKey(key);
  let out = '';
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      const base = ch >= 'a' && ch <= 'z' ? 97 : 65;
      const x = ch.charCodeAt(0) - base;
      const y = (a * x + b) % 26;
      out += String.fromCharCode(base + y);
    } else {
      out += ch;
    }
  }
  return out;
};

const affineDecrypt = (text, key) => {
  const [a, b] = affineParseKey(key);
  const invA = modInv(((a % 26) + 26) % 26, 26);
  let out = '';
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      const base = ch >= 'a' && ch <= 'z' ? 97 : 65;
      const y = ch.charCodeAt(0) - base;
      const x = (invA * (y - b + 26)) % 26;
      out += String.fromCharCode(base + x);
    } else {
      out += ch;
    }
  }
  return out;
};

const substitutionMaps = (key) => {
  const letters = normalizeKey(key).toUpperCase().replace(/[^A-Z]/g, '');
  if (letters.length !== 26 || new Set(letters).size !== 26) {
    throw new Error('Substitution key 26 unique letters required');
  }
  const forward = {};
  const backward = {};
  for (let i = 0; i < 26; i += 1) {
    const from = String.fromCharCode(65 + i);
    const to = letters[i];
    forward[from] = to;
    backward[to] = from;
  }
  return { forward, backward };
};

const substitutionEncrypt = (text, key) => {
  const { forward } = substitutionMaps(key);
  let out = '';
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      const mapped = forward[ch.toUpperCase()];
      out += ch >= 'a' && ch <= 'z' ? mapped.toLowerCase() : mapped;
    } else {
      out += ch;
    }
  }
  return out;
};

const substitutionDecrypt = (text, key) => {
  const { backward } = substitutionMaps(key);
  let out = '';
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      const mapped = backward[ch.toUpperCase()];
      out += ch >= 'a' && ch <= 'z' ? mapped.toLowerCase() : mapped;
    } else {
      out += ch;
    }
  }
  return out;
};

const polybiusBuild = (key) => {
  const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
  const keyLetters = [];
  for (const ch of normalizeKey(key).toUpperCase()) {
    if (/[A-Z]/.test(ch)) {
      const c = ch === 'J' ? 'I' : ch;
      if (!keyLetters.includes(c)) keyLetters.push(c);
    }
  }
  for (const ch of alphabet) {
    if (!keyLetters.includes(ch)) keyLetters.push(ch);
  }
  const pos = {};
  keyLetters.forEach((ch, idx) => {
    const row = Math.floor(idx / 5) + 1;
    const col = (idx % 5) + 1;
    pos[ch] = `${row}${col}`;
  });
  return { square: keyLetters, pos };
};

const polybiusEncrypt = (text, key) => {
  const { pos } = polybiusBuild(key);
  const tokens = [];
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      const c = ch.toUpperCase() === 'J' ? 'I' : ch.toUpperCase();
      tokens.push(pos[c]);
    } else if (ch === ' ') {
      tokens.push('/');
    } else {
      tokens.push(ch);
    }
  }
  return tokens.join(' ');
};

const polybiusDecrypt = (text, key) => {
  const { square } = polybiusBuild(key);
  const tokens = text.split(/\s+/).filter((t) => t.length > 0);
  let out = '';
  for (const token of tokens) {
    if (token === '/') {
      out += ' ';
    } else if (/^\d\d$/.test(token)) {
      const row = parseInt(token[0], 10) - 1;
      const col = parseInt(token[1], 10) - 1;
      const idx = row * 5 + col;
      if (idx >= 0 && idx < square.length) out += square[idx];
    } else {
      out += token;
    }
  }
  return out;
};

const pigpenMaps = (() => {
  const symbols = [
    '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
    '-', '+', '=', '{', '}', '[', ']', ':', ';', '<',
    '>', '?', '/', '\\', '|', '~',
  ];
  const forward = {};
  const backward = {};
  for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(65 + i);
    forward[letter] = symbols[i];
    backward[symbols[i]] = letter;
  }
  return { forward, backward };
})();

const pigpenEncrypt = (text) => {
  let out = '';
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      out += pigpenMaps.forward[ch.toUpperCase()];
    } else if (ch === ' ') {
      out += ' ';
    } else {
      out += ch;
    }
  }
  return out;
};

const pigpenDecrypt = (text) => {
  let out = '';
  for (const ch of text) {
    if (pigpenMaps.backward[ch]) {
      out += pigpenMaps.backward[ch];
    } else if (ch === ' ') {
      out += ' ';
    } else {
      out += ch;
    }
  }
  return out;
};

const columnarOrder = (key) => {
  const chars = normalizeKey(key).split('');
  const indexed = chars.map((ch, idx) => [idx, ch]);
  indexed.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0] - b[0]));
  const order = new Array(chars.length).fill(0);
  indexed.forEach(([idx], rank) => {
    order[idx] = rank;
  });
  return order;
};

const columnarEncrypt = (text, key) => {
  const k = normalizeKey(key).replace(/\s+/g, '');
  if (!k) throw new Error('Columnar key required');
  const cols = k.length;
  const rows = Math.ceil(text.length / cols);
  const padded = text.padEnd(rows * cols, 'X');
  const grid = [];
  for (let i = 0; i < padded.length; i += cols) {
    grid.push(padded.slice(i, i + cols));
  }
  const order = columnarOrder(k);
  let out = '';
  for (let oi = 0; oi < cols; oi += 1) {
    const colIdx = order.indexOf(oi);
    for (const row of grid) {
      out += row[colIdx];
    }
  }
  return out;
};

const columnarDecrypt = (text, key) => {
  const k = normalizeKey(key).replace(/\s+/g, '');
  if (!k) throw new Error('Columnar key required');
  const cols = k.length;
  const rows = Math.ceil(text.length / cols);
  const total = rows * cols;
  const padded = text.padEnd(total, 'X');
  const order = columnarOrder(k);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(''));
  let idx = 0;
  for (let oi = 0; oi < cols; oi += 1) {
    const colIdx = order.indexOf(oi);
    for (let r = 0; r < rows; r += 1) {
      grid[r][colIdx] = padded[idx];
      idx += 1;
    }
  }
  return grid.map((row) => row.join('')).join('').replace(/X+$/g, '');
};

const hillParseKey = (key) => {
  const parts = normalizeKey(key).replace(/\s+/g, ',').split(',').filter(Boolean);
  if (![4, 9, 16].includes(parts.length)) {
    throw new Error('Hill key format: 2x2, 3x3, or 4x4 flattened');
  }
  const nums = parts.map((v) => parseInt(v, 10) % 26);
  const size = Math.sqrt(nums.length);
  const matrix = [];
  for (let i = 0; i < size; i += 1) {
    matrix.push(nums.slice(i * size, i * size + size));
  }
  return matrix;
};

const hillPrepare = (text, size) => {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, '').split('');
  while (letters.length % size !== 0) letters.push('X');
  return letters.join('');
};

const hillModInv = (a) => {
  for (let x = 1; x < 26; x += 1) {
    if ((a * x) % 26 === 1) return x;
  }
  throw new Error('Hill inverse not found');
};

const hillMinor = (matrix, row, col) => (
  matrix
    .filter((_, r) => r !== row)
    .map((r) => r.filter((_, c) => c !== col))
);

const hillDet = (matrix) => {
  const size = matrix.length;
  if (size === 1) {
    return matrix[0][0];
  }
  if (size === 2) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }
  let det = 0;
  for (let col = 0; col < size; col += 1) {
    const sign = col % 2 === 0 ? 1 : -1;
    det += sign * matrix[0][col] * hillDet(hillMinor(matrix, 0, col));
  }
  return det;
};

const hillAdjugate = (matrix) => {
  const size = matrix.length;
  const cofactors = [];
  for (let row = 0; row < size; row += 1) {
    const rowC = [];
    for (let col = 0; col < size; col += 1) {
      const sign = (row + col) % 2 === 0 ? 1 : -1;
      rowC.push(sign * hillDet(hillMinor(matrix, row, col)));
    }
    cofactors.push(rowC);
  }
  const adj = [];
  for (let i = 0; i < size; i += 1) {
    const row = [];
    for (let j = 0; j < size; j += 1) {
      row.push(cofactors[j][i]);
    }
    adj.push(row);
  }
  return adj;
};

const hillInverse = (matrix) => {
  const det = ((hillDet(matrix) % 26) + 26) % 26;
  const invDet = hillModInv(det);
  const adj = hillAdjugate(matrix);
  const size = matrix.length;
  const inv = [];
  for (let i = 0; i < size; i += 1) {
    const row = [];
    for (let j = 0; j < size; j += 1) {
      row.push(((adj[i][j] * invDet) % 26 + 26) % 26);
    }
    inv.push(row);
  }
  return inv;
};

const hillProcess = (text, matrix) => {
  const size = matrix.length;
  const prepared = hillPrepare(text, size);
  let out = '';
  for (let i = 0; i < prepared.length; i += size) {
    const vec = [];
    for (let j = 0; j < size; j += 1) {
      vec.push(prepared.charCodeAt(i + j) - 65);
    }
    for (let r = 0; r < size; r += 1) {
      let val = 0;
      for (let c = 0; c < size; c += 1) {
        val += matrix[r][c] * vec[c];
      }
      out += String.fromCharCode(65 + (val % 26));
    }
  }
  return out;
};

const hillEncrypt = (text, key) => {
  const matrix = hillParseKey(key);
  return hillProcess(text, matrix);
};

const hillDecrypt = (text, key) => {
  const matrix = hillParseKey(key);
  const inv = hillInverse(matrix);
  return hillProcess(text, inv);
};

const aesEncrypt = (text, key) => {
  const hashHex = CryptoJS.SHA256(normalizeKey(key)).toString(CryptoJS.enc.Hex);
  const keyHex = hashHex.slice(0, 32);
  const ivHex = hashHex.slice(32, 64);
  const keyWord = CryptoJS.enc.Hex.parse(keyHex);
  const ivWord = CryptoJS.enc.Hex.parse(ivHex);
  return CryptoJS.AES.encrypt(text, keyWord, { iv: ivWord, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
};

const aesDecrypt = (text, key) => {
  const hashHex = CryptoJS.SHA256(normalizeKey(key)).toString(CryptoJS.enc.Hex);
  const keyHex = hashHex.slice(0, 32);
  const ivHex = hashHex.slice(32, 64);
  const keyWord = CryptoJS.enc.Hex.parse(keyHex);
  const ivWord = CryptoJS.enc.Hex.parse(ivHex);
  return CryptoJS.AES.decrypt(text, keyWord, { iv: ivWord, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString(CryptoJS.enc.Utf8);
};

const desEncrypt = (text, key) => {
  const hashHex = CryptoJS.SHA256(normalizeKey(key)).toString(CryptoJS.enc.Hex);
  const keyHex = hashHex.slice(0, 16);
  const ivHex = hashHex.slice(16, 32);
  const keyWord = CryptoJS.enc.Hex.parse(keyHex);
  const ivWord = CryptoJS.enc.Hex.parse(ivHex);
  return CryptoJS.DES.encrypt(text, keyWord, { iv: ivWord, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
};

const desDecrypt = (text, key) => {
  const hashHex = CryptoJS.SHA256(normalizeKey(key)).toString(CryptoJS.enc.Hex);
  const keyHex = hashHex.slice(0, 16);
  const ivHex = hashHex.slice(16, 32);
  const keyWord = CryptoJS.enc.Hex.parse(keyHex);
  const ivWord = CryptoJS.enc.Hex.parse(ivHex);
  return CryptoJS.DES.decrypt(text, keyWord, { iv: ivWord, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString(CryptoJS.enc.Utf8);
};

const wordArrayFromBytes = (bytes) => CryptoJS.lib.WordArray.create(bytes);

const bytesFromWordArray = (wordArray) => {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const bytes = [];
  for (let i = 0; i < sigBytes; i += 1) {
    const word = words[Math.floor(i / 4)];
    const byte = (word >> (24 - (i % 4) * 8)) & 0xFF;
    bytes.push(byte);
  }
  return bytes;
};

const prngBytes = (seedBytes, length) => {
  let out = [];
  let counter = 0;
  while (out.length < length) {
    const counterBytes = [
      (counter >> 24) & 0xFF,
      (counter >> 16) & 0xFF,
      (counter >> 8) & 0xFF,
      counter & 0xFF,
    ];
    const wa = wordArrayFromBytes(seedBytes.concat(counterBytes));
    const digest = CryptoJS.SHA256(wa);
    out = out.concat(bytesFromWordArray(digest));
    counter += 1;
  }
  return out.slice(0, length);
};

const generateSBoxes = (key) => {
  const seed = bytesFromWordArray(CryptoJS.SHA256(normalizeKey(key)));
  const sbox = Array.from({ length: 256 }, (_, i) => i);
  const rand = prngBytes(seed, 256);
  let idx = 0;
  for (let i = 255; i > 0; i -= 1) {
    const j = rand[idx] % (i + 1);
    idx += 1;
    const temp = sbox[i];
    sbox[i] = sbox[j];
    sbox[j] = temp;
  }
  const inv = new Array(256);
  for (let i = 0; i < 256; i += 1) {
    inv[sbox[i]] = i;
  }
  return { sbox, inv, seed };
};

const padBytes = (bytes, blockSize) => {
  const pad = blockSize - (bytes.length % blockSize);
  return bytes.concat(Array(pad).fill(pad));
};

const unpadBytes = (bytes) => {
  const pad = bytes[bytes.length - 1];
  return bytes.slice(0, bytes.length - pad);
};

const bytesToMatrix = (bytes) => {
  const matrix = [];
  for (let i = 0; i < 16; i += 4) {
    matrix.push(bytes.slice(i, i + 4));
  }
  return matrix;
};

const matrixToBytes = (matrix) => {
  const bytes = [];
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      bytes.push(matrix[i][j]);
    }
  }
  return bytes;
};

const addRoundKey = (state, roundKey) => {
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      state[r][c] ^= roundKey[r][c];
    }
  }
};

const subBytes = (state, sbox) => {
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      state[r][c] = sbox[state[r][c]];
    }
  }
};

const invSubBytes = (state, inv) => {
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      state[r][c] = inv[state[r][c]];
    }
  }
};

const shiftRows = (state) => {
  state[1] = state[1].slice(1).concat(state[1].slice(0, 1));
  state[2] = state[2].slice(2).concat(state[2].slice(0, 2));
  state[3] = state[3].slice(3).concat(state[3].slice(0, 3));
};

const invShiftRows = (state) => {
  state[1] = state[1].slice(-1).concat(state[1].slice(0, -1));
  state[2] = state[2].slice(-2).concat(state[2].slice(0, -2));
  state[3] = state[3].slice(-3).concat(state[3].slice(0, -3));
};

const gmul = (a, b) => {
  let p = 0;
  let aa = a;
  let bb = b;
  for (let i = 0; i < 8; i += 1) {
    if (bb & 1) {
      p ^= aa;
    }
    const hi = aa & 0x80;
    aa = (aa << 1) & 0xFF;
    if (hi) {
      aa ^= 0x1B;
    }
    bb >>= 1;
  }
  return p;
};

const mixColumns = (state) => {
  for (let c = 0; c < 4; c += 1) {
    const a0 = state[0][c];
    const a1 = state[1][c];
    const a2 = state[2][c];
    const a3 = state[3][c];
    state[0][c] = gmul(a0, 2) ^ gmul(a1, 3) ^ a2 ^ a3;
    state[1][c] = a0 ^ gmul(a1, 2) ^ gmul(a2, 3) ^ a3;
    state[2][c] = a0 ^ a1 ^ gmul(a2, 2) ^ gmul(a3, 3);
    state[3][c] = gmul(a0, 3) ^ a1 ^ a2 ^ gmul(a3, 2);
  }
};

const invMixColumns = (state) => {
  for (let c = 0; c < 4; c += 1) {
    const a0 = state[0][c];
    const a1 = state[1][c];
    const a2 = state[2][c];
    const a3 = state[3][c];
    state[0][c] = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9);
    state[1][c] = gmul(a0, 9) ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13);
    state[2][c] = gmul(a0, 13) ^ gmul(a1, 9) ^ gmul(a2, 14) ^ gmul(a3, 11);
    state[3][c] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9) ^ gmul(a3, 14);
  }
};

const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1B,0x36];

const expandKey = (keyBytes, sbox) => {
  const nk = 4;
  const nb = 4;
  const nr = 10;
  const keyColumns = [];
  for (let i = 0; i < 16; i += 4) {
    keyColumns.push(keyBytes.slice(i, i + 4));
  }
  let i = nk;
  while (keyColumns.length < nb * (nr + 1)) {
    let temp = keyColumns[keyColumns.length - 1].slice();
    if (i % nk === 0) {
      temp = temp.slice(1).concat(temp.slice(0, 1));
      temp = temp.map((b) => sbox[b]);
      temp[0] ^= RCON[(i / nk) - 1];
    }
    const prev = keyColumns[keyColumns.length - nk];
    const next = temp.map((b, idx) => b ^ prev[idx]);
    keyColumns.push(next);
    i += 1;
  }
  const roundKeys = [];
  for (let r = 0; r < nr + 1; r += 1) {
    roundKeys.push(keyColumns.slice(r * 4, (r + 1) * 4));
  }
  return roundKeys;
};

const encryptBlock = (blockBytes, roundKeys, sbox) => {
  const state = bytesToMatrix(blockBytes);
  addRoundKey(state, roundKeys[0]);
  for (let rnd = 1; rnd <= 9; rnd += 1) {
    subBytes(state, sbox);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, roundKeys[rnd]);
  }
  subBytes(state, sbox);
  shiftRows(state);
  addRoundKey(state, roundKeys[10]);
  return matrixToBytes(state);
};

const decryptBlock = (blockBytes, roundKeys, invSbox) => {
  const state = bytesToMatrix(blockBytes);
  addRoundKey(state, roundKeys[10]);
  invShiftRows(state);
  invSubBytes(state, invSbox);
  for (let rnd = 9; rnd >= 1; rnd -= 1) {
    addRoundKey(state, roundKeys[rnd]);
    invMixColumns(state);
    invShiftRows(state);
    invSubBytes(state, invSbox);
  }
  addRoundKey(state, roundKeys[0]);
  return matrixToBytes(state);
};

const aesManualEncrypt = (text, key) => {
  const { sbox, seed } = generateSBoxes(key);
  const keyBytes = seed.slice(0, 16);
  const ivBytes = seed.slice(16, 32);
  const roundKeys = expandKey(keyBytes, sbox);
  const plainBytes = padBytes(Array.from(new TextEncoder().encode(text)), 16);
  let iv = ivBytes.slice();
  let out = [];
  for (let i = 0; i < plainBytes.length; i += 16) {
    const block = plainBytes.slice(i, i + 16).map((b, idx) => b ^ iv[idx]);
    const enc = encryptBlock(block, roundKeys, sbox);
    out = out.concat(enc);
    iv = enc.slice();
  }
  return CryptoJS.enc.Base64.stringify(wordArrayFromBytes(out));
};

const aesManualDecrypt = (text, key) => {
  const { sbox, inv, seed } = generateSBoxes(key);
  const keyBytes = seed.slice(0, 16);
  const ivBytes = seed.slice(16, 32);
  const roundKeys = expandKey(keyBytes, sbox);
  const rawBytes = bytesFromWordArray(CryptoJS.enc.Base64.parse(text));
  let iv = ivBytes.slice();
  let out = [];
  for (let i = 0; i < rawBytes.length; i += 16) {
    const block = rawBytes.slice(i, i + 16);
    const dec = decryptBlock(block, roundKeys, inv).map((b, idx) => b ^ iv[idx]);
    out = out.concat(dec);
    iv = block.slice();
  }
  return new TextDecoder().decode(new Uint8Array(unpadBytes(out)));
};

const hashEncrypt = (text) => CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);

export const encryptLocal = (cipherType, text, key, mode) => {
  switch ((cipherType || '').toLowerCase()) {
    case 'caesar':
      return caesarEncrypt(text, key);
    case 'vigenere':
      return vigenereEncrypt(text, key);
    case 'railfence':
      return railFenceEncrypt(text, key);
    case 'playfair':
      return playfairEncrypt(text, key);
    case 'route':
      return routeEncrypt(text, key);
    case 'hash':
      return hashEncrypt(text);
    case 'affine':
      return affineEncrypt(text, key);
    case 'substitution':
      return substitutionEncrypt(text, key);
    case 'polybius':
      return polybiusEncrypt(text, key);
    case 'pigpen':
      return pigpenEncrypt(text);
    case 'columnar':
    case 'columnar_transposition':
      return columnarEncrypt(text, key);
    case 'hill':
      return hillEncrypt(text, key);
    case 'aes':
      return aesEncrypt(text, key);
    case 'aes_manual':
      return aesManualEncrypt(text, key);
    case 'des_lib':
    case 'des_manual':
      return desEncrypt(text, key);
    default:
      throw new Error('Unsupported cipher type for local encryption');
  }
};

export const decryptLocal = (cipherType, text, key, mode) => {
  switch ((cipherType || '').toLowerCase()) {
    case 'caesar':
      return caesarDecrypt(text, key);
    case 'vigenere':
      return vigenereDecrypt(text, key);
    case 'railfence':
      return railFenceDecrypt(text, key);
    case 'playfair':
      return playfairDecrypt(text, key);
    case 'route':
      return routeDecrypt(text, key);
    case 'hash':
      return 'Hash cozulemez.';
    case 'affine':
      return affineDecrypt(text, key);
    case 'substitution':
      return substitutionDecrypt(text, key);
    case 'polybius':
      return polybiusDecrypt(text, key);
    case 'pigpen':
      return pigpenDecrypt(text);
    case 'columnar':
    case 'columnar_transposition':
      return columnarDecrypt(text, key);
    case 'hill':
      return hillDecrypt(text, key);
    case 'aes':
      return aesDecrypt(text, key);
    case 'aes_manual':
      return aesManualDecrypt(text, key);
    case 'des_lib':
    case 'des_manual':
      return desDecrypt(text, key);
    default:
      throw new Error('Unsupported cipher type for local decryption');
  }
};
