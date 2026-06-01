"use client";

import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Gauge,
  Headphones,
  Layers3,
  Loader2,
  MessageSquareText,
  Mic2,
  Play,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AgentRunResult, AgentStep } from "@/lib/agent-types";
import type { IntentResult } from "@/lib/intent";
import type { KnowledgeResult } from "@/lib/knowledge";

type FeatureKey =
  | "agent"
  | "kpl"
  | "content"
  | "knowledge"
  | "voice"
  | "feedback"
  | "evaluation";

type Feature = {
  key: FeatureKey;
  label: string;
  short: string;
  icon: LucideIcon;
};

const defaultTask =
  "孙尚香在巅峰 2000 分以上的局通常做什么出装？请基于英雄技能、官方装备库和高分段出装样本，给出常规局、对面突进多、顺风压塔三种方案，并说明每套装备的取舍。";

const waitingSteps: AgentStep[] = [
  {
    id: "parse",
    title: "任务解析",
    tool: "parseTask",
    status: "waiting",
    input: "等待任务提交",
    output: "识别任务类型、素材对象和验收重点",
  },
  {
    id: "retrieve",
    title: "检索英雄/赛事语料",
    tool: "retrieveKnowledge",
    status: "waiting",
    input: "等待上一步结果",
    output: "匹配英雄、装备、KPL 表达和风险点",
  },
  {
    id: "generate",
    title: "生成内容版本",
    tool: "generateContent",
    status: "waiting",
    input: "等待语料注入",
    output: "产出回答、脚本、标题和发布摘要",
  },
  {
    id: "evaluate",
    title: "模型质量评估",
    tool: "evaluateOutput",
    status: "waiting",
    input: "等待内容版本",
    output: "评估专业度、事实准确性和风险等级",
  },
  {
    id: "memo",
    title: "迭代备忘",
    tool: "createIterationMemo",
    status: "waiting",
    input: "等待评分结果",
    output: "生成验收结论和下一轮优化建议",
  },
];

const features: Feature[] = [
  { key: "agent", label: "Agent 任务中心", short: "只放 Agent 链路", icon: Sparkles },
  { key: "kpl", label: "KPL 赛事中心", short: "节目 / 赛程 / 战队", icon: Trophy },
  { key: "content", label: "赛事内容生成", short: "视频切片到发布", icon: MessageSquareText },
  { key: "knowledge", label: "英雄语料库", short: "英雄 / 装备 / RAG", icon: BookOpenText },
  { key: "voice", label: "选手声线陪玩", short: "语音对话 Demo", icon: Mic2 },
  { key: "feedback", label: "玩家反馈分析", short: "论坛与情绪聚类", icon: BarChart3 },
  { key: "evaluation", label: "模型效果评估", short: "维度 / 权重 / 样本", icon: ClipboardCheck },
];

const statCards: Array<[string, string, string, LucideIcon]> = [
  ["本周素材", "128", "+18%", RadioTower],
  ["内容通过率", "86.4%", "+6.2%", ShieldCheck],
  ["待复核输出", "21", "-9", ClipboardCheck],
  ["语料命中率", "91%", "+4.8%", Gauge],
];

const defaultMatchLog = `00:45 双方中路抢线，蓝色方小乔拿到线权
02:10 红色方打野入侵蓝区，辅助提前占草反蹲
04:35 第一条暴君刷新，蓝色方射手绕后输出，打出一换三
08:30 中路抱团，开团位命中多人，团战打出零换四
12:20 蓝色方压高地失败，红色方反开追回节奏
16:40 主宰坑拉扯，蓝色方抢下远古生物并完成收割`;

const kplPrograms = [
  {
    title: "KPL 每日高光",
    type: "节目",
    match: "AG 超玩会 vs 狼队",
    desc: "孙尚香后期两枪收割，适合做短视频切片、标题生成和陪玩回复。",
  },
  {
    title: "赛后复盘室",
    type: "复盘",
    match: "eStarPro vs WB",
    desc: "中路河道团技能链完整，适合沉淀解说语料和模型评估样本。",
  },
  {
    title: "选手第一视角",
    type: "专题",
    match: "发育路专题",
    desc: "走位、补装、开麦沟通能拆成语音陪玩知识片段。",
  },
];

