---
name: ryft-x-launch
description: Launches a Ryft game on X, where Ryft games play right inside the post (a 480x480 playable player card). Checks the game's X card and how it plays in the card (feed-check), plans a launch week of posts (playable posts, native clips with the game in the reply, loops, challenges, devlogs), writes captions in the game's voice, gives one-click compose links, and tracks results per post, format and trailer version in a local campaign log. Drafts only: the creator posts. Use when a creator wants to share, launch, promote or market a Ryft game on X/Twitter, plan posts, A/B test trailers or post formats, or track how their posts are doing.
---

# Launch on X

Ryft games **play inside X posts**: a game link becomes a 480×480 playable card. No other platform lets a
post *be* the game. This skill turns that into a launch: check the card, make the game feed-ready, plan
posts that earn replies and shares, and measure what works.

**Read [`references/x-playbook.md`](references/x-playbook.md) first.** It has the research with sources:
where cards actually play, how X ranks posts, what formats work, and the rules.

**Drafts only.** This toolkit never posts, replies, DMs, likes or follows for anyone. X permanently
suspends browser-scripted automation and restricts AI replies. The creator reviews every word and posts
it themselves (one-click compose links make that fast).

## 1. Preflight (before any post)

```bash
node scripts/campaign.mjs init https://ryft.fun/games/<id>-<slug>     # checks the X card, starts campaign.json
node scripts/feed-check.mjs https://ryft.fun/games/<id>-<slug> feed/   # how it plays in a 480x480 card
```

- **Card:** `init` confirms it's a playable player card that X is allowed to frame, and has a cover image.
- **Feed fit:** `feed-check` reports when the game appears, how much of the square it fills, how big it
  draws, and whether a tap does anything. Read `feed/strip.png`.
  - If it fills under ~75% or draws under ~40% scale, use `ryft-iterate` to ask Ryft for a
    square/responsive layout with bigger text before launching. Retrofitting rules are in
    `ryft-game-director/ryft-platform.md`.
- **Your phone:** Ryft games play inside X posts (confirmed by creators). Still open your link once on
  your own phone before launch day: X changes card behaviour without notice.
- **Thumbnail:** the cover art is all many people will see. It should show the game's name, a character,
  and a clear sense of play. Fix it in `ryft-art-director` if not.

## 2. The formats

| Format | What it is | Why | Notes |
|---|---|---|---|
| **Playable post** | The game link (card) + a caption that stands alone | The post *is* the game | No media attached (it would replace the card) |
| **Clip + playable reply** | A 20–60 s native clip, then the game link as the first reply | Native video reaches furthest; the reply holds the card | Clip from `ryft-trailer` (`export.mjs` 1:1 or 16:9), core visual in frame 1 |
| **Loop** | A 4–6 s silent loop of the best moment | Stops the scroll; easy to repost | `footage.mjs gif` or a short MP4 |
| **Challenge** | "Beat my run" with a score or a password code | Replies and copy-link shares weigh most | Password codes come from `ryft-password-save` |
| **Devlog / made in N prompts** | How it was built on Ryft, with before/after | People share process; it markets Ryft too | `ryft-trailer` "made in N prompts" cut |
| **Reply** | Answering people who replied | Mutual-follow replies get a big boost | Always by hand |

A/B test the two main patterns (playable post vs clip + playable reply), and trailer versions, and let the
numbers decide (step 5).

## 3. Write the posts

- **Lead with the hook in the game's voice**, then why it's different, then the ask. The template that works:
  genre → hook → 2–3 specifics → name → a question.
  > *Every card you play wears with use. A roguelike deckbuilder where your best Strike slowly turns to ash.
  > Four pilgrims, one burning cathedral. Ashen Rite: play it right here. Which pilgrim are you picking?*
- **Invite a reply or a share:** a question, a challenge, "send this to the friend who…". Replies, quotes,
  DMs and copy-link shares are what X rewards. Likes barely count.
- **0–2 hashtags**, only relevant community tags; never trending tags.
- **Burned-in text in clips**: they autoplay muted.
- Keep the creator's voice. Offer 2–3 options per post; the creator picks and edits.

Draft each with:

```bash
node scripts/campaign.mjs add --type playable --text "..."
node scripts/campaign.mjs add --type trailer --text "..." --asset trailer-1x1.mp4 --trailer v2
node scripts/campaign.mjs add --type playable --text "Play it right here." --reply-to p2
node scripts/campaign.mjs list          # every draft with a one-click compose link
```

## 4. The launch week

Space posts out: X discounts several posts from one author in the same feed. Aim for 1–2 a day, weekday
mid-mornings, and stay online an hour after each to answer replies.

| Day | Post |
|---|---|
| 0 | Clip + playable reply (the main launch post). Pin it. |
| 0 | Playable post in 1–2 relevant Communities (not the same text everywhere) |
| 1 | Challenge: your best run or password code, "beat it" |
| 2 | Loop of the most satisfying moment |
| 3 | The other A/B pattern (playable post as the main post) |
| 4 | Devlog / made in N prompts |
| 5–6 | Reply to people; repost the best player clips or scores (with credit) |
| 7 | Report: what worked; plan week 2 around it |

## 5. Measure and compare

After posting, mark it and log numbers from the post's analytics at **1 h, 24 h and 7 d**:

```bash
node scripts/campaign.mjs posted p1 https://x.com/<you>/status/<id>
node scripts/campaign.mjs log p1 impressions=4200 likes=88 replies=19 reposts=12 bookmarks=30 linkClicks=140
node scripts/campaign.mjs report        # campaign.html: by post type, by trailer version, every post
```

Also note plays on Ryft for the same windows if your dashboard shows them; plays per 1,000 views is the
number that matters. Compare trailer cuts before posting with `ryft-trailer/scripts/compare.mjs`.

## Rules

- Never automate posting, replying, DMs, likes or follows. Never use browser scripts on X.
- Never post the same text across accounts or into many threads; never use unrelated trending tags.
- Credit other creators when sharing their clips or scores; ask first.
- If something in the playbook looks out of date (X changes often), say so and check it before relying on it.
