#!/usr/bin/env node
// How will this game feel inside an X post? Ryft games play in X's 480x480 player card.
// Opens the game in a 480x480 touch viewport (phone pixel density), like the card, and reports:
//   - seconds until anything is visible (a feed scroller won't wait long)
//   - how much of the square the game actually fills (letterboxing)
//   - how big things are drawn compared with a 1920x1080 window (text legibility)
//   - whether a tap does anything
// It also saves a strip of screenshots to look at.
//
//   node feed-check.mjs <game-url | embed-url | file.html> <out-dir> [--wait 20] [--tap x,y]
//
// For a Ryft link (https://ryft.fun/games/<id>-<slug>) it checks the embed the card uses
// (https://ryft.fun/embed/games/<id>). Needs Playwright and ffmpeg.
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function embedUrl(target) {
  const m = String(target).match(/^https?:\/\/(?:www\.)?ryft\.fun\/games\/([a-z0-9]+)(?:-[^/?#]*)?/i);
  if (m) return `https://ryft.fun/embed/games/${m[1]}`;
  return /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
}

// Anything visible? Full brightness range (YMAX - YMIN): ~0 for a blank screen. Dark games
// still show a wide range once something is drawn (percentile ranges miss them).
function visible(file) {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-vf", "signalstats,metadata=print", "-f", "null", "-"]).stderr.toString();
  const hi = Number((log.match(/YMAX=([\d.]+)/) || [])[1]), lo = Number((log.match(/YMIN=([\d.]+)/) || [])[1]);
  return hi - lo > 60;
}

// Where the game draws inside the card. Letterbox bars are flat bands on *opposite* edges with
// matching colour (top+bottom or left+right), in a colour the game itself doesn't fill its area with.
// A game's own flat background touching both edges (same colour as its interior) isn't a bar.
// `frame` limits the search (e.g. the canvas, below a player bar).
export function contentBox(file, frame = { x: 0, y: 0, w: 480, h: 480 }) {
  const W = 480, H = 480;
  const raw = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-vf", `scale=${W}:${H},format=rgb24`, "-f", "rawvideo", "-"]);
  const rgb = (x, y) => { const i = (y * W + x) * 3; return [raw[i], raw[i + 1], raw[i + 2]]; };
  const line = (pts) => {
    let mn = 255, mx = 0; const sum = [0, 0, 0];
    for (const [r, g, b] of pts) { const l = (r * 299 + g * 587 + b * 114) / 1000; mn = Math.min(mn, l); mx = Math.max(mx, l); sum[0] += r; sum[1] += g; sum[2] += b; }
    return { flat: mx - mn <= 6, color: sum.map((v) => v / pts.length) };
  };
  const dist = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  const rows = [], cols = [];
  for (let y = frame.y; y < frame.y + frame.h; y++) rows.push(line(Array.from({ length: frame.w }, (_, i) => rgb(frame.x + i, y))));
  for (let x = frame.x; x < frame.x + frame.w; x++) cols.push(line(Array.from({ length: frame.h }, (_, i) => rgb(x, frame.y + i))));
  // Reference colour: median of the first few flat lines (the very first is often a blended edge).
  const run = (arr) => {
    const head = arr.slice(0, 8).filter((r) => r.flat).sort((a, b) => a.color[1] - b.color[1]);
    if (!head.length) return { n: 0, color: null };
    const ref = head[head.length >> 1].color;
    let n = 0;
    while (n < arr.length && arr[n].flat && dist(arr[n].color, ref) <= 6) n++;
    return { n, color: ref };
  };
  // The game area's dominant colour (coarsely quantized), sampled away from the edges.
  const counts = new Map();
  for (let y = frame.y + Math.floor(frame.h * 0.3); y < frame.y + frame.h * 0.7; y += 2)
    for (let x = frame.x + Math.floor(frame.w * 0.3); x < frame.x + frame.w * 0.7; x += 2) {
      const k = rgb(x, y).map((v) => v >> 4).join(","); counts.set(k, (counts.get(k) || 0) + 1);
    }
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map((v) => Number(v) * 16 + 8);
  const bars = (arr) => {
    const a = run(arr), b = run([...arr].reverse()), len = arr.length;
    const matched = a.n > len * 0.06 && b.n > len * 0.06 && Math.abs(a.n - b.n) <= Math.max(a.n, b.n) * 0.35
      && dist(a.color, b.color) < 10 && dist(a.color, mode) > 14;
    return matched ? [a.n, b.n] : [0, 0];
  };
  const [top, bottom] = bars(rows), [left, right] = bars(cols);
  return { x: frame.x + left, y: frame.y + top, w: frame.w - left - right, h: frame.h - top - bottom };
}

// Similarity of two screenshots (PSNR, dB). Above ~22 dB: the same screen, give or take animation.
function similarity(a, b) {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-i", a, "-i", b, "-lavfi", "psnr", "-f", "null", "-"]).stderr.toString();
  const m = log.match(/average:([\d.]+|inf)/);
  return !m ? 0 : m[1] === "inf" ? 99 : Number(m[1]);
}

// The game surface rectangle: the largest canvas/iframe/video on the page (inside frames too).
async function surface(page) {
  let best = { x: 0, y: 0, w: 480, h: 480, area: 0 };
  for (const f of page.frames()) {
    const offset = f.parentFrame() ? await (await f.frameElement()).boundingBox().catch(() => null) : { x: 0, y: 0 };
    const rects = await f.evaluate(() => [...document.querySelectorAll("canvas,video")].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })).catch(() => []);
    for (const r of rects) {
      const x = Math.max(0, Math.round((offset?.x ?? 0) + r.x)), y = Math.max(0, Math.round((offset?.y ?? 0) + r.y));
      const w = Math.min(480 - x, Math.round(r.w)), h = Math.min(480 - y, Math.round(r.h));
      if (w * h > best.area) best = { x, y, w, h, area: w * h };
    }
  }
  return best.area ? best : { x: 0, y: 0, w: 480, h: 480 };
}

export async function feedCheck(target, out, { wait = 20, tap } = {}) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { throw new Error("Playwright isn't installed: npm i -D playwright && npx playwright install chromium"); }
  fs.mkdirSync(out, { recursive: true });
  const url = embedUrl(target);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 480, height: 480 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "commit", timeout: 60000 });
  const shots = [];
  let firstContent = null;
  for (let t = 0.5; t <= wait; t += 0.5) {
    await page.waitForTimeout(Math.max(0, t * 1000 - (Date.now() - t0)));
    const file = path.join(out, `t${String(t.toFixed(1)).padStart(4, "0")}.png`);
    await page.screenshot({ path: file });
    shots.push({ t, file });
    if (firstContent === null && visible(file)) firstContent = t;
  }
  const settled = shots.at(-1).file;
  // When did the game itself appear? The first moment after which every screenshot looks like
  // the settled screen (loading screens and blank frames don't).
  let gameOnScreen = null;
  for (let i = shots.length - 1; i >= 0 && similarity(shots[i].file, settled) > 22; i--) gameOnScreen = shots[i].t;
  const box = contentBox(settled, await surface(page));
  const fill = (box.w * box.h) / (480 * 480);
  // Scale vs a 1920x1080 window: how big the game draws things in the card.
  const scale = box.w / 1920 > box.h / 1080 ? box.h / 1080 : box.w / 1920;
  let tapResponds = null;
  const [tx, ty] = tap ? tap.split(",").map(Number) : [box.x + box.w / 2, box.y + box.h / 2];
  const before = path.join(out, "tap-before.png"), after = path.join(out, "tap-after.png");
  await page.screenshot({ path: before });
  await page.touchscreen.tap(tx, ty);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: after });
  tapResponds = !fs.readFileSync(before).equals(fs.readFileSync(after));
  await browser.close();

  // A strip of moments to look at: 1, 3, 6, 10 s, settled, after the tap.
  const picks = [1, 3, 6, 10].map((t) => shots.find((s) => s.t === t)?.file).filter(Boolean).concat([settled, after]);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...picks.flatMap((f) => ["-i", f]), "-filter_complex",
    picks.map((_, i) => `[${i}]scale=320:320[s${i}]`).join(";") + ";" + picks.map((_, i) => `[s${i}]`).join("") + `hstack=${picks.length}`, path.join(out, "strip.png")]);

  const report = {
    url,
    secondsToFirstContent: firstContent,
    secondsToGameScreen: gameOnScreen,
    gameArea: `${box.w}x${box.h} of 480x480`,
    cardFilled: Math.round(fill * 100) + "%",
    drawScaleVs1080p: Math.round(scale * 100) + "%",
    tapResponds,
    strip: path.join(out, "strip.png"),
  };
  report.advice = [];
  if (gameOnScreen !== null && gameOnScreen > 5) report.advice.push(`The game itself takes ~${gameOnScreen} s to appear (a loading screen shows before that). In a feed, aim for under 5 s: fewer/smaller assets at start, or a playable first screen while the rest loads.`);
  if (firstContent === null || firstContent > 3) report.advice.push(`Nothing visible for ${firstContent ?? `${wait}+`} s. Show the title or cover art instantly (a static first screen loads before the game).`);
  if (fill < 0.75) report.advice.push(`The game fills only ${report.cardFilled} of the card. Ask Ryft for a square (1:1) or responsive layout so it uses the whole player.`);
  if (scale < 0.4) report.advice.push(`Everything is drawn at ~${report.drawScaleVs1080p} of its 1080p size. Text needs to be about ${Math.ceil(16 / scale)} px at 1080p to read at 16 px in the card.`);
  if (!tapResponds) report.advice.push("A tap in the middle didn't change anything. Make one tap start or continue the game.");
  return report;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const wait = Number(opt("--wait") ?? 20), tap = opt("--tap");
  if (args.length < 2) { console.log("Usage: node feed-check.mjs <game-url|file> <out-dir> [--wait 20] [--tap x,y]"); process.exit(2); }
  feedCheck(args[0], args[1], { wait, tap }).then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.error(e.message); process.exit(1); });
}
