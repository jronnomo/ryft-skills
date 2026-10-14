#!/usr/bin/env node
// Plays a browser game from a script of inputs and records the screen.
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
//
//   node record.mjs <game-url-or-file> <steps.txt> <out.mp4> [--size 1280x720] [--audio] [--scale 2]
//
// --scale 2 renders the page at 2x device pixels, so `snap` stills are twice as
// sharp (crisp punch-ins on cards and text). The video stays at --size.
//
// --audio also records the game's own sound (Web Audio), in sync with the video.
// It taps every AudioContext's output inside the page (game sound that uses <audio>
// elements instead of Web Audio is not captured).
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
import { execFileSync, spawnSync } from "node:child_process";
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

// Runs inside every frame before the game's scripts. Everything that reaches an
// AudioContext's speakers is also routed into a raw-sample tap. Each buffer keeps its
// audio-clock time, so the track can be rebuilt with exact timing, silence included.
// (MediaRecorder was tried first: it drops silent stretches and loses timing.)
export function audioTap() {
  const origConnect = AudioNode.prototype.connect;
  const RATE = 24000; // mono 24 kHz: plenty for a trailer's game-audio layer
  function ensureTap(c) {
    if (c.__bus) return;
    c.__bus = c.createGain();
    const sp = c.createScriptProcessor(4096, 2, 1);
    c.__pcm = [];
    sp.onaudioprocess = (e) => {
      if (!c.__t0) c.__t0 = c.getOutputTimestamp();
      const n = e.inputBuffer.numberOfChannels;
      const L = e.inputBuffer.getChannelData(0), R = n > 1 ? e.inputBuffer.getChannelData(1) : L;
      const step = c.sampleRate / RATE, len = Math.floor(L.length / step), out = new Int16Array(len);
      for (let i = 0; i < len; i++) {
        let acc = 0, k0 = Math.floor(i * step), k1 = Math.floor((i + 1) * step);
        for (let k = k0; k < k1; k++) acc += (L[k] + R[k]) / 2;
        out[i] = Math.max(-1, Math.min(1, acc / (k1 - k0))) * 32767;
      }
      c.__pcm.push({ t: e.playbackTime, data: out });
    };
    origConnect.call(c.__bus, sp);
    origConnect.call(sp, c.destination); // a processor only runs while connected; it outputs silence
    c.__rate = RATE;
    (window.__ryftTaps ||= []).push(c);
  }
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      ensureTap(dest.context);
      origConnect.call(this, dest.context.__bus);
    }
    return origConnect.call(this, dest, ...rest);
  };
}

// Builds each tap's WAV in the page. Returns [{ startEpoch, speed, dataUrl }]:
// startEpoch is the wall-clock time of the first sample; speed is audio-clock seconds
// per real second (1.0 unless the browser's audio clock drifted).
export async function collectTaps() {
  const taps = (window.__ryftTaps || []).filter((c) => c.__t0 && c.__pcm.length);
  return Promise.all(taps.map(async (c) => {
    const t1 = c.getOutputTimestamp(), t0 = c.__t0, rate = c.__rate;
    const speed = (t1.contextTime - t0.contextTime) / ((t1.performanceTime - t0.performanceTime) / 1000) || 1;
    const first = c.__pcm[0].t, last = c.__pcm[c.__pcm.length - 1];
    const total = Math.ceil((last.t - first) * rate) + last.data.length;
    const pcm = new Int16Array(total);
    for (const { t, data } of c.__pcm) pcm.set(data.subarray(0, Math.max(0, total - Math.round((t - first) * rate))), Math.round((t - first) * rate));
    const header = new DataView(new ArrayBuffer(44));
    const str = (o, s) => [...s].forEach((ch, i) => header.setUint8(o + i, ch.charCodeAt(0)));
    str(0, "RIFF"); header.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVEfmt ");
    header.setUint32(16, 16, true); header.setUint16(20, 1, true); header.setUint16(22, 1, true);
    header.setUint32(24, rate, true); header.setUint32(28, rate * 2, true); header.setUint16(32, 2, true);
    header.setUint16(34, 16, true); str(36, "data"); header.setUint32(40, pcm.length * 2, true);
    const blob = new Blob([header, pcm.buffer], { type: "audio/wav" });
    const dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    // A ScriptProcessor hands over its input about two buffers after it was heard.
    const latency = (2 * 4096) / c.sampleRate;
    const startEpoch = performance.timeOrigin + t0.performanceTime + ((first - latency - t0.contextTime) / speed) * 1000;
    return { startEpoch, speed, dataUrl };
  }));
}

