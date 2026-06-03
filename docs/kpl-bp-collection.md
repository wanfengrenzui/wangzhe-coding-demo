# KPL BP data collection notes

## Current finding

The app should prioritize 2026 KPL data for the BP module. A clean public API for full pick/ban order has not been found yet, so the practical dataset needs three layers:

- Official season-scale facts: schedule, match result, stage, team list, hero pick count, and hero pick win rate.
- Lineup-level BP: public posts or match reports that list final Ban/Pick sets.
- True draft order: replay/video BP-stage frames plus OCR or hero portrait matching.

## Verified official bulk source

The official KPL site (`https://kpl.qq.com/`) ships a frontend bundle that points to Tencent production APIs under `https://kplshop-op.timi-esports.qq.com/kplow`.

Verified endpoints:

- `getSeasonAndStageAndTeamList`
  - Payload: `{ "seasonid": "KPL2026S1" }`
  - Provides 2026 spring stages and team IDs/names/logos.
- `getScheduleList`
  - Payload: `{ "seasonid": "KPL2026S1" }`
  - Provides the full 2026 spring schedule, match scores, BO format, stage, location, and schedule IDs.
- `getHeroRankList`
  - Payload: `{ "seasonid": "KPL2026S1" }`
  - Provides hero ID/name, lane/position, pick count (`match_count`), pick win rate (`win_cr`), and best-player fields.

Run:

```bash
npm run collect:kpl-official
```

Optional snapshot:

```bash
npm run collect:kpl-official -- --season KPL2026S1 --out data/kpl-official-2026-s1.json
```

Important limitation: the verified official endpoints expose pick counts and pick win rates, but not a reliable full ban list or B/P order for every game. `getScheduleDetail` was probed, but the currently verified call path appears to fall back to the official configured featured/final match rather than reliably expanding arbitrary `scheduleid` values. Treat it as untrusted until the exact detail parameter contract is confirmed.

## How this helps BP prediction

Official data can immediately support:

- Global hero strength: `match_count` + `win_cr` from `getHeroRankList`.
- Season meta: lane-specific hero popularity and win rate.
- Team/match context: opponent, stage, BO format, and score from `getScheduleList`.

Still needed for actual BP sequence prediction:

- Per-game final picks, bans, and side assignment.
- Exact pick order, especially blue first pick into red response windows.
- Team-specific hero pools by player, which can be derived once game-level player-hero rows are collected.

## Verified Bilibili replay source for draft order

Bilibili should be used as the video evidence layer for exact BP order. The official account `哔哩哔哩王者荣耀赛事` (`mid=392836434`) publishes match replays with per-game pages.

Verified seed:

- Video: `https://www.bilibili.com/video/BV1QXAAzsEZD/`
- Title: `【2026KPL春季赛】3月21日 重庆狼队 VS 成都AG超玩会`
- Owner: `哔哩哔哩王者荣耀赛事`
- Pages:
  - `p=1`, `cid=36865835856`, 第一局
  - `p=2`, `cid=36866558772`, 第二局
  - `p=3`, `cid=36867280757`, 第三局

The first game BP UI has been frame-located:

- `05:00` enters the KPL draft board.
- `05:30` shows B1 into R1/R2.
- `06:00` shows the next blue-side response block.
- `07:00` shows the second ban phase.

Run metadata and OCR-task collection:

```bash
npm run collect:bili-draft
```

Run local frame extraction when `ffmpeg` or `ffmpeg-static` is available:

```bash
npm run collect:bili-draft -- --extract --out-dir tmp/bili-draft-frames --seconds 300,330,360,420
```

The app keeps video evidence separate from final BP records. A frame being located means it is ready for OCR/template matching; it does not become a verified hero-order record until the hero names and sides are confirmed.

## Verified 2026 seed source

- Hupu post: `https://bbs.hupu.com/638025067.html`
  - Date: 2026-03-21
  - Event: 2026 KPL spring regular season
  - Match: Chongqing Wolves 3:0 Chengdu AG Super Play
  - Coverage: Game 1 to Game 3 Ban/Pick lists.
- Hupu/Sina repost sources for Beijing JDG 3:2 Chengdu AG Super Play.
  - Coverage: Game 1 to Game 5 Ban/Pick lists.
- Hupu/Sina repost sources for Suzhou KSG 3:1 Beijing WB.
  - Coverage: Game 1 to Game 4 Ban/Pick lists.
- Hupu source for Hangzhou LGD.NBW 4:3 Beijing WB.
  - Coverage: Game 1 to Game 6 Ban/Pick lists and Game 7 peak-duel Pick list.
- Hupu source for Guangzhou TTG 1:0 Nantong Hero.
  - Coverage: Game 1 Ban/Pick list.

The current in-app dataset has 20 lineup-level BP games with player-hero mappings.

## Data confidence

- `verified-lineup`: ban and pick hero sets are supported by a public 2026 post.
- `needs-video-order`: report data is available, but exact pick order still needs replay/OCR confirmation.
- `needs-normalization`: hero names that may be new, typo-prone, or variant-form text should be checked against the official hero list.

## Recommended pipeline

1. Search 2026 KPL match pages/posts by date, team, and "BP"/"Ban"/"Pick".
2. Record source URL, source title, match date, stage, teams, game number, result, ban sets, and pick sets.
3. Normalize hero names against the official hero list from `https://pvp.qq.com/web201605/js/herolist.json`.
4. Preserve raw source text when a hero name looks unusual, then store normalized names separately after verification.
5. For exact draft order, sample replay frames around the BP stage and run OCR/template matching against hero portraits and names.
6. Mark each record with `source_links`, `confidence`, and `last_checked_at`.

## Known gaps

- The current 2026 seed gives lineup-level BP, not true B1/R1/R2 draft order.
- Broader 2026 coverage still needs more matches and official/video cross-checking before predictive modeling.
