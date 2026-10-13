#!/usr/bin/env node
// Plays a browser game from a script of inputs and records the screen.
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
//
//   node record.mjs <game-url-or-file> <steps.txt> <out.mp4> [--size 1280x720]
//
// steps.txt, one per line (# for comments):
//   wait 1.5                 do nothing for 1.5 seconds
//   click                    click the middle of the page (gives the game focus)
//   click 640 360            click at x y
//   press Space              tap a key (names: Space, Enter, ArrowLeft, KeyA, ...)
//   hold ArrowRight 1.2      hold a key for 1.2 seconds
//   hold ArrowRight+Space 0.4  hold several keys together
//   type B3PM                type text (e.g. a password code)
//   snap title-screen        save a PNG next to the video: <out>-title-screen.png
//
// A script can't react to what happens on screen, so this suits title screens,
// menus, puzzles, attract-mode runs and build-by-build stills. For action
// gameplay, a human recording looks far better.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export function parseSteps(text) {
  const steps = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) return;
    const [op, ...args] = line.split(/\s+/);
    const num = (s) => {
      const n = Number(s);
      if (!Number.isFinite(n) || n < 0) throw new Error(`steps line ${i + 1}: "${s}" is not a number`);
      return n;
    };
    switch (op) {
      case "wait": steps.push({ op, seconds: num(args[0]) }); break;
      case "click": steps.push(args.length ? { op, x: num(args[0]), y: num(args[1]) } : { op }); break;
      case "press": steps.push({ op, key: args[0] }); break;
      case "hold": steps.push({ op, keys: args[0].split("+"), seconds: num(args[1]) }); break;
      case "type": steps.push({ op, text: args.join(" ") }); break;
      case "snap": steps.push({ op, name: args[0] || `snap-${steps.length}` }); break;
      default: throw new Error(`steps line ${i + 1}: unknown step "${op}"`);
    }
    if (op !== "click" && op !== "wait" && op !== "snap" && !args.length) {
      throw new Error(`steps line ${i + 1}: "${op}" needs an argument`);
    }
  });
  return steps;
}

async function record(target, stepsFile, out, size) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Playwright isn't installed. Run: npm i -D playwright && npx playwright install chromium");
  }
  const steps = parseSteps(fs.readFileSync(stepsFile, "utf8"));
  const [width, height] = size.split("x").map(Number);
  const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-record-"));
  const stem = out.replace(/\.[^.]+$/, "");

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: tmp, size: { width, height } } });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "load" });
    for (const s of steps) {
      if (s.op === "wait") await page.waitForTimeout(s.seconds * 1000);
      if (s.op === "click") await page.mouse.click(s.x ?? width / 2, s.y ?? height / 2);
      if (s.op === "press") await page.keyboard.press(s.key);
      if (s.op === "type") await page.keyboard.type(s.text, { delay: 120 });
      if (s.op === "snap") await page.screenshot({ path: `${stem}-${s.name}.png` });
      if (s.op === "hold") {
        for (const k of s.keys) await page.keyboard.down(k);
        await page.waitForTimeout(s.seconds * 1000);
        for (const k of [...s.keys].reverse()) await page.keyboard.up(k);
      }
    }
  } finally {
    await context.close(); // flushes the video
    await browser.close();
  }

  const webm = fs.readdirSync(tmp).find((f) => f.endsWith(".webm"));
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", path.join(tmp, webm),
    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart", out]);
  fs.rmSync(tmp, { recursive: true });
  console.log(`${out} recorded (${steps.length} steps)`);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--size");
  const size = at >= 0 ? args.splice(at, 2)[1] : "1280x720";
  if (args.length < 3 || !/^\d+x\d+$/.test(size)) {
    console.log("Usage: node record.mjs <game-url-or-file> <steps.txt> <out.mp4> [--size 1280x720]");
    process.exit(2);
  }
  record(...args, size).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
