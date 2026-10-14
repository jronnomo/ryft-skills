#!/usr/bin/env node
// X-ready exports of a 16:9 trailer.
//
//   node export.mjs trailer.mp4 out-dir [--name ashen-rite] [--max 140]
//
// Writes <name>-16x9.mp4, <name>-1x1.mp4 and <name>-9x16.mp4: H.264 High / yuv420p / 30 fps,
// AAC 48 kHz, +faststart, trimmed to --max seconds (X's limit for standard accounts is 2:20).
// Square and vertical versions keep the full 16:9 picture in the centre and fill the rest with a
// blurred, darkened copy of the same footage instead of black bars (feeds look better full-bleed).
// Put text-safe content in the middle: X overlays its UI on the edges of vertical video.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZES = { "16x9": [1920, 1080], "1x1": [1080, 1080], "9x16": [1080, 1920] };

export function exportForX(input, out, { name = path.basename(input, path.extname(input)), max = 140 } = {}) {
  fs.mkdirSync(out, { recursive: true });
  const files = {};
  for (const [tag, [w, h]] of Object.entries(SIZES)) {
    const file = path.join(out, `${name}-${tag}.mp4`);
    const vf = tag === "16x9"
      ? `scale=${w}:${h}:flags=lanczos,setsar=1,fps=30,format=yuv420p`
      : `split[bg][fg];[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},gblur=sigma=40,eq=brightness=-0.25:saturation=0.8[b];` +
        `[fg]scale=${w}:-2:flags=lanczos[f];[b][f]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p`;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-t", String(max),
      tag === "16x9" ? "-vf" : "-filter_complex", vf, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18",
      "-maxrate", "12M", "-bufsize", "24M", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", file]);
    files[tag] = file;
  }
  return files;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const name = opt("--name"), max = Number(opt("--max") ?? 140);
  if (args.length < 2) { console.log("Usage: node export.mjs trailer.mp4 out-dir [--name game] [--max 140]"); process.exit(2); }
  const files = exportForX(args[0], args[1], { name, max });
  for (const [k, f] of Object.entries(files)) console.log(`${k}: ${f} (${(fs.statSync(f).size / 1e6).toFixed(1)} MB)`);
}
