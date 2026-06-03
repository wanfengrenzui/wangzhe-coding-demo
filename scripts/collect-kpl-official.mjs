import { writeFile } from "node:fs/promises";

const API_BASE = "https://kplshop-op.timi-esports.qq.com/kplow";
const DEFAULT_SEASON_ID = "KPL2026S1";

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function getOutputPath() {
  const explicit = getArgValue("--out", "");
  if (explicit) return explicit;

  return process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--") && arg !== DEFAULT_SEASON_ID) ?? "";
}

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.result !== 0) {
    throw new Error(`${path} failed: ${payload.result} ${payload.msg ?? ""}`.trim());
  }

  return payload.data;
}

function summarizeSchedules(schedules) {
  const finished = schedules.filter((item) => item.schedule_status === 4);
  const playedGames = finished.reduce(
    (sum, item) => sum + Number(item.team_a_score ?? 0) + Number(item.team_b_score ?? 0),
    0,
  );
  const stageCounts = new Map();

  for (const item of schedules) {
    const key = item.stage_name || item.stageid || "unknown";
    stageCounts.set(key, (stageCounts.get(key) ?? 0) + 1);
  }

  return {
    matchCount: schedules.length,
    finishedMatchCount: finished.length,
    playedGames,
    stageCounts: Object.fromEntries(stageCounts),
  };
}

function summarizeHeroRanks(heroRanks) {
  const pickedHeroRows = heroRanks.filter((item) => Number(item.match_count ?? 0) > 0);
  const heroPickEvents = heroRanks.reduce((sum, item) => sum + Number(item.match_count ?? 0), 0);
  const impliedGames = heroPickEvents / 10;
  const topPicked = [...heroRanks]
    .sort((a, b) => Number(b.match_count ?? 0) - Number(a.match_count ?? 0))
    .slice(0, 15)
    .map((item) => ({
      hero_id: String(item.hero_id),
      hero_name: item.hero_name,
      position: item.position,
      match_count: Number(item.match_count ?? 0),
      win_rate: Number(item.win_cr ?? 0),
      best_player: item.player_name || "",
      best_player_win_rate: Number(item.best_player_win_cr ?? 0),
    }));

  return {
    heroRows: heroRanks.length,
    pickedHeroRows: pickedHeroRows.length,
    heroPickEvents,
    impliedGames,
    topPicked,
  };
}

async function main() {
  const seasonid = getArgValue("--season", DEFAULT_SEASON_ID);
  const outPath = getOutputPath();
  const seasonData = await postJson("getSeasonAndStageAndTeamList", { seasonid });
  const scheduleData = await postJson("getScheduleList", { seasonid });
  const heroRankData = await postJson("getHeroRankList", { seasonid });

  const schedules = scheduleData.list ?? [];
  const heroRanks = heroRankData.list ?? [];
  const report = {
    seasonid,
    source: {
      site: "https://kpl.qq.com/",
      api_base: API_BASE,
      endpoints: [
        "getSeasonAndStageAndTeamList",
        "getScheduleList",
        "getHeroRankList",
      ],
    },
    collected_at: new Date().toISOString(),
    seasons: seasonData.seasons ?? [],
    stages: seasonData.stages ?? [],
    teams: seasonData.teams ?? [],
    schedule_summary: summarizeSchedules(schedules),
    hero_rank_summary: summarizeHeroRanks(heroRanks),
    limitations: [
      "Official schedule and hero-rank endpoints provide match results, hero pick counts, and pick win rates.",
      "Exact ban lists and pick order are not exposed by the verified endpoints and still need match reports, replay OCR, or another source.",
    ],
    schedules,
    hero_ranks: heroRanks,
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outPath) {
    await writeFile(outPath, json, "utf8");
  }
  process.stdout.write(json);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
