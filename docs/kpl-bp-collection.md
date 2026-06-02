# KPL BP data collection notes

## Current finding

The app should prioritize 2026 KPL data for the BP module. A clean public API for full pick/ban order has not been found yet, so the practical dataset still needs two layers:

- Lineup-level BP: public posts or match reports that list final Ban/Pick sets.
- True draft order: replay/video BP-stage frames plus OCR or hero portrait matching.

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
