---
name: ryft-trailer
description: Makes video-game-style trailers, teasers, gameplay previews and "made in N prompts" build montages for Ryft games, following professional game-trailer craft (gameplay first, genre then hook then content, the game's own sound effects, readable shots, title last). Plans the cut by genre, captures gameplay (human recording, or a scripted browser recorder with the game's audio and 2x stills), cuts clips with ffmpeg, writes a trailer kit that /brag-slim renders, and self-grades against a rubric before delivery. Use when a creator wants a trailer, teaser, preview video, GIF, or footage to promote a game they're building or have published on Ryft.
---

# Trailer

Make the kind of video that sells a game: **gameplay first, the hook early, escalation, title and "Play free on Ryft" last.** Not a product launch.

**Read [`references/trailer-craft.md`](references/trailer-craft.md) before planning.** It holds the rules working trailer editors follow (Derek Lieu, Kert Gartner, Chris Zukowski, Valve), with numbers: structure, length by genre, text, sound, shots, transitions, genre playbooks, a self-grading rubric and QC.

```
plan the cut → capture → find moments → build trailer-kit/ → render (/brag-slim) → grade → deliver
  (genre playbook)  (record.mjs --audio --scale 2)  (footage.mjs)  (TRAILER.md)  (trailer-audio.mjs)  (rubric)
```

