"use client";

import { BarChart3, Database, RotateCcw, Search, Trophy, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AssetImage } from "@/components/asset-image";
import { getBo7RuleSnapshot, kplGlobalBpSteps, type BpRound } from "@/lib/kpl-bo7-rules";
import { currentKplBpMatches, type KplBpMatch } from "@/lib/kpl-bp-data";

type TabKey = "database" | "bp-predict";
type DraftAction = { stepIndex: number; heroes: string[] };
type Prediction = { hero: string; score: number; reason: string };

const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "database", label: "KPL 赛事中心", hint: "2026 BP 数据 / 选手英雄池" },
  { key: "bp-predict", label: "BP 预测", hint: "真实 BP 场景 / 点击选英雄" },
];

const heroIdMap: Record<string, number> = {
  小乔: 106,
  孙尚香: 111,
  夏侯惇: 126,
  曹操: 128,
  狄仁杰: 133,
  关羽: 140,
  露娜: 146,
  王昭君: 152,
  艾琳: 155,
  张良: 156,
  不知火舞: 157,
  牛魔: 168,
  张飞: 171,
  李元芳: 173,
  杨玉环: 176,
  哪吒: 180,
  干将莫邪: 182,
  太乙真人: 186,
  大乔: 191,
  铠: 193,
  苏烈: 194,
  弈星: 197,
  公孙离: 199,
  裴擒虎: 502,
  狂铁: 503,
  盾山: 509,
  嫦娥: 515,
  马超: 518,
  蒙恬: 527,
  澜: 528,
  镜: 531,
  阿古朵: 533,
  夏洛特: 536,
  云缨: 538,
  暃: 542,
};

export function AgentWorkspace() {
  const [activeTab, setActiveTab] = useState<TabKey>("bp-predict");
  const totalTeams = useMemo(
    () => new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam])).size,
    [],
  );
  const totalHeroes = useMemo(
    () => new Set(currentKplBpMatches.flatMap((match) => match.picks.map((pick) => pick.hero))).size,
    [],
  );

  return (
    <main className="min-h-screen bg-[#070d14] text-slate-100">
      <div className="border-b border-white/10 bg-[#0b121c]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">KPL HUB</p>
            <h1 className="mt-1 text-2xl font-bold">KPL 赛事中心</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[420px]">
            <Stat label="BP 样本" value={`${currentKplBpMatches.length} 局`} />
            <Stat label="覆盖战队" value={`${totalTeams} 支`} />
            <Stat label="英雄样本" value={`${totalHeroes} 个`} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 py-5">
        <nav className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              className={
                "rounded-lg border px-4 py-2 text-left transition " +
                (activeTab === tab.key
                  ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-50"
                  : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/25")
              }
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="mt-0.5 block text-[11px]">{tab.hint}</span>
            </button>
          ))}
        </nav>

        {activeTab === "database" ? <DatabasePanel /> : <BpPredictPanel />}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DatabasePanel() {
  const [selectedId, setSelectedId] = useState(currentKplBpMatches[0].id);
  const selected = currentKplBpMatches.find((match) => match.id === selectedId) || currentKplBpMatches[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr_360px]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-200" />
          <h2 className="font-semibold">2026 BP 数据库</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          当前保留 20 局阵容级 BP 和选手-英雄映射，后续继续接入 Bilibili 视频 OCR 校准逐手顺序。
        </p>
        <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto pr-1">
          {currentKplBpMatches.map((match) => (
            <button
              className={
                "w-full rounded-xl border p-3 text-left transition " +
                (selected.id === match.id
                  ? "border-emerald-300/60 bg-emerald-300/12"
                  : "border-white/10 bg-white/[0.035] hover:border-white/25")
              }
              key={match.id}
              onClick={() => setSelectedId(match.id)}
              type="button"
            >
              <p className="text-sm font-semibold text-white">
                {match.blueTeam} vs {match.redTeam}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {match.date} / {match.game} / {match.result}
              </p>
            </button>
          ))}
        </div>
      </section>

      <MatchDetail match={selected} />
      <TeamClusterPanel />
    </div>
  );
}

