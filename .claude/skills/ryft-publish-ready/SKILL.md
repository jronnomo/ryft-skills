---
name: ryft-publish-ready
description: Final pass before publishing a game on Ryft. Runs a pre-publish playtest checklist, suggests last polish prompts, and writes the title, short description, how-to-play text, and tags for the listing. Use when a creator says their game is done, is about to publish, or wants their game page to attract players.
---

# Publish Ready

Get the game from "works for me" to "a stranger can pick it up and have fun", then write a listing that makes people click.

## 1. The stranger test

A new player knows nothing. Go through this with the creator and turn every "no" into a reprompt (via `ryft-iterate`, one at a time):

**First 10 seconds**
- [ ] The title screen says what to press to start
- [ ] Controls are shown on the title screen or the first level
- [ ] The first level teaches the main action without text walls

**Playing**
- [ ] The player always knows what the goal is
- [ ] Every death has a visible cause
- [ ] Score / lives / timer are readable at a glance
- [ ] Pause works (P / Esc, and a touch button if touch is supported)
- [ ] Nothing gets stuck: enemies in walls, unwinnable states, soft-locks

**Ending**
- [ ] Losing shows a game over screen with "Try again", and retrying works
- [ ] Winning shows a win screen. Players love a "thanks for playing"
- [ ] If the game has password codes, they work after closing and reopening the tab

**Plays inside an X post** (Ryft games play in X's 480×480 player card)
- [ ] Run `node .claude/skills/ryft-x-launch/scripts/feed-check.mjs <game-url> out/` and read its advice
- [ ] The game fills most of the square; text is readable on a phone
- [ ] One tap starts; it works muted; a run fits in a minute or two
- [ ] The cover art reads as a thumbnail (it's what people see before tapping)

**Devices**
- [ ] Works in at least two browsers
- [ ] If touch is supported: playable on a phone, buttons are big enough, nothing hidden under the thumb
- [ ] If touch isn't supported: say "keyboard required" in the description

**Feel (optional polish, one prompt each)**
- [ ] Sound on key actions (jump, hit, collect, win), with a mute button
- [ ] A little juice: particles, screen shake on hits, a flash when damaged
- [ ] A simple title screen that matches the art style

## 2. Write the listing

Use the Game Concept Card and change log. Produce:

```markdown
**Title:** <2–4 words, memorable, says something about the game>
Alternatives: <two more options>

**Short description (≤ 140 chars):**
<Hook with the verb + the twist. No "this is a game where...">

**Long description:**
<2–3 short sentences: the fantasy, what you do, what makes it different.>

**How to play:**
- <Key/touch> to <action>
- Goal: <one line>
- <Password note if any: "Write down the code at each level to continue later.">

**Tags:** <genre>, <mood>, <mechanic>, <length e.g. "short", "5 minutes">, <controls e.g. "keyboard", "mobile">
```

Good short descriptions lead with action and twist:
- ✅ "Leap between rooftops as a ghost cat. Every jump makes the city darker."
- ❌ "This is a platformer game I made about a cat."

## 3. Thumbnail tip

If the platform uses a screenshot or cover image, pick a moment **mid-action**, with the hero, a threat and something colourful on screen together, not the title screen.

## 4. After publishing

Suggest the creator:
- Watch someone play it, or read comments, and log what confuses people
- Launch it on X with `ryft-x-launch`: the game link plays right inside the post.
- Share it: the game's link works anywhere. Make a trailer or a looping preview with `ryft-trailer`, since a short gameplay clip is the best way to get people to click
- Keep `GAME.md` for an update: the next version starts with `ryft-iterate`
- If they change the password fields in an update, bump the version and tell players old codes won't work