const kplVideoSources = [
  {
    title: "2019 KPL 春季赛总决赛回放",
    source: "Bilibili",
    url: "https://www.bilibili.com/video/BV1R4411V7s2/",
  },
  {
    title: "总决赛发育路对位专题",
    source: "玩加电竞 / KPL 官方微博来源",
    url: "https://www.wanplus.cn/kog/video/1557654",
  },
  {
    title: "赛中镜头：AG 反打零换三",
    source: "玩加电竞 / KPL 官方微博来源",
    url: "https://m.wanplus.cn/kog/video/1448245",
  },
];

const kplSchedule = [
  ["06-03 19:00", "AG 超玩会", "狼队", "焦点战"],
  ["06-04 20:00", "eStarPro", "WB", "争夺上半区"],
  ["06-05 19:00", "DRG", "TES.A", "季后赛卡位"],
];

const kplTeams = [
  ["AG 超玩会", "强开团 / 发育路核心", "节目素材 38"],
  ["重庆狼队", "边野联动 / 后期运营", "节目素材 34"],
  ["武汉 eStarPro", "中野节奏 / 团战执行", "节目素材 29"],
  ["北京 WB", "拉扯运营 / 控图", "节目素材 25"],
];

const videoPipeline = [
  ["导入视频 URL", "记录来源、版权备注、比赛/节目元数据"],
  ["抽帧 + OCR", "识别比分、时间、英雄头像、装备栏和团战 UI"],
  ["ASR + 解说转写", "把解说语音按英雄、战队、选手和战术标签入库"],
  ["高光检测", "融合击杀播报、经济变化、音量峰值和画面切换"],
  ["内容生成", "生成标题、封面文案、解说稿、主播口播和陪玩回复"],
  ["发布审核", "模型评估通过后进入待发布队列，保留来源链接"],
];

const publishQueue = [
  ["00:08:30-00:08:47", "孙尚香两枪收割", "标题/口播已生成", "待人工复核"],
  ["00:14:02-00:14:18", "龙坑反打零换三", "解说语料已入库", "可发布"],
  ["00:21:40-00:22:05", "高地防守翻盘", "声线陪玩脚本已生成", "待评估"],
];

const voicePresets = [
  ["发育路选手声线", "温和但决策明确，适合射手出装和团战站位提醒"],
  ["KPL 解说声线", "语速更快，强调画面感和团战节奏"],
  ["战术教练声线", "短句指令，偏复盘和临场纠错"],
];

const voiceAgentSteps = [
  ["语音识别", "把玩家语音转成 query"],
  ["场景检索", "命中英雄技能、装备库、巅峰 2000+ 出装样本和 KPL 表达"],
  ["回复生成", "生成 6 秒内可播报的短句"],
  ["安全审核", "过滤冒充真人、攻击性表达和不确定战术结论"],
];

const voiceIntentRoutes = [
  {
    id: "build",
    label: "出装建议",
    sample: "我孙尚香现在 9 分钟两件套，对面兰陵王一直切我，下一件先破晓还是保命？",
    route: "knowledge.build",
    reply:
      "先别急着补破晓。兰陵王一直盯你，这波先做名刀小件，团战站辅助身后，等他露头再一技能拉开反打。",
  },
  {
    id: "position",
    label: "站位提醒",
    sample: "下一波龙团我应该站哪里？",
    route: "match.position",
    reply:
      "你站中右草后半步，别先露头。等前排吃第一波控制，你再翻滚出来点前排，保留闪现防刺客二进场。",
  },
  {
    id: "review",
    label: "赛后复盘",
    sample: "刚才那波我为什么被秒了？",
    route: "review.death",
    reply:
      "你先交了一技能清线，兰陵王进场时没有位移窗口。下次先等敌方刺客露视野，再用强化普攻处理兵线。",
  },
  {
    id: "program",
    label: "节目切片",
    sample: "把这波团战剪成一个可以发的视频。",
    route: "content.clip",
    reply:
      "这波适合剪 15 秒：先给龙坑拉扯，再接孙尚香收割，标题可以用‘等一个翻滚，团战直接变天’。",
  },
];