function MatchDetail({ match }: { match: KplBpMatch }) {
  const bluePicks = match.picks.filter((pick) => pick.side === "blue");
  const redPicks = match.picks.filter((pick) => pick.side === "red");

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Match Detail</p>
      <h2 className="mt-2 text-2xl font-bold">
        {match.blueTeam} vs {match.redTeam}
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        {match.stage} / {match.game} / {match.result}
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <SideCard team={match.blueTeam} side="blue" bans={match.bans.blue} picks={bluePicks} />
        <SideCard team={match.redTeam} side="red" bans={match.bans.red} picks={redPicks} />
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs font-semibold text-slate-200">样本说明</p>
        <div className="mt-2 space-y-1 text-xs leading-5 text-slate-400">
          {match.analysis.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">{match.confidence}</p>
      </div>
    </section>
  );
}

function SideCard({
  bans,
  picks,
  side,
  team,
}: {
  bans: string[];
  picks: KplBpMatch["picks"];
  side: "blue" | "red";
  team: string;
}) {
  const tone = side === "blue" ? "border-sky-300/25 bg-sky-300/8" : "border-rose-300/25 bg-rose-300/8";

  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <h3 className="font-semibold">{team}</h3>
      <p className="mt-3 text-xs text-slate-500">Ban</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {bans.length ? (
          bans.map((hero) => (
            <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs" key={hero}>
              {hero}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">巅峰对决无常规 Ban</span>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">Pick / 选手</p>
      <div className="mt-2 space-y-1.5">
        {picks.map((pick) => (
          <div className="grid grid-cols-[64px_1fr_72px] gap-2 rounded-md bg-black/20 px-2 py-1.5 text-xs" key={pick.order}>
            <span className="text-slate-500">{pick.lane}</span>
            <strong>{pick.player}</strong>
            <span className="text-right text-emerald-100">{pick.hero}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamClusterPanel() {
  const teamCounts = getTeamHeroRows();

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-emerald-200" />
        <h2 className="font-semibold">聚类准备</h2>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        这些统计会服务后续“某战队常选”和“蓝色方先选后红色方响应”的预测特征。
      </p>
      <div className="mt-4 space-y-3">
        {teamCounts.slice(0, 8).map((row) => (
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={row.team}>
            <p className="text-sm font-semibold">{row.team}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.heroes.slice(0, 8).map(([hero, count]) => (
                <span className="rounded-md bg-black/25 px-2 py-1 text-[11px]" key={hero}>
                  {hero} x{count}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BpPredictPanel() {
  const teams = useMemo(
    () => Array.from(new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam]))),
    [],
  );
  const heroes = useMemo(
    () =>
      Array.from(
        new Set(
          currentKplBpMatches.flatMap((match) => [
            ...match.picks.map((pick) => pick.hero),
            ...match.bans.blue,
            ...match.bans.red,
          ]),
        ),
      ).sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
    [],
  );

  const [blueTeam, setBlueTeam] = useState("成都AG超玩会");
  const [redTeam, setRedTeam] = useState("重庆狼队");
  const [gameIndex, setGameIndex] = useState(1);
  const [draftActions, setDraftActions] = useState<DraftAction[]>([]);
  const [query, setQuery] = useState("");

  const lastAction = draftActions[draftActions.length - 1];
  const lastStep = lastAction ? kplGlobalBpSteps[lastAction.stepIndex] : undefined;
  const isLastActionIncomplete = Boolean(lastAction && lastStep && lastAction.heroes.length < lastStep.count);
  const currentStepIndex = isLastActionIncomplete ? lastAction!.stepIndex : draftActions.length;
  const currentStep = kplGlobalBpSteps[currentStepIndex];
  const currentTeam = currentStep?.side === "blue" ? blueTeam : redTeam;
  const opponentTeam = currentStep?.side === "blue" ? redTeam : blueTeam;
  const completedHeroes = useMemo(() => new Set(draftActions.flatMap((item) => item.heroes)), [draftActions]);
  const ruleSnapshot = useMemo(
    () =>
      getBo7RuleSnapshot({
        allMatches: currentKplBpMatches,
        blueTeam,
        redTeam,
        gameIndex,
        predictingTeam: currentTeam || blueTeam,
      }),
    [blueTeam, currentTeam, gameIndex, redTeam],
  );
  const lastOpponentPick =
    [...draftActions]
      .reverse()
      .flatMap((item) => {
        const step = kplGlobalBpSteps[item.stepIndex];
        return step?.action === "pick" && step.side !== currentStep?.side ? item.heroes : [];
      })[0] || heroes[0];
  const predictions = useMemo(() => {
    if (!currentStep || !currentTeam) return [];
    const unavailable =
      currentStep.action === "pick" && ruleSnapshot.mode === "global-bp"
        ? [...ruleSnapshot.usedByPredictingTeam, ...completedHeroes]
        : [...completedHeroes];

    return getBpPredictions({
      mode: currentStep.action,
      opponentTeam,
      predictingTeam: currentTeam,
      selectedHero: lastOpponentPick,
      unavailableHeroes: unavailable,
    });
  }, [completedHeroes, currentStep, currentTeam, lastOpponentPick, opponentTeam, ruleSnapshot]);
  const currentAction = draftActions.find((item) => item.stepIndex === currentStepIndex);
  const completedStepCount = draftActions.filter((item) => {
    const step = kplGlobalBpSteps[item.stepIndex];
    return step && item.heroes.length >= step.count;
  }).length;
  const filteredHeroes = heroes.filter((hero) => hero.includes(query.trim())).filter((hero) => !completedHeroes.has(hero));
  const suggestedHeroes = mergeHeroLists(predictions.map((item) => item.hero), filteredHeroes).slice(0, 36);
  const blueBans = getDraftHeroes(draftActions, "blue", "ban");
  const redBans = getDraftHeroes(draftActions, "red", "ban");
  const bluePicks = getDraftHeroes(draftActions, "blue", "pick");
  const redPicks = getDraftHeroes(draftActions, "red", "pick");
  const dialogue = createDialogue(draftActions, blueTeam, redTeam);

  function resetDraft(nextBlue = blueTeam, nextRed = redTeam) {
    setBlueTeam(nextBlue);
    setRedTeam(nextRed);
    setDraftActions([]);
  }

  function addHero(hero: string) {
    if (!currentStep || completedHeroes.has(hero)) return;

    setDraftActions((items) => {
      const existingIndex = items.findIndex((item) => item.stepIndex === currentStepIndex);
      if (existingIndex >= 0) {
        const existing = items[existingIndex];
        if (existing.heroes.length >= currentStep.count) return items;
        return items.map((item, index) =>
          index === existingIndex ? { ...item, heroes: [...item.heroes, hero] } : item,
        );
      }
      return [...items, { stepIndex: currentStepIndex, heroes: [hero] }];
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_420px]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Live Draft</p>
        <h2 className="mt-2 text-xl font-bold">对话式 BP 指挥台</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          系统会像裁判一样提示当前轮到谁。点击右侧英雄头像或名称，即可完成这一手并自动切到下一方。
        </p>

        <div className="mt-4 space-y-3">
          <SelectBox label="蓝色方" value={blueTeam} values={teams} onChange={(value) => resetDraft(value, redTeam)} />
          <SelectBox label="红色方" value={redTeam} values={teams} onChange={(value) => resetDraft(blueTeam, value)} />
          <div>
            <p className="text-xs text-slate-500">BO7 局数</p>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, index) => index + 1).map((value) => (
                <button
                  className={
                    "h-8 rounded-md border text-xs font-semibold transition " +
                    (gameIndex === value
                      ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-100"
                      : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/25")
                  }
                  key={value}
                  onClick={() => {
                    setGameIndex(value);
                    setDraftActions([]);
                  }}
                  type="button"
                >
                  G{value}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-200 transition hover:border-white/25"
              onClick={() => setDraftActions((items) => items.slice(0, -1))}
              type="button"
            >
              <Undo2 className="h-3.5 w-3.5" />
              撤销
            </button>
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300/40 bg-emerald-300/12 px-3 py-2 text-xs text-emerald-100 transition hover:border-emerald-200"
              onClick={() => setDraftActions([])}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重开
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[500px] space-y-2 overflow-y-auto pr-1">
          <DialogueBubble
            side="system"
            text={
              currentStep && currentTeam
                ? `现在轮到 ${currentTeam} ${currentStep.action === "ban" ? "禁用" : "选择"} ${currentStep.count} 个英雄。`
                : "BP 已完成，可以复盘整套阵容。"
            }
          />
          {dialogue.map((item) => (
            <DialogueBubble key={`${item.step}-${item.hero}`} side={item.side} text={item.text} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Draft Board</p>
            <h2 className="mt-2 text-xl font-bold">真实 BP 场景</h2>
          </div>
          <span className="rounded-md bg-white/[0.06] px-3 py-1.5 text-xs text-slate-300">
            {completedStepCount}/{kplGlobalBpSteps.length} 步
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_120px_1fr]">
          <TeamDraftPanel
            active={currentStep?.side === "blue"}
            bans={blueBans}
            picks={bluePicks}
            side="blue"
            team={blueTeam}
          />
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-white/10 bg-black/25 p-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Current</p>
            <p className="mt-2 text-sm font-semibold text-white">{currentStep?.label || "BP 完成"}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {currentStep ? `${roundLabel(currentStep.round)} / ${currentStep.action.toUpperCase()} x${currentStep.count}` : "准备进入复盘"}
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-emerald-300 transition-all"
                style={{ width: `${Math.min(100, (completedStepCount / kplGlobalBpSteps.length) * 100)}%` }}
              />
            </div>
          </div>
          <TeamDraftPanel active={currentStep?.side === "red"} bans={redBans} picks={redPicks} side="red" team={redTeam} />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs font-semibold text-slate-200">流程</p>
          <div className="mt-2 grid gap-2 text-xs leading-5 text-slate-400 md:grid-cols-3">
            <p>{"第一轮 Ban：蓝 Ban 1 -> 红 Ban 1 -> 蓝 Ban 2 -> 红 Ban 2 -> 蓝 Ban 3 -> 红 Ban 3。"}</p>
            <p>{"前半段 Pick：蓝 B1 -> 红 R1/R2 -> 蓝 B2/B3 -> 红 R3。"}</p>
            <p>{"第二轮 Ban 后：红 R4 -> 蓝 B4/B5 -> 红 R5。"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Hero Pool</p>
            <h2 className="mt-2 text-xl font-bold">点击英雄完成当前手</h2>
          </div>
          <Trophy className="h-5 w-5 text-emerald-200" />
        </div>

        <div className="mt-3 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3">
          <p className="text-sm font-semibold text-emerald-100">
            {currentStep && currentTeam
              ? `${currentTeam} ${currentStep.action === "ban" ? "本手建议 Ban" : "本手建议 Pick"}`
              : "BP 已完成"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            预测同时参考全局样本、当前战队英雄池、对手常用英雄、上一手对方 Pick 和已禁/已选英雄。
          </p>
        </div>

        <label className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索英雄"
            value={query}
          />
        </label>

        <div className="mt-3 grid max-h-[650px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 xl:grid-cols-3">
          {suggestedHeroes.map((hero) => {
            const prediction = predictions.find((item) => item.hero === hero);
            const isTop = predictions.slice(0, 6).some((item) => item.hero === hero);

            return (
              <button
                className={
                  "group min-h-[112px] rounded-xl border p-2 text-center transition " +
                  (isTop
                    ? "border-emerald-300/50 bg-emerald-300/12 hover:bg-emerald-300/20"
                    : "border-white/10 bg-white/[0.035] hover:border-white/25")
                }
                disabled={!currentStep}
                key={hero}
                onClick={() => addHero(hero)}
                title={prediction?.reason || hero}
                type="button"
              >
                <AssetImage
                  alt={hero}
                  className="mx-auto h-12 w-12 rounded-full border border-white/10"
                  fallback={hero.slice(0, 2)}
                  src={getHeroAvatar(hero)}
                />
                <p className="mt-2 break-words text-xs font-semibold text-white">{hero}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {prediction ? `${prediction.score.toFixed(1)} 分` : "候选"}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs font-semibold text-slate-200">预测解释</p>
          <div className="mt-2 space-y-2">
            {predictions.slice(0, 4).map((item) => (
              <div className="rounded-lg bg-black/20 p-2 text-xs leading-5" key={item.hero}>
                <strong className="text-emerald-100">{item.hero}</strong>
                <p className="mt-1 text-slate-500">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TeamDraftPanel({
  active,
  bans,
  picks,
  side,
  team,
}: {
  active: boolean;
  bans: string[];
  picks: string[];
  side: "blue" | "red";
  team: string;
}) {
  const tone =
    side === "blue"
      ? active
        ? "border-sky-300/70 bg-sky-300/12"
        : "border-sky-300/25 bg-sky-300/8"
      : active
        ? "border-rose-300/70 bg-rose-300/12"
        : "border-rose-300/25 bg-rose-300/8";

  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold">{team}</h3>
        {active ? <span className="rounded bg-emerald-300 px-2 py-1 text-[11px] font-bold text-slate-950">操作中</span> : null}
      </div>
      <p className="mt-3 text-xs text-slate-500">Ban 位</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <HeroSlot hero={bans[index]} key={index} label={`B${index + 1}`} size="small" />
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Pick 位</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <HeroSlot hero={picks[index]} key={index} label={`${index + 1}楼`} size="large" />
        ))}
      </div>
    </div>
  );
}

function HeroSlot({ hero, label, size }: { hero?: string; label: string; size: "small" | "large" }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-1.5 text-center">
      <AssetImage
        alt={hero || label}
        className={(size === "large" ? "h-12 w-12" : "h-9 w-9") + " mx-auto rounded-full border border-white/10"}
        fallback={hero ? hero.slice(0, 2) : label}
        src={hero ? getHeroAvatar(hero) : undefined}
      />
      <p className="mt-1 truncate text-[10px] text-slate-300">{hero || label}</p>
    </div>
  );
}

function DialogueBubble({ side, text }: { side: "blue" | "red" | "system"; text: string }) {
  const style =
    side === "system"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
      : side === "blue"
        ? "ml-5 border-sky-300/25 bg-sky-300/10 text-sky-50"
        : "mr-5 border-rose-300/25 bg-rose-300/10 text-rose-50";

  return <div className={`rounded-xl border px-3 py-2 text-xs leading-5 ${style}`}>{text}</div>;
}

function SelectBox({
  label,
  onChange,
  value,
  values,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  values: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <select
        className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#121b27] px-3 text-sm text-slate-100 outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function HeroCountList({ counts }: { counts: Array<[string, number]> }) {
  return (
    <div className="mt-2 space-y-1.5">
      {counts.slice(0, 8).map(([hero, count]) => (
        <div className="flex items-center justify-between rounded-md bg-black/20 px-2 py-1.5 text-xs" key={hero}>
          <span className="break-words">{hero}</span>
          <strong className="text-emerald-100">{count}</strong>
        </div>
      ))}
    </div>
  );
}

function roundLabel(round: BpRound) {
  if (round === "first-ban") return "第一轮 Ban";
  if (round === "first-pick") return "前半段 Pick";
  if (round === "second-ban") return "第二轮 Ban";
  return "后置位 Pick";
}

function getTeamHeroRows() {
  return Array.from(new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam])))
    .map((team) => ({ team, heroes: getHeroCountsForTeam(team, "pick") }))
    .sort((a, b) => b.heroes.length - a.heroes.length);
}

function getHeroCountsForTeam(team: string, type: "pick" | "ban") {
  const counts = new Map<string, number>();

  currentKplBpMatches.forEach((match) => {
    if (type === "pick") {
      const side = match.blueTeam === team ? "blue" : match.redTeam === team ? "red" : null;
      if (!side) return;
      match.picks
        .filter((pick) => pick.side === side)
        .forEach((pick) => counts.set(pick.hero, (counts.get(pick.hero) || 0) + 1));
      return;
    }

    if (match.blueTeam === team) {
      match.bans.blue.forEach((hero) => counts.set(hero, (counts.get(hero) || 0) + 1));
    }
    if (match.redTeam === team) {
      match.bans.red.forEach((hero) => counts.set(hero, (counts.get(hero) || 0) + 1));
    }
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"));
}

function getDraftHeroes(actions: DraftAction[], side: "blue" | "red", type: "ban" | "pick") {
  return actions.flatMap((action) => {
    const step = kplGlobalBpSteps[action.stepIndex];
    return step?.side === side && step.action === type ? action.heroes : [];
  });
}

function createDialogue(actions: DraftAction[], blueTeam: string, redTeam: string) {
  return actions.flatMap((action) => {
    const step = kplGlobalBpSteps[action.stepIndex];
    if (!step) return [];
    const team = step.side === "blue" ? blueTeam : redTeam;
    return action.heroes.map((hero, index) => ({
      hero,
      side: step.side,
      step: `${step.code}-${index}`,
      text: `${team} ${step.action === "ban" ? "Ban 掉" : "锁下"} ${hero}。`,
    }));
  });
}

function mergeHeroLists(primary: string[], fallback: string[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((hero) => {
    if (seen.has(hero)) return false;
    seen.add(hero);
    return true;
  });
}

function getHeroAvatar(hero: string) {
  const id = heroIdMap[hero];
  return id ? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg` : undefined;
}

function getBpPredictions({
  mode,
  opponentTeam,
  predictingTeam,
  selectedHero,
  unavailableHeroes,
}: {
  mode: "pick" | "ban";
  opponentTeam: string;
  predictingTeam: string;
  selectedHero: string;
  unavailableHeroes: string[];
}): Prediction[] {
  const unavailable = new Set(unavailableHeroes);
  const ownPickCounts = new Map(getHeroCountsForTeam(predictingTeam, "pick"));
  const ownBanCounts = new Map(getHeroCountsForTeam(predictingTeam, "ban"));
  const opponentPickCounts = new Map(getHeroCountsForTeam(opponentTeam, "pick"));
  const opponentBanCounts = new Map(getHeroCountsForTeam(opponentTeam, "ban"));
  const candidateHeroes = new Set<string>([
    ...ownPickCounts.keys(),
    ...ownBanCounts.keys(),
    ...opponentPickCounts.keys(),
    ...opponentBanCounts.keys(),
  ]);

  return Array.from(candidateHeroes)
    .filter((hero) => !unavailable.has(hero))
    .map((hero) => {
      const ownPick = ownPickCounts.get(hero) || 0;
      const ownBan = ownBanCounts.get(hero) || 0;
      const opponentPick = opponentPickCounts.get(hero) || 0;
      const opponentBan = opponentBanCounts.get(hero) || 0;
      const responseBonus = selectedHero && sharesMatchWith(selectedHero, hero, opponentTeam) ? 1.8 : 0;
      const score =
        mode === "pick"
          ? ownPick * 2.2 + opponentBan * 0.8 + responseBonus
          : opponentPick * 2.4 + ownBan * 1.1 + responseBonus;
      const reason =
        mode === "pick"
          ? `${predictingTeam} 常选 ${ownPick} 次，对手曾 Ban ${opponentBan} 次；结合上一手 ${selectedHero} 做响应。`
          : `${opponentTeam} 常选 ${opponentPick} 次，我方历史 Ban ${ownBan} 次；优先限制对方熟练英雄。`;

      return { hero, score, reason };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.hero.localeCompare(b.hero, "zh-Hans-CN"));
}

function sharesMatchWith(selectedHero: string, candidateHero: string, team: string) {
  return currentKplBpMatches.some((match) => {
    const side = match.blueTeam === team ? "blue" : match.redTeam === team ? "red" : null;
    if (!side) return false;
    const heroes = match.picks.filter((pick) => pick.side === side).map((pick) => pick.hero);
    return heroes.includes(selectedHero) && heroes.includes(candidateHero);
  });
}
