"use client";

import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers3,
  Loader2,
  MessageSquareText,
  Play,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AgentRunResult, AgentStep } from "@/lib/agent-types";
import type { IntentResult } from "@/lib/intent";
import type { KnowledgeResult } from "@/lib/knowledge";

type FeatureKey = "agent" | "content" | "knowledge" | "feedback" | "evaluation";

type Feature = {
  key: FeatureKey;
  label: string;
  short: string;
  icon: LucideIcon;
  status: string;
};

const defaultTask =
  "基于一段 KPL 团战素材生成短视频内容：8分30秒，中路抱团，射手绕后持续输出，开团位命中多人，团战打出0换4。请生成官方解说、主播口播、标题，并评估是否适合发布。";

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
    output: "匹配英雄、分路、KPL 表达和风险点",
  },
  {
    id: "generate",
    title: "生成多风格内容",
    tool: "generateContent",
    status: "waiting",
    input: "等待语料注入",
    output: "产出解说稿、口播脚本和短视频标题",
  },
  {
    id: "evaluate",
    title: "模型质量评估",
    tool: "evaluateOutput",
    status: "waiting",
    input: "等待内容版本",
    output: "评估专业度、沉浸感、准确性和传播性",
  },
  {
    id: "memo",
    title: "发布建议与迭代备忘",
    tool: "createIterationMemo",
    status: "waiting",
    input: "等待评分结果",
    output: "生成内部验收结论和模型迭代建议",
  },
];

const features: Feature[] = [
  {
    key: "agent",
    label: "Agent 任务中心",
    short: "自动完成内容闭环",
    icon: Sparkles,
    status: "主流程",
  },
  {
    key: "content",
    label: "赛事内容生成",
    short: "解说稿 / 口播 / 标题",
    icon: MessageSquareText,
    status: "可演示",
  },
  {
    key: "knowledge",
    label: "英雄语料库",
    short: "英雄机制与 KPL 表达",
    icon: BookOpenText,
    status: "待扩展",
  },
  {
    key: "feedback",
    label: "玩家反馈分析",
    short: "聚类情绪与需求",
    icon: BarChart3,
    status: "待扩展",
  },
  {
    key: "evaluation",
    label: "模型效果评估",
    short: "验收标准与风险",
    icon: ClipboardCheck,
    status: "可演示",
  },
];

const statCards: Array<[string, string, string, LucideIcon]> = [
  ["本周素材", "128", "+18%", RadioTower],
  ["内容通过率", "86.4%", "+6.2%", ShieldCheck],
  ["待复核输出", "21", "-9", ClipboardCheck],
  ["语料命中率", "91%", "+4.8%", Gauge],
];

const knowledgeItems = [
  ["团战转折", "已审核", "KPL 解说语料"],
  ["射手绕后", "待增强", "玩家语感标签"],
  ["开团控制链", "已审核", "技能机制风险"],
  ["零换四节奏", "已审核", "短视频标题库"],
];

const feedbackClusters = [
  ["解说更有画面感", "36%", "正向"],
  ["英雄技能描述泛化", "24%", "风险"],
  ["标题需要更像短视频", "21%", "机会"],
  ["想要主播锐评风格", "19%", "机会"],
];

const evaluationRows = [
  ["王者专业度", 88],
  ["赛事沉浸感", 91],
  ["事实准确性", 84],
  ["传播适配度", 86],
];

const defaultMatchLog = `00:45 双方中路抢线，蓝色方小乔拿到线权
02:10 红色方打野入侵蓝区，辅助提前占草反蹲
04:35 第一条暴君刷新，蓝色方射手绕后输出，打出一换三
08:30 中路抱团，开团位命中多人，团战打出零换四
12:20 蓝色方压高地失败，红色方反开追回节奏
16:40 主宰坑拉扯，蓝色方抢下远古生物并完成收割`;

