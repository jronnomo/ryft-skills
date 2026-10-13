# Ryft Skills

**Open-source AI skills that help anyone turn an idea into a game on [Ryft](#about-ryft), even if they've never written a prompt.**

Ryft builds 2D browser games from text prompts. That's magic when you know what to ask for, and a blank box when you don't. These skills give your AI assistant (Claude Code, Claude.ai, or any agent that supports `SKILL.md` skills) the know-how of a patient game designer: they interview you about your idea, write the prompts and upload files for Ryft, give your game a consistent look, help you fix what's broken with annotated screenshots, design levels, add retro save codes, and get the game ready to publish.

```
 "a little guy in a          Game Concept      First build      play → fix →       levels,       published
  spooky mushroom forest"  →     Card       →    prompt     →    reprompt     →  save codes  →    game
       idea-spark          art-director       prompt-builder      iterate        level-designer  publish-ready
                                                                                 password-save
```

## The skills

| Skill | Use it when… | You get |
|---|---|---|
| [`ryft-game-director`](.claude/skills/ryft-game-director/SKILL.md) | You're starting out or wondering "what next?" | A guide that routes you to the right step |
| [`ryft-idea-spark`](.claude/skills/ryft-idea-spark/SKILL.md) | You have a vibe, not a plan, or no idea at all | A one-page **Game Concept Card** |
| [`ryft-art-director`](.claude/skills/ryft-art-director/SKILL.md) | You care how it looks, have reference art, or a character drifts off-model | An uploadable **art bible**: style rules + named, reusable assets |
| [`ryft-prompt-builder`](.claude/skills/ryft-prompt-builder/SKILL.md) | You're ready for Ryft's first build | An uploadable **design brief** + a short first prompt |
| [`ryft-iterate`](.claude/skills/ryft-iterate/SKILL.md) | Something's broken, feels off, or is missing | One precise **reprompt** at a time, with **annotated screenshots** for visual bugs |
| [`ryft-level-designer`](.claude/skills/ryft-level-designer/SKILL.md) | The core works and you want more of it | An uploadable **levels.md** with ASCII maps and a difficulty curve |
| [`ryft-password-save`](.claude/skills/ryft-password-save/SKILL.md) | Players need to come back later | NES-style **continue codes**, no save data needed |
| [`ryft-publish-ready`](.claude/skills/ryft-publish-ready/SKILL.md) | You think it's done | Stranger-test checklist + **title, description, tags** |

See [`examples/pip-and-the-gloomshrooms`](examples/pip-and-the-gloomshrooms/GAME.md) for a full walk-through from idea to listing, and start your own from [`templates/GAME.md`](templates/GAME.md).

## Built around Ryft's uploads

Ryft accepts `.md` and `.png` uploads and generates reusable assets natively, so the skills keep the typed prompt short and put the detail in files:

| Upload | From | What it does |
|---|---|---|
| `design-brief.md` | prompt-builder | The full spec for the first build |
| `art-bible.md` | art-director | Style rules + one name per asset, so Ryft reuses instead of redrawing |
| `ref-*.png` | art-director | Inspiration: sketches, mood boards. Always paired with "take X, not Y" |
| `fix-*.png` / `good-*.png` | iterate, art-director | Annotated screenshots of what's wrong, and what right looks like |
| `levels.md` | level-designer | Exact level maps, one or two at a time |
| `password-save.md` | password-save | The save-code module, ready to upload |

## Password saves, the old-school way

Ryft games don't keep save data. So we borrowed a trick from the 8-bit era: at each checkpoint the game shows a code like `K7QM-2HXA`. Type it back in later and you're on the same level with the same lives and items.

[`ryft-password-save`](.claude/skills/ryft-password-save/SKILL.md) ships a small, dependency-free, tested JavaScript module ([`password.js`](.claude/skills/ryft-password-save/reference/password.js)), plus a compact copy ready to upload to Ryft ([`password-save.md`](.claude/skills/ryft-password-save/password-save.md), 3.6 KB). The module:

- packs any list of fields (level, lives, upgrades…) into the fewest bits possible
- adds a checksum salted per game, so typos and codes from other games are rejected
- scrambles the result, so level 1 and level 2 codes look nothing alike
- uses 32 symbols with no look-alikes (`0/O`, `1/I`)

```js
const pw = createPasswordSystem({
  gameId: "pip-gloomshrooms",
  fields: [{ name: "level", max: 7 }, { name: "lives", max: 5 }, { name: "hasDash", max: 1 }],
});
pw.encode({ level: 3, lives: 2, hasDash: 1 }); // → "B3PM"
pw.decode("b3pm");                             // → { level: 3, lives: 2, hasDash: 1 }
```

## Install

### Claude Code

Copy the skills into your personal skills folder so they're available in every project:

```bash
git clone https://github.com/jronnomo/ryft-skills.git
cp -R ryft-skills/.claude/skills/ryft-* ~/.claude/skills/
```

Or open Claude Code inside this repo, and the skills load automatically.

Then just talk: *"I want to make a Ryft game about a raccoon in a supermarket"* or run `/ryft-game-director`.

### Claude.ai

Zip any skill folder (e.g. `ryft-idea-spark/`) and upload it under **Settings → Capabilities → Skills**.

### Other assistants

Each `SKILL.md` is plain Markdown with a short YAML header. Paste it into any assistant's custom instructions or project knowledge.

## About Ryft

Ryft is a platform where creators describe a game in a prompt and a trained AI builds it, then iterate (prompt, build, test, reprompt) until it's ready to publish to the platform. Games are currently 2D and browser-based.

This is a **community project and is not affiliated with Ryft**. Everything the skills assume about the platform lives in one file, [`ryft-platform.md`](.claude/skills/ryft-game-director/ryft-platform.md). If Ryft changes, that's the place to update.

## Contributing

Ideas, new skills, and better prompts are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
