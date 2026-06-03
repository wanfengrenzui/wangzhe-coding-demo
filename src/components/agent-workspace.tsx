"use client";

import {
  BarChart3,
  Database,
  Download,
  RotateCcw,
  Save,
  Search,
  Trophy,
  Undo2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AssetImage } from "@/components/asset-image";
import {
  getBo7RuleSnapshot,
  getRoundLabel,
  kplGlobalBpSteps,
  peakDuelConfig,
  type Bo7BpStep,
  type BpAction,
  type BpSide,
} from "@/lib/kpl-bo7-rules";
import { currentKplBpMatches, type KplBpMatch } from "@/lib/kpl-bp-data";

type TabKey = "database" | "bp-predict";
type HeroRole = "对抗路" | "打野" | "中路" | "发育路" | "游走" | "综合";

type HeroMeta = {
  id: string;
  name: string;
  avatar?: string;
  role: HeroRole;
  tags: string[];
  strengthScore: number;
  counters: string[];
  synergy: string[];
  playerPoolScore: number;
};

type DraftAction = {
  step: number;
  side: BpSide;
  action: BpAction;
  slot: number;
  heroId: string;
  timestamp: number;
};

type DraftState = {
  gameIndex: number;
  blueTeam: string;
  redTeam: string;
  currentStepIndex: number;
  actions: DraftAction[];
  saved: boolean;
};

type Recommendation = {
  hero: HeroMeta;
  score: number;
  reason: string;
  dimensions: string[];
};

type HeroStatus =
  | "可选"
  | "当前局已禁用"
  | "当前局已被选择"
  | "全局 BP 已不可用"
  | "推荐";

const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "database", label: "KPL 赛事中心", hint: "赛事数据" },
  { key: "bp-predict", label: "BP 预测", hint: "模拟推演" },
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
  朵莉亚: 159,
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
  沈梦溪: 312,
  裴擒虎: 502,
  狂铁: 503,
  盾山: 509,
  亚连: 514,
  大司命: 517,
  马超: 518,
  海月: 521,
  鲁班大师: 525,
  蒙恬: 527,
  澜: 528,
  镜: 531,
  阿古朵: 533,
  云缨: 538,
  暃: 542,
  赵怀真: 544,
  戈娅: 548,
  姬小满: 564,
  少司缘: 577,
  元流之子: 582,
};

const roleByHero: Record<string, HeroRole> = {
  马超: "对抗路",
  夏侯惇: "对抗路",
  关羽: "对抗路",
  狂铁: "对抗路",
  姬小满: "对抗路",
  曹操: "对抗路",
  夏洛特: "对抗路",
  亚连: "对抗路",
  蒙恬: "对抗路",
  镜: "打野",
  云缨: "打野",
  铠: "打野",
  裴擒虎: "打野",
  暃: "打野",
  澜: "打野",
  大司命: "打野",
  赵怀真: "打野",
  元流之子: "打野",
  杨玉环: "中路",
  小乔: "中路",
  沈梦溪: "中路",
  不知火舞: "中路",
  弈星: "中路",
  王昭君: "中路",
  海月: "中路",
  干将莫邪: "中路",
  狄仁杰: "发育路",
  敖隐: "发育路",
  艾琳: "发育路",
  公孙离: "发育路",
  孙尚香: "发育路",
  戈娅: "发育路",
  李元芳: "发育路",
  盾山: "游走",
  朵莉亚: "游走",
  苏烈: "游走",
  少司缘: "游走",
  太乙真人: "游走",
  张飞: "游走",
  牛魔: "游走",
  鲁班大师: "游走",
};