const feedbackPosts = [
  ["发育路玩家", "射手体验", "后期团战节奏太快，射手没视野很容易被秒，希望 AI 能提示站位风险。", "机会"],
  ["KPL 观赛党", "解说内容", "团战复盘如果能自动指出胜负手和技能链，会比单纯口播更有用。", "正向"],
  ["版本研究员", "装备讨论", "很多玩家不知道什么时候补穿透装，英雄语料库应该和装备推荐联动。", "需求"],
  ["节目剪辑", "发布效率", "希望系统能直接给 15 秒高光、封面文案和审核结论。", "需求"],
];

const feedbackClusters = [
  ["解说更有画面感", "36%", "正向"],
  ["英雄技能描述泛化", "24%", "风险"],
  ["标题需要更像短视频", "21%", "机会"],
  ["想要主播锐评风格", "19%", "机会"],
];

const evaluationDimensions = [
  ["事实准确性", 0.35, 84, "英雄、技能、装备、比分和资源归属不能错"],
  ["王者专业度", 0.25, 88, "符合分路、版本、KPL 解说和高分段语境"],
  ["赛事沉浸感", 0.2, 91, "能不能让用户听出团战画面和节奏变化"],
  ["传播适配度", 0.12, 86, "标题、口播是否适合短视频和社区传播"],
  ["安全合规", 0.08, 94, "不冒充真人、不输出辱骂、不编造确定数据"],
];

const evaluationSamples = [
  ["A 样本", "孙尚香巅峰 2000+ 出装回答", 87, "通过", "命中装备逻辑，需补充样本来源标签"],
  ["B 样本", "KPL 团战切片解说稿", 91, "通过", "画面感强，事实校验无明显冲突"],
  ["C 样本", "选手声线陪玩回复", 78, "复核", "语气像真人承诺，需要改成风格化声线"],
];

const pageCopy: Record<FeatureKey, { eyebrow: string; title: string; body: string }> = {
  agent: {
    eyebrow: "Controlled Agent Workflow",
    title: "Agent 任务中心",
    body: "这里只展示 Agent 执行链路：任务解析、语料检索、生成、评估和迭代备忘。",
  },
  kpl: {
    eyebrow: "KPL Hub",
    title: "KPL 赛事中心",
    body: "对齐 KPL 官网的信息结构：节目、赛程、战队。AI 能力只作为节目流上的增强入口。",
  },
  content: {
    eyebrow: "Content Studio",
    title: "赛事内容生成",
    body: "从真实比赛视频 URL 到切片、解说稿、标题、封面文案和发布队列。",
  },
  knowledge: {
    eyebrow: "Knowledge Base",
    title: "英雄语料库",
    body: "英雄、装备、出装样本和 KPL 解说语料，为其他模块提供 RAG 资料。",
  },
  voice: {
    eyebrow: "Voice Companion",
    title: "选手声线陪玩",
    body: "先做语音对话 Demo：场景识别、知识检索、短句回复和安全边界。",
  },
  feedback: {
    eyebrow: "User Research",
    title: "玩家反馈分析",
    body: "像论坛一样收集玩家反馈，再做情绪聚类和产品需求归因。",
  },
  evaluation: {
    eyebrow: "Model QA",
    title: "模型效果评估",
    body: "清楚展示评估维度、权重、阈值、样本池和发布规则。",
  },
};

function statusClass(status: AgentStep["status"]) {
  if (status === "completed") return "border-emerald-300/50 bg-emerald-300/10";
  if (status === "running") return "border-sky-300/50 bg-sky-300/10";
  if (status === "failed") return "border-rose-300/50 bg-rose-300/10";
  return "border-white/10 bg-white/[0.035]";
}

