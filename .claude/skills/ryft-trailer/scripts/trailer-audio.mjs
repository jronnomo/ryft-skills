// Trailer audio toolkit: synthesized score + trailer SFX + the game's own audio, mixed and
// normalized for delivery. No samples, no dependencies (ffmpeg for loading/normalizing).
//
//   import { Score } from "./trailer-audio.mjs";
//   const s = new Score({ seconds: 50, bpm: 120 });
//   s.organ(0, 4, [50, 57, 62]);            // time (s), duration (s), MIDI notes
//   s.braam(16, 2.5, 38);                   // big trailer hit
//   s.riser(14, 2); s.boom(16);             // riser lands on the boom
//   s.gameAudio("game.wav", { at: 0, gain: 0.7 });   // the game's own SFX/music
//   s.duck(16, { depth: 0.5 });             // music dips under a hit
//   s.silence(31.2, 32);                    // a real gap before the payoff
//   s.write("music.wav");                   // 48 kHz stereo, -14 LUFS, -2 dBTP (still <= -1 after AAC)
//
// Buses: "music" (ducked), "sfx" and "game". Everything shares one cathedral-style reverb.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

// True-peak summary of a file (ffmpeg writes it to stderr).
function spawnTruePeak(file) {
  return spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.toString().split("Summary:")[1] || "";
}

const SR = 48000;
const TAU = 2 * Math.PI;
export const hz = (m) => 440 * 2 ** ((m - 69) / 12);
export const beats = (bpm, n) => (60 / bpm) * n;

export class Score {
  constructor({ seconds, bpm = 120 }) {
    this.seconds = seconds;
    this.bpm = bpm;
    this.n = Math.ceil(seconds * SR);
    const buf = () => [new Float32Array(this.n), new Float32Array(this.n)];
    this.bus = { music: buf(), sfx: buf(), game: buf() };
    this.send = new Float32Array(this.n);
    this.duckCurve = new Float32Array(this.n).fill(1);
    this.gate = new Float32Array(this.n).fill(1);
    this.seed = 7;
  }

