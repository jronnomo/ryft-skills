---
name: ryft-password-save
description: Adds retro-style password / continue codes to a Ryft game so players can resume where they left off without any save data. A game shows a short code like "K7QM-2HXA" at checkpoints, and entering it later restores the exact level and state. Use when a Ryft game is long enough that players need to come back, or when a creator asks about saving, continuing, checkpoints, or level select.
---

# Password Save Codes

Ryft games have no save data. The old-school fix, used by *Mega Man*, *Metroid* and *Castlevania*, is a **password**: at a checkpoint the game shows a short code, the player writes it down, and next visit they type it in to continue from exactly that point.

The code *is* the save file. Everything the game needs to restore is packed into it.

## Step 1: Decide what to save

Ask what must be true when the player comes back. Keep it small, because every field makes the code longer.

| Usually save | Usually skip |
|---|---|
| Level / world reached | Exact player position (restart at level start) |
| Lives or max health | Enemy positions |
| Key items, upgrades, unlocked abilities (yes/no each) | Timers mid-level |
| Coins or score, **rounded** (e.g. in hundreds) | Exact score down to the point |
| Difficulty setting, chosen character | Anything cosmetic |

Codes are generated **at checkpoints only**: the start of a level or world, or a "save point" object. Restoring puts the player at that checkpoint.

For each field, pick the **maximum value** it can ever have:

```text
level      max 31   (5 bits)
lives      max 7    (3 bits)
hasDash    max 1    (yes/no)
hasKey     max 1
coins      max 99   (stored as coins ÷ 10, rounded down)
```

Code length grows with the total. Rough guide: up to ~20 bits of state gives a 7-character code, ~35 bits gives 10. Under 12 characters is comfortable to write down.

## Step 2: Choose an approach

**A. Upload the module (recommended).** Upload `password-save.md` (next to this file). It holds the tested module from `reference/password.js`, minus comments, plus instructions for the title-screen "Continue" and code display. It's about 3.6 KB. Send it in **its own prompt** with nothing else uploaded, so the builder focuses on just this. The typed prompt only needs the game-specific part:

```text
Add password saves using the uploaded password-save.md, exactly as written.
createPasswordSystem({ gameId: "<unique-game-slug>", fields: [
  { name: "level", max: 31 }, { name: "lives", max: 7 }, { name: "hasDash", max: 1 }
]})
State to save at each level start: <which game values map to which fields,
e.g. coins = coins / 10 rounded down>. Keep all gameplay the same.
```

**B. Plain-English spec.** If Ryft only takes descriptions, describe the system and let the builder implement it:

```text
Add a password save system (like old NES games). No browser storage.
- Save state = level (0–31), lives (0–7), hasDash (yes/no), hasKey (yes/no), coins ÷ 10 (0–9).
- Pack those values into a number, add a checksum so random codes are rejected,
  and show it as a code of letters and digits, leaving out 0, O, 1 and I
  so it's easy to copy. Group it in 4s with dashes, like "K7QM-2HXA".
- Show the code on each level's intro card and on the pause screen.
- Title screen gets "Continue", which opens code entry (on-screen keyboard for
  touch). Valid code: start that level with those values. Invalid code: shake the
  box and show "That code doesn't work".
- Lowercase and missing dashes are accepted.
Keep all gameplay the same.
```

**C. Hand-made level codes.** For a short game where only the level matters, skip the maths. Pick a memorable word per level, like the old *Lemmings* codes:

```text
Add level codes. On each level's intro card, show its code. Title screen gets "Enter Code".
Level 2: MOSSY   Level 3: SPORE   Level 4: GLOOM   Level 5: CAVERN   Level 6: ROOTS
Codes are not case sensitive. A wrong code shows "Unknown code".
```

Easy and charming, but players can guess or share codes, and it can't remember items. Fine for many games.

## Step 3: Test it

Have the creator check each of these after the build:

1. Reach level 3, write down the code, close the tab, reopen, enter the code. Are you on level 3 with the same lives and items?
2. Type the code in lowercase without dashes. Does it still work?
3. Change one character. Is it rejected?
4. Type nonsense. Does it show the error, not crash?
5. On a phone: can you enter a code with touch?

## Step 4: Record the format

Add the field list, `gameId`, and version number to `GAME.md`. **Changing the field list later invalidates old codes.** If you must change it, bump `version` in the reference module so old codes are rejected cleanly instead of loading a wrong state, and tell players in the game description.

## How the reference module works

For curious creators and contributors:

- Each field is packed into exactly as many bits as its `max` needs, plus a 3-bit version.
- A 10-bit checksum, salted with `gameId`, is added. A random or mistyped code is accepted only about 1 time in 1,000, and codes from other games are rejected.
- The data bits are XOR-scrambled with a mask seeded by the checksum, so level 1 and level 2 give completely different codes and players can't easily hack them.
- Bits are printed 5 at a time from a 32-symbol alphabet with no look-alike characters.

Run the tests with `node --test reference/password.test.js`. In the full repo, `npm test` also checks that `password-save.md` matches the source. Regenerate it with `node scripts/build-uploads.js` after changing `password.js`.