// Time (seconds) of the first bright frame: the clapperboard flash.
function findFlash(file) {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-t", "5", "-i", file, "-vf",
    "signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"]).stderr.toString();
  for (const m of log.matchAll(/pts_time:([\d.]+)[\s\S]*?YAVG=([\d.]+)/g)) if (Number(m[2]) > 128) return Number(m[1]);
  throw new Error("Couldn't find the sync flash at the start of the recording");
}

async function record(target, stepsFile, out, size, { audio = false, scale = 1 } = {}) {
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

  // With --audio, use full Chromium (new headless): the old headless shell has no real
  // audio device, so its audio clock drifts and sounds get stretched or dropped.
  const browser = await chromium.launch(audio ? { channel: "chromium", args: ["--autoplay-policy=no-user-gesture-required"] } : {});
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, recordVideo: { dir: tmp, size: { width, height } } });
  if (audio) await context.addInitScript(audioTap);
  const page = await context.newPage();
  let taps = [], slateEpoch = 0;
  if (audio) {
    // Clapperboard: flash the page white and note the exact time. Finding this flash
    // in the finished video tells us when the video really started (it varies by run).
    await page.setContent('<body style="margin:0;height:100vh;background:#000"></body>');
    await page.waitForTimeout(400);
    slateEpoch = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => {
      document.body.style.background = "#fff";
      requestAnimationFrame(() => r(performance.timeOrigin + performance.now()));
    })));
    await page.waitForTimeout(300);
    await page.evaluate(() => { document.body.style.background = "#000"; });
    await page.waitForTimeout(200);
  }
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
    if (audio) {
      for (const f of page.frames()) taps.push(...(await f.evaluate(collectTaps).catch(() => [])));
    }
  } finally {
    await context.close(); // flushes the video
    await browser.close();
  }

  const webm = fs.readdirSync(tmp).find((f) => f.endsWith(".webm"));
  const video = ["-i", path.join(tmp, webm)];
  const encode = ["-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart"];
  const sounding = taps.filter((t) => t.dataUrl && t.dataUrl.length > 2000);
  if (audio && sounding.length) {
    const silent = path.join(tmp, "video.mp4");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...video, ...encode, silent]);
    const videoStart = slateEpoch - findFlash(silent) * 1000;
    // Each tap becomes an input delayed to its start time; all taps are mixed.
    const inputs = [], delays = [];
    sounding.forEach((t, i) => {
      const file = path.join(tmp, `tap-${i}.wav`);
      fs.writeFileSync(file, Buffer.from(t.dataUrl.split(",")[1], "base64"));
      inputs.push("-i", file);
      const ms = Math.max(0, Math.round(t.startEpoch - videoStart));
      const fix = Math.abs(t.speed - 1) > 0.005 ? `atempo=${t.speed.toFixed(4)},` : "";
      delays.push(`[${i + 1}:a]${fix}adelay=${ms}:all=1[a${i}]`);
    });
    const mix = sounding.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${sounding.length}:normalize=0,apad[a]`;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", silent, ...inputs,
      "-filter_complex", [...delays, mix].join(";"), "-map", "0:v", "-map", "[a]", "-c:v", "copy",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out]);
  } else {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...video, ...encode, out]);
    if (audio) console.log("No game audio was captured (the game may not use Web Audio, or stayed muted).");
  }
  fs.rmSync(tmp, { recursive: true });
  console.log(`${out} recorded (${steps.length} steps${sounding.length ? `, ${sounding.length} audio source(s)` : ""})`);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--size");
  const size = at >= 0 ? args.splice(at, 2)[1] : "1280x720";
  const ai = args.indexOf("--audio");
  if (ai >= 0) args.splice(ai, 1);
  const si = args.indexOf("--scale");
  const scale = si >= 0 ? Number(args.splice(si, 2)[1]) : 1;
  if (args.length < 3 || !/^\d+x\d+$/.test(size)) {
    console.log("Usage: node record.mjs <game-url-or-file> <steps.txt> <out.mp4> [--size 1280x720] [--audio] [--scale 2]");
    process.exit(2);
  }
  record(...args.slice(0, 3), size, { audio: ai >= 0, scale }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
