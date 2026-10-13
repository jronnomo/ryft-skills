// Run with: node --test test/footage.test.mjs  (needs ffmpeg)
import test from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCuts, toSeconds } from "../.claude/skills/ryft-trailer/scripts/footage.mjs";

const script = path.resolve(".claude/skills/ryft-trailer/scripts/footage.mjs");
const run = (...args) => execFileSync("node", [script, ...args]).toString();
const probe = (file, entry) => execFileSync("ffprobe", ["-v", "error", "-show_entries", entry,
  "-of", "default=nw=1:nk=1", file]).toString().trim();

test("parses times and cut lists", () => {
  assert.strictEqual(toSeconds("75"), 75);
  assert.strictEqual(toSeconds("1:15.5"), 75.5);
  assert.strictEqual(toSeconds("0:01:15"), 75);
  assert.deepStrictEqual(parseCuts("# shots\n0:02-0:04 first-jump\n\n0:10 - 0:13.5 boss # nice\n"), [
    { start: 2, end: 4, name: "first-jump" },
    { start: 10, end: 13.5, name: "boss" },
  ]);
  assert.throws(() => parseCuts("0:05-0:03 backwards"), /end must be after start/);
  assert.throws(() => parseCuts("first jump at 5s"), /expected/);
});

test("sheet, cut and gif produce usable files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-footage-"));
  const rec = path.join(dir, "recording.mov");
  // 12s fake gameplay: odd width (like a cropped screen grab), 60fps, with audio.
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=641x361:rate=60:duration=12",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=12", "-c:v", "libx264", "-pix_fmt", "yuv444p", "-c:a", "aac", rec]);

  run("sheet", rec, path.join(dir, "sheet.jpg"), "--every", "2");
  assert.ok(fs.statSync(path.join(dir, "sheet.jpg")).size > 1000);

  fs.writeFileSync(path.join(dir, "cuts.txt"), "0:01-0:03.5 first-jump\n0:09-0:20 finale  # runs past the end\n");
  run("cut", rec, path.join(dir, "cuts.txt"), path.join(dir, "out"));
  const clip = path.join(dir, "out/clips/01-first-jump.mp4");
  assert.ok(Math.abs(Number(probe(clip, "format=duration")) - 2.5) < 0.15);
  assert.strictEqual(probe(clip, "stream=r_frame_rate").split("\n")[0], "30/1");
  assert.match(probe(clip, "stream=pix_fmt"), /yuv420p/);
  assert.match(probe(clip, "stream=codec_type"), /audio/);
  assert.ok(Math.abs(Number(probe(path.join(dir, "out/clips/02-finale.mp4"), "format=duration")) - 3) < 0.15);
  assert.ok(fs.existsSync(path.join(dir, "out/stills/02-finale.jpg")));

  run("gif", clip, path.join(dir, "preview.gif"), "--width", "320", "--seconds", "2");
  assert.strictEqual(fs.readFileSync(path.join(dir, "preview.gif")).subarray(0, 3).toString(), "GIF");

  fs.rmSync(dir, { recursive: true });
});
