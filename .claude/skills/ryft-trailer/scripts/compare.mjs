#!/usr/bin/env node
// Compare two trailer cuts (A/B) before posting both.
//
//   node compare.mjs a.mp4 b.mp4 out-dir [--labels v1,v2]
//
// Writes:
//   out-dir/side-by-side.mp4   A on top, B below, in sync (A's audio), to watch together
//   out-dir/moments.jpg        8 matching moments (same % of each cut), A above B
//   out-dir/compare.json       length, loudness, true peak, flashes, black/frozen stretches for each
// Then grade both with the rubric (references/trailer-craft.md §9) and post the winner, or both
// as an A/B and log them with campaign.mjs --trailer <label>.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { qc } from "./cut.mjs";

const ff = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

export function compare(a, b, out, { labels = ["A", "B"] } = {}) {
  fs.mkdirSync(out, { recursive: true });
  const [da, db] = [duration(a), duration(b)];
  const len = Math.max(da, db);
  ff("-i", a, "-i", b, "-filter_complex",
    `[0:v]scale=960:540,tpad=stop_mode=clone:stop_duration=${(len - da + 0.1).toFixed(2)}[a];[1:v]scale=960:540,tpad=stop_mode=clone:stop_duration=${(len - db + 0.1).toFixed(2)}[b];[a][b]vstack,pad=1920:1080:480:0:color=black[v]`,
    "-map", "[v]", "-map", "0:a?", "-t", len.toFixed(2), "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", path.join(out, "side-by-side.mp4"));
  // Matching moments: the same fraction of each trailer.
  const fr = [0.03, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 0.97];
  const tiles = [];
  fr.forEach((f, i) => {
    for (const [src, d, tag] of [[a, da, "a"], [b, db, "b"]]) {
      const file = path.join(out, `m${i}${tag}.png`);
      ff("-ss", (f * d).toFixed(2), "-i", src, "-frames:v", "1", "-vf", "scale=384:216", file);
      tiles.push(file);
    }
  });
  // 8 columns: A row above B row.
  const order = [...fr.map((_, i) => tiles[i * 2]), ...fr.map((_, i) => tiles[i * 2 + 1])];
  ff(...order.flatMap((f) => ["-i", f]), "-filter_complex", `${order.map((_, i) => `[${i}]`).join("")}xstack=inputs=16:layout=${order.map((_, i) => `${(i % 8) * 384}_${Math.floor(i / 8) * 216}`).join("|")}`, path.join(out, "moments.jpg"));
  tiles.forEach((f) => fs.rmSync(f));
  // compare can't know which black stretches are deliberate (a beat before the title), so it lists
  // them without calling them problems.
  const check = (f) => qc(f, { blackAllowed: [[0, Infinity]] });
  const report = { [labels[0]]: { file: a, seconds: +da.toFixed(2), ...check(a) }, [labels[1]]: { file: b, seconds: +db.toFixed(2), ...check(b) } };
  for (const r of Object.values(report)) r.flashes = r.flashes.length;
  fs.writeFileSync(path.join(out, "compare.json"), JSON.stringify(report, null, 1));
  return report;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const li = args.indexOf("--labels");
  const labels = li >= 0 ? args.splice(li, 2)[1].split(",") : ["A", "B"];
  if (args.length < 3) { console.log("Usage: node compare.mjs a.mp4 b.mp4 out-dir [--labels v1,v2]"); process.exit(2); }
  const r = compare(args[0], args[1], args[2], { labels });
  for (const [k, v] of Object.entries(r)) console.log(`${k}: ${v.seconds}s, ${v.lufs} LUFS, peak ${v.truePeak} dBTP, ${v.flashes} flash(es), problems: ${v.problems.join("; ") || "none"}`);
  console.log(`Watch ${path.join(args[2], "side-by-side.mp4")} and look at ${path.join(args[2], "moments.jpg")}`);
}
