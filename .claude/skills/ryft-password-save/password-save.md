# Password save system

Use this exact JavaScript to create and read save codes. No browser storage.
The prompt gives the gameId and fields for createPasswordSystem().

## How it should behave
- Show the code from encode(state) on each level's intro card (large, 4s) and on the pause screen.
- Title screen: add "Continue". It opens code entry; on touch devices show on-screen letter buttons
  using only these symbols: ABCDEFGHJKLMNPQRSTUVWXYZ23456789.
- On submit call decode(code). An object means start that level with those values.
  null means shake the box and show "That code doesn't work". Never crash.
- Codes restore to the start of the saved level.

## Code
```js
(function (root) {
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CHECK_BITS = 10n;
const VERSION_BITS = 3n;
function bitsFor(max) {
let bits = 0n;
while ((1n << bits) <= BigInt(max)) bits++;
return bits || 1n;
}
function hash(str) {
let h = 0x811c9dc5;
for (let i = 0; i < str.length; i++) {
h ^= str.charCodeAt(i);
h = Math.imul(h, 0x01000193) >>> 0;
}
return h;
}
function mask(seed, bits) {
let x = seed || 1;
let out = 0n;
for (let produced = 0n; produced < bits; produced += 32n) {
x ^= x << 13; x >>>= 0;
x ^= x >>> 17;
x ^= x << 5; x >>>= 0;
out = (out << 32n) | BigInt(x);
}
return out & ((1n << bits) - 1n);
}
function createPasswordSystem({ gameId, fields, version = 0 }) {
if (!gameId) throw new Error("gameId is required");
if (!fields || !fields.length) throw new Error("fields are required");
if (version < 0 || version > 7) throw new Error("version must be 0..7");
const layout = fields.map((f) => ({ name: f.name, max: f.max, bits: bitsFor(f.max) }));
const dataBits = VERSION_BITS + layout.reduce((n, f) => n + f.bits, 0n);
const totalBits = dataBits + CHECK_BITS;
const length = Number((totalBits + 4n) / 5n);
const salt = hash(gameId);
function checksum(data) {
return BigInt(hash(salt + ":" + data.toString(36))) & ((1n << CHECK_BITS) - 1n);
}
function encode(state) {
let data = BigInt(version);
for (const f of layout) {
const v = state[f.name] === true ? 1 : state[f.name] === false ? 0 : state[f.name] ?? 0;
if (!Number.isInteger(v) || v < 0 || v > f.max) {
throw new Error(`${f.name} must be an integer 0..${f.max}, got ${state[f.name]}`);
}
data = (data << f.bits) | BigInt(v);
}
const check = checksum(data);
const scrambled = data ^ mask(Number(check) ^ salt, dataBits);
let n = (scrambled << CHECK_BITS) | check;
let code = "";
for (let i = 0; i < length; i++) {
code = ALPHABET[Number(n & 31n)] + code;
n >>= 5n;
}
return code.match(/.{1,4}/g).join("-");
}
function decode(input) {
const clean = String(input).toUpperCase().replace(/[\s-]/g, "");
if (clean.length !== length) return null;
let n = 0n;
for (const ch of clean) {
const idx = ALPHABET.indexOf(ch);
if (idx < 0) return null;
n = (n << 5n) | BigInt(idx);
}
if (n >> totalBits) return null;
const check = n & ((1n << CHECK_BITS) - 1n);
const data = (n >> CHECK_BITS) ^ mask(Number(check) ^ salt, dataBits);
if (checksum(data) !== check) return null;
const values = [];
let rest = data;
for (let i = layout.length - 1; i >= 0; i--) {
const f = layout[i];
const v = Number(rest & ((1n << f.bits) - 1n));
if (v > f.max) return null;
values[i] = v;
rest >>= f.bits;
}
if (Number(rest) !== version) return null;
return Object.fromEntries(layout.map((f, i) => [f.name, values[i]]));
}
return { encode, decode, length, bits: Number(totalBits) };
}
root.createPasswordSystem = createPasswordSystem;
if (typeof module !== "undefined") module.exports = { createPasswordSystem };
})(typeof window !== "undefined" ? window : globalThis);
```
