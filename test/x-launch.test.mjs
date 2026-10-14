// Run with: node --test test/x-launch.test.mjs
import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCard, cardProblems, composeUrl, run, summarize } from "../.claude/skills/ryft-x-launch/scripts/campaign.mjs";

const PAGE = `<html><head>
<meta property="og:title" content="Ashen Rite — play free on Ryft" />
<meta property="og:description" content="Reach the guardian at the cathedral's root." />
<meta name="twitter:card" content="player" />
<meta name="twitter:player" content="PLAYER" />
<meta name="twitter:player:width" content="480" /><meta name="twitter:player:height" content="480" />
<meta name="twitter:image" content="https://example.com/cover.webp" />
</head></html>`;

test("parses a Ryft player card and flags what would break it", () => {
  const card = parseCard(PAGE.replace("PLAYER", "https://ryft.fun/embed/games/gjgk90"));
  assert.strictEqual(card.card, "player");
  assert.strictEqual(card.width, 480);
  assert.strictEqual(card.description, "Reach the guardian at the cathedral's root.");
  assert.deepStrictEqual(cardProblems(card, "frame-ancestors 'self' https://x.com https://*.x.com"), []);
  assert.match(cardProblems(card, "frame-ancestors 'self'").join(), /frame-ancestors/);
  assert.match(cardProblems({ ...card, card: "summary_large_image" }).join(), /won't be playable/);
});

test("compose links prefill text, and the game link only where it should play", () => {
  const game = { url: "https://ryft.fun/games/gjgk90-ashen-rite" };
  const playable = new URL(composeUrl({ type: "playable", text: "Play it here." }, game));
  assert.strictEqual(playable.searchParams.get("url"), game.url);
  assert.strictEqual(new URL(composeUrl({ type: "trailer", text: "Trailer" }, game)).searchParams.get("url"), null);
});

test("a full campaign: init against a live card, draft, post, log, report", async () => {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/embed")) { res.writeHead(200, { "content-security-policy": "frame-ancestors 'self' https://x.com https://twitter.com" }); return res.end("ok"); }
    res.writeHead(200, { "content-type": "text/html" }); res.end(PAGE.replace("PLAYER", "https://localhost/embed"));
  }).listen(0);
  const base = `http://localhost:${server.address().port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-campaign-"));
  const file = path.join(dir, "campaign.json"), out = [];
  const cli = (...a) => run([...a, "--file", file], { log: (m) => out.push(m) });
  // The player URL is https (as X requires) but points at nothing here, so the CSP fetch fails: that's reported.
  await cli("init", `${base}/games/gjgk90-ashen-rite`);
  assert.match(out.join("\n"), /frame-ancestors/);
  await cli("add", "--type", "trailer", "--text", "Every card wears with use.", "--trailer", "v2", "--asset", "t.mp4");
  await cli("add", "--type", "playable", "--text", "Play it right here.", "--reply-to", "p1");
  await cli("add", "--type", "trailer", "--text", "Old cut.", "--trailer", "v1");
  await cli("posted", "p1", "https://x.com/jronnomo/status/1");
  await cli("posted", "p3", "https://x.com/jronnomo/status/3");
  await cli("log", "p1", "impressions=2000", "likes=60", "replies=10", "reposts=8", "bookmarks=12", "linkClicks=40");
  await cli("log", "p3", "impressions=1000", "likes=10", "replies=1");
  await assert.rejects(cli("log", "p1", "views=3"), /Bad metric/);
  await cli("report");
  const c = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.strictEqual(c.game.title, "Ashen Rite");
  const s = summarize(c);
  assert.ok(s.byTrailer.v2.engagementRate > s.byTrailer.v1.engagementRate);
  assert.ok(fs.readFileSync(path.join(dir, "campaign.html"), "utf8").includes("By trailer version"));
  server.close(); fs.rmSync(dir, { recursive: true });
});
