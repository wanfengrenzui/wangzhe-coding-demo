import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_LEAGUE_ID = "20260002";
const DEFAULT_OUT = "src/data/kpl/challenger-cup-2026.json";
const DEFAULT_SUMMARY_OUT = "src/data/kpl/challenger-cup-2026-summary.json";
const DEFAULT_VIEW_OUT = "src/data/kpl/challenger-cup-2026-view.json";
const API_BASE = "https://prod.comp.smoba.qq.com/leaguesite";
const PVP_BASE = "https://pvp.qq.com/matchdata";

const ENDPOINTS = {
  heroStats: `${API_BASE}/league/hero/settle_list/open`,
  matches: `${API_BASE}/matches/open`,
  matchBattles: `${API_BASE}/match/battles/open`,
  battle: `${API_BASE}/battle/open`,
};

function getArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withQuery(url, params) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      parsed.searchParams.set(key, String(value));
    }
  }
  return parsed.toString();
}

async function fetchJson(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        accept: "application/json,text/plain,*/*",
        referer: `${PVP_BASE}/`,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      },
    });
    const text = await response.text();
    if (response.ok) {
      const payload = JSON.parse(text);
      if (Number(payload.code) === 200) return payload;
      if (attempt === retries) {
        throw new Error(`${url} returned code ${payload.code}: ${payload.message || ""}`);
      }
    } else if (attempt === retries) {
      throw new Error(`${url} failed with HTTP ${response.status}: ${text.slice(0, 160)}`);
    }
    await sleep(500 * (attempt + 1));
  }
  throw new Error(`${url} failed`);
}

function percent(value) {
  return typeof value === "number" ? Number((value * 100).toFixed(2)) : null;
}

function seconds(ms) {
  return typeof ms === "number" ? Math.round(ms / 1000) : null;
}

function teamOf(camp) {
  if (!camp) return null;
  return {
    id: String(camp.team_id ?? ""),
    name: camp.team_name ?? "",
    abbreviation: camp.team_abbreviation ?? "",
    icon: camp.team_icon ?? "",
    score: Number(camp.score ?? 0),
    is_win: Boolean(camp.is_win),
  };
}

function normalizeHeroStats(row, leagueId) {
  const hero = row.hero_info ?? {};
  const stats = row.statistics_info ?? {};
  const bp = row.bp_statistics_info ?? {};
  return {
    hero_id: String(hero.hero_id ?? ""),
    hero_name: hero.hero_name ?? "",
    hero_icon: hero.hero_icon ?? "",
    position: hero.position ?? null,
    battle_count: Number(stats.battle_count ?? 0),
    pick_count: Number(bp.pick_num ?? stats.battle_count ?? 0),
    pick_rate: Number(bp.pick_rate ?? 0),
    pick_rate_percent: percent(bp.pick_rate),
    ban_count: Number(bp.ban_num ?? 0),
    ban_rate: Number(bp.ban_rate ?? 0),
    ban_rate_percent: percent(bp.ban_rate),
    victory_battle_count: Number(stats.victory_battle_count ?? 0),
    defeated_battle_count: Number(stats.defeated_battle_count ?? 0),
    win_rate: Number(stats.win_rate ?? 0),
    win_rate_percent: percent(stats.win_rate),
    avg_kill_num: Number(stats.avg_kill_num ?? 0),
    avg_death_num: Number(stats.avg_death_num ?? 0),
    avg_assist_num: Number(stats.avg_assist_num ?? 0),
    avg_kda: Number(stats.avg_kda ?? 0),
    avg_gold: Number(stats.avg_gold ?? 0),
    avg_game_duration_ms: Number(stats.avg_game_duration ?? 0),
    avg_game_duration_seconds: seconds(stats.avg_game_duration),
    source_url: `${PVP_BASE}/heroData.html?league_id=${leagueId}`,
    api_url: withQuery(ENDPOINTS.heroStats, { league_id: leagueId }),
  };
}

function normalizeBpAction(row, index) {
  const side = Number(row.camp) === 1 ? "blue" : "red";
  const action = Number(row.is_ban_or_pick) === 0 ? "ban" : "pick";
  return {
    order: index + 1,
    side,
    action,
    hero_id: String(row.hero_id ?? ""),
    hero_name: row.hero_name ?? "",
    hero_icon: row.hero_icon ?? "",
    position: row.position ?? null,
  };
}

