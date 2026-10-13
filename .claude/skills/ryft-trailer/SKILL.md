---
name: ryft-trailer
description: Makes video-game-style trailers, teasers, gameplay previews and "made in N prompts" build montages for Ryft games. Plans the shots like a game trailer editor, captures gameplay (human screen recording or a scripted browser recorder), cuts clips with ffmpeg, and packages a trailer kit that the /brag skill renders, steered away from product-launch style and toward game previews. Use when a creator wants a trailer, teaser, preview video, GIF, or footage to promote a game they're building or have published on Ryft.
---

# Trailer

Make the kind of video that sells a game: **gameplay first, escalating, ending on "Play now."** Not a product launch. Nobody wants feature cards and claims about a platformer. They want to see the jump.

The pipeline:

```
plan the cut → capture gameplay → cut clips → build trailer-kit/ → render with /brag → share
  (this skill)   (creator or record.mjs)  (footage.mjs)  (TRAILER.md + PRODUCT.md)  (brag-slim)
```

`/brag` ([latent-spaces/brag](https://github.com/latent-spaces/brag)) is the renderer: motion, music, titles, encoding. This skill is the **director**. Brag's defaults are built for product launches (hook → reveal → feature highlights → punchline, upbeat business music), so everything here exists to override them with game-trailer grammar.

## 1. Pick the format

| Format | Length | Shape | Use it for |
|---|---|---|---|
| **Teaser** | 10–15s, vertical 9:16 | one mechanic, one moment, title, "Play now" | TikTok, Shorts, Reels, "coming soon" |
| **Gameplay trailer** | 30–45s, 16:9 | full escalation (below) | the main trailer, YouTube, Ryft listing, Discord |
| **Loop** | 4–6s GIF/MP4, no text | the single best moment, loops cleanly | listing preview, README, chat |
| **Made in N prompts** | 20–30s, either | build log: prompt 1 → finished game | showing off the creation process and Ryft itself |

If they're unsure: a gameplay trailer for a published game, a teaser while it's still being built.

## 2. Game trailer grammar

These rules override brag's launch-video shape. Put them in `TRAILER.md` (template next to this file).

- **Cold open on gameplay.** First frame is the game in motion, not a logo or a title card. The first 2 seconds should show the core verb.
- **At least 70% real gameplay.** Every shot is real footage of the actual game. Never fake gameplay, mock UI, or show anything the game doesn't do.
- **Escalate.** Calm → rising → chaos. Each beat bigger than the last: more enemies, faster cuts, bigger moments.
- **Cut on the music.** Cuts land on beats. Shots get shorter as the trailer builds (2s → 1s → half-second flashes before the drop).
- **Text is mood, not features.** 2–5 short cards in the game's voice: *"The forest is dark." "Your light is fading."* Never: "Features 7 levels!", "Intuitive controls", "Streamline".
- **Show the twist.** The one thing that makes this game different gets its own clear, readable shot.
- **Title reveal late.** Around 70–80% in, after the biggest moment, often with a hard cut to black or silence first.
- **The button.** After the title, one last short gameplay moment (a joke, a near miss, a cliffhanger).
- **End card:** logo/title + **"Play free on Ryft"** + the game's link. Hold it 2–3s.
- **Sound is the game's.** Music fits the game's world: chiptune for pixel art, synthwave for neon, strings for a storybook, drums for action. Use the game's own sound effects when the recording has them. No corporate "happy business" beds.

### Beat sheet: gameplay trailer (~40s)

| Time | Beat | Shots |
|---|---|---|
| 0–3s | **Cold open** | the core verb, clean and readable |
| 3–8s | **The world** | 1–2 atmosphere shots + mood card #1 |
| 8–18s | **The twist** | the unique mechanic, shown clearly; mood card #2 |
| 18–30s | **Escalation** | enemies, hazards, new areas, faster cuts; mood card #3 |
| 30–33s | **The big moment** | boss, biggest jump, closest call; then a beat of silence |
| 33–36s | **Title reveal** | logo / title |
| 36–38s | **The button** | one last funny or tense moment |
| 38–42s | **End card** | "Play free on Ryft" + link |

Teaser: cold open (3s) → twist (5s) → title (3s) → end card (2s).

Made in N prompts: rough first build with "Prompt 1" → 4–6 fast before/after jumps through the log ("Prompt 4: it learned to glow") → finished gameplay at full speed → title → "Made in 11 prompts on Ryft" → end card. Captions come from the `GAME.md` prompt log; the build-log stills are the footage.

## 3. Shot list

Write the shot list before recording, so the creator knows what to capture. Pull from the concept card, the art bible and the level plan. Typical shots by genre:

- **Platformer:** first jump, longest jump, a near-miss over a hazard, enemy stomp, new world reveal, boss, the exit/goal
- **Shooter:** first wave, screen full of bullets, power-up pickup, biggest explosion, boss pattern, last-second dodge
- **Puzzle:** a clean "aha" solve, a chain reaction, a hard board before/after, a failure that's funny
- **Runner:** speed-up moment, narrow escape, combo streak, the crash
- **Top-down adventure:** exploring, finding an item, a fight, a secret, a new area, a boss door
- **Always:** title screen, the twist mechanic, a win, a fail that's fun to watch

## 4. Capture

**A. The creator records (best for gameplay).** A human playing looks alive in a way a script can't.
- Mac: Cmd+Shift+5 → "Record Selected Portion" around the game. Note: this doesn't capture game audio. Use OBS (free, Mac/Windows) to get sound too.
- Windows: Win+Alt+R (Xbox Game Bar) records the window with sound. OBS works too.
- Make the game big (fullscreen or a large window), hide the mouse if it's not used, and record **several runs**. Good moments come from volume.
- Record at 1080p or more and keep raw files. Don't edit or compress before cutting.

**B. The scripted recorder (menus, title screens, puzzles, build stills).** `scripts/record.mjs` opens the game in a headless browser, plays a list of inputs and records it:

```text
wait 1
snap title-screen
click
press Space
hold ArrowRight 1.2
hold ArrowRight+Space 0.4
snap mid-jump
```

```bash
node scripts/record.mjs "<game-url>" steps.txt raw/run1.mp4 --size 1920x1080
```

It can't react to the screen, so action gameplay will look robotic. Use it for the "Made in N prompts" stills: run the same `snap` script against each build as it's made (or on the published link) and save them as `build-log/NN-prompt-N.png`. Shared Ryft game URLs open and play directly, so point it at the published link.

**C. During development**, remind the creator (via `ryft-iterate`) to grab a screenshot after each prompt. It's free footage for a build montage later.

## 5. Cut the clips

`scripts/footage.mjs` (needs ffmpeg):

```bash
# 1. Contact sheet: a frame every 2s, 5 per row. Tile k is at 2*k seconds.
node scripts/footage.mjs sheet raw/session.mov work/sheet.jpg --every 2
```

Look at the sheet (it's an image you can read) to find the shot-list moments, then write `cuts.txt`:

```text
# start-end  name           (a few seconds of padding helps brag)
0:04-0:09    cold-open-jump
0:31-0:37    twist-light-shrinks
1:12-1:16    gloomshroom-swarm
2:40-2:47    boss
```

```bash
# 2. Cut: H.264 30fps clips + a still from each
node scripts/footage.mjs cut raw/session.mov cuts.txt trailer-kit

# 3. Loop format: GIF from the best clip
node scripts/footage.mjs gif trailer-kit/clips/01-cold-open-jump.mp4 trailer-kit/loop.gif --seconds 5
```

Check the stills: any clip that isn't instantly readable as a frozen frame gets re-cut or dropped.

## 6. Build the trailer kit

Create `trailer-kit/`. This is the "project" that `/brag` will read:

```
trailer-kit/
  TRAILER.md      the cut: format, beats, shots → clips, text cards, music, end card
  PRODUCT.md      the game, in brag's PRODUCT.md format (register: game)
  README.md       one-paragraph pitch + "Play free on Ryft: <link>"
  clips/          gameplay clips from footage.mjs
  stills/         one still per clip
  art/            logo/title art, key art, hero sprite (exported from Ryft assets or screenshots)
  build-log/      per-prompt screenshots (Made in N prompts only)
```

Fill `TRAILER.md` and `PRODUCT.md` from the templates next to this file, using `GAME.md`, the art bible (exact palette hexes) and the listing from `ryft-publish-ready`. Every beat in `TRAILER.md` names the clip it uses. Never invent a moment the clips don't show.

## 7. Render with /brag

Install once, if missing (Claude Code): `/plugin marketplace add latent-spaces/brag`, then `/plugin install brag@brag`. Requires Node 22+ and ffmpeg. `/brag-slim` builds everything itself, including a soundtrack written for the project, with no bundled business music, which is why it's the better fit for games. On Opus 5.5, `/brag` hands off to it automatically.

From inside `trailer-kit/`:

```text
/brag-slim --format landscape --duration 40 --tone "video game gameplay trailer: cold open on gameplay, escalating cuts on the beat, mood text cards, late title reveal, end card 'Play free on Ryft'. Follow TRAILER.md exactly. This is a game trailer, not a product launch: no feature cards, no claims, no SaaS language. Use the gameplay clips in clips/ as the footage, at least 70% of runtime. Music: <style from TRAILER.md>."
```

Teaser: `--format vertical --duration 15`. Square loop for feeds: `--format square --duration 6`.

Review what brag returns against `TRAILER.md`:
- Does it open on gameplay, not a title?
- Is it mostly real footage?
- Does the music fit the game's world?
- Are the text cards mood lines, not features?
- Does it end on "Play free on Ryft" + link?

Ask brag to re-roll any scene that drifts toward launch-video style.

**Without brag:** deliver `loop.gif`, the clips, and the stills. They're still useful for the listing and social posts. Or open the clips in any editor (CapCut, iMovie, DaVinci Resolve) with `TRAILER.md` as the edit plan.

## 8. Share

Brag writes `share-copy.txt`. Make sure it reads like a game post: the hook in the game's voice, then "Play free on Ryft: <link>". Plan more than one post: the teaser while building, the trailer at launch, the "Made in N prompts" cut a few days later for a second wave, and the loop GIF anywhere a link preview shows.

## Rules

- Ryft allows recording and sharing gameplay, so post freely. When a trailer or montage features someone else's Ryft game, credit the creator by name and link their game.
- Music: brag-slim's generated score, the game's own audio, or a track the creator has rights to. Nothing ripped from other games or songs.
- Show the game as it is. A trailer that oversells gets bad comments.
