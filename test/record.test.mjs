// Run with: node --test test/record.test.mjs  (needs Playwright + Chromium and ffmpeg)
import test from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSteps } from "../.claude/skills/ryft-trailer/scripts/record.mjs";

test("parses step scripts", () => {
  assert.deepStrictEqual(parseSteps("wait 1\nclick\nclick 10 20\npress Space # start\nhold ArrowRight+Space 0.5\ntype b3pm\nsnap title"), [
    { op: "wait", seconds: 1 },
    { op: "click" },
    { op: "click", x: 10, y: 20 },
    { op: "press", key: "Space" },
    { op: "hold", keys: ["ArrowRight", "Space"], seconds: 0.5 },
    { op: "type", text: "b3pm" },
    { op: "snap", name: "title" },
  ]);
  assert.throws(() => parseSteps("jump"), /unknown step/);
  assert.throws(() => parseSteps("press"), /needs an argument/);
  assert.throws(() => parseSteps("wait soon"), /not a number/);
});

test("records a game responding to scripted input", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-record-test-"));
  const steps = path.join(dir, "steps.txt");
  fs.writeFileSync(steps, "wait 0.5\nsnap title\nclick\npress Space\nhold ArrowRight 1.5\nsnap moved\nwait 0.5\n");
  const out = path.join(dir, "run.mp4");
  execFileSync("node", [".claude/skills/ryft-trailer/scripts/record.mjs", "test/fixtures/tiny-game.html", steps, out, "--size", "640x360"]);

  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", out]));
  assert.ok(seconds > 2 && seconds < 8, `video is ${seconds}s`);
  const title = fs.readFileSync(path.join(dir, "run-title.png"));
  const moved = fs.readFileSync(path.join(dir, "run-moved.png"));
  assert.ok(!title.equals(moved), "the game didn't react to input");
  fs.rmSync(dir, { recursive: true });
});

test("--audio records the game's sound in sync with the picture", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-sync-test-"));
  const steps = path.join(dir, "steps.txt");
  fs.writeFileSync(steps, "wait 1\nclick\npress Space\nwait 1.5\npress Space\nwait 1.5\npress Space\nwait 1\n");
  const out = path.join(dir, "sync.mp4");
  execFileSync("node", [".claude/skills/ryft-trailer/scripts/record.mjs", "test/fixtures/sync-game.html", steps, out, "--size", "320x180", "--audio"]);

  // Flash onsets: frames where brightness jumps.
  const flashes = [];
  const log = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i '${out}' -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1`]).toString();
  const times = [...log.matchAll(/pts_time:([\d.]+)[\s\S]*?YAVG=([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  times.forEach(([t, y], i) => { if (y > 100 && (i === 0 || times[i - 1][1] <= 100)) flashes.push(t); });
  flashes.shift(); // the recorder's own clapperboard flash at the start

  // Beep onsets: 10ms windows where the level jumps.
  const alog = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i '${out}' -af "aresample=44100,asetnsamples=n=441,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null - 2>&1`]).toString();
  const levels = [...alog.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -200 : Number(m[1])));
  const beeps = [];
  levels.forEach((l, i) => { if (l > -30 && (i === 0 || levels[i - 1] <= -30)) beeps.push(i * 0.01); });

  assert.strictEqual(flashes.length, 3, `flashes at ${flashes}`);
  assert.strictEqual(beeps.length, 3, `beeps at ${beeps}`);
  flashes.forEach((f, i) => assert.ok(Math.abs(f - beeps[i]) < 0.07, `flash ${f}s vs beep ${beeps[i]}s`));
  fs.rmSync(dir, { recursive: true });
});
