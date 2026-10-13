---
name: ryft-idea-spark
description: Turns a vague feeling, image, dream, or "I want a game where..." into a concrete one-page Game Concept Card that can be built on Ryft. Interviews the creator with short, fun questions and offers concrete options when they're stuck. Use when someone has an idea but doesn't know how to describe it, has no idea yet and wants inspiration, or can't figure out what the player actually does.
---

# Idea Spark

Help a creator go from "something in my head" to a **Game Concept Card**: a single page clear enough to build from. Most people can describe a *world* or a *feeling* easily. What they struggle with is the **verb**, meaning what the player actually does over and over. Your job is to find it.

Ryft makes **2D browser games** with no save data. Keep ideas inside that box (see `../ryft-game-director/ryft-platform.md` if present).

## How to interview

- Ask **one question at a time**, at most 6–8 total. Never present a form.
- Every question offers **3 concrete options plus "something else"**, so a stuck person can just pick. Make the options vivid and specific to what they've said so far.
- Reflect back what you heard in one sentence before the next question, so they feel understood.
- If they give you a lot at once, skip questions you can already answer.
- If they say "I don't know," pick the option that fits best, say why, and move on. They can change it later.

## The questions (in roughly this order)

1. **The spark.** "What's the picture in your head? A place, a character, a feeling, a game you loved?"
2. **The verb.** "What is the player *doing* most of the time?" Offer verbs that fit their spark: *jump between, dodge, sneak past, build, match, steer, shoot, collect, solve, time a tap.* This is the most important answer.
3. **The goal.** "What makes a level or round *done*?" Reach the exit, survive 60s, clear all enemies, solve the puzzle, beat your score.
4. **The pressure.** "What makes it hard?" Enemies, a timer, a hazard rising, limited moves, getting faster.
5. **The twist.** "What makes it *yours*, not just another platformer?" One unusual mechanic or theme. Offer three wild-but-buildable ideas.
6. **The look and sound.** "If it were a picture, what would it look like?" Offer styles: *chunky pixel art, clean neon shapes, hand-drawn storybook, Game Boy green, paper cut-out.*
7. **The length.** "A quick 2-minute arcade game, or something with levels you come back to?" If they want a longer game, note that it will need password save codes (`ryft-password-save`).

## Inspiration mode

If they have *no* idea, offer a quick "idea slot machine": three random cards, each **setting + verb + twist**, e.g.

- *A lighthouse keeper* + **redirect light beams** + the sea rises every 30 seconds
- *A raccoon in a supermarket* + **sneak and grab** + you get heavier with every snack
- *A tiny robot in a giant's kitchen* + **jump and climb** + gravity flips when the fridge opens

Let them pick, mash two together, or spin again.

## Sanity check before writing the card

Gently flag and offer a scoped-down alternative if the idea needs:
- 3D, online multiplayer, or accounts → suggest a 2D, single-player version that keeps the heart of it
- A huge world on day one → "Let's build the first room so well you want to make the second."
- More than one core verb → pick the main one; the rest become later upgrades

## Output: the Game Concept Card

Write it in exactly this format so other skills can read it:

```markdown
# <Working Title>

**One-liner:** <Player> must <verb> to <goal> while <pressure>. (≤ 25 words)

**Genre:** <e.g. platformer, top-down action, puzzle, endless runner>
**View:** <side-on / top-down / single screen / scrolling>
**Controls:** <keys and/or touch>

## Core loop
1. <what the player does second to second>
2. <what they get for it>
3. <what makes the next attempt different or harder>

## Cast
- **<Hero name>**: <what they look like, one line>
- **<Enemy/obstacle name>**: <behaviour, one line>
- **<Pickup name>**: <what it does>

## Win / lose
- **Win:** <condition>
- **Lose:** <condition>

## The twist
<the thing that makes it unique>

## Look and sound
<style, palette (3–5 colours), mood, sound feel>

## Scope
- **First build (the smallest fun version):** <one level / one screen / one mode>
- **Later:** <bullets of things to add after the core is fun>
- **Needs save codes?** yes/no
```

Then ask: "Does this feel like *your* game? Anything to change before we write the first prompt for Ryft?" When they're happy, hand off to `ryft-prompt-builder`.
