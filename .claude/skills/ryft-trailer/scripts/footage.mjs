#!/usr/bin/env node
// Turns raw gameplay recordings into trailer-ready material. Needs ffmpeg on PATH.
//
//   node footage.mjs sheet <recording> <out.jpg> [--every 2]
//       Contact sheet: one frame every N seconds, 5 per row, left to right.
//       Tile k (from 0) is at k * N seconds. Look at it to find highlights.
//
//   node footage.mjs cut <recording> <cuts.txt> <outdir>
//       cuts.txt has one shot per line: "0:12.5-0:16 first-jump" (# for comments).
//       Writes <outdir>/clips/NN-name.mp4 (H.264, 30fps) and <outdir>/stills/NN-name.jpg.
//
//   node footage.mjs gif <clip> <out.gif> [--width 480] [--seconds 6]
//       A looping preview GIF for a listing, README or chat.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

function duration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1", file]).toString();
  return Number(out);
}

function hasAudio(file) {
  return execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries",
    "stream=index", "-of", "csv=p=0", file]).toString().trim() !== "";
}

// "75", "1:15", "1:15.5", "0:01:15" -> seconds
export function toSeconds(t) {
  const parts = t.trim().split(":").map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n) || n < 0)) throw new Error(`Bad time "${t}"`);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function parseCuts(text) {
  const cuts = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) return;
    const m = line.match(/^([\d:.]+)\s*-\s*([\d:.]+)\s+([\w-]+)$/);
    if (!m) throw new Error(`cuts line ${i + 1}: expected "0:12-0:16 name", got "${raw}"`);
    const start = toSeconds(m[1]);
    const end = toSeconds(m[2]);
    if (end <= start) throw new Error(`cuts line ${i + 1}: end must be after start`);
    cuts.push({ start, end, name: m[3] });
  });
  return cuts;
}

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : fallback;
}

function sheet([input, out, ...rest]) {
  const every = flag(rest, "--every", 2);
  const frames = Math.max(1, Math.ceil(duration(input) / every));
  const rows = Math.ceil(frames / 5);
  ffmpeg(["-i", input, "-vf", `fps=1/${every},scale=320:-2,tile=5x${rows}`, "-frames:v", "1", out]);
  console.log(`${out}: ${frames} frames, tile k = ${every}*k seconds`);
}

function cut([input, cutsFile, outdir]) {
  const cuts = parseCuts(fs.readFileSync(cutsFile, "utf8"));
  const total = duration(input);
  const audio = hasAudio(input);
  fs.mkdirSync(path.join(outdir, "clips"), { recursive: true });
  fs.mkdirSync(path.join(outdir, "stills"), { recursive: true });

  cuts.forEach(({ start, end, name }, i) => {
    if (start >= total) throw new Error(`${name} starts after the recording ends (${total.toFixed(1)}s)`);
    const base = `${String(i + 1).padStart(2, "0")}-${name}`;
    const clip = path.join(outdir, "clips", `${base}.mp4`);
    ffmpeg(["-ss", String(start), "-to", String(Math.min(end, total)), "-i", input,
      "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      ...(audio ? ["-c:a", "aac", "-b:a", "160k"] : ["-an"]),
      "-movflags", "+faststart", clip]);
    ffmpeg(["-ss", String((Math.min(end, total) - start) / 2), "-i", clip,
      "-frames:v", "1", "-q:v", "2", path.join(outdir, "stills", `${base}.jpg`)]);
    console.log(`${clip}  (${(Math.min(end, total) - start).toFixed(1)}s)`);
  });
}

function gif([input, out, ...rest]) {
  const width = flag(rest, "--width", 480);
  const seconds = flag(rest, "--seconds", 6);
  ffmpeg(["-t", String(seconds), "-i", input, "-filter_complex",
    `fps=15,scale=${width}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    "-loop", "0", out]);
  console.log(`${out}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

const commands = { sheet, cut, gif };
const [cmd, ...args] = process.argv.slice(2);
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  if (!commands[cmd] || args.length < 2) {
    console.log("Usage: node footage.mjs sheet|cut|gif ... (see the top of this file)");
    process.exit(2);
  }
  try {
    commands[cmd](args);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
