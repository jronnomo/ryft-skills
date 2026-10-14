// Run with: node --test test/cut.test.mjs  (needs ffmpeg and Playwright + Chromium)
import test from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cut, checkTimeline, countFlashes } from "../.claude/skills/ryft-trailer/scripts/cut.mjs";
import { Score } from "../.claude/skills/ryft-trailer/scripts/trailer-audio.mjs";

test("checkTimeline rejects gaps, odd frame counts and wrong lengths", () => {
  const ok = { LENGTH: 2, SHOTS: [{ at: 0, dur: 1, kind: "black" }, { at: 1, dur: 1, kind: "black" }] };
  checkTimeline(ok);
  assert.throws(() => checkTimeline({ ...ok, SHOTS: [{ at: 0, dur: 1, kind: "black" }, { at: 1.5, dur: 0.5, kind: "black" }] }), /gap or overlap/);
  assert.throws(() => checkTimeline({ LENGTH: 1.01, SHOTS: [{ at: 0, dur: 1.01, kind: "black" }] }), /whole number of frames/);
  assert.throws(() => checkTimeline({ ...ok, LENGTH: 3 }), /LENGTH/);
});

test("countFlashes counts a flash (rise and fall) once, not every fade step", () => {
  const y = Array(60).fill(20);
  [200, 160, 120, 80, 40].forEach((v, i) => (y[10 + i] = v)); // one flash with a 5-step fade
  assert.deepStrictEqual(countFlashes(y).flashes.length, 1);
  const strobe = Array(60).fill(20).map((v, i) => (i % 6 < 2 ? 220 : 20)); // 5 flashes per second
  assert.ok(countFlashes(strobe).worstPerSecond >= 4);
});

test("cut renders a timeline with cards, an end card and music, and passes QC", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-cut-test-"));
  const clip = path.join(dir, "clip.mp4"), still = path.join(dir, "still.png");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:duration=6", "-pix_fmt", "yuv420p", clip]);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=3840x2160:rate=1", "-frames:v", "1", still]);
  fs.writeFileSync(path.join(dir, "timeline.mjs"), `
export const LENGTH = 4;
export const SHOTS = [
  { at: 0, dur: 1, kind: "video", src: ${JSON.stringify(clip)}, in: 1, crop: { x: 120, y: 100, w: 1280, h: 720 } },
  { at: 1, dur: 1, kind: "still", src: ${JSON.stringify(still)}, push: [1, 1.1] },
  { at: 2, dur: 0.5, kind: "black" },
  { at: 2.5, dur: 1.5, kind: "video", src: ${JSON.stringify(clip)}, in: 3, dim: 0.7, blur: 12 },
];
export const CARDS = [{ in: 1.05, out: 1.95, lines: ["Every card wears."] }];
export const END = { in: 2.6, title: "TEST GAME", cta: "Play free on Ryft", link: "ryft.fun/games/test" };
export const FLASHES = [1.0];
`);
  const s = new Score({ seconds: 4 });
  s.organ(0, 2, [50, 57, 62]); s.drum(0); s.drum(1); s.boom(2.5); s.silence(2.0, 2.45);
  const music = s.write(path.join(dir, "music.wav"));
  const out = path.join(dir, "out.mp4");
  const report = await cut(path.join(dir, "timeline.mjs"), out, { music, work: path.join(dir, "work") });
  assert.deepStrictEqual(report.problems, [], JSON.stringify(report));
  assert.strictEqual(report.frames, 120);
  assert.strictEqual(report.flashes.length, 1);
  // The card panel is drawn: the centre of the overlay at 1.5 s isn't transparent.
  const px = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path.join(dir, "work", "ov", "00045.png"), "-vf", "crop=1:1:960:540", "-f", "rawvideo", "-pix_fmt", "rgba", "-"]);
  assert.ok(px[3] > 200, `overlay alpha at centre: ${px[3]}`);
  fs.rmSync(dir, { recursive: true });
});
