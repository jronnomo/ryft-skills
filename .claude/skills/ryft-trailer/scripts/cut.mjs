#!/usr/bin/env node
// Renders a trailer from one timeline file: picture, text overlay, sound, then QC.
//
//   node cut.mjs timeline.mjs out.mp4 [--music music.wav] [--work dir]
//
// timeline.mjs exports (times in seconds, on your beat grid):
//   LENGTH                        total length
//   SHOTS  [{ at, dur, kind, ... }] back to back, no gaps:
//          kind "video": src, in, crop?{x,y,w,h}, dim? (0-1), blur? (sigma)
//          kind "still": src (image), crop?{x,y,w,h}, push? [fromZoom, toZoom], dim?, blur?
//          kind "black"
//   CARDS  [{ in, out, lines: ["..."] }]           text cards (panel styled by STYLE)
//   END    { in, title, cta, link, by? }           end card (over the last shot)
//   FLASHES [t, ...]                               2-frame white flashes on big hits
//   STYLE  { font, panel, border, gold, text }     optional: match the game's UI
//
// Prints a QC report (frames, black/freeze, loudness, true peak, flashes per second) and
// exits 1 if anything is out of spec.
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ff = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);
const enc = ["-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", "-an"];
const dimF = (d) => (d ? `,eq=brightness=${(-0.35 * d).toFixed(3)}:saturation=${(1 - 0.35 * d).toFixed(3)}` : "");
const blurF = (b) => (b ? `,gblur=sigma=${b}` : "");
// Push-in: upscale first so zoompan doesn't jitter, zoom from a to b over n frames.
const pushF = (n, [a, b]) => `scale=3840:2160:flags=lanczos,zoompan=z='${a}+(${b}-${a})*on/${Math.max(1, n - 1)}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30`;

export function checkTimeline({ SHOTS, LENGTH }) {
  if (!SHOTS?.length) throw new Error("timeline has no SHOTS");
  SHOTS.forEach((s, i) => {
    if (!["video", "still", "black"].includes(s.kind)) throw new Error(`shot ${i}: unknown kind "${s.kind}"`);
    if (i === 0 && Math.abs(s.at) > 1e-6) throw new Error("the first shot must start at 0");
    if (i > 0 && Math.abs(SHOTS[i - 1].at + SHOTS[i - 1].dur - s.at) > 1e-6) throw new Error(`gap or overlap before shot ${i} (${s.tag ?? s.kind})`);
    if (Math.abs(s.dur * 30 - Math.round(s.dur * 30)) > 1e-6) throw new Error(`shot ${i}: duration isn't a whole number of frames`);
  });
  const end = SHOTS.at(-1).at + SHOTS.at(-1).dur;
  if (Math.abs(end - LENGTH) > 1e-6) throw new Error(`shots end at ${end}s but LENGTH is ${LENGTH}s`);
}

function renderPicture(t, work) {
  const seg = path.join(work, "segments");
  fs.rmSync(seg, { recursive: true, force: true }); fs.mkdirSync(seg, { recursive: true });
  const list = t.SHOTS.map((s, i) => {
    const n = Math.round(s.dur * 30), out = path.join(seg, `${String(i).padStart(3, "0")}.mp4`);
    const c = s.crop;
    if (s.kind === "video") {
      const crop = c ? `crop=${c.w}:${c.h}:${c.x}:${c.y},scale=1920:1080:flags=lanczos,` : "scale=1920:1080:flags=lanczos,";
      ff("-ss", String(s.in ?? 0), "-i", s.src, "-vf", `fps=30,${crop}tpad=stop_mode=clone:stop_duration=5,setsar=1${blurF(s.blur)}${dimF(s.dim)}`, "-frames:v", String(n), ...enc, out);
    } else if (s.kind === "still") {
      const crop = c ? `crop=${c.w}:${c.h}:${c.x}:${c.y},` : "";
      ff("-loop", "1", "-i", s.src, "-vf", `${crop}${pushF(n, s.push || [1, 1])},setsar=1${blurF(s.blur)}${dimF(s.dim)}`, "-frames:v", String(n), ...enc, out);
    } else {
      ff("-f", "lavfi", "-i", "color=c=0x080605:s=1920x1080:r=30", "-frames:v", String(n), ...enc, out);
    }
    return `file '${out}'`;
  });
  fs.writeFileSync(path.join(seg, "list.txt"), list.join("\n"));
  const base = path.join(work, "base.mp4");
  ff("-f", "concat", "-safe", "0", "-i", path.join(seg, "list.txt"), "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", base);
  return base;
}

