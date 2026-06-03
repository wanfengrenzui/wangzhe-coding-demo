"use client";

import {
  BarChart3,
  Database,
  Download,
  RotateCcw,
  Save,
  Search,
  Undo2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AssetImage } from "@/components/asset-image";
import {
  getBo7RuleSnapshot,
  getRoundLabel,
  kplGlobalBpSteps,
  type Bo7BpStep,
  type BpAction,
  type BpSide,
} from "@/lib/kpl-bo7-rules";
import { currentKplBpMatches, type KplBpMatch } from "@/lib/kpl-bp-data";
import { kplHeroCatalog } from "@/lib/kpl-hero-catalog";

type TabKey = "agent" | "database" | "bp-predict" | "content" | "knowledge" | "feedback" | "evaluation";
type HeroRole = "对抗路" | "打野" | "中路" | "发育路" | "游走" | "综合";
type HeroStatus = "可选" | "推荐" | "当前局已禁用" | "当前局已选择" | "全局 BP 不可用" | "BP 已完成";

type HeroMeta = {
  id: string;
  name: string;
  avatar?: string;
  role: HeroRole;
  tags: string[];
  strengthScore: number;
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
  type: BpAction;
  hero: HeroMeta;
  totalScore: number;
  summary: string;
  breakdown: {
    versionStrength: number;
    opponentUsage: number;
    opponentWinRate?: number;
    counterScore?: number;
    lineupFit?: number;
    playerProficiency?: number;
  };
  dimensions: string[];
};

type StrategyMeta = {
  currentMode: BpAction;
  scoringRule: string;
  weights: Record<string, number>;
};

type DraftComputed = {
  analysis: DraftAnalysis;
  currentStep?: Bo7BpStep;
  currentTeam?: string;
  disabledReason: (hero: HeroMeta) => string;
  globalUsedHeroes: Record<BpSide, string[]>;
  isCompleted: boolean;
  isPeakDuel: boolean;
  phaseLabel: string;
  progress: { current: number; percent: number };
  recommendedHeroes: Recommendation[];
  systemPrompt: string;
};

type DraftAnalysis = {
  blueScore: number;
  redScore: number;
  blueTags: string[];
  redTags: string[];
  curve: string;
  keyMatchup: string;
  risk: string;
  blueWinRate: number;
};

const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "agent", label: "Agent 任务中心", hint: "任务链路" },
  { key: "database", label: "KPL 赛事中心", hint: "赛事数据" },
  { key: "bp-predict", label: "BP 预测", hint: "模拟推演" },
  { key: "content", label: "赛事内容生成", hint: "切片 / 标题" },
  { key: "knowledge", label: "英雄资料库", hint: "英雄 / 装备" },
  { key: "feedback", label: "玩家反馈分析", hint: "论坛情绪" },
  { key: "evaluation", label: "模型效果评估", hint: "样本 / 权重" },
];

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

const roleFilters: Array<HeroRole | "全部"> = ["全部", "对抗路", "打野", "中路", "发育路", "游走"];
const banSlotsPerTeam = 4;
const pickSlotsPerTeam = 5;
const draftTotalSteps = kplGlobalBpSteps.length;

const banScoreWeights = {
  versionStrength: 0.4,
  opponentUsage: 0.35,
  opponentWinRate: 0.25,
};

const pickScoreWeights = {
  versionStrength: 0.25,
  opponentUsage: 0.2,
  counterScore: 0.2,
  lineupFit: 0.2,
  playerProficiency: 0.15,
};

