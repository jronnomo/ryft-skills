# Contributing

Thanks for helping more people make games! This repo is a collection of skills: Markdown instructions that teach an AI assistant how to help Ryft creators.

## Ways to help

- **Share what works.** Found a prompt phrasing Ryft follows reliably, or one it always misreads? Open an issue or PR against the relevant skill.
- **Correct platform facts.** Everything we assume about Ryft lives in
  [`ryft-platform.md`](.claude/skills/ryft-game-director/ryft-platform.md). Lines marked *(assumed)* especially need confirmation.
- **Add an example.** A real `GAME.md` from your project (idea → prompts → result) in `examples/` teaches more than any guide.
- **Propose a new skill.** Some ideas: genre-specific prompt packs (puzzle, shooter, rhythm), art-style vocabulary, sound design, accessibility, kid-friendly mode.

## Writing a skill

Each skill is a folder at `.claude/skills/<skill-name>/` with a `SKILL.md`:

```markdown
---
name: ryft-<something>
description: What it does and, most importantly, WHEN to use it. The assistant reads this to decide whether to load the skill.
---

# Title

Instructions for the assistant...
```

Guidelines:

- **Write for beginners.** The person on the other end may be 10 years old or have never made a game.
- **Give templates and examples**, not just advice. A fill-in-the-blank prompt beats a paragraph of tips.
- **One job per skill.** Hand off to other skills by name instead of duplicating them.
- **Stay inside Ryft's box:** 2D, browser, no save data (unless `ryft-platform.md` says otherwise).
- **Use uploads.** Long specs go in a `.md` file the creator uploads; visual problems get an annotated `.png`. Add any new upload file to the conventions table in `ryft-platform.md`.
- Name new skills `ryft-<verb-or-noun>` and add them to the table in the README and the routing table in `ryft-game-director`.

## Code

`ryft-password-save/reference/password.js` must stay dependency-free and work pasted into a browser `<script>` tag. `password-save.md` (the upload version) is generated from it. Run the build and tests before opening a PR:

```bash
npm run build   # regenerate password-save.md
npm test        # run tests on both versions + check the upload is in sync
```

If you change the encoding, existing games' codes will break. Only do that behind a new `version`.

The trailer scripts in `ryft-trailer/scripts/` need ffmpeg. `npm test` covers `footage.mjs`; the recorder needs a browser, so it has its own test:

```bash
npx playwright install chromium
npm run test:record
```