  beat(n) { return beats(this.bpm, n); }
  noise() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x3fffffff - 1; }

  // Core voice: gen(tt) -> sample. Envelope: attack, optional exponential decay, release.
  voice(t, dur, gen, { vol = 0.2, a = 0.01, r = 0.2, decay = 0, lp = 0, hp = 0, pan = 0, rev = 0.3, bus = "music", drive = 0 } = {}) {
    const [L, R] = this.bus[bus];
    const start = Math.floor(t * SR), total = Math.floor((dur + r) * SR);
    const aLp = lp ? 1 - Math.exp((-TAU * lp) / SR) : 1;
    const aHp = hp ? 1 - Math.exp((-TAU * hp) / SR) : 0;
    let y = 0, low = 0;
    const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < total; i++) {
      const k = start + i;
      if (k < 0) continue;
      if (k >= this.n) break;
      const tt = i / SR;
      let env = tt < a ? tt / a : 1;
      if (decay) env *= Math.exp(-tt / decay);
      if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / r);
      let x = gen(tt);
      if (drive) x = Math.tanh(x * drive) / Math.tanh(drive);
      y += aLp * (x - y);
      let v = y;
      if (aHp) { low += aHp * (v - low); v -= low; }
      v *= env * vol;
      L[k] += v * gl; R[k] += v * gr;
      this.send[k] += v * rev;
    }
  }

  // --- tonal instruments ---------------------------------------------------
  organ(t, dur, notes, vol = 0.05, { a = 0.18, r = 0.6 } = {}) {
    const draw = [[1, 0.9], [2, 0.55], [3, 0.3], [4, 0.22], [6, 0.12], [8, 0.08]];
    notes.forEach((m, k) => {
      const f = hz(m);
      this.voice(t, dur, (tt) => { let s = 0; for (const [h, w] of draw) s += w * Math.sin(TAU * f * h * tt + h); return s * (1 + 0.04 * Math.sin(TAU * 5.5 * tt)); },
        { vol, a, r, lp: 5000, pan: ((k % 3) - 1) * 0.3, rev: 0.45 });
    });
  }
  choir(t, dur, notes, vol = 0.03) {
    notes.forEach((m) => {
      for (const cents of [-7, 0, 7]) {
        const f = hz(m) * 2 ** (cents / 1200);
        this.voice(t, dur, (tt) => 2 * ((f * tt + 0.003 * Math.sin(TAU * 5 * tt)) % 1) - 1, { vol, a: 0.7, r: 1.0, lp: 1300, pan: (cents / 7) * 0.4, rev: 0.6 });
      }
    });
  }
  strings(t, dur, notes, vol = 0.025, { tremolo = 0 } = {}) {
    notes.forEach((m, k) => {
      const f = hz(m);
      this.voice(t, dur, (tt) => (2 * ((f * tt) % 1) - 1) * (tremolo ? 0.6 + 0.4 * Math.sin(TAU * tremolo * tt) : 1), { vol, a: Math.min(0.8, dur * 0.5), r: 0.5, lp: 2800, pan: k % 2 ? 0.35 : -0.35, rev: 0.5 });
    });
  }
  bell(t, m, vol = 0.12) {
    const f = hz(m);
    for (const [r, w, d] of [[0.5, 1, 3.5], [1, 0.8, 2.6], [1.19, 0.45, 1.8], [1.56, 0.35, 1.4], [2, 0.3, 1.2], [2.51, 0.2, 0.9], [3.01, 0.15, 0.7]]) {
      this.voice(t, 0.01, (tt) => Math.sin(TAU * f * r * tt), { vol: vol * w, a: 0.003, r: d * 1.6, decay: d, rev: 0.7, pan: 0.1 });
    }
  }
  pluck(t, m, vol = 0.05, { duty = 0.25, len = 0.18 } = {}) { // chiptune square
    const f = hz(m);
    this.voice(t, len, (tt) => ((tt * f) % 1 < duty ? 1 : -1), { vol, a: 0.002, r: 0.05, decay: len, lp: 5000, rev: 0.25 });
  }
  bass(t, m, dur = 0.22, vol = 0.12) {
    const f = hz(m);
    this.voice(t, dur, (tt) => Math.sin(TAU * f * tt) + 0.35 * Math.sin(TAU * 2 * f * tt), { vol, a: 0.004, r: 0.05, decay: dur, lp: 900, rev: 0.15, drive: 1.5 });
  }

  // --- percussion -------------------------------------------------------------
  drum(t, vol = 0.5) { // war drum / taiko
    let ph = 0;
    this.voice(t, 0.6, (tt) => { ph += (TAU * (42 + 38 * Math.exp(-tt * 18))) / SR; return Math.sin(ph) + 0.25 * this.noise() * Math.exp(-tt * 30); },
      { vol, a: 0.002, r: 0.05, decay: 0.32, lp: 1800, rev: 0.35, drive: 1.8 });
  }
  kick(t, vol = 0.5) {
    let ph = 0;
    this.voice(t, 0.25, (tt) => { ph += (TAU * (45 + 90 * Math.exp(-tt * 30))) / SR; return Math.sin(ph); }, { vol, a: 0.001, r: 0.03, decay: 0.2, rev: 0.1, drive: 1.5 });
  }
  snare(t, vol = 0.15) { this.voice(t, 0.14, () => this.noise(), { vol, a: 0.001, r: 0.03, decay: 0.12, lp: 6000, hp: 300, rev: 0.25 }); }
  hat(t, vol = 0.04) { this.voice(t, 0.03, () => this.noise(), { vol, a: 0.001, r: 0.01, decay: 0.03, hp: 6000, rev: 0.1, pan: 0.3 }); }
  tick(t, vol = 0.05) { this.voice(t, 0.02, (tt) => Math.sin(TAU * 1760 * tt) + 0.5 * this.noise(), { vol, a: 0.0005, r: 0.04, decay: 0.015, rev: 0.4, pan: 0.25, bus: "sfx" }); }
  heartbeat(t, vol = 0.45) {
    for (const [dt, v] of [[0, 1], [0.16, 0.7]]) this.voice(t + dt, 0.12, (tt) => Math.sin(TAU * (48 + 20 * Math.exp(-tt * 20)) * tt), { vol: vol * v, a: 0.004, r: 0.08, decay: 0.09, lp: 400, rev: 0.15, drive: 2, bus: "sfx" });
  }

  // --- trailer SFX ------------------------------------------------------------
  // Impact: click transient + pitched body + noise tail. Use on on-screen hits.
  impact(t, vol = 0.35) {
    let ph = 0;
    this.voice(t, 0.5, (tt) => { ph += (TAU * (55 + 105 * Math.exp(-tt * 25))) / SR; return Math.sin(ph) + 0.6 * this.noise() * Math.exp(-tt * 40); },
      { vol, a: 0.001, r: 0.05, decay: 0.22, lp: 2500, rev: 0.3, drive: 2, bus: "sfx" });
  }
  // Boom: long sub hit; saturated so phone speakers hear its harmonics.
  boom(t, vol = 0.8) {
    let ph = 0;
    this.voice(t, 3, (tt) => { ph += (TAU * (32 + 40 * Math.exp(-tt * 3))) / SR; return Math.sin(ph) + 0.35 * this.noise(); },
      { vol, a: 0.004, r: 0.3, decay: 1.1, lp: 320, rev: 0.5, drive: 3, bus: "sfx" });
  }
  subDrop(t, vol = 0.5, dur = 1.2) {
    let ph = 0;
    this.voice(t, dur, (tt) => { ph += (TAU * (35 * Math.pow(120 / 35, 1 - tt / dur))) / SR; return Math.sin(ph); }, { vol, a: 0.005, r: 0.1, decay: dur * 0.5, rev: 0.2, drive: 2.5, bus: "sfx" });
  }
  // Braam: detuned low saws with an opening filter; the classic trailer hit.
  braam(t, dur = 2.5, root = 38, vol = 0.09) {
    for (const [m, cents] of [[root, -12], [root, 0], [root, 11], [root + 12, -6], [root + 12, 7], [root + 7, 0]]) {
      const f = hz(m) * 2 ** (cents / 1200);
      let y = 0;
      this.voice(t, dur, (tt) => {
        const cutoff = 220 + 2300 * Math.exp(-tt * 10) + 650; // opens fast, settles ~900 Hz
        const a = 1 - Math.exp((-TAU * cutoff) / SR);
        y += a * ((2 * ((f * tt + 0.004 * Math.sin(TAU * 5 * tt)) % 1) - 1) - y);
        return y;
      }, { vol, a: 0.04, r: 1.2, rev: 0.6, drive: 2.5, bus: "sfx" });
    }
    this.subDrop(t, vol * 4, 1.5);
  }
  // Riser: noise opening upward plus a rising saw; ends dead on t + dur (the hit takes over).
  riser(t, dur = 2, vol = 0.06) {
    let y = 0, ph = 0;
    this.voice(t, dur, (tt) => {
      const p = tt / dur, cutoff = 200 * Math.pow(40, p), a = 1 - Math.exp((-TAU * cutoff) / SR);
      y += a * (this.noise() - y);
      ph += (TAU * hz(50 + 24 * p)) / SR;
      return (y + 0.25 * Math.sin(ph)) * p * p;
    }, { vol, a: 0.01, r: 0.005, rev: 0.4, bus: "sfx" });
  }
  // Whoosh: band-swept noise peaking ~60% in; place its peak on a cut.
  whoosh(t, vol = 0.1, { dur = 0.45, pan = 0 } = {}) {
    let y = 0;
    this.voice(t - dur * 0.6, dur, (tt) => {
      const p = tt / dur, centre = 300 + 2700 * Math.sin(Math.PI * Math.min(1, p * 1.1));
      const a = 1 - Math.exp((-TAU * centre) / SR);
      y += a * (this.noise() - y);
      return y * Math.sin(Math.PI * p);
    }, { vol, a: 0.005, r: 0.02, hp: 150, rev: 0.3, pan, bus: "sfx" });
  }
  scrape(t, dur = 0.55, vol = 0.11) {
    let p = 0;
    this.voice(t, dur, (tt) => { const n = this.noise(), h = n - p; p = n; return h * (0.6 + 0.4 * Math.sin(TAU * 31 * tt)); }, { vol, a: 0.03, r: 0.12, lp: 2400, rev: 0.25, pan: -0.2, bus: "sfx" });
  }

  // --- the game's own audio ---------------------------------------------------
  // Mixes a recorded file (any format ffmpeg reads) onto the "game" bus.
  // clips: [{ from, to, at }] in seconds (source in/out, destination) to follow the edit;
  // speed > 1 for sped-up shots (atempo keeps pitch).
  gameAudio(file, { clips, gain = 0.7 } = {}) {
    const tmp = path.join(os.tmpdir(), `ryft-game-${process.pid}-${Date.now()}.f32`);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", tmp]);
    const raw = new Float32Array(fs.readFileSync(tmp).buffer.slice(0));
    fs.rmSync(tmp);
    const [L, R] = this.bus.game;
    for (const { from, to, at, speed = 1 } of clips ?? [{ from: 0, to: raw.length / 2 / SR, at: 0 }]) {
      const len = Math.floor(((to - from) / speed) * SR), fade = Math.floor((4 / 30) * SR); // 4-frame fades (Lieu)
      for (let i = 0; i < len; i++) {
        const src = Math.floor(from * SR + i * speed), dst = Math.floor(at * SR) + i;
        if (dst < 0 || dst >= this.n || src * 2 + 1 >= raw.length) continue;
        const env = Math.min(1, i / fade, (len - i) / fade);
        L[dst] += raw[src * 2] * gain * env;
        R[dst] += raw[src * 2 + 1] * gain * env;
      }
    }
  }

  // A recorded sample (e.g. from sfx.mjs). align "peak" puts the sample's loudest moment at t
  // (a riser's hit, an impact's crack); "start" puts its first sample at t.
  sample(file, t, { gain = 0.8, align = "peak", bus = "sfx", rev = 0.15, pan = 0 } = {}) {
    this.samples ??= new Map();
    if (!this.samples.has(file)) {
      const tmp = path.join(os.tmpdir(), `ryft-sample-${process.pid}-${this.samples.size}.f32`);
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", tmp]);
      const raw = new Float32Array(fs.readFileSync(tmp).buffer.slice(0));
      fs.rmSync(tmp);
      let peak = 0, at = 0;
      for (let i = 0; i < raw.length; i++) if (Math.abs(raw[i]) > peak) { peak = Math.abs(raw[i]); at = i >> 1; }
      this.samples.set(file, { raw, peakAt: at });
    }
    const { raw, peakAt } = this.samples.get(file);
    const start = Math.round(t * SR) - (align === "peak" ? peakAt : 0);
    const [L, R] = this.bus[bus];
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    for (let i = 0; i < raw.length / 2; i++) {
      const k = start + i;
      if (k < 0 || k >= this.n) continue;
      const l = raw[i * 2] * gain, r = raw[i * 2 + 1] * gain;
      L[k] += l * gl; R[k] += r * gr;
      this.send[k] += ((l + r) / 2) * rev;
    }
    return { peakSeconds: peakAt / SR };
  }

  // --- mix automation ---------------------------------------------------------
  // Dip the music bus under a hit: fast attack, slower release.
  duck(t, { depth = 0.5, attack = 0.03, hold = 0.15, release = 0.5 } = {}) {
    const s = Math.floor(t * SR);
    const a = attack * SR, h = hold * SR, r = release * SR;
    for (let i = 0; i < a + h + r; i++) {
      const k = s + i;
      if (k < 0 || k >= this.n) continue;
      const g = i < a ? 1 - depth * (i / a) : i < a + h ? 1 - depth : 1 - depth * (1 - (i - a - h) / r);
      this.duckCurve[k] = Math.min(this.duckCurve[k], g);
    }
  }
  // True silence (all buses), with short fades so it doesn't click.
  silence(from, to, fade = 0.04) {
    for (let k = Math.floor((from - fade) * SR); k < Math.ceil((to + fade) * SR); k++) {
      if (k < 0 || k >= this.n) continue;
      const t = k / SR;
      const g = t < from ? (from - t) / fade : t > to ? (t - to) / fade : 0;
      this.gate[k] = Math.min(this.gate[k], Math.max(0, Math.min(1, g)));
    }
  }

  reverb() {
    const out = new Float32Array(this.n);
    for (const [ms, fb] of [[47.3, 0.86], [53.9, 0.85], [61.1, 0.84], [67.7, 0.83]]) {
      const d = Math.floor((ms / 1000) * SR), buf = new Float32Array(this.n);
      let lp = 0;
      for (let i = 0; i < this.n; i++) { const prev = i >= d ? buf[i - d] : 0; lp += 0.4 * (prev - lp); buf[i] = this.send[i] + lp * fb; out[i] += prev * 0.25; }
    }
    for (const ms of [8.9, 3.1]) {
      const d = Math.floor((ms / 1000) * SR), x = out.slice(), g = 0.6;
      for (let i = 0; i < this.n; i++) out[i] = -g * x[i] + (i >= d ? x[i - d] + g * out[i - d] : 0);
    }
    return out;
  }

  // Mix, fade the last `fadeOut` seconds, then normalize to delivery loudness with ffmpeg.
  // truePeak defaults to -2: AAC encoding adds up to ~1 dB of overs, and delivery needs <= -1 dBTP.
  write(file, { fadeOut = 0.9, lufs = -14, truePeak = -2, reverbMix = 0.5, gameGain = 1, sfxGain = 1 } = {}) {
    const wet = this.reverb(), pre = Math.floor(0.011 * SR);
    const out = Buffer.alloc(this.n * 8);
    for (let i = 0; i < this.n; i++) {
      const t = i / SR;
      const g = this.gate[i] * (t > this.seconds - fadeOut ? Math.max(0, (this.seconds - t) / fadeOut) : 1);
      for (let c = 0; c < 2; c++) {
        const w = c === 0 ? wet[i] : i >= pre ? wet[i - pre] : 0;
        const v = this.bus.music[c][i] * this.duckCurve[i] + this.bus.sfx[c][i] * sfxGain + this.bus.game[c][i] * gameGain + w * reverbMix;
        out.writeFloatLE(Math.tanh(v * 1.1) * g, i * 8 + c * 4);
      }
    }
    const tmp = path.join(os.tmpdir(), `ryft-mix-${process.pid}-${Date.now()}.f32`);
    fs.writeFileSync(tmp, out);
    const norm = `${tmp}.norm.wav`;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", tmp,
      "-af", `loudnorm=I=${lufs}:TP=${truePeak}:LRA=11`, "-ar", String(SR), "-c:a", "pcm_f32le", norm]);
    // Single-pass loudnorm can overshoot its peak target: measure, then trim the gain if needed.
    const summary = String(spawnTruePeak(norm));
    const tp = Number((summary.match(/Peak:\s+(-?[\d.]+)/) || [])[1]);
    const trim = Number.isFinite(tp) && tp > truePeak ? truePeak - tp : 0;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", norm, "-af", `volume=${trim.toFixed(2)}dB`, "-c:a", "pcm_s16le", file]);
    fs.rmSync(tmp); fs.rmSync(norm);
    return file;
  }
}
