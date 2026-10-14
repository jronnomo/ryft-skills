# Trailer craft reference

What working game-trailer editors agree on, turned into rules this skill follows.
Main sources: Derek Lieu (editor of Firewatch, Spelunky 2, Among Us and Dead Cells trailers; derek-lieu.com),
Kert Gartner, Chris Zukowski (howtomarketagame.com), Valve's Steamworks trailer docs, and GameDiscoverCo.
Items marked *(heuristic)* are common practice rather than a quoted rule. Read this before planning any cut.

## 1. The non-negotiables

1. **Gameplay within 2 seconds.** Frame 0 is the game in motion. No studio logo, no title, no lore card, no slow pan.
   Shoppers "scrub through the trailer timeline until they can find actual gameplay" (Zukowski).
2. **Genre → Hook → Content.** First make the genre obvious (what do I *do*?), then show the hook (what's different),
   then show scope (enemies, areas, modes). "The moment people know what genre they're in, you need to jump to the hook."
   The hook lands in the first third, ideally 10–15 s in, never after halfway (Lieu).
3. **Answer five questions in order:** What is this? What is happening? Why is that interesting? What makes it unique?
   How big is it? (Lieu)
4. **Logo/title at the end.** Title and call to action ("Play free on Ryft" + link) close the trailer.
5. **It must read with the sound off and work with it on.** Steam and social feeds autoplay muted, but
   "a silent trailer is an inferior video."
6. **Show the real game.** No mock-ups, no shots of things the game doesn't do. Busy UI stays if it explains the loop.

## 2. Structure and length

**Length by genre** (inferred from editors' trailers; Gartner: 1:00–1:30, max 2:00):

| Genre | Target |
|---|---|
| Arcade, runner, score attack | 30–45 s |
| Action, shooter, survivors-like, roguelike, deckbuilder | 45–75 s |
| Puzzle, cozy, strategy, narrative | 60–75 s |
| Horror / atmospheric | up to 90 s |
| Teaser / social | 10–20 s |
| Steam/listing loop | 6 s (Steam builds "microtrailers" from six 1 s clips of the first video, so every stretch must be strong) |

**Shape (three acts, one core concept):**

| Act | Share | Content |
|---|---|---|
| Open | 0–15% | Core verb in motion; genre obvious |
| Hook | by 15–35% | The unique mechanic, isolated, clearly readable; shown twice |
| Build | 35–75% | Layer one complication at a time; new enemies, areas, palettes; cut rate rises |
| Climax | 75–90% | Biggest moment, or failure; then a music stop / silence |
| Title + CTA | last 10% | Title, the button (one last moment), end card held 3–5 s |

**Escalate one layer at a time.** Base mechanic → mechanic + complication → mechanic + complication + payoff.
Order selects by excitement: "less complicated moments in the first acts, more flashy ones later."
Save the flashiest enemy, effect or area for the end. Never show cosmetics or modes before halfway.

**Show variety.** Contrasting palettes and areas make the game look bigger. One area for the whole trailer looks "small in scope and dull."

**Show failure.** Perfect play makes a game look trivial (the Sheepherds makeover). A death, a miss or a near-miss makes it look skilful and makes viewers "want to do a better job."

## 3. Text on screen

- **Less text, and every word earns its place.** No bullet points, no feature lists ("Couch co-op!", "Upgrades!"),
  no lore dumps ("In a world…" / "Nobody buys a game by the lore").
- **Sell the fantasy or the benefit, in the game's voice.** Short imperatives work: Cloverpit's "PAY YOUR DEBTS / MAKE COMBOS",
  Hades II's "JOIN FORCES WITH OLYMPUS". A genre label is fine ("GOD-LIKE ROGUE-LIKE").
- **Early cards can be flavourful; montage cards must be plain words.** A card on screen for a fraction of a second can't carry wordplay.
- **2–5 words per card is the default.** Longer only for one key line.
- **Reading time:** each line fully visible ~0.3 s/word minimum (1.2 s minimum per card); a comfortable hold is 2–3 s.
- **Style text to match the game.** A-tier cards look like they belong to the game (its font, colours, frames).
  Plain text over busy gameplay is C-tier. Over busy UI footage: use a darkened/blurred bed, a solid card, or a clean area.
- **Test copy on outsiders.** Cut anything vague ("Play at your own pace").
- **Text on mobile:** titles ≥ 90–140 px at 1080p, supporting ≥ 48–60 px; inside the 90% title-safe area; 2–4 px stroke or soft shadow over gameplay.

## 4. Shots

- **Build around player verbs.** Every shot shows the player *doing* something.
- **One action per cut, held just long enough to read.** UI-heavy shots ≥ 1.5 s; never cut a movement mid-arc.
- **Squint test:** blur your eyes; the thing you want seen must be the first thing you see.
- **Frame for a phone.** Crop or punch in until sprites and card text are legible at phone size.
  Wide shots where the character is a few pixels "go in one ear and out the other."
- **Card / UI games:** zoom until card text is readable; show synergy and payoffs (numbers climbing, combos firing), not single cards;
  skip the slow thinking ("show the interactions in super-speed" — Into the Breach).
- **HUD:** keep it in shots that explain the loop (score, health, wear, combos); hide or crop it in mood shots.
- **Use the best 1%.** Record far more than you need (many runs); pare down in passes.
- **Average shot length depends on the game's pace** (Lieu measured Baba Is You 4.25 s, Papers, Please 2.6 s, Modern Warfare II 1.3 s).
  Don't cut fast for the sake of it.

## 5. Sound

- **Pick or write the music first;** it gives mood, pacing and structure. Cut the picture to it.
- **Not the game's looping in-game music** (monotonous); not generic stock "trailer music" that could fit any game.
  Write a score for this game (brag-slim does).
- **Game sound effects are the secret weapon.** At A-tier they act "like an added percussion track." Capture with game
  music off and SFX on when the game allows it (`record.mjs --audio` captures the game's own audio).
  Give the game's signature sound space: drop the music around it so it's "loud and clear."
- **Silence before the payoff:** stop the music 0.5–1.5 s before the title or the biggest reveal, then hit.
  Keep a faint room tone or reverb tail so it doesn't sound broken.
- **J/L cuts with music:** start the next section's riser before the picture changes; let a boom tail run past the cut.
- **Mix:**
  - Duck music 3–6 dB under big hits and signature SFX.
  - 4-frame fades on every audio edge; no clicks.
  - Deliver at about −14 LUFS integrated, ≤ −1 dBTP (YouTube norms).
  - Sub-bass is inaudible on phones: saturate booms so their harmonics carry.

## 6. Editing techniques (with numbers, 30 fps)

**Tempo grid.** Pick a BPM with whole frames per beat: 90 (20 f), 100 (18 f), 112.5 (16 f), 120 (15 f), 150 (12 f).
By mood *(heuristic)*: cozy/puzzle 80–100, adventure 100–120, action/arcade 128–150.
Cuts on beats (0–2 frames early is fine); section changes on bar downbeats.

**Cut rhythm at 120 BPM:**

| Section | Shot length |
|---|---|
| Opening | 2 bars (4 s) → 1 bar (2 s) |
| Middle | 1 bar → 2 beats (1 s) |
| Climax | 1 beat (0.5 s) → half-beat (0.25 s), then a hard stop |

**Accents:** a quick shot, hit, or transition every 2–4 bars keeps energy up between the main beats.

**Transitions** (hard cut is the default; 2–4 real transitions per trailer):

| Transition | Use | Timing / how |
|---|---|---|
| Hard / smash cut | Default; chaos → stillness | On the beat |
| Match cut | Same framing or motion across two shots (before/after, early/late run) | Cut on the beat; the change carries it |
| Flash cut | Impacts, act changes | 1–3 f white, fade over 3–6 f; ≤ 3 flashes/s |
| Whip | Energy between shots | 6–10 f, horizontal blur peaking on the cut + whoosh |
| Dip to black | Act breaks, before the title | 6–12 f out, 0–12 f black, 6–12 f in |
| Iris / shape wipe | Comedic or cozy games, the game's own motif | 10–20 f |
| Speed ramp | Show a slow process fast | 100% → 30–50% → 100%, ramps 6–10 f; speed-ups (2–4×) for turn-based play |
| Freeze frame | A reveal or character intro | 0.5–1.5 s, sparingly |

**Camera moves on footage:**
- **Slow push-in:** 100 → 105–110% over 3–6 s gives life to static UI.
- **Snap punch-in:** 100% → 130–200% on a beat, no tween.
- **Ken Burns on stills:** 5–15% over 4–6 s.
- **Impact shake:** 8–20 px, decaying over 6–12 f.

**Pixel art and resolution:**
- Integer zooms only (2×: crop 960×540 → 1920×1080) with nearest-neighbour; never blur pixel art.
- Capture hero stills at `--scale 2` (2× device pixels) so punch-ins stay crisp instead of upscaling video.
- Grain and bloom on sprites look bad. Keep finishing effects on overlays and title cards.

## 7. Genre playbooks

| Genre | Trailer's job | Show the mechanic by | Text | Sound | Avoid |
|---|---|---|---|---|---|
| Roguelike / deckbuilder / card | What kind of card game in < 10 s; sell synergy and the snowball | Readable card close-ups; a hand resolving; numbers climbing; map/shop after combat; a death and "one more run" | Short imperatives, a genre label | Steady groove; card flicks, chip clinks as percussion | Unreadable cards; turn-by-turn thinking; deckbuilding menus before combat |
| Platformer | Prove the controls feel good; show difficulty | Unbroken runs; a new verb per beat; death → instant respawn | 1–2 lines max | The game's world in the music; jumps on beats | Tiny wide shots; cutting mid-jump; only perfect runs |
| Action / shooter / survivors-like | Sell power growth | Sparse start → level-up choice → screen full of chaos; one action per cut | 2–4 word counts/stakes ("1000s of enemies") | Driving track, rising cut rate, pickup sounds poking through | Chaos before the player sprite is readable |
| Puzzle | The rule, the "aha", enough puzzles | One clean demo of the rule → a twist on it → variety; never full solutions | Let the game's own UI/words explain | Calm/ambient; satisfying snaps | Showing every puzzle; spoilers; a mobile-level-select feel |
| Strategy / tactics / management | Make thinking exciting; stakes | Outcomes in super-speed; push-ins over the HUD; cut on clicks; a map/network growing | Role and stakes questions ("Protect the city?") | Tension score, or soft ambient where SFX are the melody | Real-time turns; cinematic-only footage |
| Horror / atmospheric | Dread plus what the player does | The player's verbs in tense framing; stage the build (wrong → worse → relief → climax) | Sparse or none | Sound design first; drones; silence | Revealing the monster early; gore overload |
| Cozy / life sim | The feeling and the daily loop, plus a hook that stands out | Hook activity first; small satisfying interactions in close-up; seasons/variety | Warm, witty, puns OK | Gentle score; soft cross-dissolves only in slow sections | Cosmetics/modes before the loop; lingering 20 s in one place |
| Narrative / RPG | Premise, conflict, tone, choices | Words matched to the visuals ("connection points"); dialogue UI briefly | Genre tag after the logo; conflict cards ("Battle your salty sister") | Character lines + score, SFX accents on key words | Lore monologues over slow shots; no stated goal |
| Arcade / score attack / runner | Instant readability; "one more try" | Long runs with combo/score on screen; death → instant retry | Almost none | Chiptune/electronic, hard music sync | Cards that interrupt the run; slow intros |

## 8. Vertical / social cuts (9:16)

- The first frame is mid-action with a text hook visible: it is also the thumbnail.
- Reframe: crop 540×960 from 1920×1080 and scale 2× nearest-neighbour; or pan the crop to follow action;
  or put gameplay in the centre with a blurred, darkened copy filling the background.
- Safe zones *(heuristic)*: keep text out of the top 250 px, bottom 450 px and right 140 px of 1080×1920.
- Burn in short captions (4–7 words); assume muted viewing.
- Loops: make the last frame match the first; end the music on a bar that resolves into bar 1.

## 9. Self-grading rubric (use before delivering)

Score each 0–2. Ship at ≥ 16/20; fix anything scoring 0.

| # | Check | 2 = | 0 = |
|---|---|---|---|
| 1 | Opening | Core verb in motion by 2 s | Logo, lore card or menu first |
| 2 | Genre clarity | A stranger names the genre by 5 s | Unclear at 10 s |
| 3 | Hook | Unique mechanic isolated and readable by ~1/3 | After halfway, or never clear |
| 4 | Escalation | Each section bigger; variety of areas/enemies | Flat, one area |
| 5 | Readability | Every shot passes the squint test on a phone | Tiny sprites, unreadable cards |
| 6 | Text | Few words, game-styled, readable timing, no lore/features | Text walls, feature bullets |
| 7 | Sound | Score fits the world; game SFX audible; silence before the payoff | Generic music, no SFX, no dynamics |
| 8 | Sync | Cuts and hits land on the music | Random cut timing |
| 9 | Ending | Title late, button, end card with CTA + link held 3 s | Logo first, or no CTA |
| 10 | Honesty | All real gameplay, nothing the game doesn't do | Mock-ups or misleading shots |

## 10. Pre-delivery QC

- `ffmpeg -i out.mp4 -vf blackdetect,freezedetect -f null -` for accidental black or frozen stretches.
- `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -` for loudness (≈ −14 LUFS, ≤ −1 dBTP).
- ≤ 3 flashes per second (photosensitivity).
- `yuv420p`, constant 30 fps, `+faststart`; 1080p H.264/AAC (Steam: up to 1920×1080, 5,000+ kbps).
- Look at stills from every scene and mid-transition; check text against title-safe; check the end card spelling and link.
- Watch it on a phone, muted, at actual size.

## Sources

- Derek Lieu, blog: https://www.derek-lieu.com/blog (grading, editing tidbits, capture breakdown, Sheepherds and Dosa Divas makeovers, Hades II, Arranger, Carto, favorites of 2025, sound-effects targeting)
- Derek Lieu, GDC 2019 "Trailer Made": https://gdcvault.com/play/1026358/Trailer-Made-What-Makes-a
- Kert Gartner: https://kertgartner.com/making-entertaining-and-engaging-video-game-trailers
- Chris Zukowski, Steam Page Checklist and "60 Mistakes" ebook: https://howtomarketagame.com
- Valve, Steamworks trailers: https://partner.steamgames.com/doc/store/trailer
- GameDiscoverCo on hooks and anchors: https://newsletter.gamediscover.co/p/how-to-get-to-your-games-hook-quick
- Game Developer, Into the Breach trailer takeaways: https://gamedeveloper.com/business/video-5-trailer-takeaways-from-into-the-breach
- Game Developer, Cogmind pixel-art trailer: https://www.gamedeveloper.com/business/creating-a-crisp-engaging-trailer-for-a-pixel-art-game-from-inception-to-reception
- TikTok creative best practices: https://ads.tiktok.com/help/article/creative-best-practices
