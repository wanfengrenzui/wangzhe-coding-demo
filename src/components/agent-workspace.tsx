"use client";

import { BarChart3, Database, RotateCcw, Trophy, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getBo7RuleSnapshot,
  kplGlobalBpSteps,
  type BpRound,
} from "@/lib/kpl-bo7-rules";
import { currentKplBpMatches, type KplBpMatch } from "@/lib/kpl-bp-data";

type TabKey = "database" | "bp-predict";
type DraftAction = { stepIndex: number; heroes: string[] };
type Prediction = { hero: string; score: number; reason: string };

const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "database", label: "KPL 赛事中心", hint: "2026 BP 数据 / 选手英雄池" },
  { key: "bp-predict", label: "BP 预测", hint: "按真实流程逐手推荐" },
];

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
          当前先保留 20 局阵容级 BP 和选手-英雄映射，后续可继续接入 Bilibili 视频 OCR 校准逐手顺序。
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
        这些统计会直接服务后续“某战队常选”和“蓝色方先选后红色方响应”的预测特征。
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
    <div className="grid gap-4 xl:grid-cols-[320px_1fr_360px]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">BP Predictor</p>
        <h2 className="mt-2 text-xl font-bold">交互式 BP 流程</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          先按蓝/红/蓝/红/蓝/红完成第一轮 Ban，再走 B1、R1/R2、B2/B3、R3；第二轮 Ban 后按 R4、B4/B5、R5 收尾。
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

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-slate-500">当前节点</p>
          <p className="mt-2 text-sm leading-6">
            {currentStep && currentTeam ? (
              <>
                轮到 <strong className="text-sky-200">{currentTeam}</strong>{" "}
                {currentStep.action === "ban" ? "禁用" : "选择"}{" "}
                <strong className="text-emerald-200">{currentStep.count}</strong> 个英雄。
              </>
            ) : (
              "BP 流程已完成。"
            )}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {ruleSnapshot.mode === "global-bp"
              ? "前 6 局按全局 BP：Pick 避开本队 BO7 已用英雄；Ban 只影响当前小局。"
              : "Game 7 是巅峰对决，不走常规 Ban/Pick 流程。"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Draft Timeline</p>
            <h2 className="mt-2 text-xl font-bold">每轮 Ban/Pick 预测</h2>
          </div>
          <span className="rounded-md bg-white/[0.06] px-3 py-1.5 text-xs text-slate-300">
            已完成 {completedStepCount}/{kplGlobalBpSteps.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {kplGlobalBpSteps.map((step, index) => {
            const done = draftActions.find((item) => item.stepIndex === index);
            const active = index === currentStepIndex;

            return (
              <div
                className={
                  "rounded-xl border p-3 " +
                  (active
                    ? "border-emerald-300/50 bg-emerald-300/10"
                    : done
                      ? "border-sky-300/25 bg-sky-300/8"
                      : "border-white/10 bg-white/[0.035]")
                }
                key={step.code}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500">{roundLabel(step.round)}</p>
                    <h3 className="mt-1 text-sm font-semibold">{step.label}</h3>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold " +
                      (step.side === "blue" ? "bg-sky-300 text-slate-950" : "bg-rose-300 text-slate-950")
                    }
                  >
                    {step.action.toUpperCase()} x{step.count}
                  </span>
                </div>
                <div className="mt-2 flex min-h-7 flex-wrap gap-1.5">
                  {done?.heroes.length ? (
                    done.heroes.map((hero) => (
                      <span className="rounded-md bg-black/25 px-2 py-1 text-[11px]" key={hero}>
                        {hero}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">等待选择</span>
                  )}
                </div>
                {active ? (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-emerald-100">
                        当前预测 {currentAction ? currentAction.heroes.length : 0}/{step.count}
                      </p>
                      <p className="text-[11px] text-slate-500">参考上一手对方 Pick：{lastOpponentPick}</p>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {predictions.slice(0, 6).map((item) => (
                        <button
                          className="rounded-lg border border-white/10 bg-black/20 p-2 text-left transition hover:border-emerald-300/50 hover:bg-emerald-300/10"
                          key={item.hero}
                          onClick={() => addHero(item.hero)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="break-words text-sm font-semibold">{item.hero}</span>
                            <span className="rounded bg-emerald-300 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                              {item.score.toFixed(1)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.reason}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-200" />
          <h2 className="font-semibold">预测依据</h2>
        </div>
        <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-300/8 p-3">
          <p className="text-sm font-semibold text-sky-100">{currentTeam || blueTeam} 常用英雄</p>
          <HeroCountList counts={getHeroCountsForTeam(currentTeam || blueTeam, "pick")} />
        </div>
        <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/8 p-3">
          <p className="text-sm font-semibold text-rose-100">{opponentTeam || redTeam} 常用英雄</p>
          <HeroCountList counts={getHeroCountsForTeam(opponentTeam || redTeam, "pick")} />
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs font-semibold text-slate-200">流程阐述</p>
          <div className="mt-2 space-y-2 text-xs leading-5 text-slate-400">
            <p>{"第一轮 Ban：蓝 Ban 1 -> 红 Ban 1 -> 蓝 Ban 2 -> 红 Ban 2 -> 蓝 Ban 3 -> 红 Ban 3。"}</p>
            <p>{"前半段 Pick：蓝 B1 -> 红 R1/R2 -> 蓝 B2/B3 -> 红 R3。"}</p>
            <p>{"第二轮 Ban 后：红 R4 -> 蓝 B4/B5 -> 红 R5。"}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ruleSnapshot.ruleNotes.map((note) => (
              <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300" key={note}>
                {note}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
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
  return Array.from(
    new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam])),
  )
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
