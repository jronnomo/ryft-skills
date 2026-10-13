---
name: ryft-iterate
description: Runs the play → observe → reprompt loop for a Ryft game. Turns messy playtest reactions ("it feels weird", "the guy falls through stuff", "make it more fun") into one precise, safe reprompt at a time (with annotated screenshot uploads for visual problems), and keeps a change log. Use whenever a creator has a Ryft build and wants to fix a bug, change how something feels, or add a feature.
---

# Iterate: the Build Loop

Once a game exists, every prompt is an **edit**. Edits are where working games break, so the job here is to make each reprompt small, precise, and protective of what already works.

## The loop

```
play for real → write down what you saw → pick ONE thing → reprompt → play again → log it
```

## Step 1: Get a real playtest report

Ask the creator to play for 2–3 minutes and tell you what happened. If they only give feelings, dig with quick questions:

- "What were you trying to do when it felt wrong?"
- "What did you expect to happen, and what happened instead?"
- "Does it happen every time, or only sometimes? Where?"
- "Is it *broken* (a bug), *off* (a feel/balance problem), or *missing* (a new feature)?"

Translate vague words into specifics:

| They say | Usually means | Ask/propose |
|---|---|---|
| "floaty" | gravity too low or jump lasts too long | faster fall, shorter hang time |
| "slippery" | too much acceleration/slide | stop within a few pixels when keys released |
| "too hard" | unfair hits, too fast, too many enemies | which part, exactly? reduce one thing |
| "boring" | no pressure, no variety, no reward | add one of: timer, new enemy, combo, pickup |
| "janky" | stutter, popping, collisions | where? what was on screen? |
| "it doesn't feel good" | missing feedback ("juice") | sound + particles + small screen shake on key actions |

## Step 2: Triage

Sort everything into a list and pick **one** item. Priority order:

1. **Can't play**: crashes, can't start, can't move, can't win
2. **Breaks the rules**: falling through floors, enemies not hurting, score wrong
3. **Feel**: controls, speed, difficulty
4. **Missing features**
5. **Polish**: art, sound, effects

Bugs before features. Don't add a boss while the player can fall through the floor.

## Step 3: Write the reprompt

Use this shape:

```text
<CHANGE ONE THING>: <what's wrong now>. It should <what it should do instead>.
Details: <specifics, numbers, where it happens>.
Keep everything else the same, especially <things that work and must not change>.
```

Examples:

```text
Fix a bug: when Pip lands on the edge of a moving platform, Pip falls through it.
Pip should always stand on platforms when any part of Pip's feet touches them,
including the moving ones in the second half of the level.
Keep everything else the same, especially the jump height and the level layout.
```

```text
Change how jumping feels: right now it's floaty. Make Pip fall about twice as fast
as Pip rises, and if the jump key is released early, cut the jump short so small
hops are possible. Keep the maximum jump height the same.
```

```text
Add one feature: a dash. Pressing Shift (or a new "Dash" touch button) moves Pip
quickly forward about 4 tiles over a quarter second, with a short white trail.
It can be used once, then recharges when Pip touches the ground.
Keep all existing controls and levels the same.
```

### Show it: screenshot fixes

Ryft accepts PNG uploads, and for anything **visible** a screenshot beats a paragraph: a character that looks wrong, a misaligned platform, an unreadable HUD, an enemy in the wrong spot, a texture seam.

1. **Capture the moment.** Pause the game at the problem and take a screenshot (Windows: Win+Shift+S, Mac: Cmd+Shift+4, phone: power+volume).
2. **Mark it up.** Circle the problem and add an arrow or one or two words. Red stands out on most games.
3. **One problem per image**, named for what it shows: `fix-spikes-overlap.png`.
4. **Add a "good" image** when something used to look right: `good-hud-level1.png`.
5. **Still say it in words.** The image shows *where*; the words say *what's wrong* and *what it should be*.

```text
I've uploaded fix-spikes-overlap.png. The spikes (circled) are drawn on top of the
ground tiles and stick out sideways. Spikes should sit on top of the ground,
exactly one tile wide each, with no overlap. Keep the level layout the same.
```

Feel problems (floaty, slippery, too fast) don't show in a still image. Describe those in words, with numbers where possible. For **looks** that drift across the game (a character, a tile set, the palette), use the drift-fix steps in `ryft-art-director` and update the art bible.

Rules:
- **One change per prompt.** Two small, tightly related changes are okay when they're the same system (e.g. jump rise + fall).
- **Always include the "keep" line**, naming the things they love.
- **Use the established names** from the concept card.
- **Keep it small.** A focused reprompt is usually a few sentences. If it's turning into several paragraphs, it's probably more than one change.
- **Describe the behaviour, not the code.** Unless the creator knows the code, don't guess at variable names.

## Step 4: Verify and log

After the build, have them check:
1. Is the thing fixed/changed?
2. Did anything that worked before break? Quickly replay start → win → lose.

Then add a line to the change log in `GAME.md`, and suggest grabbing **one screenshot of the game after each prompt** (`build-log/07-prompt-7.png`). It takes seconds, and later it becomes the footage for a "made in N prompts" video (`ryft-trailer`).

Change log line:

```
Prompt 7: Dash added (Shift / touch). Works. Recharge feels slightly long, revisit later.
```

## When things go sideways

- **The fix broke something else:** reprompt to restore the broken thing and name the fix as something to keep. Don't stack a third change on top.
- **Same bug after two tries:** rephrase from a different angle. Describe the exact moment it fails and what the player sees, or ask Ryft to simplify the system ("Replace the moving platform logic with a simpler version: …").
- **The game has drifted far from the vision:** compare against the concept card, list what drifted, and fix the most important drift first. If it's very far gone, consider rebuilding with an updated `design-brief.md` (`ryft-prompt-builder`) that includes everything you've learned, plus the current `art-bible.md` so the assets come back the same.
