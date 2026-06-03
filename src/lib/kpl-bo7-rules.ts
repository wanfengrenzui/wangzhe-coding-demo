import type { KplBpMatch } from "@/lib/kpl-bp-data";

export type BpSide = "blue" | "red";
export type BpAction = "ban" | "pick";
export type BpRound = "first-ban" | "first-pick" | "second-ban" | "second-pick";

export type Bo7BpStep = {
  side: BpSide;
  action: BpAction;
  count: number;
  label: string;
  code: string;
  round: BpRound;
};

const zh = {
  blue: "\u84dd\u8272\u65b9",
  red: "\u7ea2\u8272\u65b9",
};

export const kplGlobalBpSteps: Bo7BpStep[] = [
  { side: "blue", action: "ban", count: 1, label: `${zh.blue} Ban 1`, code: "BB1", round: "first-ban" },
  { side: "red", action: "ban", count: 1, label: `${zh.red} Ban 1`, code: "RB1", round: "first-ban" },
  { side: "blue", action: "ban", count: 1, label: `${zh.blue} Ban 2`, code: "BB2", round: "first-ban" },
  { side: "red", action: "ban", count: 1, label: `${zh.red} Ban 2`, code: "RB2", round: "first-ban" },
  { side: "blue", action: "ban", count: 1, label: `${zh.blue} Ban 3`, code: "BB3", round: "first-ban" },
  { side: "red", action: "ban", count: 1, label: `${zh.red} Ban 3`, code: "RB3", round: "first-ban" },
  { side: "blue", action: "pick", count: 1, label: `${zh.blue} B1`, code: "B1", round: "first-pick" },
  { side: "red", action: "pick", count: 2, label: `${zh.red} R1/R2`, code: "R1R2", round: "first-pick" },
  { side: "blue", action: "pick", count: 2, label: `${zh.blue} B2/B3`, code: "B2B3", round: "first-pick" },
  { side: "red", action: "pick", count: 1, label: `${zh.red} R3`, code: "R3", round: "first-pick" },
  { side: "red", action: "ban", count: 1, label: `${zh.red} Ban 4`, code: "RB4", round: "second-ban" },
  { side: "blue", action: "ban", count: 1, label: `${zh.blue} Ban 4`, code: "BB4", round: "second-ban" },
  { side: "red", action: "ban", count: 1, label: `${zh.red} Ban 5`, code: "RB5", round: "second-ban" },
  { side: "blue", action: "ban", count: 1, label: `${zh.blue} Ban 5`, code: "BB5", round: "second-ban" },
  { side: "red", action: "pick", count: 1, label: `${zh.red} R4`, code: "R4", round: "second-pick" },
  { side: "blue", action: "pick", count: 2, label: `${zh.blue} B4/B5`, code: "B4B5", round: "second-pick" },
  { side: "red", action: "pick", count: 1, label: `${zh.red} R5`, code: "R5", round: "second-pick" },
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

    if (done < step.count) return step;

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
    params.gameIndex === 1
      ? "\u9996\u5c40\u6309\u8d5b\u524d\u9009\u8fb9\uff1b\u540e\u7eed\u901a\u5e38\u7531\u4e0a\u4e00\u5c40\u8d25\u8005\u9009\u8fb9\u3002"
      : "\u4e0a\u4e00\u5c40\u8d25\u8005\u62e5\u6709\u672c\u5c40\u9009\u8fb9\u6743\u3002";

  return {
    mode,
    previousGames,
    usedByPredictingTeam,
    nextSideSelection,
    ruleNotes:
      mode === "peak-duel"
        ? [
            "Game 7 \u8fdb\u5165\u5dc5\u5cf0\u5bf9\u51b3\uff0c\u4e0d\u8d70\u5e38\u89c4 Ban/Pick\u3002",
            "\u53cc\u65b9\u76f2\u9009\u9635\u5bb9\u5e76\u540c\u65f6\u63ed\u6653\uff0c\u540c\u961f\u9635\u5bb9\u5185\u82f1\u96c4\u4e0d\u80fd\u91cd\u590d\u3002",
            "\u5dc5\u5cf0\u5bf9\u51b3\u4e0d\u6cbf\u7528\u524d 6 \u5c40\u7684\u5168\u5c40 BP \u82f1\u96c4\u590d\u7528\u9650\u5236\u3002",
          ]
        : [
            "\u524d 6 \u5c40\u8d70\u5168\u5c40 BP\uff1a\u540c\u4e00\u6218\u961f\u5df2\u4f7f\u7528\u82f1\u96c4\u540e\u7eed\u4e0d\u80fd\u518d\u6b21 Pick\u3002",
            "\u7b2c\u4e00\u8f6e\u53cc\u65b9\u5404 Ban 3 \u4e2a\u82f1\u96c4\uff0c\u987a\u5e8f\u662f\u84dd/\u7ea2/\u84dd/\u7ea2/\u84dd/\u7ea2\u3002",
            "\u524d\u4e09\u624b Pick \u987a\u5e8f\u662f B1 -> R1/R2 -> B2/B3 -> R3\u3002",
            "\u7b2c\u4e8c\u8f6e Ban \u540e\uff0c\u540e\u7f6e\u4f4d Pick \u987a\u5e8f\u662f R4 -> B4/B5 -> R5\u3002",
          ],
  };
}
