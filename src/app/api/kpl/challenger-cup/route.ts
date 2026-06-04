import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import summary from "@/data/kpl/challenger-cup-2026-summary.json";

async function readJsonFile<T>(fileName: string) {
  const filePath = path.join(process.cwd(), "src", "data", "kpl", fileName);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readDataset() {
  return readJsonFile<{
    matches: Array<{
      match_id: string;
      stage_desc: string;
      bo: number;
      start_time: string;
      blue_team: unknown;
      red_team: unknown;
      score: string;
      winner_side: string;
      source_url: string;
      games: Array<{
        battle_id: string;
        game_no: number;
        winner_side: string;
        winner_team: string;
        bp_actions: unknown[];
        source_url: string;
      }>;
    }>;
  }>("challenger-cup-2026.json");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "summary";

  if (view === "full") {
    const dataset = await readDataset();
    return NextResponse.json(dataset);
  }

  if (view === "ui") {
    const viewDataset = await readJsonFile("challenger-cup-2026-view.json");
    return NextResponse.json(viewDataset);
  }

  if (view === "matches") {
    const dataset = await readDataset();
    return NextResponse.json({
      ...summary,
      matches: dataset.matches.map((match) => ({
        match_id: match.match_id,
        stage_desc: match.stage_desc,
        bo: match.bo,
        start_time: match.start_time,
        blue_team: match.blue_team,
        red_team: match.red_team,
        score: match.score,
        winner_side: match.winner_side,
        source_url: match.source_url,
        games: match.games.map((game) => ({
          battle_id: game.battle_id,
          game_no: game.game_no,
          winner_side: game.winner_side,
          winner_team: game.winner_team,
          bp_action_count: game.bp_actions.length,
          source_url: game.source_url,
        })),
      })),
    });
  }

  return NextResponse.json(summary);
}
