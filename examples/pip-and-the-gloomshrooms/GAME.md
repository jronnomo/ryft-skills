# Pip and the Gloomshrooms

> A worked example: one creator's path from a half-formed idea to a published
> Ryft game, using every skill in this repo. Use it as a template for your own `GAME.md`.

## Where it started

> "I want something cozy but kind of spooky? Like a little guy in a mushroom forest at night."

`ryft-idea-spark` asked five questions. The key moment was the **verb** question. The
creator picked "jump between" from the options, and the twist came from "glowing spores
light up the dark."

---

# Game Concept Card: Pip and the Gloomshrooms

**One-liner:** A tiny firefly named Pip must hop through a pitch-dark mushroom forest, collecting spores to light the way, before the Gloomshrooms snuff out the glow.

**Genre:** platformer
**View:** side-on, scrolling left to right
**Controls:** ←/→ or A/D to move, Space/W to jump. Touch: left/right buttons bottom-left, jump button bottom-right

## Core loop
1. Hop between mushroom caps in the dark
2. Collect glowing spores, each one widens the circle of light around Pip
3. The light slowly shrinks over time, so keep moving and keep collecting

## Cast
- **Pip**: a round yellow firefly with tiny wings, about one tile tall
- **Gloomshroom**: a purple mushroom that walks back and forth and dims Pip's light by half on contact
- **Spore**: a small green glowing dot that grows the light radius

## Win / lose
- **Win:** reach the glowing door at the end of the level
- **Lose:** the light shrinks to nothing

## The twist
The level is dark. You only see what your light reaches. Spores are both score and vision.

## Look and sound
Chunky pixel art. Palette: midnight blue `#0b1026`, mushroom purple `#6b3fa0`, spore green `#7dff9a`, firefly yellow `#ffd84a`. Soft chimes for spores, a low "bwomp" for Gloomshroom hits.

## Scope
- **First build:** one level, ~3 screens wide
- **Later:** 6 more levels in 2 worlds, a dash upgrade, a boss Gloomshroom
- **Needs save codes?** yes, once there are 7 levels

---

## Prompt log

**Prompt 1** (from `ryft-prompt-builder` + `ryft-art-director`): first build, one level.
Uploads: `design-brief.md`, `art-bible.md`, `ref-forest-mood.png` (the creator's own night-forest photo, used for palette and glow only).
Result: playable! Light circle works. Jump feels floaty. Spores sometimes spawn inside mushrooms. Pip came out orange, not yellow.

**Prompt 2** (`ryft-iterate`, bug): spores must spawn in open air, above platforms. Upload: `fix-spore-in-mushroom.png`, spore circled.
Result: fixed.

**Prompt 2b** (`ryft-art-director`, drift): Pip back to firefly yellow `#ffd84a` with a glowing belly, per the art bible. Upload: `fix-pip-color.png`.
Result: fixed, and the same Pip asset is now used everywhere.

**Prompt 3** (`ryft-iterate`, feel): faster fall than rise; release jump early for short hops. Keep max height.
Result: much better.

**Prompt 4** (`ryft-iterate`, juice): green particle burst + chime on spore pickup, small screen shake on Gloomshroom hit.
Result: feels great. Kept.

**Prompt 5** (`ryft-level-designer`): added a level system, existing level becomes level 1.
**Prompts 6–9**: levels 2–7, one or two at a time, each uploaded as `levels.md`. World 2 reuses `tile-mushroom-cap` recoloured as `tile-mushroom-cap-ice` instead of new tiles.

**Prompt 10** (`ryft-password-save`, approach A): uploaded `password-save.md` on its own. Codes at each level intro and pause screen.

```text
gameId: "pip-gloomshrooms"   version: 0
fields:
  level    max 7
  lives    max 5
  hasDash  max 1
```

Result: 4-character codes (small state = tiny code), e.g. `B3PM` for level 3, 2 lives, dash unlocked. Tested: close tab → reopen → continue works.

**Prompt 11** (`ryft-publish-ready`): added mute button and "thanks for playing" screen.

## Listing

**Title:** Pip and the Gloomshrooms
**Short description:** Light the dark one spore at a time. Hop a firefly through a haunted mushroom forest before your glow goes out.
**Tags:** platformer, cozy, spooky, short, keyboard, mobile

## To do
- [ ] Dash recharge feels slow, try 25% faster
- [ ] Boss Gloomshroom for level 7
