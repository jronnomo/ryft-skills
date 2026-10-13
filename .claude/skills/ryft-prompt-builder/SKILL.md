---
name: ryft-prompt-builder
description: Converts a Game Concept Card or a rough idea into an uploadable design-brief.md plus a short first-build prompt for Ryft. Use when a creator is ready to ask Ryft to build their game for the first time, wants to restart a game with a better prompt, or asks "how should I word this for Ryft?"
---

# Prompt Builder

Write the **first build prompt** for Ryft: the one that creates the game from nothing. A good first prompt gets a playable core in one shot. A bad one gets a pretty screen that doesn't play right.

If the creator doesn't have a Game Concept Card yet, either run `ryft-idea-spark` first or ask for the minimum: **what the player does, how they win, how they lose, and what it looks like.**

## Rules for a good first prompt

1. **Build the smallest fun version.** One level, one screen, or one endless mode. Leave content and extras for later prompts. Say so in the prompt: "Just one level for now."
2. **Lead with the verb.** The first sentence says what the player does.
3. **Be concrete about feel.** "Jumps about 3 times the player's height, falls faster than it rises" beats "good jumping."
4. **Name everything.** Names keep the AI consistent across reprompts.
5. **List controls explicitly**, including touch if it should work on phones.
6. **Spell out every screen**: title, playing, pause, game over, win.
7. **Use numbers** for speeds, counts, sizes and timings where they matter. Approximate is fine.
8. **Say what NOT to do** when there's an obvious wrong guess ("no gravity, it's top-down").
9. **Stay inside Ryft's box:** 2D, browser, no accounts, no online play, no automatic saving.
10. **Keep it scannable.** Short headed sections and bullets.
11. **Put the detail in an upload, not the prompt box.** Ryft accepts `.md` and `.png` uploads. Save the full spec as `design-brief.md` and keep the typed prompt to a few lines that point at it.
12. **Keep the brief tight.** Aim for a brief around 4 KB and an art bible around 2.5 KB. Everything in them should matter for *this* build.

## Package it: brief + short prompt

Produce up to three things for the creator:

1. **`design-brief.md`**: the template below, filled in. This is the full spec.
2. **`art-bible.md`** (optional but recommended): from `ryft-art-director`, if the look matters to them. If they just want to get going, put the "LOOK & SOUND" section in the brief and do the art bible later.
3. **The typed prompt**, short:

```text
Build the game described in design-brief.md. Just the first level for now.
<If uploaded:> Use art-bible.md for every asset and follow its style rules.
<If uploaded:> ref-<name>.png is inspiration. Take <what> from it, not <what>.
Start by making the controls and the win/lose rules work. Those matter most.
```

If the creator can't upload files for some reason, paste the brief directly into the prompt instead.

**If the brief is getting long, or Ryft rejects or ignores parts of it,** shrink in this order (and see "Prompt size" in `ryft-platform.md`):
1. Cut "Later" ideas and anything not in the first level
2. Turn sentences into bullets and drop filler words
3. Move the art bible to a second prompt ("Now restyle all assets using art-bible.md")
4. Split the build: prompt 1 = player, controls, rules, screens; prompt 2 = enemies, pickups, polish

## Template (design-brief.md)

Fill this in from the concept card. Drop any section that doesn't apply.

```text
Make a 2D <genre> browser game called "<Title>".

THE GAME
<One-liner: the player does X to achieve Y while Z.>
Just build one <level/screen/mode> for now. I'll add more later.

PLAYER: <Hero name>
- Looks like: <one line>
- Moves: <speed, jump height, special ability, with rough numbers>

CONTROLS
- Keyboard: <keys>
- Touch: <on-screen buttons / tap / swipe>, or "desktop only"

WORLD
- View: <side-on scrolling / top-down / single screen>
- Layout of this first level: <short description, start → challenges → goal>

ENEMIES & HAZARDS
- <Name>: <behaviour, speed, what happens on contact>

PICKUPS
- <Name>: <effect>

RULES
- Win: <condition>
- Lose: <condition>
- Score: <how points are earned>, shown top-left
- Lives/health: <number, how shown>

SCREENS
- Title screen with the game name and "Press Space / Tap to start"
- Pause with P / Escape
- Game over screen with score and "Try again"
- Win screen

LOOK & SOUND
- Style: <pixel art / flat shapes / ...>
- Colours: <palette>
- Juice: <screen shake on hit, particles on pickup, short sound effects for jump/hit/collect>

DON'T
- <the obvious wrong guess to avoid>
```

## After writing it

1. Read it back to the creator as a short summary: "This asks Ryft for: one level, Pip can run and jump, Gloomshrooms patrol, collect 10 spores to open the exit."
2. Remind them what to **check first** when the build comes back:
   - Can I start the game?
   - Do the controls do what I expect?
   - Can I win? Can I lose?
   - Does anything crash or freeze?
3. Tell them to note what's wrong instead of fixing it all at once, then use `ryft-iterate`.
4. Suggest saving the prompt as "Prompt 1" in their `GAME.md`, and keeping `design-brief.md` up to date as the game changes. It's the best thing to upload if they ever need to rebuild.

## If the first build comes back badly broken

If the core loop doesn't work at all (can't move, nothing happens, wrong genre), it's often faster to **start over with a better first prompt** than to repair it. Find what the AI misunderstood, add a sentence that rules it out, and rebuild.