function normalizePlayer(row) {
  return {
    team_id: String(row.team_id ?? ""),
    team_name: row.team_name ?? "",
    team_abbreviation: row.team_abbreviation ?? "",
    camp: Number(row.camp ?? 0),
    side: Number(row.camp) === 1 ? "blue" : "red",
    player_name: row.player_name ?? "",
    actual_player_name: row.actual_player_name ?? "",
    player_icon: row.player_icon ?? "",
    hero_id: String(row.hero_id ?? ""),
    hero_name: row.hero_name ?? "",
    hero_icon: row.hero_icon ?? "",
    position: row.position ?? null,
    position_desc: row.position_desc ?? "",
    is_mvp: Number(row.is_mvp ?? 0) === 1,
    is_lose_mvp: Number(row.is_lose_mvp ?? 0) === 1,
    kills: Number(row.kill_num ?? 0),
    deaths: Number(row.death_num ?? 0),
    assists: Number(row.assist_num ?? 0),
    kda: Number(row.kda ?? 0),
    gold: Number(row.gold ?? 0),
    participation_rate: Number(row.participation_rate ?? 0),
    hurt_to_hero_total: Number(row.hurt_to_hero_total ?? 0),
    hurt_to_hero_total_rate: Number(row.hurt_to_hero_total_rate ?? 0),
    be_hurt_by_hero_total: Number(row.be_hurt_by_hero_total ?? 0),
    be_hurt_by_hero_total_rate: Number(row.be_hurt_by_hero_total_rate ?? 0),
    summoner_ability: row.SummonerAbilityInfo
      ? {
          id: String(row.SummonerAbilityInfo.summoner_ability_id ?? ""),
          name: row.SummonerAbilityInfo.summoner_ability_name ?? "",
          icon: row.SummonerAbilityInfo.summoner_ability_icon ?? "",
        }
      : null,
    equipment: Array.isArray(row.BriefEquipList)
      ? row.BriefEquipList.map((item) => ({
          id: String(item.equip_id ?? ""),
          name: item.equip_name ?? "",
          icon: item.equip_icon ?? "",
        }))
      : [],
  };
}

function normalizeBattle(detail, match, leagueId) {
  const bpActions = Array.isArray(detail.bp_list) ? detail.bp_list.map(normalizeBpAction) : [];
  const players = Array.isArray(detail.battle_player_list)
    ? detail.battle_player_list.map(normalizePlayer)
    : [];
  const bluePicks = players.filter((player) => player.side === "blue");
  const redPicks = players.filter((player) => player.side === "red");
  const blueBans = bpActions.filter((item) => item.side === "blue" && item.action === "ban");
  const redBans = bpActions.filter((item) => item.side === "red" && item.action === "ban");
  const winnerSide = Number(detail.win_camp) === 1 ? "blue" : Number(detail.win_camp) === 2 ? "red" : "unknown";
  const sourceUrl = `${PVP_BASE}/scheduleDetails.html?league_id=${leagueId}&match_id=${match.match_id}`;
  const apiUrl = withQuery(ENDPOINTS.battle, { battle_id: detail.battle_id });

  return {
    battle_id: String(detail.battle_id ?? ""),
    game_no: Number(detail.battle_seq ?? 0),
    status: Number(detail.status ?? 0),
    winner_side: winnerSide,
    winner_team:
      winnerSide === "blue"
        ? detail.camp1?.team_name ?? ""
        : winnerSide === "red"
          ? detail.camp2?.team_name ?? ""
          : "",
    duration_ms: Number(detail.game_duration ?? 0),
    duration_seconds: seconds(detail.game_duration),
    blue_team: teamOf(detail.camp1),
    red_team: teamOf(detail.camp2),
    bp_actions: bpActions,
    bans: { blue: blueBans, red: redBans },
    picks: { blue: bluePicks, red: redPicks },
    video_list: detail.video_list ?? [],
    source_url: sourceUrl,
    api_url: apiUrl,
  };
}