function overlayHtml(t) {
  const S = { font: '"Times New Roman", Times, serif', panel: "rgba(42,32,32,.94)", border: "#cba45c", gold: "#d9b45a", text: "#e4d8bc", ...(t.STYLE || {}) };
  const data = JSON.stringify({ CARDS: t.CARDS || [], END: t.END || null, FLASHES: t.FLASHES || [] });
  return `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
.layer{position:absolute;inset:0}
.panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:34px 84px 40px;background:${S.panel};border:3px solid ${S.border};
  outline:1px solid ${S.border}88;outline-offset:-12px;box-shadow:0 0 60px rgba(0,0,0,.7);text-align:center;white-space:nowrap;
  font:500 80px/1.18 ${S.font};color:${S.gold};text-shadow:0 2px 0 #000}
.panel span{display:inline-block;margin:0 .14em}.panel .line{display:block}
#flash{background:#fff;opacity:0}
#scrim{background:radial-gradient(ellipse at center,rgba(8,6,5,.55),rgba(8,6,5,.88) 75%);opacity:0}
#end{display:none;text-align:center}
#title{position:absolute;left:0;right:0;top:300px;font:500 168px ${S.font};letter-spacing:6px;color:${S.gold};text-shadow:0 4px 0 #000}
#cta{position:absolute;left:50%;top:560px;transform:translateX(-50%);padding:18px 70px;border:3px solid ${S.border};outline:1px solid ${S.border}88;outline-offset:-10px;
  background:${S.panel};font:500 56px ${S.font};color:${S.gold};white-space:nowrap}
#link{position:absolute;left:0;right:0;top:720px;font:400 40px ${S.font};color:${S.text}}
#by{position:absolute;left:0;right:0;top:778px;font:italic 400 32px ${S.font};color:${S.text};opacity:.7}
</style>
<div class="layer" id="scrim"></div><div class="layer" id="cards"></div>
<div class="layer" id="end"><div id="title"></div><div id="cta"></div><div id="link"></div><div id="by"></div></div>
<div class="layer" id="flash"></div>
<script>
const {CARDS,END,FLASHES}=${data};
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-clamp(x),3);
const els=CARDS.map(c=>{const el=document.createElement("div");el.className="panel";
  el.innerHTML=c.lines.map(l=>'<span class="line">'+l.split(" ").map(w=>"<span>"+w+"</span>").join("")+"</span>").join("");
  document.getElementById("cards").appendChild(el);return el;});
if(END){for(const k of ["title","cta","link","by"])document.getElementById(k).textContent=END[k]||"";}
function rise(el,t,start,extra=""){const p=ease((t-start)/.35);el.style.opacity=p;el.style.transform=extra+"translateY("+(1-p)*14+"px)";}
window.render=t=>{
  CARDS.forEach((c,i)=>{const el=els[i],on=t>=c.in-.01&&t<=c.out+.25;el.style.display=on?"block":"none";if(!on)return;
    el.style.opacity=ease((t-c.in)/.25)*clamp((c.out+.25-t)/.25);el.style.transform="translate(-50%,-50%) scale("+(.96+.04*ease((t-c.in)/.3))+")";
    let k=0;el.querySelectorAll(".line>span").forEach(w=>{const q=ease((t-c.in-.08-(k++)*.05)/.25);w.style.opacity=q;w.style.transform="translateY("+(1-q)*10+"px)";});});
  let f=0;for(const s of FLASHES){const d=t-s;if(d>=0&&d<.2)f=Math.max(f,d<.067?.85:.85*(1-(d-.067)/.133));}
  document.getElementById("flash").style.opacity=f;
  const on=!!END&&t>=END.in;document.getElementById("scrim").style.opacity=on?ease((t-END.in)/.4):0;
  document.getElementById("end").style.display=on?"block":"none";
  if(on){rise(document.getElementById("title"),t,END.in+.05);rise(document.getElementById("cta"),t,END.in+.35,"translateX(-50%) ");
    rise(document.getElementById("link"),t,END.in+.6);rise(document.getElementById("by"),t,END.in+.75);}
};
</script>`;
}

async function renderOverlay(t, work) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require("playwright")); } catch {
    ({ chromium } = await import("playwright").catch(() => { throw new Error("Playwright isn't installed: npm i -D playwright && npx playwright install chromium"); }));
  }
  const html = path.join(work, "overlay.html"), dir = path.join(work, "ov");
  fs.writeFileSync(html, overlayHtml(t));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(pathToFileURL(html).href);
  await page.evaluate(() => document.fonts.ready);
  for (let f = 0; f < Math.round(t.LENGTH * 30); f++) {
    await page.evaluate((x) => window.render(x), f / 30);
    await page.screenshot({ path: path.join(dir, `${String(f).padStart(5, "0")}.png`), omitBackground: true });
  }
  await browser.close();
  return dir;
}