export function AgentWorkspace() {
  const [activeTab, setActiveTab] = useState<TabKey>("bp-predict");
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [draftSeed, setDraftSeed] = useState(0);
  const totalTeams = useMemo(
    () => new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam])).size,
    [],
  );

  function openDraft() {
    setDraftSeed((value) => value + 1);
    setIsDraftOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#070B12] text-[#EAF2FF]">
      <header className="border-b border-white/10 bg-[#0B111A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-[#5EF2C2]">KPL HUB</p>
            <h1 className="mt-1 text-2xl font-bold">KPL 赛事中心</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                className={
                  "rounded-[10px] border px-4 py-2 text-left transition " +
                  (activeTab === tab.key
                    ? "border-[#5EF2C2]/60 bg-[#5EF2C2]/12 text-[#EFFFF9]"
                    : "border-white/10 bg-white/[0.035] text-[#8EA0B8] hover:border-white/25")
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
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-6">
        {activeTab === "agent" ? <AgentPanel /> : null}
        {activeTab === "database" ? <DatabasePanel /> : null}
        {activeTab === "bp-predict" ? (
          <BpLandingPanel onOpenDraft={openDraft} totalHeroes={kplHeroCatalog.length} totalTeams={totalTeams} />
        ) : null}
        {activeTab === "content" ? <ContentPanel /> : null}
        {activeTab === "knowledge" ? <KnowledgePanel /> : null}
        {activeTab === "feedback" ? <FeedbackPanel /> : null}
        {activeTab === "evaluation" ? <EvaluationPanel /> : null}
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
      <section className="rounded-[20px] border border-[#5EF2C2]/25 bg-[rgba(18,27,40,0.86)] p-6 shadow-[0_0_40px_rgba(94,242,194,0.08)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#5EF2C2]">BP Predictor</p>
        <h2 className="mt-4 text-4xl font-bold">KPL BP 预测</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#8EA0B8]">
          基于赛事数据、英雄池、历史阵容与全局 BP 规则，模拟真实赛场 BP 推演。点击后进入弹窗式工作台，
          由系统一步一步引导完成 {draftTotalSteps} 步常规 BP。
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="rounded-[10px] border border-[#5EF2C2]/50 bg-[#5EF2C2]/15 px-5 py-3 text-sm font-semibold text-[#EFFFF9] transition hover:-translate-y-0.5 hover:bg-[#5EF2C2]/22"
            onClick={onOpenDraft}
            type="button"
          >
            开始 BP 预测
          </button>
          <Stat label="BP 样本" value={`${currentKplBpMatches.length} 局`} />
          <Stat label="覆盖战队" value={`${totalTeams} 支`} />
          <Stat label="英雄目录" value={`${totalHeroes} 个`} />
        </div>
      </section>

      <section className="rounded-[20px] border border-white/10 bg-[rgba(18,27,40,0.86)] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-[#8EA0B8]">Recent Match</p>
        <h3 className="mt-3 text-2xl font-semibold">成都AG超玩会 vs 重庆狼队</h3>
        <p className="mt-2 text-sm text-[#8EA0B8]">BO7 / 2026 KPL 春季赛 / 模拟 BP</p>
        <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <span className="rounded-[10px] bg-[#4AA3FF]/10 px-3 py-2 text-[#BFE0FF]">蓝方：成都AG超玩会</span>
          <span className="rounded-[10px] bg-[#FF5C7A]/10 px-3 py-2 text-[#FFD1DA]">红方：重庆狼队</span>
          <span className="rounded-[10px] bg-white/[0.04] px-3 py-2 text-slate-300">G1-G6 全局 BP</span>
          <span className="rounded-[10px] bg-white/[0.04] px-3 py-2 text-slate-300">{draftTotalSteps} 步常规流程</span>
        </div>
        <button
          className="mt-5 w-full rounded-[10px] border border-[#5EF2C2]/40 bg-[#5EF2C2]/12 px-4 py-3 text-sm font-semibold text-[#EFFFF9] transition hover:-translate-y-0.5"
          onClick={onOpenDraft}
          type="button"
        >
          进入模拟
        </button>
      </section>
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
  const [roleFilter, setRoleFilter] = useState<HeroRole | "全部">("全部");
  const [draftState, setDraftState] = useState<DraftState>({
    gameIndex: 1,
    blueTeam: "成都AG超玩会",
    redTeam: "重庆狼队",
    currentStepIndex: 0,
    actions: [],
    saved: false,
  });

  const computed = useDraftComputed(draftState, heroes, query, roleFilter);

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
      currentStepIndex: Math.min(state.currentStepIndex + 1, draftTotalSteps),
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
    setDraftState((state) => ({ ...state, currentStepIndex: 0, actions: [], saved: false }));
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
      <div className="flex h-[92vh] w-[96vw] min-w-[320px] max-w-[1720px] flex-col overflow-hidden rounded-[20px] border border-white/12 bg-[#0B111A]/95 shadow-[0_0_80px_rgba(74,163,255,0.14)] xl:h-[88vh] xl:w-[85vw]">
        <BPStatusBar computed={computed} draftState={draftState} onClose={onClose} onReset={reset} onSave={() => setDraftState((state) => ({ ...state, saved: true }))} onUndo={undo} />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[16%_53%_31%] xl:overflow-hidden">
          <DialoguePanel computed={computed} draftState={draftState} heroes={heroes} teams={teams} updateGame={(gameIndex) => setDraftState((state) => ({ ...state, gameIndex, currentStepIndex: 0, actions: [], saved: false }))} updateTeams={updateTeams} />
          <DraftArena computed={computed} draftState={draftState} heroes={heroes} />
          <PredictionPanel computed={computed} heroes={heroes} query={query} roleFilter={roleFilter} selectHero={selectHero} setQuery={setQuery} setRoleFilter={setRoleFilter} />
        </div>

        {computed.isCompleted ? (
          <div className="shrink-0 border-t border-white/10 bg-[#070B12]/90 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#CFFFEF]">
                BP 已完成，蓝方胜率预测 {computed.analysis.blueWinRate}% / 红方 {100 - computed.analysis.blueWinRate}%。
              </p>
              <div className="flex gap-2">
                <ModalActionButton onClick={reset}>重新 BP</ModalActionButton>
                <ModalActionButton onClick={() => setDraftState((state) => ({ ...state, saved: true }))}>保存方案</ModalActionButton>
                <ModalActionButton>
                  <Download className="mr-1 inline h-3.5 w-3.5" />
                  导出图片
                </ModalActionButton>
                <ModalActionButton onClick={nextGame}>进入下一局</ModalActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BPStatusBar({
  computed,
  draftState,
  onClose,
  onReset,
  onSave,
  onUndo,
}: {
  computed: DraftComputed;
  draftState: DraftState;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="grid h-auto shrink-0 grid-cols-1 items-center gap-3 border-b border-white/10 px-4 py-3 xl:h-16 xl:grid-cols-[1fr_1.5fr_auto] xl:gap-4 xl:py-0">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold">KPL BP 预测</h2>
        <p className="mt-0.5 truncate text-xs text-[#8EA0B8]">
          {draftState.blueTeam} vs {draftState.redTeam} · BO7
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <StatusPill label="当前局数" value={`G${draftState.gameIndex}`} />
        <StatusPill label="当前阶段" value={computed.phaseLabel} />
        <StatusPill label="当前操作" value={computed.currentStep ? `${computed.currentTeam} ${computed.currentStep.action === "ban" ? "Ban" : "Pick"} ${computed.currentStep.slot} 位` : "BP 完成"} />
        <StatusPill label="当前进度" value={`Step ${computed.progress.current} / ${draftTotalSteps}`} />
      </div>
      <div className="flex items-center gap-2">
        <ModalActionButton onClick={onUndo}>
          <Undo2 className="mr-1 inline h-3.5 w-3.5" />
          撤销
        </ModalActionButton>
        <ModalActionButton onClick={onReset}>
          <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
          重开
        </ModalActionButton>
        <ModalActionButton accent onClick={onSave}>
          <Save className="mr-1 inline h-3.5 w-3.5" />
          保存
        </ModalActionButton>
        <button aria-label="关闭" className="rounded-[10px] border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:border-white/25" onClick={onClose} type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DialoguePanel({
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
    <section className="flex min-h-[620px] flex-col gap-3 rounded-[16px] border border-white/10 bg-[rgba(18,27,40,0.82)] p-3 xl:min-h-0">
      <div className="shrink-0">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5EF2C2]">Dialogue</p>
        <h3 className="mt-1 text-base font-semibold">系统引导</h3>
        <div className="mt-3 grid gap-2">
          <SelectBox label="蓝方" value={draftState.blueTeam} values={teams} onChange={(value) => updateTeams("blue", value)} />
          <SelectBox label="红方" value={draftState.redTeam} values={teams} onChange={(value) => updateTeams("red", value)} />
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, index) => index + 1).map((game) => (
            <button
              className={
                "h-8 rounded-[10px] border text-xs font-semibold transition " +
                (draftState.gameIndex === game
                  ? "border-[#5EF2C2]/60 bg-[#5EF2C2]/15 text-[#DFFFF4]"
                  : "border-white/10 bg-white/[0.035] text-[#8EA0B8]")
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

      <CurrentTaskCard computed={computed} />

      <div className="min-h-0 flex-1 overflow-hidden rounded-[12px] bg-black/14 p-2">
        <p className="mb-2 text-xs font-semibold text-[#EAF2FF]">对话日志</p>
        <div className="h-[calc(100%-26px)] space-y-2 overflow-y-auto pr-1">
          <ChatBubble tone="system">
            {computed.isPeakDuel
              ? "系统：G7 已进入巅峰对决预留配置。"
              : `系统：现在进入 G${draftState.gameIndex}，${computed.systemPrompt}`}
          </ChatBubble>
          {draftState.actions.map((action) => {
            const hero = getHeroById(heroes, action.heroId);
            const team = action.side === "blue" ? draftState.blueTeam : draftState.redTeam;
            return (
              <ChatBubble key={`${action.step}-${action.heroId}-${action.timestamp}`} tone={action.side}>
                用户：选择让 {team} {action.action === "ban" ? "Ban 掉" : "锁下"}：{hero?.name || action.heroId}
              </ChatBubble>
            );
          })}
          {computed.currentStep && draftState.actions.length > 0 ? (
            <ChatBubble tone="system">系统：已记录，接下来轮到 {computed.currentTeam} 选择第 {computed.currentStep.slot} 个 {computed.currentStep.action === "ban" ? "Ban 位" : "Pick 位"}。</ChatBubble>
          ) : null}
          {computed.isCompleted ? <ChatBubble tone="system">系统：BP 已完成，正在生成阵容分析。</ChatBubble> : null}
        </div>
      </div>
    </section>
  );
}

function CurrentTaskCard({ computed }: { computed: DraftComputed }) {
  return (
    <div className="shrink-0 rounded-[12px] border border-[#5EF2C2]/35 bg-[#5EF2C2]/10 p-3 shadow-[0_0_24px_rgba(94,242,194,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#5EF2C2]">Current Task</p>
      <h4 className="mt-2 text-base font-semibold">{computed.phaseLabel}</h4>
      <div className="mt-3 space-y-2 text-xs leading-5 text-[#CFE6F5]">
        <p>当前队伍：{computed.currentTeam || "双方"}</p>
        <p>当前动作：{computed.currentStep ? `请选择第 ${computed.currentStep.slot} 个 ${computed.currentStep.action === "ban" ? "Ban 英雄" : "Pick 英雄"}` : "BP 已完成"}</p>
        <p>剩余步骤：{Math.max(0, draftTotalSteps - (computed.progress.current - 1))}</p>
        <p className="text-[#5EF2C2]">请在右侧英雄池中点击一个英雄。</p>
      </div>
    </div>
  );
}

function DraftArena({
  computed,
  draftState,
  heroes,
}: {
  computed: DraftComputed;
  draftState: DraftState;
  heroes: HeroMeta[];
}) {
  return (
    <section className="flex min-h-[640px] flex-col rounded-[18px] border border-white/10 bg-[rgba(18,27,40,0.88)] p-4 shadow-[0_0_54px_rgba(74,163,255,0.1)] xl:min-h-0">
      <div className="shrink-0 text-center">
        <div className="flex justify-center gap-1">
          {Array.from({ length: 7 }, (_, index) => index + 1).map((game) => (
            <span className={(draftState.gameIndex === game ? "bg-[#5EF2C2] text-[#07111D]" : "bg-white/[0.05] text-[#8EA0B8]") + " rounded-[10px] px-2 py-1 text-[11px] font-semibold"} key={game}>
              G{game}
            </span>
          ))}
        </div>
        <h3 className="mt-3 text-xl font-semibold">{computed.phaseLabel}</h3>
        <p className="mt-1 text-xs text-[#8EA0B8]">
          {computed.isCompleted ? "BP 完成" : `${computed.currentTeam} / ${computed.currentStep?.action === "ban" ? "Ban" : "Pick"} ${computed.currentStep?.slot} 位`}
        </p>
        <p className="mt-2 text-[11px] text-[#566273]">当前规则：双方各 Ban 2 → 双方各 Pick 3 → 双方各 Ban 2 → 补齐 Pick，共 {draftTotalSteps} 步</p>
      </div>

      <div className="mt-5 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] gap-5 overflow-hidden">
        <TeamDraftBoard actions={draftState.actions} activeStep={computed.currentStep} heroes={heroes} side="blue" team={draftState.blueTeam} />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-full w-px bg-white/10" />
          <div className="rounded-full border border-[#5EF2C2]/35 bg-[#5EF2C2]/10 px-3 py-2 text-xs font-semibold text-[#DFFFF4]">VS</div>
          <div className="h-full w-px bg-white/10" />
        </div>
        <TeamDraftBoard actions={draftState.actions} activeStep={computed.currentStep} heroes={heroes} side="red" team={draftState.redTeam} />
      </div>

      <PhaseProgressBar computed={computed} />
    </section>
  );
}

function TeamDraftBoard({
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
    <div className="min-h-0 rounded-[16px] border border-white/10 bg-[#0B111A]/72 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="break-words text-lg font-semibold" style={{ color }}>
          {team}
        </h4>
        {activeStep?.side === side ? <span className="rounded-[10px] border border-[#5EF2C2]/40 bg-[#5EF2C2]/10 px-2 py-1 text-[11px] text-[#DFFFF4]">操作中</span> : null}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-[#8EA0B8]">
        <span>Ban 位</span>
        <span>{banSlotsPerTeam} slots</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2.5">
        {Array.from({ length: banSlotsPerTeam }, (_, index) => (
          <DraftSlot active={activeStep?.side === side && activeStep.action === "ban" && activeStep.slot === index + 1} hero={getActionHero(actions, heroes, side, "ban", index + 1)} key={index} label={`B${index + 1}`} side={side} size="small" />
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between text-xs text-[#8EA0B8]">
        <span>Pick 位</span>
        <span>{pickSlotsPerTeam} slots</span>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2.5">
        {Array.from({ length: pickSlotsPerTeam }, (_, index) => (
          <DraftSlot active={activeStep?.side === side && activeStep.action === "pick" && activeStep.slot === index + 1} hero={getActionHero(actions, heroes, side, "pick", index + 1)} key={index} label={`P${index + 1}`} side={side} size="large" />
        ))}
      </div>
    </div>
  );
}

function PhaseProgressBar({ computed }: { computed: DraftComputed }) {
  const segments = [
    ["各 Ban 2", 4],
    ["各 Pick 3", 6],
    ["再 Ban 2", 4],
    ["补齐 Pick", 4],
  ] as const;
  return (
    <div className="mt-3 shrink-0 rounded-[12px] border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8EA0B8]">
          当前：{computed.currentTeam || "完成"} {computed.currentStep ? `${computed.currentStep.action === "ban" ? "Ban" : "Pick"} 第 ${computed.currentStep.slot} 位` : "阵容分析"}
        </span>
        <span className="font-semibold text-[#5EF2C2]">Step {computed.progress.current} / {draftTotalSteps}</span>
      </div>
      <div className="mt-2 grid grid-cols-[4fr_6fr_4fr_4fr] gap-1">
        {segments.map(([label, count], index) => {
          const previous = segments.slice(0, index).reduce((sum, item) => sum + item[1], 0);
          const filled = Math.max(0, Math.min(count, computed.progress.current - previous));
          return (
            <div className="h-3 overflow-hidden rounded-full bg-white/10" key={label} title={label}>
              <div className="h-full rounded-full bg-[#5EF2C2]" style={{ width: `${(filled / count) * 100}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-[4fr_6fr_4fr_4fr] gap-1 text-[10px] text-[#566273]">
        {segments.map(([label]) => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}

function PredictionPanel({
  computed,
  heroes,
  query,
  roleFilter,
  selectHero,
  setQuery,
  setRoleFilter,
}: {
  computed: DraftComputed;
  heroes: HeroMeta[];
  query: string;
  roleFilter: HeroRole | "全部";
  selectHero: (hero: HeroMeta) => void;
  setQuery: (value: string) => void;
  setRoleFilter: (value: HeroRole | "全部") => void;
}) {
  const [showRules, setShowRules] = useState(false);
  const filtered = heroes.filter((hero) => hero.name.includes(query.trim()) && (roleFilter === "全部" || hero.role === roleFilter));
  const recommendedIds = new Set(computed.recommendedHeroes.map((item) => item.hero.id));
  const ordered = mergeHeroMetaLists(computed.recommendedHeroes.map((item) => item.hero), filtered).slice(0, 60);
  const strategyMeta = getStrategyMeta(computed.currentStep?.action || "ban");

  return (
    <section className="flex min-h-[720px] flex-col gap-3 rounded-[16px] border border-white/10 bg-[rgba(18,27,40,0.86)] p-3 xl:min-h-0">
      <p className="shrink-0 text-xs uppercase tracking-[0.25em] text-[#5EF2C2]">Prediction</p>
      {computed.isCompleted ? (
        <CompletionAnalysis computed={computed} />
      ) : (
        <>
          <div className="max-h-[43%] shrink-0 overflow-hidden rounded-[14px] border border-[#5EF2C2]/25 bg-[#5EF2C2]/8 p-3 shadow-[0_0_30px_rgba(94,242,194,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{computed.currentStep?.action === "ban" ? "Ban 策略推荐" : "Pick 策略推荐"}</h3>
                <p className="mt-1 text-[11px] text-[#8EA0B8]">按总分排序，点击卡片直接填入当前槽位。</p>
              </div>
              <button className="rounded-[10px] border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-[#CFFFEF] transition hover:border-[#5EF2C2]/40" onClick={() => setShowRules((value) => !value)} type="button">
                评分规则
              </button>
            </div>
            {showRules ? <StrategyRules meta={strategyMeta} /> : null}
            <div className="mt-3 max-h-[calc(43vh-128px)] space-y-2 overflow-y-auto pr-1">
              {computed.recommendedHeroes.slice(0, 5).map((item) => (
                <RecommendedHeroCard item={item} key={item.hero.id} onClick={() => selectHero(item.hero)} />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-[14px] border border-white/10 bg-[#0B111A]/72 p-3">
            <div className="shrink-0">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">英雄搜索与选择</h3>
                  <p className="mt-1 text-[11px] text-[#8EA0B8]">{filtered.length} 个匹配英雄 / 当前英雄目录 {heroes.length} 个</p>
                </div>
              </div>
              <label className="mt-3 flex h-12 items-center gap-3 rounded-[12px] border border-white/10 bg-[#070B12] px-3 shadow-inner shadow-black/20">
                <Search className="h-4 w-4 text-[#5EF2C2]" />
                <input className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-[#566273]" onChange={(event) => setQuery(event.target.value)} placeholder="搜索英雄名称，例如：关羽 / 公孙离 / 大司命" value={query} />
              </label>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {roleFilters.map((role) => (
                  <button
                    className={(roleFilter === role ? "border-[#5EF2C2]/45 bg-[#5EF2C2]/12 text-[#DFFFF4]" : "border-white/10 bg-white/[0.035] text-[#8EA0B8]") + " rounded-[10px] border px-2.5 py-1.5 text-[11px] transition hover:border-white/25"}
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    type="button"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2.5">
              {ordered.map((hero) => {
                const reason = computed.disabledReason(hero);
                const recommendation = computed.recommendedHeroes.find((item) => item.hero.id === hero.id);
                const status = getHeroStatus(reason, recommendedIds.has(hero.id));
                return <HeroCard disabled={Boolean(reason)} hero={hero} key={hero.id} onClick={() => selectHero(hero)} recommendation={recommendation} status={status} />;
              })}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function RecommendedHeroCard({ item, onClick }: { item: Recommendation; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const scoreTone = item.type === "ban" ? "text-[#FFCCD6]" : "text-[#CFFFEF]";
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#0B111A]/76 p-2 transition hover:border-[#5EF2C2]/40">
      <button className="w-full text-left" onClick={onClick} type="button">
        <div className="flex gap-2.5">
          <AssetImage alt={item.hero.name} className="h-12 w-12 shrink-0 rounded-[14px] border border-white/10 object-cover" fallback={item.hero.name.slice(0, 2)} src={item.hero.avatar} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{item.hero.name}</p>
                  <span className="rounded bg-[#5EF2C2] px-1.5 py-0.5 text-[10px] font-bold text-[#07111D]">{item.type === "ban" ? "建议 Ban" : "建议 Pick"}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[#8EA0B8]">{item.hero.role}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-lg font-black ${scoreTone}`}>{item.totalScore}</p>
                <p className="text-[10px] text-[#566273]">总分</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#AAB7C8]">{item.summary}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={item.type === "ban" ? "h-full rounded-full bg-[#FF5C7A]" : "h-full rounded-full bg-[#5EF2C2]"} style={{ width: `${item.totalScore}%` }} />
            </div>
          </div>
        </div>
      </button>
      <button className="mt-2 text-[11px] font-semibold text-[#5EF2C2] hover:text-white" onClick={() => setExpanded((value) => !value)} type="button">
        {expanded ? "收起评分依据" : "查看分项评分"}
      </button>
      {expanded ? <ScoreBreakdown item={item} /> : null}
    </div>
  );
}

function StrategyRules({ meta }: { meta: StrategyMeta }) {
  const labels: Record<string, string> = {
    versionStrength: "版本强度",
    opponentUsage: "对手常用",
    opponentWinRate: "对手胜率",
    counterScore: "反制对手",
    lineupFit: "阵容适配",
    playerProficiency: "选手熟练度",
  };
  return (
    <div className="mt-3 rounded-[12px] border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] leading-5 text-[#AAB7C8]">{meta.scoringRule}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {Object.entries(meta.weights).map(([key, value]) => (
          <span className="rounded-[8px] bg-white/[0.045] px-2 py-1 text-[10px] text-[#CFE6F5]" key={key}>
            {labels[key] || key} · {Math.round(value * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreBreakdown({ item }: { item: Recommendation }) {
  const rows = item.type === "ban"
    ? [
        ["版本强度", item.breakdown.versionStrength],
        ["对手常用", item.breakdown.opponentUsage],
        ["对手胜率", item.breakdown.opponentWinRate || 0],
      ]
    : [
        ["版本强度", item.breakdown.versionStrength],
        ["反制对手", item.breakdown.opponentUsage],
        ["对位克制", item.breakdown.counterScore || 0],
        ["阵容适配", item.breakdown.lineupFit || 0],
        ["选手熟练", item.breakdown.playerProficiency || 0],
      ];
  return (
    <div className="mt-2 space-y-1.5 rounded-[10px] border border-white/10 bg-black/18 p-2">
      {rows.map(([label, value]) => (
        <div className="grid grid-cols-[64px_1fr_34px] items-center gap-2 text-[10px]" key={label}>
          <span className="text-[#8EA0B8]">{label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-[#5EF2C2]" style={{ width: `${value}%` }} />
          </span>
          <strong className="text-right text-[#EAF2FF]">{value}</strong>
        </div>
      ))}
      <p className="pt-1 text-[10px] leading-4 text-[#8EA0B8]">策略说明：{item.summary}</p>
    </div>
  );
}

function DraftSlot({ active, hero, label, side, size }: { active: boolean; hero?: HeroMeta; label: string; side: BpSide; size: "small" | "large" }) {
  const sideClass = side === "blue" ? "border-[#4AA3FF]/55 shadow-[0_0_16px_rgba(74,163,255,0.12)]" : "border-[#FF5C7A]/55 shadow-[0_0_16px_rgba(255,92,122,0.12)]";
  const activeClass = "border-[#5EF2C2] bg-[#5EF2C2]/12 shadow-[0_0_18px_rgba(94,242,194,0.34)] animate-pulse";
  const emptyClass = "border-white/10 bg-white/[0.035]";
  if (size === "large") {
    return (
      <div className={(active ? activeClass : hero ? `${sideClass} bg-white/[0.045]` : emptyClass) + " relative flex min-h-[118px] flex-col items-center justify-center rounded-[16px] border p-2 text-center transition"}>
        {active ? <span className="absolute right-1.5 top-1.5 rounded-[8px] bg-[#5EF2C2]/18 px-1.5 py-0.5 text-[9px] font-semibold text-[#CFFFEF]">操作中</span> : null}
        {hero ? (
          <>
            <AssetImage alt={hero.name} className="h-14 w-14 rounded-[14px] border border-white/10 object-cover" fallback={hero.name.slice(0, 2)} src={hero.avatar} />
            <p className="mt-2 max-w-full truncate text-[11px] font-semibold text-[#EAF2FF]">{hero.name}</p>
            <p className="mt-1 text-[9px] text-[#8EA0B8]">{hero.role}</p>
          </>
        ) : (
          <>
            <p className="text-base font-black text-[#8EA0B8]">{label}</p>
            <p className="mt-1 text-[9px] text-[#566273]">待选择</p>
          </>
        )}
      </div>
    );
  }
  return (
    <div className={(active ? activeClass : hero ? `${sideClass} bg-white/[0.045]` : emptyClass) + " relative flex aspect-square min-h-[74px] flex-col items-center justify-center rounded-[14px] border p-1.5 text-center transition"}>
      {hero ? (
        <>
          <AssetImage alt={hero.name} className="h-9 w-9 rounded-[10px] border border-white/10 object-cover" fallback={hero.name.slice(0, 2)} src={hero.avatar} />
          <p className="mt-1 max-w-full truncate text-[10px] text-[#EAF2FF]">{hero.name}</p>
        </>
      ) : (
        <>
          <p className="text-sm font-black text-[#8EA0B8]">{label}</p>
          <p className="mt-0.5 text-[9px] text-[#566273]">Ban</p>
        </>
      )}
    </div>
  );
}

function HeroCard({ disabled, hero, onClick, recommendation, status }: { disabled: boolean; hero: HeroMeta; onClick: () => void; recommendation?: Recommendation; status: HeroStatus }) {
  return (
    <button
      className={(disabled ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-45" : recommendation ? "border-[#5EF2C2]/45 bg-[#5EF2C2]/10 hover:-translate-y-0.5" : "border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/25") + " group relative min-h-[132px] overflow-hidden rounded-[12px] border p-2 text-center transition"}
      disabled={disabled}
      onClick={onClick}
      title={disabled ? status : recommendation?.summary || hero.name}
      type="button"
    >
      {recommendation ? <span className="absolute right-1.5 top-1.5 rounded bg-[#5EF2C2] px-1.5 py-0.5 text-[10px] font-bold text-[#07111D]">推荐</span> : null}
      {disabled ? <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -rotate-12 bg-[#8EA0B8]/70" /> : null}
      <AssetImage alt={hero.name} className="mx-auto h-14 w-14 rounded-full border border-white/10 transition group-hover:scale-105" fallback={hero.name.slice(0, 2)} src={hero.avatar} />
      <p className="mt-2 break-words text-xs font-semibold text-white">{hero.name}</p>
      <p className="mt-1 text-[10px] text-[#8EA0B8]">{hero.role}</p>
      <p className={disabled ? "mt-1 text-[10px] text-[#8EA0B8]" : "mt-1 text-[10px] text-[#5EF2C2]"}>{status}</p>
    </button>
  );
}

function CompletionAnalysis({ computed }: { computed: DraftComputed }) {
  return (
    <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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
    <div className="rounded-[12px] border border-white/10 bg-[#0B111A]/70 p-3">
      <p className="text-xs text-[#8EA0B8]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#EAF2FF]">{value}</p>
    </div>
  );
}

function ChatBubble({ children, tone }: { children: ReactNode; tone: "system" | BpSide }) {
  const className = tone === "system" ? "border-[#5EF2C2]/30 bg-[#5EF2C2]/10 text-[#DFFFF4]" : tone === "blue" ? "ml-3 border-[#4AA3FF]/25 bg-[#4AA3FF]/10 text-[#DDEEFF]" : "mr-3 border-[#FF5C7A]/25 bg-[#FF5C7A]/10 text-[#FFE0E6]";
  return <div className={`rounded-[12px] border px-3 py-2 text-xs leading-5 ${className}`}>{children}</div>;
}

function SelectBox({ label, onChange, value, values }: { label: string; onChange: (value: string) => void; value: string; values: string[] }) {
  return (
    <label className="block">
      <span className="text-xs text-[#8EA0B8]">{label}</span>
      <select className="mt-1 h-10 w-full rounded-[10px] border border-white/10 bg-[#0B111A] px-3 text-sm text-slate-100 outline-none" onChange={(event) => onChange(event.target.value)} value={value}>
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-white/10 bg-white/[0.035] px-2 py-1">
      <p className="truncate text-[10px] text-[#8EA0B8]">{label}</p>
      <p className="truncate text-xs font-semibold text-[#EAF2FF]">{value}</p>
    </div>
  );
}

function ModalActionButton({ accent, children, onClick }: { accent?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button className={(accent ? "border-[#5EF2C2]/35 bg-[#5EF2C2]/10 text-[#CFFFEF]" : "border-white/10 bg-white/[0.04] text-slate-300") + " rounded-[10px] border px-3 py-2 text-xs transition hover:border-white/25"} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function DashboardShell({ children, description, eyebrow, title }: { children: ReactNode; description: string; eyebrow: string; title: string }) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-[rgba(18,27,40,0.86)] p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#5EF2C2]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8EA0B8]">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function WorkflowList({ rows }: { rows: Array<[string, string, string, string]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {rows.map(([id, title, body, status]) => (
        <div className="rounded-[12px] border border-white/10 bg-white/[0.035] p-4" key={`${id}-${title}`}>
          <p className="text-xs text-[#8EA0B8]">{id}</p>
          <h3 className="mt-2 font-semibold">{title}</h3>
          <p className="mt-2 text-xs leading-5 text-[#8EA0B8]">{body}</p>
          <span className="mt-3 inline-flex rounded-[10px] border border-[#5EF2C2]/30 px-2 py-1 text-[11px] text-[#CFFFEF]">{status}</span>
        </div>
      ))}
    </div>
  );
}

function AgentPanel() {
  return <DashboardShell eyebrow="Agent Ops" title="Agent 任务中心" description="保留任务解析、知识检索、内容生成、质量评估和迭代备忘的工作流入口。"><WorkflowList rows={[["1", "任务解析", "识别任务类型、英雄对象和验收重点", "待执行"], ["2", "知识检索", "匹配英雄、装备、KPL 表达和风险点", "待执行"], ["3", "内容生成", "生成回答、脚本、标题和发布摘要", "待执行"], ["4", "模型评估", "检查事实准确性、专业度和可读性", "待执行"]]} /></DashboardShell>;
}

function ContentPanel() {
  return <DashboardShell eyebrow="Content" title="赛事内容生成" description="用于赛事切片、标题、口播和赛后复盘内容生产。"><WorkflowList rows={[["切片", "团战高光候选", "识别关键资源团、反打和终结点", "样本中"], ["标题", "短视频标题", "生成 KPL 风格标题和封面文案", "可用"], ["口播", "解说脚本", "输出赛后复盘和陪玩语气版本", "可用"]]} /></DashboardShell>;
}

function KnowledgePanel() {
  return (
    <DashboardShell eyebrow="Knowledge" title="英雄资料库" description="英雄、装备、铭文、技能和 KPL 解说语料仍保留为资料入口。">
      <div className="grid gap-3 md:grid-cols-3">
        {[["英雄目录", `${kplHeroCatalog.length} 个英雄`, "/knowledge/heroes"], ["装备资料", "装备属性与出装建议", "/knowledge/equipment"], ["BP 样本", `${currentKplBpMatches.length} 局`, ""]].map(([title, desc, href]) => (
          <a className="rounded-[12px] border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#5EF2C2]/40" href={href || undefined} key={title}>
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-xs text-[#8EA0B8]">{desc}</p>
          </a>
        ))}
      </div>
    </DashboardShell>
  );
}

function FeedbackPanel() {
  return <DashboardShell eyebrow="Forum Signals" title="玩家反馈分析" description="论坛情绪、版本争议点、战队舆情和英雄讨论聚类入口。"><WorkflowList rows={[["论坛", "虎扑 / 社媒反馈", "聚合比赛后讨论和英雄争议", "待接入"], ["情绪", "正负向分析", "识别吐槽、认可、争议和节奏点", "可恢复"], ["样本", "KPL BP 语料", "把 BP 选择转成聚类特征", "进行中"]]} /></DashboardShell>;
}

function EvaluationPanel() {
  return <DashboardShell eyebrow="Evaluation" title="模型效果评估" description="用于比较 BP 推荐、内容生成和资料问答的样本表现。"><WorkflowList rows={[["准确性", "事实与规则", "检查 BP 顺序、全局 BP 和英雄可用性", "重点"], ["解释性", "推荐理由", "覆盖版本强度、英雄池、阵容缺口", "重点"], ["体验", "交互链路", "检查 Modal、撤销、重开、完成态", "进行中"]]} /></DashboardShell>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-white/10 bg-white/[0.035] px-3 py-2">
      <p className="text-[11px] text-[#8EA0B8]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DatabasePanel() {
  const [selectedId, setSelectedId] = useState(currentKplBpMatches[0].id);
  const selected = currentKplBpMatches.find((match) => match.id === selectedId) || currentKplBpMatches[0];
  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr_360px]">
      <section className="rounded-[20px] border border-white/10 bg-[rgba(18,27,40,0.86)] p-4">
        <div className="flex items-center gap-2"><Database className="h-4 w-4 text-[#5EF2C2]" /><h2 className="font-semibold">2026 BP 数据库</h2></div>
        <p className="mt-2 text-xs leading-5 text-[#8EA0B8]">当前保留 20 局阵容级 BP 和选手-英雄映射，后续继续接入 Bilibili 视频 OCR 校准逐手顺序。</p>
        <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto pr-1">
          {currentKplBpMatches.map((match) => (
            <button className={(selected.id === match.id ? "border-[#5EF2C2]/60 bg-[#5EF2C2]/12" : "border-white/10 bg-white/[0.035] hover:border-white/25") + " w-full rounded-[12px] border p-3 text-left transition"} key={match.id} onClick={() => setSelectedId(match.id)} type="button">
              <p className="text-sm font-semibold text-white">{match.blueTeam} vs {match.redTeam}</p>
              <p className="mt-1 text-xs text-[#8EA0B8]">{match.date} / {match.game} / {match.result}</p>
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
    <section className="rounded-[20px] border border-white/10 bg-[rgba(18,27,40,0.86)] p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-[#5EF2C2]">Match Detail</p>
      <h2 className="mt-2 text-2xl font-bold">{match.blueTeam} vs {match.redTeam}</h2>
      <p className="mt-2 text-sm text-[#8EA0B8]">{match.stage} / {match.game} / {match.result}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <SideCard team={match.blueTeam} side="blue" bans={match.bans.blue} picks={bluePicks} />
        <SideCard team={match.redTeam} side="red" bans={match.bans.red} picks={redPicks} />
      </div>
    </section>
  );
}

function SideCard({ bans, picks, side, team }: { bans: string[]; picks: KplBpMatch["picks"]; side: BpSide; team: string }) {
  const tone = side === "blue" ? "border-[#4AA3FF]/25 bg-[#4AA3FF]/8" : "border-[#FF5C7A]/25 bg-[#FF5C7A]/8";
  return (
    <div className={`rounded-[12px] border p-3 ${tone}`}>
      <h3 className="font-semibold">{team}</h3>
      <p className="mt-3 text-xs text-[#8EA0B8]">Ban</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{bans.length ? bans.map((hero) => <span className="rounded-[10px] border border-white/10 bg-black/20 px-2 py-1 text-xs" key={hero}>{hero}</span>) : <span className="text-xs text-[#8EA0B8]">巅峰对决无常规 Ban</span>}</div>
      <p className="mt-3 text-xs text-[#8EA0B8]">Pick / 选手</p>
      <div className="mt-2 space-y-1.5">{picks.map((pick) => <div className="grid grid-cols-[64px_1fr_72px] gap-2 rounded-[10px] bg-black/20 px-2 py-1.5 text-xs" key={pick.order}><span className="text-[#8EA0B8]">{pick.lane}</span><strong>{pick.player}</strong><span className="text-right text-[#5EF2C2]">{pick.hero}</span></div>)}</div>
    </div>
  );
}

function TeamClusterPanel() {
  const teamCounts = getTeamHeroRows();
  return (
    <section className="rounded-[20px] border border-white/10 bg-[rgba(18,27,40,0.86)] p-4">
      <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#5EF2C2]" /><h2 className="font-semibold">聚类准备</h2></div>
      <div className="mt-4 space-y-3">{teamCounts.slice(0, 8).map((row) => <div className="rounded-[12px] border border-white/10 bg-white/[0.035] p-3" key={row.team}><p className="text-sm font-semibold">{row.team}</p><div className="mt-2 flex flex-wrap gap-1.5">{row.heroes.slice(0, 8).map(([hero, count]) => <span className="rounded-[10px] bg-black/25 px-2 py-1 text-[11px]" key={hero}>{hero} x{count}</span>)}</div></div>)}</div>
    </section>
  );
}

function useDraftComputed(state: DraftState, heroes: HeroMeta[], query: string, roleFilter: HeroRole | "全部"): DraftComputed & { availableHeroes: HeroMeta[] } {
  const isPeakDuel = state.gameIndex === 7;
  const currentStep = isPeakDuel ? undefined : kplGlobalBpSteps[state.currentStepIndex];
  const currentTeam = currentStep?.side === "blue" ? state.blueTeam : currentStep?.side === "red" ? state.redTeam : undefined;
  const currentRound = currentStep ? getRoundLabel(currentStep.round) : isPeakDuel ? "巅峰对决" : "BP 完成";
  const ruleSnapshot = getBo7RuleSnapshot({ allMatches: currentKplBpMatches, blueTeam: state.blueTeam, redTeam: state.redTeam, gameIndex: state.gameIndex, predictingTeam: currentTeam || state.blueTeam });
  const currentBanned = new Set(state.actions.filter((item) => item.action === "ban").map((item) => item.heroId));
  const currentPicked = new Set(state.actions.filter((item) => item.action === "pick").map((item) => item.heroId));
  const globalUsedHeroes = { blue: getGlobalUsedHeroIds(ruleSnapshot.previousGames, state.blueTeam, heroes), red: getGlobalUsedHeroIds(ruleSnapshot.previousGames, state.redTeam, heroes) };
  const roleNeeds = currentStep ? getRoleNeeds(state.actions, heroes, currentStep.side) : [];

  function disabledReason(hero: HeroMeta) {
    if (!currentStep) return "BP 已完成";
    if (currentBanned.has(hero.id)) return "当前局已禁用";
    if (currentPicked.has(hero.id)) return "当前局已选择";
    if (currentStep.action === "pick" && state.gameIndex <= 6 && (currentStep.side === "blue" ? globalUsedHeroes.blue : globalUsedHeroes.red).includes(hero.id)) return "全局 BP 不可用";
    return "";
  }

  const recommendedHeroes = currentStep ? recommendHeroes({ heroes, currentStep, currentTeam: currentTeam || state.blueTeam, opponentTeam: currentStep.side === "blue" ? state.redTeam : state.blueTeam, disabledReason, roleNeeds }) : [];
  const progress = { current: Math.min(state.actions.length + (state.actions.length === kplGlobalBpSteps.length ? 0 : 1), kplGlobalBpSteps.length), percent: Math.round((state.actions.length / kplGlobalBpSteps.length) * 100) };
  const isCompleted = !isPeakDuel && state.actions.length >= kplGlobalBpSteps.length;
  const analysis = buildAnalysis(state.actions, heroes);
  const systemPrompt = currentStep && currentTeam ? `${currentTeam} 先进行第 ${currentStep.slot} 个 ${currentStep.action === "ban" ? "Ban 位" : "Pick 位"}。剩余 ${kplGlobalBpSteps.length - state.actions.length} 步。` : "BP 已完成。";
  const availableHeroes = heroes.filter((hero) => !disabledReason(hero) && hero.name.includes(query.trim()) && (roleFilter === "全部" || hero.role === roleFilter));

  return { analysis, availableHeroes, currentStep, currentTeam, disabledReason, globalUsedHeroes, isCompleted, isPeakDuel, phaseLabel: isCompleted ? "BP 完成" : currentRound, progress, recommendedHeroes, systemPrompt };
}

function buildHeroes(): HeroMeta[] {
  return kplHeroCatalog.map((item) => {
    const pickCount = countHero(item.name, "pick");
    const banCount = countHero(item.name, "ban");
    const role = roleByHero[item.name] || normalizeHeroRole(item.role);
    return { id: item.name, name: item.name, avatar: item.avatar || getHeroAvatar(item.name), role, tags: [role, pickCount >= 3 ? "高频" : "样本", banCount >= 3 ? "高压 Ban" : "可摇摆"], strengthScore: 60 + Math.min(30, pickCount * 4 + banCount * 2), playerPoolScore: 50 + Math.min(35, pickCount * 5) };
  });
}

function normalizeHeroRole(role: string): HeroRole {
  if (role === "战士" || role === "坦克") return "对抗路";
  if (role === "刺客") return "打野";
  if (role === "法师") return "中路";
  if (role === "射手") return "发育路";
  if (role === "辅助") return "游走";
  return "综合";
}

function recommendHeroes({ currentStep, currentTeam, disabledReason, heroes, opponentTeam, roleNeeds }: { currentStep: Bo7BpStep; currentTeam: string; disabledReason: (hero: HeroMeta) => string; heroes: HeroMeta[]; opponentTeam: string; roleNeeds: HeroRole[] }) {
  const ownCounts = new Map(getHeroCountsForTeam(currentTeam, "pick"));
  const opponentCounts = new Map(getHeroCountsForTeam(opponentTeam, "pick"));
  const opponentBanCounts = new Map(getHeroCountsForTeam(opponentTeam, "ban"));
  return heroes.filter((hero) => !disabledReason(hero)).map((hero) => {
    const ownPool = ownCounts.get(hero.name) || 0;
    const opponentPool = opponentCounts.get(hero.name) || 0;
    const opponentBanPressure = opponentBanCounts.get(hero.name) || 0;
    const versionStrength = clampScore(hero.strengthScore);
    const opponentUsage = clampScore(opponentPool * 26 + opponentBanPressure * 12 + (hero.tags.includes("高频") ? 10 : 0));
    const opponentWinRate = clampScore(54 + opponentPool * 7 + versionStrength * 0.18);
    const counterScore = clampScore(46 + opponentBanPressure * 12 + (hero.role === "打野" || hero.role === "中路" ? 10 : 4));
    const lineupFit = clampScore((roleNeeds.includes(hero.role) ? 82 : 52) + (hero.tags.includes("高频") ? 8 : 0));
    const playerProficiency = clampScore(hero.playerPoolScore + ownPool * 8);

    if (currentStep.action === "ban") {
      const totalScore = Math.round(
        versionStrength * banScoreWeights.versionStrength +
          opponentUsage * banScoreWeights.opponentUsage +
          opponentWinRate * banScoreWeights.opponentWinRate,
      );
      return {
        type: currentStep.action,
        hero,
        totalScore,
        summary: `${hero.name} 当前版本优先级 ${versionStrength}，${opponentTeam} 使用压力 ${opponentUsage}，预估胜率表现 ${opponentWinRate}，Ban 价值较高。`,
        breakdown: { versionStrength, opponentUsage, opponentWinRate },
        dimensions: ["版本强度", "对手常用程度", "对手胜率表现"],
      };
    }

    const totalScore = Math.round(
      versionStrength * pickScoreWeights.versionStrength +
        opponentUsage * pickScoreWeights.opponentUsage +
        counterScore * pickScoreWeights.counterScore +
        lineupFit * pickScoreWeights.lineupFit +
        playerProficiency * pickScoreWeights.playerProficiency,
    );
    return {
      type: currentStep.action,
      hero,
      totalScore,
      summary: `${hero.name} 可补足${hero.role}位置，版本强度 ${versionStrength}，阵容适配 ${lineupFit}，同时具备对位反制与选手熟练度支撑。`,
      breakdown: { versionStrength, opponentUsage, counterScore, lineupFit, playerProficiency },
      dimensions: ["版本强度", "反制对手", "对位克制", "阵容适配", "选手熟练度"],
    };
  }).sort((a, b) => b.totalScore - a.totalScore).slice(0, 8);
}

function getStrategyMeta(mode: BpAction): StrategyMeta {
  if (mode === "ban") {
    return {
      currentMode: mode,
      scoringRule: "BanScore = 版本强度 * 0.40 + 对方常用 * 0.35 + 对方胜率 * 0.25。当前先使用 mock 结构，后续可接真实胜率与选手池。",
      weights: banScoreWeights,
    };
  }
  return {
    currentMode: mode,
    scoringRule: "PickScore = 版本强度 * 0.25 + 反制对手 * 0.20 + 对位克制 * 0.20 + 阵容适配 * 0.20 + 选手熟练度 * 0.15。",
    weights: pickScoreWeights,
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getHeroStatus(reason: string, recommended: boolean): HeroStatus {
  if (reason === "当前局已禁用") return "当前局已禁用";
  if (reason === "当前局已选择") return "当前局已选择";
  if (reason === "全局 BP 不可用") return "全局 BP 不可用";
  if (reason === "BP 已完成") return "BP 已完成";
  if (recommended) return "推荐";
  return "可选";
}

function getTeamHeroRows() {
  return Array.from(new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam]))).map((team) => ({ team, heroes: getHeroCountsForTeam(team, "pick") })).sort((a, b) => b.heroes.length - a.heroes.length);
}

function getHeroCountsForTeam(team: string, type: "pick" | "ban") {
  const counts = new Map<string, number>();
  currentKplBpMatches.forEach((match) => {
    if (type === "pick") {
      const side = match.blueTeam === team ? "blue" : match.redTeam === team ? "red" : null;
      if (!side) return;
      match.picks.filter((pick) => pick.side === side).forEach((pick) => counts.set(pick.hero, (counts.get(pick.hero) || 0) + 1));
      return;
    }
    if (match.blueTeam === team) match.bans.blue.forEach((hero) => counts.set(hero, (counts.get(hero) || 0) + 1));
    if (match.redTeam === team) match.bans.red.forEach((hero) => counts.set(hero, (counts.get(hero) || 0) + 1));
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"));
}

function countHero(hero: string, type: "pick" | "ban") {
  return currentKplBpMatches.reduce((sum, match) => type === "pick" ? sum + match.picks.filter((pick) => pick.hero === hero).length : sum + match.bans.blue.filter((item) => item === hero).length + match.bans.red.filter((item) => item === hero).length, 0);
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
  const pickedRoles = actions.filter((action) => action.side === side && action.action === "pick").map((action) => getHeroById(heroes, action.heroId)?.role).filter(Boolean);
  return (["对抗路", "打野", "中路", "发育路", "游走"] as HeroRole[]).filter((role) => !pickedRoles.includes(role));
}

function buildAnalysis(actions: DraftAction[], heroes: HeroMeta[]): DraftAnalysis {
  const bluePicks = actions.filter((action) => action.side === "blue" && action.action === "pick").map((action) => getHeroById(heroes, action.heroId)).filter(Boolean) as HeroMeta[];
  const redPicks = actions.filter((action) => action.side === "red" && action.action === "pick").map((action) => getHeroById(heroes, action.heroId)).filter(Boolean) as HeroMeta[];
  const blueScore = Math.round(bluePicks.reduce((sum, hero) => sum + hero.strengthScore, 0) / Math.max(1, bluePicks.length));
  const redScore = Math.round(redPicks.reduce((sum, hero) => sum + hero.strengthScore, 0) / Math.max(1, redPicks.length));
  const blueWinRate = Math.max(35, Math.min(65, 50 + Math.round((blueScore - redScore) / 2)));
  return { blueScore, redScore, blueTags: makeTags(bluePicks), redTags: makeTags(redPicks), curve: blueScore >= redScore ? "蓝方前中期主动性略高，红方需要拖到后期团战寻找反打。" : "红方中期节奏更完整，蓝方需要用边线和视野稳住资源交换。", keyMatchup: `${bluePicks[1]?.name || "蓝方打野"} vs ${redPicks[1]?.name || "红方打野"} 是主要节奏点。`, risk: "当前预测基于阵容级样本，逐手顺序仍需要视频 OCR 继续校准。", blueWinRate };
}

function makeTags(picks: HeroMeta[]) {
  const roles = new Set(picks.map((hero) => hero.role));
  return [roles.has("打野") ? "有节奏点" : "缺打野", roles.has("游走") ? "开团/保护完整" : "缺辅助", picks.some((hero) => hero.tags.includes("高频")) ? "熟练度高" : "样本偏少"];
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
  const item = kplHeroCatalog.find((candidate) => candidate.name === hero);
  return item?.avatar;
}
