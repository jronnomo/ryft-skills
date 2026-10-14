# X playbook for Ryft games (researched 2026-10)

What's known about getting a small browser game played on X, with sources. **[unverified]** marks
claims nobody has measured. X changes often: re-check anything marked with a date before a launch.

## 1. Ryft's superpower: the playable card

- A Ryft game link renders as an X **player card**: `twitter:card=player`, a **480×480** iframe of
  `ryft.fun/embed/games/<id>`, which explicitly allows X to frame it (`frame-ancestors x.com twitter.com`).
  Checked on a live game, 2026-10. `campaign.mjs init` re-checks this for any game.
- **Ryft games play inside X.** Confirmed first-hand by a Ryft creator who has played Ryft games in X
  posts (2026-10-14). For other sites' player cards, a 2026-10-10 test found mobile X showed only a thumbnail
  ([awesamarth/flappy-bird-twt](https://github.com/awesamarth/flappy-bird-twt)), so X's behaviour can differ by
  client and may change. A quick look on your own phone before a launch costs nothing.
- **Playable posts can go viral:** a Minecraft-in-a-post build passed 5M views (2026-10-06,
  [Khelnow](https://khelnow.com/gaming/viral-project-lets-you-play-minecraft-directly-on-x-twitter-202610)).
- **The thumbnail and caption must sell the game alone.** X link cards show only the image with a
  domain overlay, no headline (since 2023-10). The cover art should show the game's name and look playable.
- **Attached media replaces the link card** (reported by Ayrshare, OneUp; X hasn't confirmed). A post can
  carry the native video *or* the playable card, not both.
- Player cards run on X's tolerance, not a published policy: the old (2014) docs required allowlisting
  and excluded games. It could change at any time.

## 2. Links and reach

- X said in 2025 that link posts got lower reach (Nikita Bier, 2025-10-19). Buffer measured a **0% median
  engagement rate on link posts from non-Premium accounts** from March 2025 (18.8M posts,
  [Buffer 2025-10-14](https://buffer.com/resources/links-on-x/)).
- On 2026-07-28 X said link penalties were gone ([PPC Land](https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/)).
  The open-sourced ranker has no explicit URL rule, but **opening a link scores only 0.2** next to 5.0 for a
  reply, so posts that mostly send people away still rank lower.
- Practitioners put the link in **the first reply** under a native video (IndieGameJoe, via
  [howtomarketagame 2026-05-07](https://howtomarketagame.com/2026/05/07/2026-tips-for-making-your-tweets-go-viral/)).
- **For Ryft, A/B test:** (A) the playable card as the main post with a caption that stands alone,
  vs (B) a native clip as the main post with the playable card in the first reply.

## 3. What the ranker rewards (xai-org/x-algorithm, weights published 2026-08-13)

Score = Σ weight × predicted chance the viewer does it ([repo](https://github.com/xai-org/x-algorithm)).

| Action | Weight | | Action | Weight |
|---|---|---|---|---|
| Share via copy link | **20.0** | | Like | 0.66 |
| Reply | 5.0 | | Time on post after click | 0.4 |
| Quote | 5.0 | | Click | 0.3 |
| Share via DM | 5.0 | | Open link | 0.2 |
| Follow author | 4.0 | | Dwell | 0.05 |
| Share | 2.0 | | Not interested | **−52.3** |
| Repost | 1.0 | | Mute | **−58.8** |

- A reply between mutual followers gets a 15× boost: **answer every reply**, especially early.
- More posts by the same author in one feed refresh are discounted: **space posts out**.
- Small accounts get a new-author boost. Out-of-network posts are considered for 48 h.
- So write posts people **send to a friend** ("send this to whoever…") and **answer** ("beat my score",
  "which pilgrim?"). Anything spammy costs far more than a like gains.

## 4. Formats that work

- **Native video** has the best engagement of the media types (Buffer 2025).
  - Post **clips, not trailers**: re-cut to ~30–60 s with the core visual in the **first frame**.
  - A weak first 3–4 s cost one dev ~2× the views.
  - Raw gameplay often beats polish (Zukowski / IndieGameJoe, 2026-05).
- **Muted autoplay:** burned-in text must carry it.
- **Caption template** (IndieGameJoe): genre → hook → 3 features → name → a question ("Would you play this?").
- **Hashtags don't boost reach** (no ranker signal; Musk 2024-12). #screenshotsaturday-style tags are
  community search terms at most. Use 0–2, never unrelated trending tags (against the rules).
- **Communities:** public Community posts can appear in main feeds (since 2025-02). Post in relevant
  game/genre Communities.
- **Benchmark:** IndieGameJoe's small sample converted a median ~7 wishlists per 1,000 views (2.5–21).
  Views were spiky: one post can beat a month. For free browser games, track **plays per 1,000 views**.
- **Timing** *(secondary sources)*: weekday mid-mornings (Tue–Thu, 9–11 in the audience's time zone).
  Be online for the first hour to reply.

## 5. Rules: what this toolkit must never do

From X's [developer guidelines](https://docs.x.com/developer-guidelines), Developer Policy and Automation Rules:
- **Never automate X through browser scripting or scraping.** That means permanent suspension. Posting is
  manual (compose links) or via the official API.
- No auto-replies to keyword mentions, uninvited @mentions, auto-DMs, bulk DMs, auto-likes, follows or
  follow-backs.
- No duplicate content across accounts; no posting into unrelated trending topics.
- **AI-generated replies need X's prior approval.** Since 2026-02-23, programmatic replies are allowed
  only when the author summoned the account.
- Giveaways that require follows or reposts are risky (engagement manipulation).
- Bot accounts must be labelled "Automated".
- **This toolkit drafts. The creator reviews, posts, and replies as themselves.**

## 6. Video specs ([docs.x.com](https://docs.x.com/x-api/media/quickstart/best-practices), 2026-09)

- H.264 High, 30/60 fps, yuv420p, progressive, AAC-LC ≥ 128 kbps.
- 16:9 or 1:1 recommended (1:3 to 3:1 accepted).
- Non-Premium plays back at 720p, Premium at 1080p.
- Length: at least 140 s for every account (sources conflict on more). Clips are far shorter anyway.
- GIF ≤ 15 MB; images ≤ 5 MB; one video or up to four images per post.
- `ryft-trailer/scripts/export.mjs` makes 16:9, 1:1 and 9:16 versions to this spec.

## 7. Measuring

- Each post's own analytics (tap the chart icon) show impressions and engagements. Account-wide
  analytics are Premium-only.
- Log each post at **1 h, 24 h and 7 d** with `campaign.mjs log`.
- Track **plays on Ryft** for the same windows (from your Ryft dashboard, if it shows them).
- **UTM tags** (`?utm_source=x&utm_medium=social&utm_content=<post-id>`) separate variants, but each new
  URL is a new card fetch: **check the card still renders with parameters [unverified]**. Don't use
  link shorteners: they hide the domain and can look like spam.