// Flashes: a brightness rise of > 40 (of 255) that falls back within 0.3 s counts as one flash.
export function countFlashes(yavg, fps = 30) {
  const flashes = [];
  for (let i = 1; i < yavg.length; i++) {
    if (yavg[i] - yavg[i - 1] > 40) {
      const back = yavg.slice(i, i + Math.round(0.3 * fps)).findIndex((v) => v < yavg[i] - 40);
      if (back >= 0) { flashes.push(i / fps); i += back; }
    }
  }
  let worst = 0;
  for (const a of flashes) worst = Math.max(worst, flashes.filter((b) => b >= a && b < a + 1).length);
  return { flashes, worstPerSecond: worst };
}

export function qc(file, { length, blackAllowed = [] } = {}) {
  const stderr = (args) => spawnSync("ffmpeg", ["-hide_banner", ...args]).stderr.toString();
  const frames = Number(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", file]).toString().trim());
  const vlog = stderr(["-i", file, "-vf", "blackdetect=d=0.25:pix_th=0.06,freezedetect=n=0.001:d=1.6,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-an", "-f", "null", "-"]);
  const black = [...vlog.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const freezes = [...vlog.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const yavg = [...vlog.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  const { flashes, worstPerSecond } = countFlashes(yavg);
  const alog = stderr(["-i", file, "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]).split("Summary:")[1] || "";
  const lufs = Number((alog.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]);
  const truePeak = Number((alog.match(/Peak:\s+(-?[\d.]+)/) || [])[1]);
  const unexpectedBlack = black.filter(([a, b]) => !blackAllowed.some(([x, y]) => a >= x - 0.1 && b <= y + 0.1));
  const report = { frames, expectedFrames: length ? Math.round(length * 30) : undefined, black, freezes, flashes, worstFlashesPerSecond: worstPerSecond, lufs, truePeak };
  const problems = [];
  if (length && frames !== Math.round(length * 30)) problems.push(`frame count ${frames}, expected ${Math.round(length * 30)}`);
  if (unexpectedBlack.length) problems.push(`unplanned black at ${unexpectedBlack.map(([a]) => a.toFixed(2)).join(", ")} s`);
  if (freezes.length) problems.push(`frozen picture at ${freezes.map((f) => f.toFixed(2)).join(", ")} s`);
  if (worstPerSecond > 3) problems.push(`${worstPerSecond} flashes in one second (max 3)`);
  if (Number.isFinite(lufs) && Math.abs(lufs + 14) > 1.5) problems.push(`loudness ${lufs} LUFS (target -14)`);
  if (Number.isFinite(truePeak) && truePeak > -1) problems.push(`true peak ${truePeak} dBTP (max -1)`);
  return { ...report, problems };
}

export async function cut(timelineFile, out, { music, work } = {}) {
  const t = await import(pathToFileURL(path.resolve(timelineFile)).href + `?t=${Date.now()}`);
  checkTimeline(t);
  work ??= fs.mkdtempSync(path.join(os.tmpdir(), "ryft-cut-"));
  fs.mkdirSync(work, { recursive: true });
  const base = renderPicture(t, work);
  const ov = await renderOverlay(t, work);
  const audio = music ? ["-i", music] : [];
  ff("-i", base, "-framerate", "30", "-i", path.join(ov, "%05d.png"), ...audio, "-filter_complex",
    "[0]setpts=N/30/TB[b];[1]format=rgba,setpts=N/30/TB[o];[b][o]overlay=0:0,format=yuv420p[v]",
    "-map", "[v]", ...(music ? ["-map", "2:a", "-c:a", "aac", "-b:a", "192k"] : []),
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-t", String(t.LENGTH), "-movflags", "+faststart", out);
  const blackAllowed = t.SHOTS.filter((s) => s.kind === "black").map((s) => [s.at, s.at + s.dur]);
  return qc(out, { length: t.LENGTH, blackAllowed });
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const music = opt("--music"), work = opt("--work");
  if (args.length < 2) { console.log("Usage: node cut.mjs timeline.mjs out.mp4 [--music music.wav] [--work dir]"); process.exit(2); }
  cut(args[0], args[1], { music, work }).then((r) => {
    console.log(JSON.stringify({ ...r, flashes: r.flashes.map((f) => +f.toFixed(2)) }, null, 1));
    if (r.problems.length) { console.error("QC problems:\n- " + r.problems.join("\n- ")); process.exit(1); }
    console.log("QC passed");
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
