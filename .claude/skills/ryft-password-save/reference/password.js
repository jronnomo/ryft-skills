/*
 * Retro password save system for browser games — no storage, no server.
 *
 * The game's progress is packed into bits, protected with a checksum,
 * scrambled so neighbouring states don't look alike, and printed as a short
 * code like "K7QM-2HXA-9PDT". Typing the code back restores the exact state.
 *
 * Usage:
 *   const pw = createPasswordSystem({
 *     gameId: "my-game",               // codes from other games are rejected
 *     fields: [
 *       { name: "level", max: 31 },    // 0..31
 *       { name: "lives", max: 7 },
 *       { name: "hasKey", max: 1 },    // booleans are max: 1
 *     ],
 *   });
 *   const code = pw.encode({ level: 4, lives: 3, hasKey: 1 });
 *   const state = pw.decode(code);     // => { level: 4, lives: 3, hasKey: 1 } or null
 *
 * Changing the field list changes the code format. Bump `version` when you do,
 * so old codes are rejected cleanly instead of decoding into garbage.
 */
(function (root) {
  // 32 symbols, no I or O, no 0 or 1 — nothing a player can misread.
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const CHECK_BITS = 10n;
  const VERSION_BITS = 3n;

  function bitsFor(max) {
    let bits = 0n;
    while ((1n << bits) <= BigInt(max)) bits++;
    return bits || 1n;
  }

  // FNV-1a over a string, 32-bit.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  // Deterministic mask of `bits` length derived from a seed (xorshift32).
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
    const length = Number((totalBits + 4n) / 5n); // 5 bits per symbol
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
      if (n >> totalBits) return null; // padding bits must be zero

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