function normalizeMatch(match, battles, leagueId) {
  const sourceUrl = `${PVP_BASE}/scheduleDetails.html?league_id=${leagueId}&match_id=${match.match_id}`;
  return {
    match_id: String(match.match_id ?? ""),
    league_id: String(match.league_id ?? leagueId),
    stage_name: match.match_stage_name ?? "",
    stage_desc: match.match_stage_desc ?? "",
    bo: Number(match.bo ?? 0),
    status: Number(match.status ?? 0),
    start_time: match.start_time ?? "",
    end_time: match.end_time ?? "",
    address: match.match_address ?? "",
    cc_match_id: match.cc_match_id ?? "",
    blue_team: teamOf(match.camp1),
    red_team: teamOf(match.camp2),
    winner_side: Number(match.win_camp) === 1 ? "blue" : Number(match.win_camp) === 2 ? "red" : "unknown",
    score: `${match.camp1?.score ?? 0}-${match.camp2?.score ?? 0}`,
    source_url: sourceUrl,
    api_url: withQuery(ENDPOINTS.matches, { league_id: leagueId }),
    games: battles,
  };
}

function compactHero(item) {
  return {
    hero_id: item.hero_id,
    hero_name: item.hero_name,
    hero_icon: item.hero_icon,
    side: item.side,
    order: item.order,
  };
}

function compactPick(player) {
  return {
    side: player.side,
    team_name: player.team_name,
    player_name: player.player_name,
    actual_player_name: player.actual_player_name,
    player_icon: player.player_icon,
    hero_id: player.hero_id,
    hero_name: player.hero_name,
    hero_icon: player.hero_icon,
    position_desc: player.position_desc,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    kda: player.kda,
    gold: player.gold,
    participation_rate: player.participation_rate,
    hurt_to_hero_total: player.hurt_to_hero_total,
    be_hurt_by_hero_total: player.be_hurt_by_hero_total,
    summoner_ability: player.summoner_ability,
  };
}

function buildViewDataset(dataset) {
  return {
    dataset_id: dataset.dataset_id,
    league_id: dataset.league_id,
    league_name: dataset.league_name,
    source_level: dataset.source_level,
    collected_at: dataset.collected_at,
    source_pages: dataset.source_pages,
    summary: dataset.summary,
    hero_stats: dataset.hero_stats
      .map((hero) => ({
        hero_id: hero.hero_id,
        hero_name: hero.hero_name,
        hero_icon: hero.hero_icon,
        battle_count: hero.battle_count,
        pick_count: hero.pick_count,
        pick_rate_percent: hero.pick_rate_percent,
        ban_count: hero.ban_count,
        ban_rate_percent: hero.ban_rate_percent,
        victory_battle_count: hero.victory_battle_count,
        win_rate_percent: hero.win_rate_percent,
      }))
      .sort((a, b) => b.battle_count - a.battle_count),
    matches: dataset.matches.map((match) => ({
      match_id: match.match_id,
      stage_desc: match.stage_desc,
      bo: match.bo,
      start_time: match.start_time,
      end_time: match.end_time,
      blue_team: match.blue_team,
      red_team: match.red_team,
      winner_side: match.winner_side,
      score: match.score,
      source_url: match.source_url,
      games: match.games.map((game) => ({
        battle_id: game.battle_id,
        game_no: game.game_no,
        winner_side: game.winner_side,
        winner_team: game.winner_team,
        duration_seconds: game.duration_seconds,
        blue_team: game.blue_team,
        red_team: game.red_team,
        bans: {
          blue: game.bans.blue.map(compactHero),
          red: game.bans.red.map(compactHero),
        },
        picks: {
          blue: game.picks.blue.map(compactPick),
          red: game.picks.red.map(compactPick),
        },
        bp_action_count: game.bp_actions.length,
        source_url: game.source_url,
      })),
    })),
  };
}

