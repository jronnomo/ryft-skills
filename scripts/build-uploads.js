// Regenerates upload-ready files from their readable sources.
//   node scripts/build-uploads.js          write files
//   node scripts/build-uploads.js --check  fail if files are out of date
const fs = require("node:fs");
const path = require("node:path");

const skills = path.join(__dirname, "..", ".claude", "skills");
const src = path.join(skills, "ryft-password-save", "reference", "password.js");
const out = path.join(skills, "ryft-password-save", "password-save.md");

function compact(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
    .replace(/\s+\/\/ .*$/gm, "")        // trailing "// comments"
    .replace(/^\s*\/\/.*$/gm, "")        // whole-line comments
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

const code = compact(fs.readFileSync(src, "utf8"));

const md = `# Password save system

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
\`\`\`js
${code}
\`\`\`
`;

module.exports = { compact, code, md };

if (require.main === module) {
  const bytes = Buffer.byteLength(md);
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
    if (current !== md) {
      console.error("password-save.md is out of date. Run: node scripts/build-uploads.js");
      process.exit(1);
    }
  } else {
    fs.writeFileSync(out, md);
  }
  console.log(`password-save.md: ${bytes} bytes`);
}