`/brag-slim` ([latent-spaces/brag](https://github.com/latent-spaces/brag)) renders. This skill directs. Brag's defaults are product-launch shaped; `TRAILER.md` overrides them.

## 1. Pick the format

| Format | Length | Use it for |
|---|---|---|
| **Gameplay trailer** | by genre: arcade 30–45 s, action/roguelike/deckbuilder 45–75 s, puzzle/cozy/strategy/narrative 60–75 s | the main trailer, Ryft listing, YouTube, Discord |
| **Teaser** | 10–20 s, vertical 9:16 | TikTok, Shorts, Reels |
| **Loop** | 4–6 s, no text | listing preview, README, chat |
| **Made in N prompts** | 20–30 s | showing the creation process and Ryft itself |

## 2. Plan the cut (genre → hook → content)

Find the game's genre row in the playbook table (`references/trailer-craft.md` §7), then answer before touching footage:

1. **Core verb:** what the player does, shown in the first 2 seconds.
2. **Genre signal:** the shot that makes the genre obvious by 5 s.
3. **Hook:** the one mechanic that breaks the formula. It lands by a third of the way in, isolated and readable, shown twice.
4. **Escalation:** 3–5 layers, each bigger (enemies, areas, palettes, stakes). Save the flashiest for last.
5. **Failure:** one death, miss or near-miss (it makes the game look skilful).
6. **Payoff:** the biggest moment, then silence, then the title.

Default shape (scale to the length):

| Share | Beat | Notes |
|---|---|---|
| 0–10% | **Open** | Core verb in motion, punched in so it reads on a phone. No logo, no lore. |
| 10–35% | **Genre + hook** | One short genre/fantasy card max; the hook isolated, then shown again |
| 35–75% | **Build** | One new layer per section; cut rate rises; contrasting areas |
| 75–90% | **Climax** | Biggest moment or failure; music stops 0.5–1.5 s before the title |
| 90–100% | **Title, button, end card** | Title; one last moment; "Play free on Ryft" + link held 3 s |

**Text cards** (§3 of the reference): 2–5 words, sell the fantasy or the hook in the game's voice ("EVERY CARD WEARS WITH USE"), plain words in fast montages. **Never lore** ("In a world…"), never feature bullets. Style them like the game's own UI. Each line fully visible ≥ 0.3 s/word (1.2 s minimum).

## 3. Capture

**Which capture fits the game:**

| Playstyle | Capture |
|---|---|
| Turn-based, card, puzzle, strategy, menus, idle, visual novel | Scripted recorder: plays whole runs reliably |
| Real-time action, platformer, shooter, rhythm, racing | The creator records (A). The script can't react to the screen, so it dies or looks robotic. Use the recorder only for title screens, menus and stills. |
| Any | `snap` stills at `--scale 2` for crisp punch-ins on characters, cards, UI |

**A. The creator records (best for real-time action).** OBS (free) records the game with sound. Fullscreen, hide the mouse, record many runs. Keep game sound effects on; the game's music can be off.

**B. The scripted recorder.** `scripts/record.mjs` plays the game in a headless browser from a list of inputs:

```bash
node scripts/record.mjs "<game-url>" steps.txt raw/run.mp4 --size 1920x1124 --audio --scale 2
```

- **`--audio`** records the game's own sound (Web Audio), synced to the picture within one frame by a clapperboard flash at the start (the first ~1 s of every `--audio` recording is that flash; cut it). Game SFX are the best percussion a trailer has.
- **`--scale 2`** renders at 2× device pixels, so every `snap` still is twice as sharp. Use stills for punch-ins on cards, text and UI (video upscaling looks soft). Video stays at `--size`.
- Steps: `wait s`, `click [x y]`, `press Key`, `hold Key[+Key] s`, `type text`, `snap name`.

**Recording a published Ryft game:**
- **Use the embed URL** `https://ryft.fun/embed/games/<id>` (the code before the slug: `gjgk90` in `/games/gjgk90-ashen-rite`).
- Record at `--size 1920x1124` and crop Ryft's 44 px player bar: `ffmpeg -i raw.mp4 -vf crop=1920:1080:0:44 raw-crop.mp4`.
- Start with `wait 20` (loading). `click` inside the game before any keys (it's an iframe). For `--audio`, also click Ryft's unmute button (`click 1679 21` at 1920 wide).
- Read the game's controls first (F2). Keyboard shortcuts beat pixel clicks. Turn-based and card games script whole runs well.
- `snap` liberally: every turn's hand, each character, each area. Stills are cheap and become the crispest shots.
- Check the first snaps before trusting a long run (Ryft maintenance page, focus problems).
- Don't keep pressing Space/Enter after a win or death screen if you need it on screen: many games restart on it.

**C. During development**, `ryft-iterate` reminds the creator to screenshot after each prompt: footage for a "Made in N prompts" cut.

## 4. Find the moments

`scripts/footage.mjs` (ffmpeg):

```bash
node scripts/footage.mjs sheet raw/run-crop.mp4 work/sheet.jpg --every 4     # tile k = 4k seconds
node scripts/footage.mjs sheet trailer-kit/clips/05-x.mp4 work/s.jpg --every 0.5  # pin an exact frame
node scripts/footage.mjs cut raw/run-crop.mp4 cuts.txt trailer-kit             # clips + stills
node scripts/footage.mjs gif trailer-kit/clips/01-x.mp4 trailer-kit/loop.gif --seconds 5
```

Read the sheets (they're images): find the core verb, the hook, every area/enemy, the failure, the biggest moment. Use the best 1%. A frozen frame that isn't instantly readable gets reframed or dropped.

**Find the hits.** Sound onsets in the game audio are the most reliable marker of on-screen action (`ffmpeg -i game.wav -af "asetnsamples=n=2400,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level" -f null -` and look for jumps). If the game flashes characters on damage, colour spikes in the battle area (`signalstats` VAVG) confirm them. Put trailer impacts on the real hits, not just on the beat.

**Make every shot readable on a phone:**
- Punch in on the action (crop the region, integer 2× zoom; nearest-neighbour for pixel art). Wide UI-heavy frames lose the viewer.
- For cards and text, use the 2× `snap` stills with a slow push (5–10% over the shot).
- Show a changing mechanic with a **match cut**: the same framing early and late (clean hand → worn hand).
- Speed up slow, turn-based stretches (1.5–3×); cut out the thinking, keep the outcomes.
- **Don't crop on top of the game's own camera moves.** Many games punch in on a spell or a hit for a few frames. A crop on top of that doubles the zoom and clips the HUD. Check a shot frame by frame (`sheet clip.mp4 s.jpg --every 0.2`) and show those moments full frame.
- **Skip misplays.** Scripted runs make mistakes ("Not enough energy", a wasted turn). Pick in-points that avoid error messages: a viewer reads them as sloppy play.

## 5. Build the trailer kit

```
trailer-kit/
  TRAILER.md      the cut: beats → clips/stills (in-points, lengths), cards, transitions, sound cues
  PRODUCT.md      the game, in brag's PRODUCT.md format (register: game)
  README.md       pitch + "Play free on Ryft: <link>"
  clips/ stills/  from footage.mjs
  snaps/          2× stills from record.mjs
  audio/          the game's own audio from the recording
  art/            cover art / logo (download the og:image from the game page)
```

Fill `TRAILER.md` and `PRODUCT.md` from `templates/`. Every beat names its source. Never invent a moment the footage doesn't show.

## 6. Render with /brag-slim

Install once: `/plugin marketplace add latent-spaces/brag`, `/plugin install brag@brag` (Node 22+, ffmpeg). From inside `trailer-kit/`:

```text
/brag-slim --format landscape --duration <s> --tone "video game gameplay trailer per TRAILER.md and references/trailer-craft.md: gameplay in the first 2 s, genre then hook then content, plain short cards in the game's style, cuts on the beat, silence before the title, end card 'Play free on Ryft'. Not a product launch: no feature cards, no claims. Real gameplay is the footage. Mix the game's own SFX from audio/ into the score."
```

**Or render it directly with `scripts/cut.mjs`** (what brag-slim does by hand, as one tested command). Write one `timeline.mjs` (shots back to back on the beat grid, cards, end card, flashes, the game's UI `STYLE`), score it, then:

```bash
node scripts/cut.mjs timeline.mjs trailer.mp4 --music music.wav
```

It renders every shot to an exact frame count (video with crops/dim/blur, stills with push-ins, black), draws the cards and end card, mixes, and prints a QC report (frames, unplanned black, frozen picture, flashes per second, LUFS, true peak), failing if anything is out of spec. One timeline driving picture, text and sound is what keeps everything in sync. See `examples/` for timelines.

**Real sound effects:** they're the biggest audio upgrade over synthesis. `scripts/sfx.mjs` searches Freesound for real recorded impacts, whooshes and ambience (CC0 and CC BY only by default) and keeps a `CREDITS.md` of every sound used. Mix them in with `trailer-audio.mjs`: `s.sample(file, t)` puts a sample's **loudest moment** on `t` (a riser's hit, an impact's crack land on the cue), or `{ align: "start" }` for things like card slides and bells. Needs a free `FREESOUND_API_KEY`.

```bash
node scripts/sfx.mjs search "heavy sword impact" --max 2
node scripts/sfx.mjs get 123456 654321 --out trailer-kit/audio/sfx     # + CREDITS.md
```

Put CC BY credits wherever the trailer is published (the post's reply, the Ryft listing).

**Sound:** build the score with `scripts/trailer-audio.mjs` (organ, choir, strings, bells, chiptune plucks, drums, braams, risers, whooshes, booms, sub drops, the game's audio placed per clip, ducking, real silence, −14 LUFS master). Pick a BPM with whole frames per beat (90, 100, 120, 150). Put on-screen hits on SFX cues, duck the music under them, and stop the music before the title.

Teaser: `--format vertical --duration 15` (reframe per §8 of the reference). Loop: `--format square --duration 6`.

## 7. Grade, then deliver

**Get a second opinion that listens.** `scripts/review.mjs` sends the render to Google Gemini, which watches *and hears* it. It scores the same rubric and answers mix questions stills can't (does the score clash with the game's music, do hits land, is the silence real). It's advisory: compare it with your own grade, fix what you both flag, and still have a person watch it.
- **Trust its specific notes more than its total.** In practice it scores generously (it gave a cut 20/20 that the rubric gave 18), but its timestamped fixes were real: a too-dense card screen, and a misplay message nobody had noticed.
- **Use it across versions.** Run it on each cut. The useful signal is which notes disappear and which new ones appear.
- **Free tier quirks:** the Pro alias is often out of quota and models get busy. The script retries busy models and falls back down a list automatically. Needs `GEMINI_API_KEY`; the upload is deleted afterwards.

```bash
node scripts/review.mjs trailer.mp4 --brief trailer-kit/TRAILER.md --out review.json
```

Score the render with the rubric in `references/trailer-craft.md` §9 (opening, genre clarity, hook timing, escalation, readability, text, sound, sync, ending, honesty). **Ship at ≥ 16/20, with no zeros**; otherwise fix the lowest scores and re-render. Run the QC list (§10): black/freeze detection, loudness, flashes, a muted look on a phone-sized frame.

Deliver the video, the poster frame (also baked in as frame 0), `share-copy.txt` (the hook in the game's voice + "Play free on Ryft: <link>"), and the grade.

**Without brag:** deliver `loop.gif`, clips and stills, with `TRAILER.md` as the edit plan for any editor.

## Rules

- Ryft allows recording and sharing gameplay. When featuring someone else's Ryft game, credit the creator and link it.
- Music: the generated score, the game's own audio, or a track the creator has rights to. Nothing ripped.
- Show the game as it is. No mock-ups, no moments that didn't happen.

Examples: [`examples/pip-and-the-gloomshrooms/trailer/`](../../../examples/pip-and-the-gloomshrooms/trailer/).