const forumPosts = [
  {
    user: "发育路玩家",
    tag: "射手体验",
    content: "这个版本后期团战节奏太快，射手没有视野时很容易被秒，希望 AI 能提示站位风险。",
    sentiment: "机会",
  },
  {
    user: "KPL 观赛党",
    tag: "解说内容",
    content: "团战复盘如果能自动指出胜负手和技能链，会比单纯口播更有用。",
    sentiment: "正向",
  },
  {
    user: "版本研究员",
    tag: "装备讨论",
    content: "很多玩家不知道什么时候补穿透装，英雄语料库应该和装备推荐联动。",
    sentiment: "需求",
  },
];

const evaluationPipeline = [
  ["事实校验", "核对英雄、技能、击杀交换和资源归属"],
  ["专业度评分", "判断是否符合王者/KPL 语境"],
  ["沉浸感评分", "评估解说节奏、画面感和传播表达"],
  ["风险分流", "低分样本进入人工复核和语料回收"],
];

function statusClass(status: AgentStep["status"]) {
  if (status === "completed") {
    return "border-emerald-300/50 bg-emerald-300/10 text-emerald-100";
  }
  if (status === "running") {
    return "border-sky-300/50 bg-sky-300/10 text-sky-100";
  }
  if (status === "failed") {
    return "border-rose-300/50 bg-rose-300/10 text-rose-100";
  }
  return "border-white/10 bg-white/[0.035] text-slate-400";
}

function statusLabel(status: AgentStep["status"]) {
  if (status === "completed") return "已完成";
  if (status === "running") return "执行中";
  if (status === "failed") return "失败";
  return "等待中";
}

function activeFeatureCopy(feature: FeatureKey, result: AgentRunResult | null) {
  if (feature === "content") {
    return {
      eyebrow: "Content Studio",
      title: "赛事内容生成",
      body:
        result?.artifacts.creatorScript ||
        "选择团战素材后，生成官方解说、主播口播、短视频标题和赛后复盘摘要。",
    };
  }
  if (feature === "knowledge") {
    return {
      eyebrow: "Knowledge Base",
      title: "英雄语料库",
      body: "维护英雄定位、技能机制、分路打法、KPL 高频表达和易错事实，作为 Agent 的业务知识源。",
    };
  }
  if (feature === "feedback") {
    return {
      eyebrow: "User Research",
      title: "玩家反馈分析",
      body: "聚类玩家评论，提炼情绪倾向、高频痛点和下一轮模型优化方向。",
    };
  }
  if (feature === "evaluation") {
    return {
      eyebrow: "Model QA",
      title: "模型效果评估",
      body:
        result?.artifacts.reviewMemo ||
        "按专业度、沉浸感、事实准确性、传播性做发布前验收，低置信度输出进入人工复核池。",
    };
  }
  return {
    eyebrow: "Controlled Agent Workflow",
    title: "Agent 任务中心",
    body:
      result?.report.summary ||
      "输入赛事素材，Agent 自动完成任务解析、语料检索、内容生成、质量评估和迭代备忘。",
  };
}