export function AgentWorkspace() {
  const [activeTab, setActiveTab] = useState<TabKey>("bp-predict");
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [draftSeed, setDraftSeed] = useState(0);
  const totalTeams = useMemo(
    () => new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam])).size,
    [],
  );
  const totalHeroes = useMemo(
    () => new Set(currentKplBpMatches.flatMap((match) => match.picks.map((pick) => pick.hero))).size,
    [],
  );

  function openDraft() {
    setDraftSeed((value) => value + 1);
    setIsDraftOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#070B12] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B111A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#5EF2C2]">KPL HUB</p>
            <h1 className="mt-1 text-2xl font-bold">KPL 赛事中心</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                className={
                  "rounded-lg border px-4 py-2 text-left transition " +
                  (activeTab === tab.key
                    ? "border-[#5EF2C2]/60 bg-[#5EF2C2]/12 text-[#EFFFF9]"
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
            <button className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-2 text-sm text-slate-400" type="button">
              数据分析
            </button>
            <button className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-2 text-sm text-slate-400" type="button">
              阵容库
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-5">
        {activeTab === "database" ? (
          <DatabasePanel />
        ) : (
          <BpLandingPanel onOpenDraft={openDraft} totalHeroes={totalHeroes} totalTeams={totalTeams} />
        )}
      </div>

      {isDraftOpen ? <BpDraftModal key={draftSeed} onClose={() => setIsDraftOpen(false)} /> : null}
    </main>
  );
}

function BpLandingPanel({
  onOpenDraft,
  totalHeroes,
  totalTeams,
}: {
  onOpenDraft: () => void;
  totalHeroes: number;
  totalTeams: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-[#5EF2C2]/25 bg-[rgba(18,27,40,0.85)] p-6 shadow-[0_0_40px_rgba(94,242,194,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#5EF2C2]">BP Predictor</p>
        <h2 className="mt-4 text-4xl font-bold tracking-normal text-white">KPL BP 预测</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          基于赛事数据、英雄池、历史阵容与全局 BP 规则，模拟真实赛场 BP 推演。
          点击后进入弹窗式工作台，由系统一步一步引导完成 18 步常规 BP。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-lg border border-[#5EF2C2]/50 bg-[#5EF2C2]/15 px-5 py-3 text-sm font-semibold text-[#EFFFF9] transition hover:-translate-y-0.5 hover:bg-[#5EF2C2]/22"
            onClick={onOpenDraft}
            type="button"
          >
            开始 BP 预测
          </button>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="BP 样本" value={`${currentKplBpMatches.length} 局`} />
            <Stat label="覆盖战队" value={`${totalTeams} 支`} />
            <Stat label="英雄样本" value={`${totalHeroes} 个`} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[rgba(18,27,40,0.85)] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recent Match</p>
        <h3 className="mt-3 text-2xl font-semibold">成都AG超玩会 vs 重庆狼队</h3>
        <p className="mt-2 text-sm text-slate-400">BO7 / 2026 KPL 春季赛 / 模拟 BP</p>
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs text-slate-500">默认配置</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-md bg-[#4AA3FF]/10 px-2 py-2 text-[#BFE0FF]">蓝方：成都AG超玩会</span>
            <span className="rounded-md bg-[#FF5C7A]/10 px-2 py-2 text-[#FFD1DA]">红方：重庆狼队</span>
            <span className="rounded-md bg-white/[0.04] px-2 py-2 text-slate-300">G1-G6 全局 BP</span>
            <span className="rounded-md bg-white/[0.04] px-2 py-2 text-slate-300">18 步常规流程</span>
          </div>
        </div>
        <button
          className="mt-5 w-full rounded-lg border border-[#5EF2C2]/40 bg-[#5EF2C2]/12 px-4 py-3 text-sm font-semibold text-[#EFFFF9] transition hover:-translate-y-0.5"
          onClick={onOpenDraft}
          type="button"
        >
          进入模拟
        </button>
      </section>
    </div>
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

function BpDraftModal({ onClose }: { onClose: () => void }) {
  const teams = useMemo(
    () => Array.from(new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam]))),
    [],
  );
  const heroes = useMemo(() => buildHeroes(), []);
  const [query, setQuery] = useState("");
  const [draftState, setDraftState] = useState<DraftState>({
    gameIndex: 1,
    blueTeam: "成都AG超玩会",
    redTeam: "重庆狼队",
    currentStepIndex: 0,
    actions: [],
    saved: false,
  });

  const computed = useDraftComputed(draftState, heroes, query);

  function updateTeams(side: BpSide, team: string) {
    setDraftState((state) => ({
      ...state,
      blueTeam: side === "blue" ? team : state.blueTeam,
      redTeam: side === "red" ? team : state.redTeam,
      currentStepIndex: 0,
      actions: [],
      saved: false,
    }));
  }

  function selectHero(hero: HeroMeta) {
    if (!computed.currentStep || computed.disabledReason(hero)) return;
    const step = computed.currentStep;
    setDraftState((state) => ({
      ...state,
      currentStepIndex: Math.min(state.currentStepIndex + 1, kplGlobalBpSteps.length),
      actions: [
        ...state.actions,
        {
          step: step.step,
          side: step.side,
          action: step.action,
          slot: step.slot,
          heroId: hero.id,
          timestamp: Date.now(),
        },
      ],
      saved: false,
    }));
  }

  function undo() {
    setDraftState((state) => ({
      ...state,
      currentStepIndex: Math.max(0, state.currentStepIndex - 1),
      actions: state.actions.slice(0, -1),
      saved: false,
    }));
  }

  function reset() {
    setDraftState((state) => ({
      ...state,
      currentStepIndex: 0,
      actions: [],
      saved: false,
    }));
  }

  function nextGame() {
    setDraftState((state) => ({
      ...state,
      gameIndex: Math.min(7, state.gameIndex + 1),
      currentStepIndex: 0,
      actions: [],
      saved: false,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
      <div className="flex h-[88vh] w-[85vw] min-w-[320px] max-w-[1680px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0B111A]/95 shadow-[0_0_80px_rgba(74,163,255,0.14)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#5EF2C2]">Live BP Workbench</p>
            <h2 className="mt-1 text-lg font-semibold">KPL BP 预测工作台</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition hover:border-white/25"
              onClick={undo}
              type="button"
            >
              <Undo2 className="mr-1 inline h-3.5 w-3.5" />
              撤销
            </button>
            <button
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition hover:border-white/25"
              onClick={reset}
              type="button"
            >
              <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
              重开
            </button>
            <button
              className="rounded-lg border border-[#5EF2C2]/35 bg-[#5EF2C2]/10 px-3 py-2 text-xs text-[#CFFFEF] transition hover:border-[#5EF2C2]"
              onClick={() => setDraftState((state) => ({ ...state, saved: true }))}
              type="button"
            >
              <Save className="mr-1 inline h-3.5 w-3.5" />
              保存
            </button>
            <button
              aria-label="关闭"
              className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:border-white/25"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[30%_40%_30%]">
          <DialogueGuide
            computed={computed}
            draftState={draftState}
            heroes={heroes}
            teams={teams}
            updateGame={(gameIndex) =>
              setDraftState((state) => ({ ...state, gameIndex, currentStepIndex: 0, actions: [], saved: false }))
            }
            updateTeams={updateTeams}
          />
          <DraftBoard computed={computed} draftState={draftState} heroes={heroes} />
          <HeroPool
            computed={computed}
            heroes={heroes}
            query={query}
            selectHero={selectHero}
            setQuery={setQuery}
          />
        </div>

        {computed.isCompleted ? (
          <div className="shrink-0 border-t border-white/10 bg-[#070B12]/90 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#CFFFEF]">
                BP 已完成。蓝方胜率预测 {computed.analysis.blueWinRate}% / 红方 {100 - computed.analysis.blueWinRate}%。
              </p>
              <div className="flex gap-2">
                <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300" onClick={reset} type="button">
                  重新 BP
                </button>
                <button
                  className="rounded-lg border border-[#5EF2C2]/35 px-3 py-2 text-xs text-[#CFFFEF]"
                  onClick={() => setDraftState((state) => ({ ...state, saved: true }))}
                  type="button"
                >
                  保存方案
                </button>
                <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300" type="button">
                  <Download className="mr-1 inline h-3.5 w-3.5" />
                  导出图片
                </button>
                <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300" onClick={nextGame} type="button">
                  进入下一局
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DialogueGuide({
  computed,
  draftState,
  heroes,
  teams,
  updateGame,
  updateTeams,
}: {
  computed: DraftComputed;
  draftState: DraftState;
  heroes: HeroMeta[];
  teams: string[];
  updateGame: (gameIndex: number) => void;
  updateTeams: (side: BpSide, team: string) => void;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[rgba(18,27,40,0.85)] p-3">
      <div className="shrink-0">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5EF2C2]">Dialogue</p>
        <h3 className="mt-1 text-lg font-semibold">系统引导</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <SelectBox label="蓝方" value={draftState.blueTeam} values={teams} onChange={(value) => updateTeams("blue", value)} />
          <SelectBox label="红方" value={draftState.redTeam} values={teams} onChange={(value) => updateTeams("red", value)} />
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, index) => index + 1).map((game) => (
            <button
              className={
                "h-8 rounded-md border text-xs font-semibold transition " +
                (draftState.gameIndex === game
                  ? "border-[#5EF2C2]/60 bg-[#5EF2C2]/15 text-[#DFFFF4]"
                  : "border-white/10 bg-white/[0.035] text-slate-500")
              }
              key={game}
              onClick={() => updateGame(game)}
              type="button"
            >
              G{game}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        <ChatBubble tone="system">
          {computed.isPeakDuel
            ? "G7 已切换到巅峰对决预留配置：noBan / blindPick / ignoreGlobalBP。"
            : `现在进入 G${draftState.gameIndex} BP。${computed.systemPrompt}`}
        </ChatBubble>
        {draftState.actions.map((action) => {
          const hero = getHeroById(heroes, action.heroId);
          const team = action.side === "blue" ? draftState.blueTeam : draftState.redTeam;
          return (
            <ChatBubble key={`${action.step}-${action.heroId}-${action.timestamp}`} tone={action.side}>
              你选择让 {team} {action.action === "ban" ? "Ban 掉" : "锁下"}：{hero?.name || action.heroId}
            </ChatBubble>
          );
        })}
        {computed.isCompleted ? <ChatBubble tone="system">BP 已完成。右侧已生成阵容分析和胜率预测。</ChatBubble> : null}
      </div>
    </section>
  );
}

function DraftBoard({
  computed,
  draftState,
  heroes,
}: {
  computed: DraftComputed;
  draftState: DraftState;
  heroes: HeroMeta[];
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[rgba(18,27,40,0.85)] p-3">
      <div className="shrink-0 text-center">
        <div className="flex justify-center gap-1">
          {Array.from({ length: 7 }, (_, index) => index + 1).map((game) => (
            <span
              className={
                "rounded-md px-2 py-1 text-[11px] " +
                (draftState.gameIndex === game ? "bg-[#5EF2C2] text-[#07111D]" : "bg-white/[0.05] text-slate-500")
              }
              key={game}
            >
              G{game}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold text-white">{computed.phaseLabel}</p>
        <p className="mt-1 text-xs text-slate-500">
          {computed.isCompleted ? "BP 完成" : `${computed.currentTeam} / ${computed.currentStep?.action === "ban" ? "Ban" : "Pick"} ${computed.currentStep?.slot} 位`}
        </p>
      </div>

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[1fr_72px_1fr] gap-3 overflow-hidden">
        <TeamBoard
          actions={draftState.actions}
          activeStep={computed.currentStep}
          heroes={heroes}
          side="blue"
          team={draftState.blueTeam}
        />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-full w-px bg-white/10" />
          <div className="rounded-full border border-[#5EF2C2]/35 bg-[#5EF2C2]/10 px-3 py-2 text-xs font-semibold text-[#DFFFF4]">
            VS
          </div>
          <div className="h-full w-px bg-white/10" />
        </div>
        <TeamBoard
          actions={draftState.actions}
          activeStep={computed.currentStep}
          heroes={heroes}
          side="red"
          team={draftState.redTeam}
        />
      </div>

      <div className="mt-3 shrink-0 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">流程进度</span>
          <span className="font-semibold text-[#5EF2C2]">{computed.progress.current}/18</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/10">
          <div className="h-2 rounded-full bg-[#5EF2C2]" style={{ width: `${computed.progress.percent}%` }} />
        </div>
      </div>
    </section>
  );
}

function TeamBoard({
  actions,
  activeStep,
  heroes,
  side,
  team,
}: {
  actions: DraftAction[];
  activeStep?: Bo7BpStep;
  heroes: HeroMeta[];
  side: BpSide;
  team: string;
}) {
  const color = side === "blue" ? "#4AA3FF" : "#FF5C7A";
  return (
    <div className="min-h-0 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="break-words text-base font-semibold" style={{ color }}>
          {team}
        </h4>
        {activeStep?.side === side ? (
          <span className="rounded-md border border-[#5EF2C2]/40 bg-[#5EF2C2]/10 px-2 py-1 text-[11px] text-[#DFFFF4]">
            操作中
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-slate-500">Ban 位</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <DraftSlot
            active={activeStep?.side === side && activeStep.action === "ban" && activeStep.slot === index + 1}
            hero={getActionHero(actions, heroes, side, "ban", index + 1)}
            key={index}
            label={`B${index + 1}`}
            side={side}
            size="small"
          />
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Pick 位</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <DraftSlot
            active={activeStep?.side === side && activeStep.action === "pick" && activeStep.slot === index + 1}
            hero={getActionHero(actions, heroes, side, "pick", index + 1)}
            key={index}
            label={`${index + 1}楼`}
            side={side}
            size="large"
          />
        ))}
      </div>
    </div>
  );
}

function HeroPool({
  computed,
  heroes,
  query,
  selectHero,
  setQuery,
}: {
  computed: DraftComputed;
  heroes: HeroMeta[];
  query: string;
  selectHero: (hero: HeroMeta) => void;
  setQuery: (value: string) => void;
}) {
  const filtered = heroes.filter((hero) => hero.name.includes(query.trim()));
  const recommendedIds = new Set(computed.recommendedHeroes.map((item) => item.hero.id));
  const ordered = mergeHeroMetaLists(
    computed.recommendedHeroes.map((item) => item.hero),
    filtered,
  ).slice(0, 42);

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[rgba(18,27,40,0.85)] p-3">
      <div className="shrink-0">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5EF2C2]">Prediction</p>
        <h3 className="mt-1 text-lg font-semibold">
          {computed.currentStep?.action === "ban" ? "建议 Ban" : "建议 Pick"}
        </h3>
        <label className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#0B111A] px-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索英雄"
            value={query}
          />
        </label>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {computed.isCompleted ? (
          <CompletionAnalysis computed={computed} />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {ordered.map((hero) => {
              const reason = computed.disabledReason(hero);
              const recommendation = computed.recommendedHeroes.find((item) => item.hero.id === hero.id);
              const status = getHeroStatus(hero, reason, recommendedIds.has(hero.id));
              return (
                <HeroCard
                  hero={hero}
                  key={hero.id}
                  onClick={() => selectHero(hero)}
                  recommendation={recommendation}
                  status={status}
                  disabled={Boolean(reason)}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function CompletionAnalysis({ computed }: { computed: DraftComputed }) {
  return (
    <div className="space-y-3">
      <AnalysisBlock title="蓝方阵容标签" value={computed.analysis.blueTags.join(" / ")} />
      <AnalysisBlock title="红方阵容标签" value={computed.analysis.redTags.join(" / ")} />
      <AnalysisBlock title="阵容强度评分" value={`蓝方 ${computed.analysis.blueScore} / 红方 ${computed.analysis.redScore}`} />
      <AnalysisBlock title="前中后期曲线" value={computed.analysis.curve} />
      <AnalysisBlock title="关键对位" value={computed.analysis.keyMatchup} />
      <AnalysisBlock title="潜在风险" value={computed.analysis.risk} />
      <AnalysisBlock title="胜率预测" value={`蓝方 ${computed.analysis.blueWinRate}% / 红方 ${100 - computed.analysis.blueWinRate}%`} />
    </div>
  );
}

function AnalysisBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-100">{value}</p>
    </div>
  );
}

function DraftSlot({
  active,
  hero,
  label,
  side,
  size,
}: {
  active: boolean;
  hero?: HeroMeta;
  label: string;
  side: BpSide;
  size: "small" | "large";
}) {
  const sideClass = side === "blue" ? "border-[#4AA3FF]/50" : "border-[#FF5C7A]/50";
  return (
    <div
      className={
        "rounded-lg border bg-white/[0.035] p-1.5 text-center transition " +
        (active ? "border-[#5EF2C2] shadow-[0_0_18px_rgba(94,242,194,0.35)] animate-pulse" : hero ? sideClass : "border-white/10")
      }
    >
      <AssetImage
        alt={hero?.name || label}
        className={(size === "large" ? "h-14 w-14" : "h-10 w-10") + " mx-auto rounded-full border border-white/10"}
        fallback={hero?.name.slice(0, 2) || label}
        src={hero?.avatar}
      />
      <p className="mt-1 truncate text-[10px] text-slate-300">{hero?.name || label}</p>
      {hero ? <p className="text-[9px] text-slate-500">{hero.role}</p> : null}
    </div>
  );
}

function HeroCard({
  disabled,
  hero,
  onClick,
  recommendation,
  status,
}: {
  disabled: boolean;
  hero: HeroMeta;
  onClick: () => void;
  recommendation?: Recommendation;
  status: HeroStatus;
}) {
  return (
    <button
      className={
        "group relative min-h-[148px] overflow-hidden rounded-xl border p-2 text-center transition " +
        (disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-45"
          : recommendation
            ? "border-[#5EF2C2]/55 bg-[#5EF2C2]/12 hover:-translate-y-0.5 hover:bg-[#5EF2C2]/18"
            : "border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/25")
      }
      disabled={disabled}
      onClick={onClick}
      title={recommendation?.reason || status}
      type="button"
    >
      {recommendation ? (
        <span className="absolute right-1.5 top-1.5 rounded bg-[#5EF2C2] px-1.5 py-0.5 text-[10px] font-bold text-[#07111D]">
          推荐
        </span>
      ) : null}
      {disabled ? <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -rotate-12 bg-slate-400/55" /> : null}
      <AssetImage
        alt={hero.name}
        className="mx-auto h-16 w-16 rounded-full border border-white/10 transition group-hover:scale-105"
        fallback={hero.name.slice(0, 2)}
        src={hero.avatar}
      />
      <p className="mt-2 break-words text-xs font-semibold text-white">{hero.name}</p>
      <p className="mt-1 text-[10px] text-slate-500">{hero.role}</p>
      <p className={disabled ? "mt-1 text-[10px] text-slate-400" : "mt-1 text-[10px] text-[#5EF2C2]"}>
        {status}
      </p>
    </button>
  );
}

function ChatBubble({ children, tone }: { children: React.ReactNode; tone: "system" | BpSide }) {
  const className =
    tone === "system"
      ? "border-[#5EF2C2]/30 bg-[#5EF2C2]/10 text-[#DFFFF4]"
      : tone === "blue"
        ? "ml-4 border-[#4AA3FF]/25 bg-[#4AA3FF]/10 text-[#DDEEFF]"
        : "mr-4 border-[#FF5C7A]/25 bg-[#FF5C7A]/10 text-[#FFE0E6]";
  return <div className={`rounded-xl border px-3 py-2 text-xs leading-5 ${className}`}>{children}</div>;
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
        className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0B111A] px-3 text-sm text-slate-100 outline-none"
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

function DatabasePanel() {
  const [selectedId, setSelectedId] = useState(currentKplBpMatches[0].id);
  const selected = currentKplBpMatches.find((match) => match.id === selectedId) || currentKplBpMatches[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr_360px]">
      <section className="rounded-2xl border border-white/10 bg-[rgba(18,27,40,0.85)] p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#5EF2C2]" />
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
                  ? "border-[#5EF2C2]/60 bg-[#5EF2C2]/12"
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
    <section className="rounded-2xl border border-white/10 bg-[rgba(18,27,40,0.85)] p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-[#5EF2C2]">Match Detail</p>
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
  side: BpSide;
  team: string;
}) {
  const tone = side === "blue" ? "border-[#4AA3FF]/25 bg-[#4AA3FF]/8" : "border-[#FF5C7A]/25 bg-[#FF5C7A]/8";
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <h3 className="font-semibold">{team}</h3>
      <p className="mt-3 text-xs text-slate-500">Ban</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {bans.length ? bans.map((hero) => <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs" key={hero}>{hero}</span>) : <span className="text-xs text-slate-500">巅峰对决无常规 Ban</span>}
      </div>
      <p className="mt-3 text-xs text-slate-500">Pick / 选手</p>
      <div className="mt-2 space-y-1.5">
        {picks.map((pick) => (
          <div className="grid grid-cols-[64px_1fr_72px] gap-2 rounded-md bg-black/20 px-2 py-1.5 text-xs" key={pick.order}>
            <span className="text-slate-500">{pick.lane}</span>
            <strong>{pick.player}</strong>
            <span className="text-right text-[#5EF2C2]">{pick.hero}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamClusterPanel() {
  const teamCounts = getTeamHeroRows();
  return (
    <section className="rounded-2xl border border-white/10 bg-[rgba(18,27,40,0.85)] p-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#5EF2C2]" />
        <h2 className="font-semibold">聚类准备</h2>
      </div>
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

type DraftComputed = ReturnType<typeof useDraftComputed>;

function useDraftComputed(state: DraftState, heroes: HeroMeta[], query: string) {
  const isPeakDuel = state.gameIndex === 7;
  const currentStep = isPeakDuel ? undefined : kplGlobalBpSteps[state.currentStepIndex];
  const currentTeam = currentStep?.side === "blue" ? state.blueTeam : currentStep?.side === "red" ? state.redTeam : undefined;
  const currentRound = currentStep ? getRoundLabel(currentStep.round) : isPeakDuel ? "巅峰对决" : "BP 完成";
  const ruleSnapshot = getBo7RuleSnapshot({
    allMatches: currentKplBpMatches,
    blueTeam: state.blueTeam,
    redTeam: state.redTeam,
    gameIndex: state.gameIndex,
    predictingTeam: currentTeam || state.blueTeam,
  });
  const currentBanned = new Set(state.actions.filter((item) => item.action === "ban").map((item) => item.heroId));
  const currentPicked = new Set(state.actions.filter((item) => item.action === "pick").map((item) => item.heroId));
  const globalUsedHeroes = {
    blue: getGlobalUsedHeroIds(ruleSnapshot.previousGames, state.blueTeam, heroes),
    red: getGlobalUsedHeroIds(ruleSnapshot.previousGames, state.redTeam, heroes),
  };
  const roleNeeds = currentStep ? getRoleNeeds(state.actions, heroes, currentStep.side) : [];
  const recommendedHeroes = currentStep
    ? recommendHeroes({
        heroes,
        currentStep,
        currentTeam: currentTeam || state.blueTeam,
        opponentTeam: currentStep.side === "blue" ? state.redTeam : state.blueTeam,
        disabledReason,
        roleNeeds,
      })
    : [];
  const progress = {
    current: Math.min(state.actions.length + (state.actions.length === kplGlobalBpSteps.length ? 0 : 1), kplGlobalBpSteps.length),
    percent: Math.round((state.actions.length / kplGlobalBpSteps.length) * 100),
  };
  const isCompleted = !isPeakDuel && state.actions.length >= kplGlobalBpSteps.length;
  const analysis = buildAnalysis(state.actions, heroes);
  const systemPrompt = currentStep && currentTeam
    ? `请 ${currentTeam} 选择第 ${currentStep.slot} 个 ${currentStep.action === "ban" ? "Ban 位" : "Pick 位"}。剩余 ${kplGlobalBpSteps.length - state.actions.length} 步。`
    : "BP 已完成。";
  const phaseLabel = isCompleted ? "BP 完成" : currentRound;

  function disabledReason(hero: HeroMeta) {
    if (!currentStep) return "BP 已完成";
    if (currentBanned.has(hero.id)) return "当前局已禁用";
    if (currentPicked.has(hero.id)) return "当前局已被选择";
    if (
      currentStep.action === "pick" &&
      state.gameIndex <= 6 &&
      (currentStep.side === "blue" ? globalUsedHeroes.blue : globalUsedHeroes.red).includes(hero.id)
    ) {
      return "全局 BP 已不可用";
    }
    return "";
  }

  return {
    analysis,
    availableHeroes: heroes.filter((hero) => !disabledReason(hero) && hero.name.includes(query.trim())),
    currentStep,
    currentTeam,
    disabledReason,
    globalUsedHeroes,
    isCompleted,
    isPeakDuel,
    phaseLabel,
    progress,
    recommendedHeroes,
    ruleSnapshot,
    systemPrompt,
  };
}

function buildHeroes(): HeroMeta[] {
  const names = Array.from(
    new Set(
      currentKplBpMatches.flatMap((match) => [
        ...match.picks.map((pick) => pick.hero),
        ...match.bans.blue,
        ...match.bans.red,
      ]),
    ),
  ).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  return names.map((name) => {
    const pickCount = countHero(name, "pick");
    const banCount = countHero(name, "ban");
    const role = roleByHero[name] || "综合";
    return {
      id: name,
      name,
      avatar: getHeroAvatar(name),
      role,
      tags: [role, pickCount >= 3 ? "高频" : "样本", banCount >= 3 ? "高压 Ban" : "可摇摆"],
      strengthScore: 60 + Math.min(30, pickCount * 4 + banCount * 2),
      counters: [],
      synergy: [],
      playerPoolScore: 50 + Math.min(35, pickCount * 5),
    };
  });
}

function recommendHeroes({
  currentStep,
  currentTeam,
  disabledReason,
  heroes,
  opponentTeam,
  roleNeeds,
}: {
  currentStep: Bo7BpStep;
  currentTeam: string;
  disabledReason: (hero: HeroMeta) => string;
  heroes: HeroMeta[];
  opponentTeam: string;
  roleNeeds: HeroRole[];
}) {
  const ownCounts = new Map(getHeroCountsForTeam(currentTeam, "pick"));
  const opponentCounts = new Map(getHeroCountsForTeam(opponentTeam, "pick"));
  const opponentBanCounts = new Map(getHeroCountsForTeam(opponentTeam, "ban"));

  return heroes
    .filter((hero) => !disabledReason(hero))
    .map((hero) => {
      const ownPool = ownCounts.get(hero.name) || 0;
      const opponentPool = opponentCounts.get(hero.name) || 0;
      const versionStrength = hero.strengthScore / 10;
      const roleFit = currentStep.action === "pick" && roleNeeds.includes(hero.role) ? 8 : 2;
      const systemFit = hero.tags.includes("高频") ? 5 : 2;
      const counterScore = opponentBanCounts.get(hero.name) || 0;
      const consume = currentStep.action === "pick" ? Math.max(0, 4 - ownPool) : opponentPool;
      const score =
        currentStep.action === "ban"
          ? opponentPool * 6 + versionStrength + counterScore * 2 + systemFit
          : ownPool * 5 + versionStrength + roleFit + systemFit - consume * 0.4;
      const reason =
        currentStep.action === "ban"
          ? `${opponentTeam} 常用 ${hero.name}，版本强度 ${hero.strengthScore}，可压缩对手英雄池并打断体系适配。`
          : `${currentTeam} 可选 ${hero.name}，补充${hero.role}位置，兼顾版本强度、选手英雄池与当前阵容缺口。`;
      return {
        hero,
        score,
        reason,
        dimensions: ["版本强度", "选手英雄池", "阵容位置完整性", "体系适配", "对手常用英雄", "全局 BP 消耗"],
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function getHeroStatus(hero: HeroMeta, reason: string, recommended: boolean): HeroStatus {
  if (reason === "当前局已禁用") return "当前局已禁用";
  if (reason === "当前局已被选择") return "当前局已被选择";
  if (reason === "全局 BP 已不可用") return "全局 BP 已不可用";
  if (recommended) return "推荐";
  return "可选";
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
    if (match.blueTeam === team) match.bans.blue.forEach((hero) => counts.set(hero, (counts.get(hero) || 0) + 1));
    if (match.redTeam === team) match.bans.red.forEach((hero) => counts.set(hero, (counts.get(hero) || 0) + 1));
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"));
}

function countHero(hero: string, type: "pick" | "ban") {
  return currentKplBpMatches.reduce((sum, match) => {
    if (type === "pick") return sum + match.picks.filter((pick) => pick.hero === hero).length;
    return sum + match.bans.blue.filter((item) => item === hero).length + match.bans.red.filter((item) => item === hero).length;
  }, 0);
}

function getActionHero(actions: DraftAction[], heroes: HeroMeta[], side: BpSide, action: BpAction, slot: number) {
  const item = actions.find((entry) => entry.side === side && entry.action === action && entry.slot === slot);
  return item ? getHeroById(heroes, item.heroId) : undefined;
}

function getHeroById(heroes: HeroMeta[], heroId: string) {
  return heroes.find((hero) => hero.id === heroId);
}

function getGlobalUsedHeroIds(matches: KplBpMatch[], team: string, heroes: HeroMeta[]) {
  const names = new Set<string>();
  matches.forEach((match) => {
    const side = match.blueTeam === team ? "blue" : match.redTeam === team ? "red" : null;
    if (!side) return;
    match.picks.filter((pick) => pick.side === side).forEach((pick) => names.add(pick.hero));
  });
  return heroes.filter((hero) => names.has(hero.name)).map((hero) => hero.id);
}

function getRoleNeeds(actions: DraftAction[], heroes: HeroMeta[], side: BpSide): HeroRole[] {
  const pickedRoles = actions
    .filter((action) => action.side === side && action.action === "pick")
    .map((action) => getHeroById(heroes, action.heroId)?.role)
    .filter(Boolean);
  return (["对抗路", "打野", "中路", "发育路", "游走"] as HeroRole[]).filter((role) => !pickedRoles.includes(role));
}

function buildAnalysis(actions: DraftAction[], heroes: HeroMeta[]) {
  const bluePicks = actions.filter((action) => action.side === "blue" && action.action === "pick").map((action) => getHeroById(heroes, action.heroId)).filter(Boolean) as HeroMeta[];
  const redPicks = actions.filter((action) => action.side === "red" && action.action === "pick").map((action) => getHeroById(heroes, action.heroId)).filter(Boolean) as HeroMeta[];
  const blueScore = Math.round(bluePicks.reduce((sum, hero) => sum + hero.strengthScore, 0) / Math.max(1, bluePicks.length));
  const redScore = Math.round(redPicks.reduce((sum, hero) => sum + hero.strengthScore, 0) / Math.max(1, redPicks.length));
  const blueWinRate = Math.max(35, Math.min(65, 50 + Math.round((blueScore - redScore) / 2)));
  return {
    blueScore,
    redScore,
    blueTags: makeTags(bluePicks),
    redTags: makeTags(redPicks),
    curve: blueScore >= redScore ? "蓝方前中期主动性略高，红方需要拖到后期团战寻找反打。" : "红方中期节奏更完整，蓝方需要用边线和视野稳住资源交换。",
    keyMatchup: `${bluePicks[1]?.name || "蓝方打野"} vs ${redPicks[1]?.name || "红方打野"} 是主要节奏点。`,
    risk: "当前预测基于阵容级样本，逐手顺序仍需要视频 OCR 继续校准。",
    blueWinRate,
  };
}

function makeTags(picks: HeroMeta[]) {
  const roles = new Set(picks.map((hero) => hero.role));
  return [
    roles.has("打野") ? "有节奏点" : "缺打野",
    roles.has("游走") ? "开团/保护完整" : "缺辅助",
    picks.some((hero) => hero.tags.includes("高频")) ? "熟练度高" : "样本偏少",
  ];
}

function mergeHeroMetaLists(primary: HeroMeta[], fallback: HeroMeta[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((hero) => {
    if (seen.has(hero.id)) return false;
    seen.add(hero.id);
    return true;
  });
}

function getHeroAvatar(hero: string) {
  const id = heroIdMap[hero];
  return id ? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg` : undefined;
}
