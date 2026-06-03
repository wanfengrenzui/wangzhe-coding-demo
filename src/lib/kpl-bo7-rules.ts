import type { KplBpMatch } from "@/lib/kpl-bp-data";

export type BpSide = "blue" | "red";
export type BpAction = "ban" | "pick";

export type Bo7BpStep = {
  side: BpSide;
  action: BpAction;
  count: number;
  label: string;
};

export const kplGlobalBpSteps: Bo7BpStep[] = [
  { side: "blue", action: "ban", count: 1, label: "蓝 Ban 1" },
  { side: "red", action: "ban", count: 1, label: "红 Ban 1" },
  { side: "blue", action: "ban", count: 1, label: "蓝 Ban 2" },
  { side: "red", action: "ban", count: 1, label: "红 Ban 2" },
  { side: "blue", action: "pick", count: 1, label: "蓝 B1" },
  { side: "red", action: "pick", count: 2, label: "红 R1/R2" },
  { side: "blue", action: "pick", count: 2, label: "蓝 B2/B3" },
  { side: "red", action: "pick", count: 1, label: "红 R3" },
  { side: "red", action: "ban", count: 1, label: "红 Ban 3" },
  { side: "blue", action: "ban", count: 1, label: "蓝 Ban 3" },
  { side: "red", action: "ban", count: 1, label: "红 Ban 4" },
  { side: "blue", action: "ban", count: 1, label: "蓝 Ban 4" },
  { side: "red", action: "ban", count: 1, label: "红 Ban 5" },
  { side: "blue", action: "ban", count: 1, label: "蓝 Ban 5" },
  { side: "red", action: "pick", count: 1, label: "红 R4" },
  { side: "blue", action: "pick", count: 2, label: "蓝 B4/B5" },
  { side: "red", action: "pick", count: 1, label: "红 R5" },
];

export function getCurrentGlobalBpStep(completedActions: {
  bans: Record<BpSide, number>;
  picks: Record<BpSide, number>;
}) {
  let banBlue = 0;
  let banRed = 0;
  let pickBlue = 0;
  let pickRed = 0;

  for (const step of kplGlobalBpSteps) {
    const done =
      step.action === "ban"
        ? step.side === "blue"
          ? completedActions.bans.blue - banBlue
          : completedActions.bans.red - banRed
        : step.side === "blue"
          ? completedActions.picks.blue - pickBlue
          : completedActions.picks.red - pickRed;

    if (done < step.count) {
      return step;
    }

    if (step.action === "ban") {
      if (step.side === "blue") banBlue += step.count;
      else banRed += step.count;
    } else if (step.side === "blue") {
      pickBlue += step.count;
    } else {
      pickRed += step.count;
    }
  }

  return undefined;
}

export function getTeamUsedHeroes(matches: KplBpMatch[], team: string) {
  const heroes = new Set<string>();

  matches.forEach((match) => {
    const side = match.blueTeam === team ? "blue" : match.redTeam === team ? "red" : null;
    if (!side) return;
    match.picks
      .filter((pick) => pick.side === side)
      .forEach((pick) => heroes.add(pick.hero));
  });

  return Array.from(heroes).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

export function getBo7RuleSnapshot(params: {
  allMatches: KplBpMatch[];
  blueTeam: string;
  redTeam: string;
  gameIndex: number;
  predictingTeam: string;
}) {
  const previousGames = params.allMatches.filter(
    (match) =>
      match.game !== `Game ${params.gameIndex}` &&
      [match.blueTeam, match.redTeam].includes(params.blueTeam) &&
      [match.blueTeam, match.redTeam].includes(params.redTeam),
  );
  const usedByPredictingTeam = getTeamUsedHeroes(previousGames, params.predictingTeam);
  const mode = params.gameIndex >= 7 ? "peak-duel" : "global-bp";
  const nextSideSelection =
    params.gameIndex === 1 ? "首局按赛前选边；后续通常由上一局败者选边。" : "上一局败者拥有本局选边权。";

  return {
    mode,
    previousGames,
    usedByPredictingTeam,
    nextSideSelection,
    ruleNotes:
      mode === "peak-duel"
        ? [
            "第 7 局进入巅峰对决，不走常规 Ban/Pick。",
            "双方盲选阵容并同时揭晓，同队阵容内英雄不能重复。",
            "巅峰对决不沿用前 6 局的全局 BP 英雄复用限制。",
          ]
        : [
            "前 6 局走全局 BP：同一战队已使用英雄后续不能再次 Pick。",
            "Ban 不写入战队已使用英雄池，只限制当前小局。",
            "常规流程为 5 Ban + 5 Pick，并支持完成后交换同侧 Pick 位置。",
          ],
  };
}
