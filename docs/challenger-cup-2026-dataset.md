# 2026 Challenger Cup Official BP Dataset

This dataset is collected from Tencent PVP official match data for `league_id=20260002`.

## Source Pages

- Hero statistics: https://pvp.qq.com/matchdata/heroData.html?league_id=20260002
- Match details template: https://pvp.qq.com/matchdata/scheduleDetails.html?league_id=20260002&match_id={match_id}

## Official API Endpoints

- Hero stats: `https://prod.comp.smoba.qq.com/leaguesite/league/hero/settle_list/open?league_id=20260002`
- Match list: `https://prod.comp.smoba.qq.com/leaguesite/matches/open?league_id=20260002`
- Game list in a match: `https://prod.comp.smoba.qq.com/leaguesite/match/battles/open?match_id={match_id}`
- Game detail: `https://prod.comp.smoba.qq.com/leaguesite/battle/open?battle_id={battle_id}`

## Local Files

- Full dataset: `src/data/kpl/challenger-cup-2026.json`
- Lightweight summary: `src/data/kpl/challenger-cup-2026-summary.json`
- Frontend view dataset: `src/data/kpl/challenger-cup-2026-view.json`
- API summary: `/api/kpl/challenger-cup`
- API match index: `/api/kpl/challenger-cup?view=matches`
- API full dataset: `/api/kpl/challenger-cup?view=full`

## Current Crawl Summary

- Heroes with official stats: 95
- Matches: 38
- Finished matches: 38
- Games: 188
- BP actions: 3698
- Teams: 32
- Crawl errors: 0

The official `bp_list` is preserved in its returned order. In Tencent's renderer, `is_ban_or_pick=0` is a ban and `is_ban_or_pick=1` is a pick.

Most games contain 20 BP actions. A small number of games contain fewer actions in the official response, often for special/peak-duel or incomplete official BP records. The collector does not synthesize missing BP rows, so downstream modeling can distinguish complete and partial official records.

## Re-run

```bash
npm run collect:pvp-challenger
```

Optional:

```bash
node scripts/collect-pvp-challenger-cup.mjs --league-id 20260002 --out src/data/kpl/challenger-cup-2026.json --summary-out src/data/kpl/challenger-cup-2026-summary.json
```