function summarize(matches, heroStats) {
  const games = matches.flatMap((match) => match.games);
  const bpActionCount = games.reduce((sum, game) => sum + game.bp_actions.length, 0);
  const finishedMatches = matches.filter((match) => match.status === 2);
  const bpActionLengthDistribution = {};
  const teams = new Map();
  for (const match of matches) {
    for (const team of [match.blue_team, match.red_team]) {
      if (team?.id) teams.set(team.id, { id: team.id, name: team.name, abbreviation: team.abbreviation, icon: team.icon });
    }
  }
  for (const game of games) {
    const key = String(game.bp_actions.length);
    bpActionLengthDistribution[key] = (bpActionLengthDistribution[key] ?? 0) + 1;
  }
  return {
    hero_count: heroStats.length,
    match_count: matches.length,
    finished_match_count: finishedMatches.length,
    game_count: games.length,
    bp_action_count: bpActionCount,
    bp_action_length_distribution: bpActionLengthDistribution,
    team_count: teams.size,
    teams: [...teams.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")),
  };
}

async function collectLeague(leagueId) {
  const heroUrl = withQuery(ENDPOINTS.heroStats, { league_id: leagueId });
  const matchesUrl = withQuery(ENDPOINTS.matches, { league_id: leagueId });
  const [heroPayload, matchPayload] = await Promise.all([fetchJson(heroUrl), fetchJson(matchesUrl)]);

  const heroStats = (heroPayload.data ?? []).map((row) => normalizeHeroStats(row, leagueId));
  const matchRows = (matchPayload.results ?? []).sort((a, b) =>
    String(a.start_time ?? "").localeCompare(String(b.start_time ?? "")),
  );

  const matches = [];
  const errors = [];

  for (const [matchIndex, match] of matchRows.entries()) {
    const matchId = String(match.match_id ?? "");
    const matchBattlesUrl = withQuery(ENDPOINTS.matchBattles, { match_id: matchId });
    try {
      const battlesPayload = await fetchJson(matchBattlesUrl);
      const simpleBattles = (battlesPayload.results ?? []).sort(
        (a, b) => Number(a.battle_seq ?? 0) - Number(b.battle_seq ?? 0),
      );
      const battleDetails = [];
      for (const battle of simpleBattles) {
        const battleId = String(battle.battle_id ?? "");
        try {
          const battlePayload = await fetchJson(withQuery(ENDPOINTS.battle, { battle_id: battleId }));
          if (battlePayload.data) {
            battleDetails.push(normalizeBattle(battlePayload.data, match, leagueId));
          }
        } catch (error) {
          errors.push({ match_id: matchId, battle_id: battleId, message: error.message });
        }
        await sleep(120);
      }
      matches.push(normalizeMatch(match, battleDetails, leagueId));
      process.stderr.write(
        `[${matchIndex + 1}/${matchRows.length}] ${matchId} ${match.camp1?.team_name ?? ""} vs ${match.camp2?.team_name ?? ""}: ${battleDetails.length} games\n`,
      );
    } catch (error) {
      errors.push({ match_id: matchId, message: error.message });
    }
    await sleep(160);
  }

  return {
    dataset_id: `pvp-official-${leagueId}`,
    league_id: leagueId,
    league_name: "2026年挑战者杯",
    source_level: "official",
    collected_at: new Date().toISOString(),
    source_pages: {
      hero_data: `${PVP_BASE}/heroData.html?league_id=${leagueId}`,
      schedule_details_template: `${PVP_BASE}/scheduleDetails.html?league_id=${leagueId}&match_id={match_id}`,
    },
    api_endpoints: ENDPOINTS,
    notes: [
      "hero_stats comes from Tencent PVP official hero settle list for league_id=20260002.",
      "matches and games come from Tencent PVP official schedule and battle detail endpoints.",
      "bp_actions preserves the official bp_list order returned by the battle detail endpoint.",
      "is_ban_or_pick=0 is normalized as ban; is_ban_or_pick=1 is normalized as pick, matching Tencent's page renderer.",
    ],
    summary: summarize(matches, heroStats),
    hero_stats: heroStats,
    matches,
    crawl_errors: errors,
  };
}

async function main() {
  const leagueId = getArg("--league-id", DEFAULT_LEAGUE_ID);
  const outPath = path.resolve(getArg("--out", DEFAULT_OUT));
  const summaryOutPath = path.resolve(getArg("--summary-out", DEFAULT_SUMMARY_OUT));
  const viewOutPath = path.resolve(getArg("--view-out", DEFAULT_VIEW_OUT));
  const dataset = await collectLeague(leagueId);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  await mkdir(path.dirname(summaryOutPath), { recursive: true });
  await writeFile(
    summaryOutPath,
    `${JSON.stringify(
      {
        dataset_id: dataset.dataset_id,
        league_id: dataset.league_id,
        league_name: dataset.league_name,
        source_level: dataset.source_level,
        collected_at: dataset.collected_at,
        source_pages: dataset.source_pages,
        summary: dataset.summary,
        crawl_error_count: dataset.crawl_errors.length,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await mkdir(path.dirname(viewOutPath), { recursive: true });
  await writeFile(viewOutPath, `${JSON.stringify(buildViewDataset(dataset), null, 2)}\n`, "utf8");
  process.stdout.write(
    JSON.stringify(
      { outPath, summaryOutPath, viewOutPath, summary: dataset.summary, errors: dataset.crawl_errors.length },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
