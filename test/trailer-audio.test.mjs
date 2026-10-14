// Run with: node --test test/trailer-audio.test.mjs  (needs ffmpeg)
import test from "node:test";
import assert from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Score } from "../.claude/skills/ryft-trailer/scripts/trailer-audio.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-audio-test-"));
const levelAt = (file, t, d = 0.2) => {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(t), "-t", String(d), "-i", file, "-af", "volumedetect", "-f", "null", "-"]).stderr.toString();
  const m = log.match(/mean_volume: (-?[\d.]+|-inf)/);
  return !m || m[1] === "-inf" ? -200 : Number(m[1]);
};

test("a full score renders at delivery loudness with real silence where asked", () => {
  const s = new Score({ seconds: 8, bpm: 120 });
  s.organ(0, 3, [50, 57, 62]); s.choir(0, 3, [50, 57]); s.strings(0, 3, [62, 69], 0.02, { tremolo: 12 });
  s.bell(0.5, 62); s.pluck(1, 74); s.bass(1, 38);
  for (let b = 0; b < 3; b += 0.5) { s.drum(b); s.hat(b + 0.25); }
  s.kick(1); s.snare(1.5); s.tick(2); s.heartbeat(2.5);
  s.riser(2, 1.5); s.braam(3.5, 1.5, 38); s.boom(3.5); s.impact(3.5); s.whoosh(3.5); s.scrape(5); s.subDrop(5.5);
  s.duck(3.5, { depth: 0.6 });
  s.silence(6.0, 6.8);
  const out = s.write(path.join(dir, "score.wav"));

  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=sample_rate,channels:format=duration", "-of", "csv=p=0", out]).toString();
  assert.match(probe, /48000,2/);
  const r128 = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.toString().split("Summary:")[1];
  const lufs = Number(r128.match(/I:\s+(-?[\d.]+) LUFS/)[1]);
  const peak = Number(r128.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]);
  assert.ok(Math.abs(lufs + 14) < 1.5, `integrated loudness ${lufs} LUFS`);
  assert.ok(peak <= -1.5, `true peak ${peak} dBTP`);
  assert.ok(levelAt(out, 6.2, 0.4) < -70, "the silence window is silent");
  assert.ok(levelAt(out, 3.6, 0.3) > -30, "the braam/boom hit is loud");
});

test("game audio clips land where the edit puts them, sped up when asked", () => {
  const beep = path.join(dir, "beep.wav");
  // 1 s of silence, then a 0.2 s tone at 1.0 s.
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=f=880:d=3", "-af", "volume='if(between(t,1,1.2),1,0)':eval=frame", beep]);
  const s = new Score({ seconds: 4 });
  s.gameAudio(beep, { clips: [{ from: 0.5, to: 1.5, at: 2.0 }], gain: 1 }); // tone should land at 2.5 s
  const out = s.write(path.join(dir, "game.wav"), { fadeOut: 0.01 });
  assert.ok(levelAt(out, 2.5, 0.15) > -40, "tone at 2.5 s");
  assert.ok(levelAt(out, 1.0, 0.2) < -70, "nothing at the source time");
});