export function AgentWorkspace() {
  const [task, setTask] = useState(defaultTask);
  const [steps, setSteps] = useState(waitingSteps);
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("agent");
  const [intentQuery, setIntentQuery] = useState(
    "孙尚香在这个版本应该做什么装备？",
  );
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [isIntentLoading, setIsIntentLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeResult | null>(null);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const [matchLog, setMatchLog] = useState(defaultMatchLog);
  const [slices, setSlices] = useState<
    Array<{
      time: string;
      type: string;
      title: string;
      score: number;
      reason: string;
    }>
  >([]);

  const completedCount = useMemo(
    () => steps.filter((item) => item.status === "completed").length,
    [steps],
  );

  const featureCopy = activeFeatureCopy(activeFeature, result);

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

      if (data.intent === "knowledge") {
        await loadKnowledge(intentQuery);
      }
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
    setSteps(
      waitingSteps.map((item, index) => ({
        ...item,
        status: index === 0 ? "running" : "waiting",
      })),
    );

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });

      if (!response.ok) {
        throw new Error("Agent 执行失败");
      }

      const data = (await response.json()) as AgentRunResult;
      setResult(data);

      data.steps.forEach((item, index) => {
        window.setTimeout(() => {
          setSteps((current) =>
            current.map((stepItem, stepIndex) => {
              if (stepIndex < index) return { ...stepItem, status: "completed" };
              if (stepIndex === index) return item;
              if (stepIndex === index + 1) {
                return { ...stepItem, status: "running" };
              }
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
        current.map((item, index) =>
          index === 0 ? { ...item, status: "failed" } : item,
        ),
      );
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen overflow-auto bg-[#05070b] px-4 py-4 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-32px)] items-center justify-center">
        <section className="aspect-video w-[min(100%,1600px)] min-w-[1120px] overflow-hidden rounded-[18px] border border-white/12 bg-[#081019] shadow-2xl shadow-black/50">
          <div className="grid h-full grid-cols-[230px_1fr]">
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
                  <span>今日 Agent 任务</span>
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
                      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-emerald-300/40 bg-emerald-300/12 text-white"
                          : "border-white/8 bg-white/[0.025] text-slate-400 hover:border-white/16 hover:bg-white/[0.06] hover:text-slate-200"
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
                <p className="text-xs font-medium text-sky-100">演示闭环</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  素材输入 → Agent 拆解 → 语料检索 → 内容生成 → 质量评估 → 迭代建议
                </p>
              </div>
            </aside>

            <div className="flex min-h-0 flex-col">
              <header className="flex h-[74px] items-center justify-between border-b border-white/10 px-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200">
                    {featureCopy.eyebrow}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{featureCopy.title}</h2>
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
                    {isIntentLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    识别意图
                  </button>
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 text-xs text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    <span>wangzhe.asta.net.cn</span>
                  </div>
                </div>
              </header>

              <div className="grid min-h-0 flex-1 grid-cols-[330px_1fr_330px] gap-4 p-4">
                <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d1622] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={17} className="text-emerald-200" />
                      <h3 className="text-sm font-semibold">任务输入</h3>
                    </div>
                    <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-slate-400">
                      KPL 素材
                    </span>
                  </div>

                  <textarea
                    value={task}
                    onChange={(event) => setTask(event.target.value)}
                    className="mt-3 h-[168px] w-full resize-none rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60"
                  />

                  <button
                    onClick={runAgent}
                    disabled={isRunning}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
                    type="button"
                  >
                    {isRunning ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Play size={16} />
                    )}
                    {isRunning ? "Agent 执行中" : "运行内容策划 Agent"}
                  </button>
                  {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {statCards.map(([label, value, delta, Icon]) => (
                      <div
                        className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                        key={label}
                      >
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

                  <div className="mt-4 min-h-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-medium text-slate-200">意图识别结果</p>
                    {intentResult ? (
                      <div className="mt-2 space-y-2 text-xs">
                        <div className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-2">
                          <span className="text-slate-400">命中模块</span>
                          <span className="text-emerald-200">{intentResult.label}</span>
                        </div>
                        <p className="leading-5 text-slate-500">{intentResult.reason}</p>
                        <p className="leading-5 text-sky-200">
                          下一步：{intentResult.nextStep}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        在顶部输入 query，意图识别 Agent 会判断它该进入赛事内容、知识库、反馈分析还是评估流程。
                      </p>
                    )}
                  </div>
                </section>

                <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d1622] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers3 size={17} className="text-emerald-200" />
                      <h3 className="text-sm font-semibold">Agent 执行链路</h3>
                    </div>
                    <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-slate-300">
                      {completedCount}/5 steps
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">
                          {featureCopy.eyebrow}
                        </p>
                        <h4 className="mt-1 text-lg font-semibold">{featureCopy.title}</h4>
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
                          {featureCopy.body}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-emerald-100">
                        <WandSparkles size={22} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    {activeFeature === "agent" ? (
                      <div className="space-y-2">
                        {steps.map((item, index) => (
                          <div
                            key={item.id}
                            className={`rounded-xl border p-3 transition ${statusClass(item.status)}`}
                          >
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
                                  <p className="text-sm font-medium text-slate-100">
                                    {item.title}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    Tool: {item.tool}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-md bg-black/20 px-2 py-1 text-[11px]">
                                {statusLabel(item.status)}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                              <div>
                                <p className="text-[11px] text-slate-500">输入摘要</p>
                                <p className="mt-1 line-clamp-2 text-slate-300">
                                  {item.input}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] text-slate-500">输出摘要</p>
                                <p className="mt-1 line-clamp-2 text-slate-200">
                                  {item.output}
                                </p>
                              </div>
                            </div>
                            {item.score ? (
                              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                                <span>质量分 {item.score}</span>
                                <span>风险 {item.risk}</span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {activeFeature === "content" ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">KPL 比赛切片输入</p>
                            <button
                              className="rounded-lg bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-950"
                              onClick={generateSlices}
                              type="button"
                            >
                              生成切片
                            </button>
                          </div>
                          <textarea
                            value={matchLog}
                            onChange={(event) => setMatchLog(event.target.value)}
                            className="mt-3 h-32 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-5 outline-none focus:border-emerald-300/60"
                          />
                        </div>
                        <div className="grid gap-2">
                          {slices.map((item) => (
                            <div
                              className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                              key={`${item.time}-${item.title}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-sky-300/15 px-2 py-1 text-[11px] text-sky-100">
                                    {item.time}
                                  </span>
                                  <span className="rounded-md bg-emerald-300/15 px-2 py-1 text-[11px] text-emerald-100">
                                    {item.type}
                                  </span>
                                </div>
                                <span className="text-xs text-emerald-200">
                                  高光分 {item.score}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-100">{item.title}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {item.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {activeFeature === "knowledge" ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">RAG 回答</p>
                            <button
                              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200"
                              onClick={() => loadKnowledge(intentQuery)}
                              type="button"
                            >
                              {isKnowledgeLoading ? "检索中" : "重新检索"}
                            </button>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-300">
                            {knowledge?.answer || "等待知识库检索结果。"}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(knowledge?.heroes || []).slice(0, 8).map((hero) => (
                            <div
                              className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                              key={hero.id}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{hero.name}</p>
                                <span className="text-[11px] text-slate-500">{hero.role}</span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {hero.title}
                              </p>
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">
                                {hero.skills[0]?.description || "官方基础资料已同步，技能详情按 query 命中后补全。"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {activeFeature === "feedback" ? (
                      <div className="space-y-3">
                        {forumPosts.map((post) => (
                          <div
                            className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                            key={post.content}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{post.user}</p>
                              <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-slate-300">
                                {post.sentiment}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-emerald-200">{post.tag}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-300">
                              {post.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {activeFeature === "evaluation" ? (
                      <div className="grid gap-3">
                        {evaluationPipeline.map(([title, description], index) => (
                          <div
                            className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                            key={title}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-300 text-xs font-bold text-slate-950">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium">{title}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d1622] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target size={17} className="text-emerald-200" />
                      <h3 className="text-sm font-semibold">模块产出</h3>
                    </div>
                    <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400">
                      {features.find((item) => item.key === activeFeature)?.status}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-[11px] text-slate-500">发布结论</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-200">
                      {result?.report.publishable || "等待评估"}
                    </p>
                    <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-400">
                      {result?.report.summary ||
                        "运行 Agent 后，这里会展示可发布版本、验收风险和模型迭代方向。"}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {evaluationRows.map(([label, value]) => (
                      <div
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        key={label}
                      >
                        <p className="text-[11px] text-slate-500">{label}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-emerald-300"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <p className="mt-2 text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-medium">标题候选</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(result?.artifacts.titles || [
                        "关键团战转折",
                        "AI 生成后展示",
                        "KPL 级别压迫感",
                      ]).map((title) => (
                        <span
                          key={title}
                          className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-slate-300"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-medium">语料与反馈</p>
                    <div className="mt-3 grid gap-2">
                      {(activeFeature === "feedback" ? feedbackClusters : knowledgeItems).map(
                        ([name, status, tag]) => (
                          <div
                            className="flex items-center justify-between rounded-lg bg-black/18 px-3 py-2 text-xs"
                            key={name}
                          >
                            <div>
                              <p className="text-slate-200">{name}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">{tag}</p>
                            </div>
                            <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300">
                              {status}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <button
                    className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-slate-200 transition hover:bg-white/[0.08]"
                    type="button"
                  >
                    查看迭代备忘
                    <ChevronRight size={15} />
                  </button>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
