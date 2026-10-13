---
name: ryft-level-designer
description: Designs levels, stages, waves, or puzzles for a Ryft game as text maps and prompts the AI builder can follow, with a difficulty curve that teaches before it tests. Use when a creator's core game works and they want more levels, a world map, a boss, or better difficulty progression.
---

# Level Designer

Help the creator grow one working level into a full game that ramps up well, and describe each level in a way Ryft can build reliably.

**Prerequisite:** the core loop should already be fun in one level. If it isn't, go back to `ryft-iterate`.

## 1. Inventory the toolbox

List every element the game already has, using the established names: terrain, hazards, enemies, pickups, mechanics. New levels should mostly **remix existing elements**. Each new element is a new thing that can break.

## 2. Plan the arc

Use the classic **teach → test → twist** rhythm. For each new element:

1. **Teach** it somewhere safe (a gap over solid ground, an enemy alone on flat floor)
2. **Test** it with mild pressure
3. **Twist** it by combining it with something the player already knows

Default plan for a short game (adjust to their length):

| # | Purpose | Introduces |
|---|---|---|
| 1 | Learn to move and win | core verb only |
| 2 | First threat | main enemy |
| 3 | Combine | enemy + terrain |
| 4 | Breather / reward | lots of pickups, low danger |
| 5 | New mechanic | one new element |
| 6 | Mastery | everything, tighter |
| 7 | Finale / boss | a test of the core verb |

Group levels into **worlds** of 3–5 if the game is longer. Each world gets a visual theme and one new element. Worlds also make natural **password checkpoints** (`ryft-password-save`).

## 3. Describe each level

For grid-based games (platformers, top-down, puzzles), give Ryft an **ASCII map plus a legend**. Keep maps small (≤ 40 wide, ≤ 15 tall) and every row the same width.

```text
LEVEL 3: "Mushroom Bridge"
Goal: reach the door (D). Teaches: Gloomshrooms (G) on narrow platforms.

Legend: # ground   = platform   P player start   D exit door
        G Gloomshroom (walks back and forth)   * spore pickup   ^ spikes

..............................*.........
.......................======.......D...
..........*....====.............######..
.P.....======.........G.................
#####..........^^^^^^^^^^^^......#######
#####^^^^^^^^^^##############^^^^#######
```

For non-grid games (shooters, runners, clickers), describe levels as **waves or a timeline**:

```text
LEVEL 2: "Asteroid Drizzle" (90 seconds)
0–20s:  small asteroids from the top, slow, 1 every 2s
20–50s: add medium asteroids that split into 2 small ones
50–80s: speed up 25%, 1 every 1s
80–90s: no spawns, "Level clear!" when screen is empty
```

For puzzle games, describe the **starting state, the solution, and the one idea** the puzzle teaches. Always solve it yourself first and include the solution for testing.

## 4. Prompt Ryft for levels

Put level maps in an uploaded **`levels.md`**. Uploaded files keep exact spacing better than a pasted prompt. Add levels **one or two at a time**, so each can be played and fixed before the next. Keep a master file of all levels, but upload only the new ones.

```text
I've uploaded levels.md with one new level. Add it after level 2, using its map and legend exactly.
When the player reaches the door, go to the next level. Show "Level 3: Mushroom Bridge"
for 2 seconds at the start. Keep levels 1 and 2 and all player controls exactly the same.
```

If the game doesn't have a level system yet, add that first, on its own:

```text
Add a level system: levels are played in order, reaching the exit loads the next level,
and the current level number is shown top-right. After the last level, show the win screen.
For now, the existing level is level 1. Don't change how level 1 plays.
```

## 5. Difficulty checks

After each level is built, ask the creator:
- Did you beat it on your first or second try? (Early levels should be yes.)
- Did any death feel *unfair*, i.e. something you couldn't see coming?
- Was there any part where you didn't know where to go?

Unfair deaths and confusion are fixed before difficulty is raised. If a playtester (friend, kid, sibling) is available, watching them play silently is the best test there is.
