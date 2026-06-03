import type { KplBpMatch } from "@/lib/kpl-bp-data";

export type BpSide = "blue" | "red";
export type BpAction = "ban" | "pick";
export type BpRound = "first-ban" | "first-pick" | "second-ban" | "second-pick";

export type Bo7BpStep = {
  step: number;
  side: BpSide;
  action: BpAction;
  slot: number;
  label: string;
  code: string;
  round: BpRound;
};

const sideLabel: Record<BpSide, string> = {
  blue: "蓝方",
  red: "红方",
};

const roundLabel: Record<BpRound, string> = {
  "first-ban": "第一轮 Ban",
  "first-pick": "第一轮 Pick",
  "second-ban": "第二轮 Ban",
  "second-pick": "第二轮 Pick",
};

function makeStep(step: number, side: BpSide, action: BpAction, slot: number, round: BpRound): Bo7BpStep {
  const prefix = action === "ban" ? "Ban" : side === "blue" ? "B" : "R";
  return {
    step,
    side,
    action,
    slot,
    label: `${sideLabel[side]} ${prefix}${slot}`,
    code: `${side === "blue" ? "B" : "R"}${action === "ban" ? "B" : "P"}${slot}`,
    round,
  };
}

export const kplGlobalBpSteps: Bo7BpStep[] = [
  makeStep(1, "blue", "ban", 1, "first-ban"),
  makeStep(2, "red", "ban", 1, "first-ban"),
  makeStep(3, "blue", "ban", 2, "first-ban"),
  makeStep(4, "red", "ban", 2, "first-ban"),

  makeStep(5, "blue", "pick", 1, "first-pick"),
  makeStep(6, "red", "pick", 1, "first-pick"),
  makeStep(7, "red", "pick", 2, "first-pick"),
  makeStep(8, "blue", "pick", 2, "first-pick"),
  makeStep(9, "blue", "pick", 3, "first-pick"),
  makeStep(10, "red", "pick", 3, "first-pick"),

  makeStep(11, "red", "ban", 3, "second-ban"),
  makeStep(12, "blue", "ban", 3, "second-ban"),
  makeStep(13, "red", "ban", 4, "second-ban"),
  makeStep(14, "blue", "ban", 4, "second-ban"),

  makeStep(15, "red", "pick", 4, "second-pick"),
  makeStep(16, "blue", "pick", 4, "second-pick"),
  makeStep(17, "blue", "pick", 5, "second-pick"),
  makeStep(18, "red", "pick", 5, "second-pick"),
];

export const peakDuelConfig = {
  noBan: true,
  blindPick: true,
  ignoreGlobalBP: true,
};

export function getRoundLabel(round: BpRound) {
  return roundLabel[round];
}

export function getCurrentGlobalBpStep(completedActions: {
  bans: Record<BpSide, number>;
  picks: Record<BpSide, number>;
}) {
  return kplGlobalBpSteps.find((step) => {
    const completed =
      step.action === "ban" ? completedActions.bans[step.side] : completedActions.picks[step.side];
    return completed < step.slot;
  });
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

  return {
    mode,
    previousGames,
    usedByPredictingTeam,
    peakDuelConfig: mode === "peak-duel" ? peakDuelConfig : undefined,
    nextSideSelection:
      params.gameIndex === 1
        ? "首局按赛前选边；后续通常由上一局败者选边。"
        : "上一局败者拥有本局选边权。",
    ruleNotes:
      mode === "peak-duel"
        ? [
            "Game 7 预留巅峰对决配置：noBan、blindPick、ignoreGlobalBP。",
            "当前先保留结构开关，后续可实现双方盲选同时揭晓。",
          ]
        : [
            "G1-G6 使用 18 步常规 BP：双方各 Ban 2 后各 Pick 3，再各 Ban 2，最后补齐 Pick。",
            "Pick 受全局 BP 限制；Ban 只限制当前小局。",
            "当前局已 Ban 或已 Pick 的英雄不能再次选择。",
          ],
  };
}
