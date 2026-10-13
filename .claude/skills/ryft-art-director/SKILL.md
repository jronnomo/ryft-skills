---
name: ryft-art-director
description: Gives a Ryft game a consistent look by building an art bible (style rules + a named, reusable asset list) to upload as Markdown, guiding which reference/inspiration PNGs to upload and how to describe them, and fixing characters or textures that drift off-model. Use when a creator wants to define or change their game's look, generate characters/tiles/textures/backgrounds, reuse assets across levels, turn a sketch or mood board into game art, or says "my character looks wrong/different".
---

# Art Director

Ryft generates assets and textures natively and can reuse them across the game. That's powerful and easy to make messy: without direction you get five slightly different heroes and a grass tile that changes every level. Your job is to give Ryft **one source of truth for the look** and **one name per asset**, then keep everything on-model.

## When to run this

- **Before or with the first build** if the creator cares about the look (most do). The art bible uploads alongside the design brief.
- **When adding content** (new world, new enemy), to add entries to the asset list first.
- **When something drifts** ("Pip looks different in level 3").

## Step 1: Find the look

Ask about style the same way `ryft-idea-spark` asks about gameplay: one question at a time, with concrete options.

1. **Style family:** chunky pixel art (16×16 / 32×32), clean flat vector, hand-drawn storybook, neon outline, paper cut-out, monochrome handheld, painterly backgrounds with simple sprites
2. **Mood in three words:** e.g. *cozy, spooky, glowing*
3. **Palette:** offer 3 palettes of 4–6 hex colours that fit the mood, or pull one from their reference image
4. **Proportions:** chibi (big head), realistic, tiny-on-big-world
5. **Outlines and lighting:** dark outline / no outline / coloured outline; flat / soft shading / strong light source

### Using reference images

If the creator has inspiration (a sketch, a photo, a screenshot of a game they love, a mood board), have them upload it as a PNG and **always say what to take from it**, because the builder can't guess:

```text
I've uploaded ref-forest-mood.png as inspiration.
Take from it: the deep blue night colours, the soft glow around light sources, the round shapes.
Don't take: the characters or the exact scene. Our hero and world are our own.
```

Good references:
- **Their own sketches.** Even a phone photo of a doodle is great for a character's silhouette.
- **Mood boards:** colours, lighting, textures, real-world photos.
- **"Feel" screenshots** of other games, used for camera, scale or palette only.

Steer away from uploading another game's characters, logos or art to be copied. Their game will be published publicly. Use references for *feel*, and make the characters original.

## Step 2: Write the art bible

Produce `art-bible.md` in this format for the creator to save and upload:

```markdown
# Art Bible: <Game Title>

## Style rules
- Style: <e.g. 32×32 pixel art, 1px dark outline, no anti-aliasing>
- Mood: <three words>
- Palette (use only these): <name #hex>, <name #hex>, ...
- Light: <direction and style, e.g. "glow from light sources only; the world is dark">
- Proportions: <e.g. characters 1 tile tall, round and chunky>
- Never: <e.g. gradients, realistic textures, thin lines>

## Assets
Every asset has ONE name. Always reuse the asset with that name; never redraw it.

### Characters
| Name | Size | Description | Animations |
|---|---|---|---|
| Pip | 1×1 tile | round yellow firefly, tiny white wings, big black eyes, glowing belly | idle (bob), run, jump, hurt (flash) |

### Enemies
| Name | Size | Description | Animations |
|---|---|---|---|

### Tiles & textures
| Name | Description | Used in |
|---|---|---|
| tile-mushroom-cap | purple cap top, white spots, tileable left/right | all forest levels |

### Backgrounds
| Name | Description | Layers |
|---|---|---|

### Items & UI
| Name | Description |
|---|---|

## Reference images
- ref-<name>.png: take <what>; ignore <what>
```

Rules for a good asset list:
- **Name things like files:** `tile-moss-ground`, `bg-forest-far`, `item-spore`. Characters can use their story names (`Pip`).
- **Describe the silhouette and 2–3 distinctive details.** These are what keep a character recognisable.
- **Tileable textures say so** ("tiles seamlessly left/right").
- **Reuse before adding.** A new world can recolour existing tiles (`tile-mushroom-cap` → `tile-mushroom-cap-ice`, same shape, ice palette) instead of inventing new ones.
- **Keep it short.** The first build needs only the hero, one enemy, one or two tiles, one background and one pickup.
- **Keep it lean,** around 2.5 KB for the first build, one line per asset. As the game grows, upload only the style rules plus the rows the prompt is about, so Ryft focuses on what's changing.

## Step 3: Prompt Ryft with it

First build (alongside `design-brief.md` from `ryft-prompt-builder`):

```text
I've uploaded art-bible.md. Generate every asset in it following its style rules,
and use those assets everywhere in the game. Refer to them by their names.
```

Adding assets later: add the rows to `art-bible.md` (your master copy), but upload a small `art-new.md` with just the **style rules + new rows**. That keeps the prompt focused:

```text
I've uploaded art-new.md with the style rules and one new asset: "Bramblebug".
Generate only Bramblebug in the same style as Pip and the Gloomshroom.
Don't change any existing assets.
```

Reusing assets:

```text
Build level 4 using only existing assets: tile-mushroom-cap, tile-moss-ground,
bg-forest-far, and the Gloomshroom. Don't generate new tiles.
```

## Step 4: Fix drift with screenshots

When an asset comes out wrong or changes between levels, show, don't tell:

1. Screenshot the problem. Crop it to the asset if possible.
2. Mark it up: circle it, arrow + a word ("too thin", "wrong colour"). Any image editor or phone markup tool works.
3. Name the file for what it shows: `fix-pip-level3.png`.
4. If you have a screenshot where it looked **right**, upload that too (`good-pip-level1.png`). A before/after pair is the strongest fix.

```text
I've uploaded fix-pip-level3.png and good-pip-level1.png.
In level 3, Pip (circled) is thinner and orange instead of yellow, and lost the glowing belly.
Pip should look exactly like in good-pip-level1.png, matching the art bible.
Use that one Pip asset in every level. Keep everything else the same.
```

Always describe in words what the markup means. Don't rely on the image alone.

## Step 5: Keep it in sync

The art bible is a living file. Every time an asset is added, renamed or changed, update `art-bible.md` and note it in `GAME.md`'s prompt log. When starting any new art prompt, re-upload the current version.