function statusLabel(status: AgentStep["status"]) {
  if (status === "completed") return "已完成";
  if (status === "running") return "执行中";
  if (status === "failed") return "失败";
  return "等待中";
}

export function AgentWorkspace() {
  const [task, setTask] = useState(defaultTask);
  const [steps, setSteps] = useState(waitingSteps);
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("agent");
  const [intentQuery, setIntentQuery] = useState(
    "孙尚香在巅峰 2000 分以上的局都是做什么出装？",
  );
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [isIntentLoading, setIsIntentLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeResult | null>(null);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const [matchLog, setMatchLog] = useState(defaultMatchLog);
  const [slices, setSlices] = useState<
    Array<{ time: string; type: string; title: string; score: number; reason: string }>
  >([]);

  const completedCount = useMemo(
    () => steps.filter((item) => item.status === "completed").length,
    [steps],
  );
  const copy = pageCopy[activeFeature];

  useEffect(() => {
    void loadKnowledge(intentQuery);
    generateSlices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function classifyQuery() {
    setIsIntentLoading(true);
    try {
      const response = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: intentQuery }),
      });
      const data = (await response.json()) as IntentResult;
      setIntentResult(data);
      setActiveFeature(data.intent);
      if (data.intent === "knowledge") await loadKnowledge(intentQuery);
    } finally {
      setIsIntentLoading(false);
    }
  }

  async function loadKnowledge(query: string) {
    setIsKnowledgeLoading(true);
    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      setKnowledge((await response.json()) as KnowledgeResult);
    } finally {
      setIsKnowledgeLoading(false);
    }
  }

  function generateSlices() {
    const generated = matchLog
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const time = line.match(/^\d{2}:\d{2}/)?.[0] || "--:--";
        const score =
          55 +
          (/(零换四|一换三|收割|抢下|高地|主宰|暴君|远古)/.test(line) ? 28 : 0) +
          (/(绕后|反开|入侵|拉扯|开团)/.test(line) ? 12 : 0);
        const type = /(暴君|主宰|远古)/.test(line)
          ? "资源团"
          : /(零换四|一换三|收割|开团)/.test(line)
            ? "高光团战"
            : "节奏点";

        return {
          time,
          type,
          title: line.replace(/^\d{2}:\d{2}\s*/, ""),
          score: Math.min(score, 96),
          reason: "按击杀交换、资源归属、节奏反转和传播表达进行切片评分。",
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    setSlices(generated);
  }

  async function runAgent() {
    setActiveFeature("agent");
    setIsRunning(true);
    setError("");
    setResult(null);
    setSteps(waitingSteps.map((item, index) => ({ ...item, status: index === 0 ? "running" : "waiting" })));

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      if (!response.ok) throw new Error("Agent 执行失败");

      const data = (await response.json()) as AgentRunResult;
      setResult(data);
      data.steps.forEach((item, index) => {
        window.setTimeout(() => {
          setSteps((current) =>
            current.map((stepItem, stepIndex) => {
              if (stepIndex < index) return { ...stepItem, status: "completed" };
              if (stepIndex === index) return item;
              if (stepIndex === index + 1) return { ...stepItem, status: "running" };
              return stepItem;
            }),
          );
        }, index * 420);
      });
      window.setTimeout(() => {
        setSteps(data.steps);
        setIsRunning(false);
      }, data.steps.length * 420 + 200);
    } catch (agentError) {
      setError(agentError instanceof Error ? agentError.message : "未知错误");
      setSteps((current) =>
        current.map((item, index) => (index === 0 ? { ...item, status: "failed" } : item)),
      );
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen overflow-auto bg-[#05070b] px-4 py-4 text-slate-100">
      <section className="mx-auto grid min-h-[calc(100vh-32px)] w-[min(100%,1600px)] grid-cols-[230px_1fr] overflow-hidden rounded-[18px] border border-white/12 bg-[#081019] shadow-2xl shadow-black/50">
        <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#0b121c] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300 text-slate-950">
              <Bot size={22} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                KingAI Ops
              </p>
              <h1 className="text-sm font-semibold">峡谷 AI 内容工作台</h1>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>今日任务</span>
              <Activity size={14} className="text-emerald-200" />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <strong className="text-3xl">42</strong>
              <span className="text-xs text-emerald-200">+12.6%</span>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {features.map((item) => {
              const Icon = item.icon;
              const active = activeFeature === item.key;
              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-emerald-300/40 bg-emerald-300/12 text-white"
                      : "border-white/8 bg-white/[0.025] text-slate-400 hover:border-white/16 hover:bg-white/[0.06]"
                  }`}
                  key={item.key}
                  onClick={() => setActiveFeature(item.key)}
                  type="button"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active ? "bg-emerald-300 text-slate-950" : "bg-white/8"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                      {item.short}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-sky-300/20 bg-sky-300/8 p-3">
            <p className="text-xs font-medium text-sky-100">产品结构</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Agent 是任务链路；其他模块是业务工具，不再复用 Agent 面板。
            </p>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="flex h-[74px] items-center justify-between border-b border-white/10 px-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200">
                {copy.eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{copy.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-[360px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-300">
                <Search size={14} />
                <input
                  value={intentQuery}
                  onChange={(event) => setIntentQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="输入 query，先做意图识别"
                />
              </div>
              <button
                className="flex h-9 items-center gap-2 rounded-lg bg-sky-300 px-3 text-xs font-semibold text-slate-950 transition hover:bg-sky-200 disabled:opacity-70"
                disabled={isIntentLoading}
                onClick={classifyQuery}
                type="button"
              >
                {isIntentLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                识别意图
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="max-w-3xl text-sm leading-6 text-slate-300">{copy.body}</p>
            </div>

            {activeFeature === "agent" ? (
              <AgentModule
                completedCount={completedCount}
                error={error}
                isRunning={isRunning}
                result={result}
                runAgent={runAgent}
                setTask={setTask}
                steps={steps}
                task={task}
              />
            ) : null}

            {activeFeature === "kpl" ? <KplModule /> : null}

            {activeFeature === "content" ? (
              <ContentModule
                generateSlices={generateSlices}
                matchLog={matchLog}
                setMatchLog={setMatchLog}
                slices={slices}
              />
            ) : null}

            {activeFeature === "knowledge" ? (
              <KnowledgeModule
                intentQuery={intentQuery}
                isKnowledgeLoading={isKnowledgeLoading}
                knowledge={knowledge}
                loadKnowledge={loadKnowledge}
              />
            ) : null}

            {activeFeature === "voice" ? <VoiceModule /> : null}
            {activeFeature === "feedback" ? <FeedbackModule /> : null}
            {activeFeature === "evaluation" ? <EvaluationModule /> : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function AgentModule({
  completedCount,
  error,
  isRunning,
  result,
  runAgent,
  setTask,
  steps,
  task,
}: {
  completedCount: number;
  error: string;
  isRunning: boolean;
  result: AgentRunResult | null;
  runAgent: () => void;
  setTask: (value: string) => void;
  steps: AgentStep[];
  task: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr_320px]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-emerald-200" />
            <h3 className="text-sm font-semibold">任务输入</h3>
          </div>
          <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-slate-400">
            Agent only
          </span>
        </div>
        <textarea
          value={task}
          onChange={(event) => setTask(event.target.value)}
          className="mt-3 h-[230px] w-full resize-none rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-100 outline-none focus:border-emerald-300/60"
        />
        <button
          onClick={runAgent}
          disabled={isRunning}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-70"
          type="button"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {isRunning ? "Agent 执行中" : "运行 Agent"}
        </button>
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {statCards.map(([label, value, delta, Icon]) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={label}>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{label}</span>
                <Icon size={13} className="text-emerald-200" />
              </div>
              <div className="mt-2 flex items-end justify-between">
                <strong className="text-lg">{value}</strong>
                <span className="text-[11px] text-emerald-200">{delta}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers3 size={17} className="text-emerald-200" />
            <h3 className="text-sm font-semibold">Agent 执行链路</h3>
          </div>
          <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-slate-300">
            {completedCount}/5 steps
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {steps.map((item, index) => (
            <div className={`rounded-xl border p-3 ${statusClass(item.status)}`} key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/25 text-xs font-semibold">
                    {item.status === "running" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : item.status === "completed" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Tool: {item.tool}</p>
                  </div>
                </div>
                <span className="rounded-md bg-black/20 px-2 py-1 text-[11px]">
                  {statusLabel(item.status)}
                </span>
              </div>
              <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                <div>
                  <p className="text-[11px] text-slate-500">输入摘要</p>
                  <p className="mt-1 line-clamp-2 text-slate-300">{item.input}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">输出摘要</p>
                  <p className="mt-1 line-clamp-2 text-slate-200">{item.output}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center gap-2">
          <Target size={17} className="text-emerald-200" />
          <h3 className="text-sm font-semibold">Agent 产出</h3>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[11px] text-slate-500">发布结论</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-200">
            {result?.report.publishable || "等待评估"}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            {result?.report.summary || "运行 Agent 后展示可发布版本、验收风险和迭代方向。"}
          </p>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-medium">标题候选</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(result?.artifacts.titles || ["关键团战转折", "AI 生成后展示", "KPL 级别压迫感"]).map((title) => (
              <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px]" key={title}>
                {title}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function KplModule() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-semibold">节目</h3>
            <span className="text-xs text-slate-500">Videos</span>
          </div>
          <div className="mt-4 grid gap-3">
            {kplPrograms.map((program) => (
              <article className="rounded-xl border border-white/10 bg-black/20 p-4" key={program.title}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{program.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {program.match} / {program.type}
                    </p>
                  </div>
                  <span className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-semibold text-slate-950">
                    AI 可处理
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{program.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["切片", "解说", "入库", "陪玩", "评估"].map((item) => (
                    <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-semibold">赛程</h3>
            <span className="text-xs text-slate-500">Schedule</span>
          </div>
          <div className="mt-4 space-y-3">
            {kplSchedule.map(([time, left, right, tag]) => (
              <div className="rounded-xl bg-white/[0.035] p-3" key={`${time}-${left}`}>
                <p className="text-xs text-slate-500">{time}</p>
                <p className="mt-1 text-sm font-semibold">
                  {left} vs {right}
                </p>
                <p className="mt-1 text-xs text-emerald-200">{tag}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-semibold">战队</h3>
            <span className="text-xs text-slate-500">Teams</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {kplTeams.map(([team, style, count]) => (
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={team}>
                <p className="font-semibold">{team}</p>
                <p className="mt-1 text-xs text-slate-400">{style}</p>
                <p className="mt-3 text-[11px] text-emerald-200">{count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-semibold">真实视频素材池</h3>
            <span className="text-xs text-slate-500">外链导入</span>
          </div>
          <div className="mt-4 grid gap-3">
            {kplVideoSources.map((video) => (
              <a
                className="group rounded-xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-sky-300/40 hover:bg-sky-300/10"
                href={video.url}
                key={video.url}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{video.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{video.source}</p>
                  </div>
                  <ExternalLink className="text-slate-500 group-hover:text-sky-100" size={15} />
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ContentModule({
  generateSlices,
  matchLog,
  setMatchLog,
  slices,
}: {
  generateSlices: () => void;
  matchLog: string;
  setMatchLog: (value: string) => void;
  slices: Array<{ time: string; type: string; title: string; score: number; reason: string }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">视频导入与转写</h3>
          <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-slate-400">URL / ASR / OCR</span>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-slate-500">视频 URL</p>
          <p className="mt-2 break-all text-sm text-sky-100">
            https://www.bilibili.com/video/BV1R4411V7s2/
          </p>
        </div>
        <textarea
          value={matchLog}
          onChange={(event) => setMatchLog(event.target.value)}
          className="mt-4 h-56 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 outline-none focus:border-emerald-300/60"
        />
        <button
          className="mt-3 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
          onClick={generateSlices}
          type="button"
        >
          生成候选切片
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">切片结果</h3>
        <div className="mt-4 grid gap-3">
          {slices.map((item) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={`${item.time}-${item.title}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-sky-300/15 px-2 py-1 text-xs text-sky-100">{item.time}</span>
                  <span className="rounded-md bg-emerald-300/15 px-2 py-1 text-xs text-emerald-100">{item.type}</span>
                </div>
                <span className="text-xs text-emerald-200">高光分 {item.score}</span>
              </div>
              <p className="mt-2 text-sm">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">发布队列</h3>
        <div className="mt-4 space-y-3">
          {publishQueue.map(([time, title, artifact, status]) => (
            <div className="rounded-xl bg-white/[0.035] p-3 text-xs" key={time}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100">{title}</p>
                <span className="rounded-md border border-white/10 px-2 py-1 text-slate-300">{status}</span>
              </div>
              <p className="mt-2 text-slate-500">{time}</p>
              <p className="mt-1 text-emerald-200">{artifact}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KnowledgeModule({
  intentQuery,
  isKnowledgeLoading,
  knowledge,
  loadKnowledge,
}: {
  intentQuery: string;
  isKnowledgeLoading: boolean;
  knowledge: KnowledgeResult | null;
  loadKnowledge: (query: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">知识入口</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4" href="/knowledge/heroes">
            <p className="font-semibold text-emerald-100">英雄总览</p>
            <p className="mt-1 text-xs text-slate-400">全英雄图片、定位、详情页</p>
          </Link>
          <Link className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-4" href="/knowledge/equipment">
            <p className="font-semibold text-sky-100">装备总览</p>
            <p className="mt-1 text-xs text-slate-400">全装备分类、价格、属性</p>
          </Link>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">RAG 回答</p>
            <button
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs"
              onClick={() => loadKnowledge(intentQuery)}
              type="button"
            >
              {isKnowledgeLoading ? "检索中" : "重新检索"}
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{knowledge?.answer || "等待知识库检索结果。"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">巅峰赛出装样本</h3>
        <div className="mt-4 grid gap-3">
          {(knowledge?.rankedBuilds || []).slice(0, 3).map((sample) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={sample.scenario}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{sample.scenario}</p>
                <span className="text-xs text-emerald-200">置信 {sample.confidence}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">{sample.build.join(" → ")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{sample.reason}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function matchVoiceIntent(query: string) {
  if (/出装|破晓|名刀|装备|保命/.test(query)) return voiceIntentRoutes[0];
  if (/站位|龙团|团战|位置|视野/.test(query)) return voiceIntentRoutes[1];
  if (/为什么|被秒|复盘|刚才|死亡/.test(query)) return voiceIntentRoutes[2];
  if (/剪|视频|切片|发布|标题/.test(query)) return voiceIntentRoutes[3];
  return voiceIntentRoutes[1];
}

function VoiceModule() {
  const [query, setQuery] = useState(voiceIntentRoutes[0].sample);
  const [intent, setIntent] = useState(voiceIntentRoutes[0]);
  const [listening, setListening] = useState(false);
  const [spoken, setSpoken] = useState(false);

  function routeQuery(nextQuery = query) {
    const nextIntent = matchVoiceIntent(nextQuery);
    setQuery(nextQuery);
    setIntent(nextIntent);
    return nextIntent;
  }

  function speak(text = intent.reply) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.08;
    utterance.pitch = intent.id === "program" ? 1.05 : 0.92;
    window.speechSynthesis.speak(utterance);
    setSpoken(true);
  }

  function startListening() {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const nextIntent = routeQuery(query);
      speak(nextIntent.reply);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || query;
      const nextIntent = routeQuery(transcript);
      speak(nextIntent.reply);
    };
    recognition.start();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">对话式小精灵</h3>
          <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-slate-400">
            Voice intent router
          </span>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/8 p-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/40">
            <Bot size={34} />
            <span
              className={`absolute inset-0 rounded-full border border-emerald-200 ${
                listening ? "animate-ping" : ""
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-100">KPL 陪玩小精灵</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              点击麦克风后说一句局内问题；系统会识别意图，再分发到出装、站位、复盘或节目切片路由。
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/8 p-4">
          <p className="text-xs text-slate-500">玩家语音转写</p>
          <textarea
            className="mt-2 h-24 w-full resize-none rounded-lg border border-white/10 bg-black/25 p-3 text-sm leading-6 text-slate-100 outline-none focus:border-sky-300/60"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="flex items-center gap-2 rounded-lg bg-sky-300 px-3 py-2 text-sm font-semibold text-slate-950"
              onClick={startListening}
              type="button"
            >
              <Mic2 size={15} />
              {listening ? "正在听..." : "按住说话 Demo"}
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200"
              onClick={() => {
                const nextIntent = routeQuery(query);
                speak(nextIntent.reply);
              }}
              type="button"
            >
              识别意图并播报
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200"
              onClick={() => speak(intent.reply)}
              type="button"
            >
              重新播放回复
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-4">
          <div className="flex items-center justify-between gap-3 text-emerald-100">
            <div className="flex items-center gap-2">
            <Volume2 size={16} />
            <p className="font-semibold">陪玩回复脚本</p>
            </div>
            <span className="rounded-md bg-black/20 px-2 py-1 text-xs">
              {spoken ? "已播报" : "待播报"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-100">
            {intent.reply}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">意图路由与声线</h3>
        <div className="mt-4 grid gap-2">
          {voiceIntentRoutes.map((item) => (
            <button
              className={`rounded-xl border p-3 text-left transition ${
                intent.id === item.id
                  ? "border-emerald-300/50 bg-emerald-300/10"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20"
              }`}
              key={item.id}
              onClick={() => {
                setQuery(item.sample);
                setIntent(item);
              }}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{item.label}</p>
                <span className="rounded-md bg-black/20 px-2 py-1 text-[11px] text-slate-300">
                  {item.route}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                {item.sample}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {voicePresets.map(([name, description]) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={name}>
              <Headphones size={16} className="text-emerald-200" />
              <p className="mt-2 font-semibold">{name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2">
          {voiceAgentSteps.map(([title, description], index) => (
            <div className="flex gap-3 rounded-lg bg-black/20 px-3 py-2 text-xs" key={title}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-300 font-bold text-slate-950">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeedbackModule() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">玩家论坛</h3>
        <div className="mt-4 grid gap-3">
          {feedbackPosts.map(([user, tag, content, sentiment]) => (
            <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4" key={content}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{user}</p>
                <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs">{sentiment}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-200">{tag}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{content}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">反馈聚类</h3>
        <div className="mt-4 space-y-3">
          {feedbackClusters.map(([name, value, tag]) => (
            <div className="rounded-xl bg-white/[0.035] p-3" key={name}>
              <div className="flex items-center justify-between text-sm">
                <span>{name}</span>
                <span className="text-emerald-200">{value}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{tag}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EvaluationModule() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">评分机制</h3>
        <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3 text-sm leading-6">
          总分 = Σ(维度分 × 权重)。85 分以上可发布，70-84 分进入人工复核，低于 70 分禁止发布并回收为负样本。
        </p>
        <div className="mt-4 grid gap-3">
          {evaluationDimensions.map(([name, weight, score, rule]) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={name as string}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{name}</span>
                <span className="text-emerald-200">
                  {score as number} × {Math.round((weight as number) * 100)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-300" style={{ width: `${score}%` }} />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{rule}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">评估样本池</h3>
        <div className="mt-4 space-y-3">
          {evaluationSamples.map(([id, name, score, status, note]) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={id}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{name}</p>
                <span className="rounded-md bg-emerald-300/15 px-2 py-1 text-xs text-emerald-100">
                  {score} / {status}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
