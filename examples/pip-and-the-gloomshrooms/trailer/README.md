# Trailer test run: Pip and the Gloomshrooms

A full run of [`ryft-trailer`](../../../.claude/skills/ryft-trailer/SKILL.md) on the [demo game](../demo-game/index.html), rendered with [`/brag-slim`](https://github.com/latent-spaces/brag). The demo game is a hand-written stand-in, not made on Ryft; the pipeline is the same for a published Ryft link.

[![Trailer poster](brag.jpg)](brag.mp4)

**[Watch the 24s trailer (brag.mp4)](brag.mp4)**

## What was run

1. **Record**: `record.mjs` played the game from [`record-steps.txt`](record-steps.txt) at 1920x1080 (about 45s of raw footage).
2. **Find the moments**: `footage.mjs sheet --every 1` made a contact sheet of the run; the shot list was read off it.
3. **Cut**: `footage.mjs cut` with [`cuts.txt`](cuts.txt) produced 8 clips plus a still of each.
4. **Kit**: [`kit/TRAILER.md`](kit/TRAILER.md) (the cut, beat by beat) and [`kit/PRODUCT.md`](kit/PRODUCT.md) (the game in brag's format) were filled from the templates.
5. **Render**: `/brag-slim` with the game-trailer tone from the skill. Its plan is in [`brag-plan.md`](brag-plan.md) and its post text in [`share-copy.txt`](share-copy.txt).

## The result

- 24.0s, 1920x1080, 30fps, 90% real gameplay
- Cold open on gameplay, three mood cards in the game's voice, cuts on a 120 BPM grid
- A light-circle transition closes on Pip, then a beat of black and silence, then the forest lights up exactly on the music's hit
- Real title screen, then the end card "Play free on Ryft"
- Original chiptune score composed for this trailer (A minor building to a bright C major payoff), no stock music

## What the test taught (now in the skill)

- Scripted runs must stop pressing jump once the run ends, or the game restarts and cuts the win screen short.
- Scripted recordings are about 1 Mbps, slightly softer than OBS. Fine for social; record the hero trailer by hand.
- End cards need a background without in-game text; the win screen's own text collided with the title on the first render.
- A finer contact sheet of a single clip (`--every 0.5`) is the quickest way to find an exact in-point.
