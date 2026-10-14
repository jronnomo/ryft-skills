// Run with: node --test test/feed-check.test.mjs  (needs Playwright + Chromium and ffmpeg)
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { feedCheck, embedUrl } from "../.claude/skills/ryft-x-launch/scripts/feed-check.mjs";

test("Ryft game links are checked through the embed the X card uses", () => {
  assert.strictEqual(embedUrl("https://ryft.fun/games/gjgk90-ashen-rite"), "https://ryft.fun/embed/games/gjgk90");
  assert.strictEqual(embedUrl("https://ryft.fun/embed/games/gjgk90"), "https://ryft.fun/embed/games/gjgk90");
});

test("measures letterboxing and tap response in a 480x480 card", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-feed-"));
  const boxed = await feedCheck("test/fixtures/letterbox-game.html", path.join(dir, "boxed"), { wait: 2 });
  const fill = Number(boxed.cardFilled.replace("%", ""));
  assert.ok(fill > 50 && fill < 62, `16:9 in a square should fill ~56%, got ${boxed.cardFilled}`);
  assert.strictEqual(boxed.tapResponds, true);
  assert.strictEqual(boxed.secondsToFirstContent, 0.5);
  assert.ok(boxed.advice.some((a) => /square/.test(a)));

  const full = await feedCheck("test/fixtures/tiny-game.html", path.join(dir, "full"), { wait: 2 });
  assert.strictEqual(full.cardFilled, "100%", "a flat sky must not be mistaken for letterbox bars");
  assert.strictEqual(full.tapResponds, false);
  assert.ok(fs.existsSync(full.strip));
  fs.rmSync(dir, { recursive: true });
});
