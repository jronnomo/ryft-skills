#!/usr/bin/env node
// Measures one Ryft prompt: the typed text plus every .md uploaded with it.
// Ryft once capped prompts at 8192 bytes; that may have been lifted (see
// ryft-platform.md). Use this when a prompt gets rejected or truncated.
//
//   node budget.js prompt.txt design-brief.md art-bible.md
//   echo "my prompt" | node budget.js --limit 8192 - design-brief.md
//
// PNGs are listed but not counted. Exits 1 if over --limit (default 8192).
const fs = require("node:fs");

const args = process.argv.slice(2);
const at = args.indexOf("--limit");
const LIMIT = at >= 0 ? Number(args.splice(at, 2)[1]) : 8192;
const WARN = 0.9;
const files = args;

if (!files.length || !(LIMIT > 0)) {
  console.log("Usage: node budget.js [--limit bytes] <prompt.txt | -> [upload.md ...]");
  process.exit(2);
}

let total = 0;
for (const f of files) {
  if (/\.(png|jpe?g|gif|webp)$/i.test(f)) {
    console.log(`${"image".padStart(7)}  ${f} (not counted)`);
    continue;
  }
  const text = fs.readFileSync(f === "-" ? 0 : f, "utf8");
  const bytes = Buffer.byteLength(text);
  const wide = [...text].filter((c) => Buffer.byteLength(c) > 1).length;
  total += bytes;
  console.log(`${String(bytes).padStart(7)}  ${f === "-" ? "(prompt from stdin)" : f}` +
    (wide ? `  [${wide} non-ASCII chars cost extra bytes]` : ""));
}

const pct = Math.round((total / LIMIT) * 100);
console.log(`${String(total).padStart(7)}  TOTAL of ${LIMIT} (${pct}%)`);

if (total > LIMIT) {
  console.log(`OVER by ${total - LIMIT} bytes. Split into two prompts or trim the uploads.`);
  process.exit(1);
} else if (total > LIMIT * WARN) {
  console.log("Close to the limit. Leave room for a follow-up sentence.");
}
