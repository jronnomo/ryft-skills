# What we know about Ryft

> **Maintainers:** this file holds every assumption the skills make about the
> platform. When Ryft changes or you learn something new, update it here first.
> Lines marked *(assumed)* have not been confirmed against official docs.

## Confirmed by creators

- Creators describe a game in a text prompt; a trained AI builds it.
- The loop is: prompt → build → play/test → reprompt with edits → repeat.
- Ryft publishes finished games to the platform for others to play.
- Games are **2D** and run **in the browser**.
- Games have **no built-in save data**. Players start fresh each visit.
- **Game URLs work when shared.** A published game's link opens and plays directly in a browser.
- **Ryft games play inside X posts.** A game link posted on X renders as a playable **player card** (checked on a live game, 2026-10: `twitter:card=player`, `twitter:player=https://ryft.fun/embed/games/<id>`, **480×480**, and the embed's security policy lists `x.com`/`twitter.com` in `frame-ancestors`). The card shows the game's cover art until played. Ryft's player bar takes the top 44 px and starts **muted**. **Confirmed playable inside X** by a Ryft creator who played Ryft games in X posts (2026-10-14).
- Recording games and sharing gameplay footage (trailers, clips, streams, social posts) is allowed.
- Ryft **generates assets and textures natively** (characters, tiles, backgrounds, items), and those assets can be **reused throughout a game**.
- Creators can **upload `.md` files and `.png` images** alongside prompts, to:
  - **fix** things, e.g. a screenshot showing a character or feel that's wrong
  - **inspire** things, e.g. reference art, mood boards, sketches
  - **specify** things, e.g. a design brief, level maps, a style guide written in Markdown

## Working assumptions

- Each reprompt edits the existing game rather than starting over. *(assumed)*
- The builder understands plain English best; structured lists help it follow everything. *(assumed)*
- Very long prompts get partially ignored; focused prompts work better. *(assumed; true of most AI builders)* Long detail belongs in an uploaded `.md`, with the prompt pointing to it.
- Assets are best reused when referred to by a **consistent name**. *(assumed)*
- Arrows, circles and labels drawn on an uploaded screenshot are read by the builder. *(assumed)* Always say in words what the markup means too.
- Ryft used to cap a prompt at **8,192 bytes**. That limit appears to have been lifted. *(unconfirmed)* See "Prompt size" below.
- An uploaded `.md` can carry code (such as the password module) for the builder to use. *(assumed)*
- Players may be on desktop **or** a phone, so games should say which controls they support. *(assumed)*
- Persistent storage such as accounts, cloud saves or `localStorage` cannot be counted on. *(assumed)* This is why `ryft-password-save` uses typed codes.

## What this means for prompts

Things that are safe to ask for:

- Single-screen and scrolling 2D games: platformers, top-down adventures, shooters, puzzle games, endless runners, card/board games, clickers, rhythm and timing games
- Generated art in a consistent style: characters, enemies, tiles, textures, backgrounds, items, UI
- Screen shake, particles, sound effects
- Title screen, pause, game over, win screen, a HUD (score, lives, timer)
- Keyboard, mouse, and touch controls

Things to avoid or scope down:

- 3D anything
- Online multiplayer, leaderboards, accounts (unless Ryft adds them)
- Saving progress automatically. Use password codes instead
- Huge open worlds in the first prompt. Start with one room, one level, one screen
- Uploading someone else's characters or art to copy. Reference images are for **mood, palette and style**, not for cloning (games are published publicly)

## Designing for the X player card

The card is a 480×480 square on a phone. Measured on a live 16:9 game (`feed-check.mjs`):
- the game filled only **~54%** of the card (letterboxed to ~480×259),
- everything was drawn at **~24%** of its 1080p size (body text ≈ 5 px: unreadable),
- Ryft's loading screen showed at ~1 s and the game at ~4.5 s.

So for games meant to spread on X *(the rules below are recommendations; whether Ryft's builder honours a square layout is unconfirmed)*:
- Ask for a **square (1:1) or responsive layout** that fills the play area.
- **Big type and big targets**: at 480 px, text needs to be drawn at ≥ 16 px *in the card*.
- **One tap starts**; touch controls first; no keyboard-only input.
- **Works muted**: sound is off until the player unmutes.
- **A satisfying loop in 30–90 s**, ending on a shareable result (a score, a password code: "beat my run").
- **Fast first screen**: the game visible within ~5 s; a static title appears first.

Run `node .claude/skills/ryft-x-launch/scripts/feed-check.mjs <game-url> out/` to measure a game before posting it.

## Prompt size

Ryft previously limited one prompt (typed text plus uploaded `.md` files) to 8,192 bytes. Creators report that limit has been lifted, but this hasn't been confirmed. Either way, **focused prompts get better results than huge ones**, so the skills still aim for:

| Prompt | Contents | Rough size |
|---|---|---|
| First build | short prompt + `design-brief.md` + `art-bible.md` | brief ~4 KB, art bible ~2.5 KB |
| Reprompt / fix | typed prompt (+ PNGs) | under 1 KB |
| New levels | short prompt + `levels.md` with 1–2 levels | 2–4 KB |
| New assets | short prompt + only the **new** art-bible rows | under 2 KB |
| Password saves | short prompt + `password-save.md` (3.6 KB) | ~4 KB |

If Ryft ever rejects or truncates a prompt for length, check its size with `node scripts/budget.js --limit <bytes> prompt.txt file.md ...` (in `ryft-game-director`) and split it into two prompts: build the core, then add the rest. Sizes are in bytes. Plain ASCII is 1 byte per character, but emoji take 4 and arrows/accents/curly quotes take 2–3.

## Upload conventions used by these skills

| File | Made by | Purpose |
|---|---|---|
| `design-brief.md` | `ryft-prompt-builder` | Full spec for the first build |
| `art-bible.md` | `ryft-art-director` | Style rules + named asset list |
| `levels.md` | `ryft-level-designer` | Level maps and legends |
| `password-save.md` | `ryft-password-save` | Save-code module + instructions |
| `fix-<thing>.png` | `ryft-iterate` | Annotated screenshot of a problem |
| `ref-<thing>.png` | `ryft-art-director` | Inspiration / reference image |
