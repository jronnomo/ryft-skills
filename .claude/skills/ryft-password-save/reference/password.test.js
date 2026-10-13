// Run with: node --test .claude/skills/ryft-password-save/reference/password.test.js
const assert = require("node:assert");
const vm = require("node:vm");
const path = require("node:path");

// Every test runs against the readable source and the compact upload version.
const implementations = { source: require("./password.js").createPasswordSystem };
try {
  const { code } = require(path.join(__dirname, "../../../../scripts/build-uploads.js"));
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(code, sandbox);
  const create = sandbox.module.exports.createPasswordSystem;
  // Copy decoded objects out of the sandbox so deepStrictEqual sees this realm's Object prototype.
  implementations.upload = (opts) => {
    const pw = create(opts);
    return { ...pw, decode: (c) => { const s = pw.decode(c); return s && { ...s }; } };
  };
} catch {
  // Installed as a standalone skill: the build script isn't present.
}

for (const [impl, createPasswordSystem] of Object.entries(implementations)) {
const test = (name, fn) => require("node:test")(`[${impl}] ${name}`, fn);

const fields = [
  { name: "level", max: 31 },
  { name: "lives", max: 7 },
  { name: "hasKey", max: 1 },
  { name: "coins", max: 999 },
];
const pw = createPasswordSystem({ gameId: "test-game", fields });

test("round-trips every level and lives combination", () => {
  for (let level = 0; level <= 31; level++) {
    for (let lives = 0; lives <= 7; lives++) {
      const state = { level, lives, hasKey: level % 2, coins: level * 31 };
      assert.deepStrictEqual(pw.decode(pw.encode(state)), state);
    }
  }
});

test("codes are short, grouped, and use only unambiguous symbols", () => {
  const code = pw.encode({ level: 12, lives: 3, hasKey: 1, coins: 450 });
  assert.match(code, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{1,4})*$/);
  assert.strictEqual(code.replace(/-/g, "").length, pw.length);
});

test("accepts lowercase, spaces, and missing dashes", () => {
  const state = { level: 5, lives: 2, hasKey: 0, coins: 7 };
  const code = pw.encode(state);
  assert.deepStrictEqual(pw.decode(code.toLowerCase().replace(/-/g, " ")), state);
});

test("rejects codes with a single mistyped character", () => {
  const code = pw.encode({ level: 9, lives: 4, hasKey: 1, coins: 120 }).replace(/-/g, "");
  let accepted = 0;
  for (let i = 0; i < code.length; i++) {
    for (const ch of "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
      if (ch === code[i]) continue;
      if (pw.decode(code.slice(0, i) + ch + code.slice(i + 1))) accepted++;
    }
  }
  // 10-bit checksum: roughly 1 in 1024 random edits slip through.
  assert.ok(accepted < 5, `${accepted} single-character typos were accepted`);
});

test("neighbouring states produce very different codes", () => {
  const a = pw.encode({ level: 1, lives: 3, hasKey: 0, coins: 0 });
  const b = pw.encode({ level: 2, lives: 3, hasKey: 0, coins: 0 });
  const same = [...a].filter((ch, i) => ch === b[i] && ch !== "-").length;
  assert.ok(same < pw.length / 2, `${a} vs ${b}`);
});

test("rejects codes from another game or another version", () => {
  const state = { level: 3, lives: 3, hasKey: 0, coins: 10 };
  const other = createPasswordSystem({ gameId: "other-game", fields });
  const v1 = createPasswordSystem({ gameId: "test-game", fields, version: 1 });
  assert.strictEqual(pw.decode(other.encode(state)), null);
  assert.strictEqual(pw.decode(v1.encode(state)), null);
});

test("rejects garbage", () => {
  for (const bad of ["", "HELLO", "0000-0000-00", "IIII-OOOO-11", "ZZZZ-ZZZZ-ZZZZ-ZZZZ"]) {
    assert.strictEqual(pw.decode(bad), null, bad);
  }
});

test("refuses to encode out-of-range values", () => {
  assert.throws(() => pw.encode({ level: 32, lives: 1, hasKey: 0, coins: 0 }));
  assert.throws(() => pw.encode({ level: -1, lives: 1, hasKey: 0, coins: 0 }));
  assert.throws(() => pw.encode({ level: 1.5, lives: 1, hasKey: 0, coins: 0 }));
});

test("booleans encode as 0/1", () => {
  const code = pw.encode({ level: 1, lives: 1, hasKey: true, coins: 0 });
  assert.strictEqual(pw.decode(code).hasKey, 1);
});
}
