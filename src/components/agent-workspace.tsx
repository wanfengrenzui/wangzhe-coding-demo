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
  status: string;
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
    key: "kpl",
    label: "KPL 赛事中心",
    short: "节目 / 赛程 / 战队",
    icon: Trophy,
    status: "核心入口",
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
    key: "voice",
    label: "选手声线陪玩",
    short: "语音对话 / 局内建议",
    icon: Mic2,
    status: "概念演示",
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

const voicePresets = [
  ["发育路选手声线", "温和但决策明确，适合射手出装和团战站位提醒"],
  ["KPL 解说声线", "语速更快，强调画面感和团战节奏"],
  ["战术教练声线", "短句指令，偏复盘和临场纠错"],
];

const voiceAgentSteps = [
  ["语音识别", "把玩家语音转成 query：孙尚香现在先补破晓还是保命装？"],
  ["场景检索", "命中英雄技能、装备库、巅峰 2000+ 出装样本和 KPL 表达"],
  ["回复生成", "生成 6 秒内可播报的短句，避免长篇文字压过局内信息"],
  ["安全审核", "过滤冒充真实选手承诺、攻击性表达和不确定战术结论"],
];

const kplPrograms = [
  {
    title: "KPL 每日高光",
    tag: "节目流",
    match: "AG 超玩会 vs 狼队",
    focus: "孙尚香后期两枪收割，适合生成短视频标题和选手声线陪玩回复",
    score: 94,
  },
  {
    title: "赛后复盘室",
    tag: "复盘",
    match: "eStarPro vs WB",
    focus: "中路河道团技能链完整，适合沉淀解说语料和模型评估样本",
    score: 89,
  },
  {
    title: "选手第一视角",
    tag: "陪玩素材",
    match: "发育路专题",
    focus: "走位、补装、开麦沟通都能拆成语音陪玩知识片段",
    score: 92,
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

const kplAiActions = [
  ["智能切片", "识别团战转折、资源团、个人高光，输出 15 秒节目片段"],
  ["解说生成", "生成官方解说、主播口播、短视频标题三种版本"],
  ["语料入库", "抽取英雄、装备、战术关键词，回写英雄语料库和 KPL 表达库"],
  ["声线陪玩", "把节目里的选手决策压缩成局内 6 秒语音回复"],
  ["效果评估", "按事实准确性、KPL 专业度、沉浸感和安全合规打分"],
];

const kplVideoSources = [
  {
    title: "2019 KPL 春季赛总决赛回放",
    source: "Bilibili",
    url: "https://www.bilibili.com/video/BV1R4411V7s2/",
    scene: "完整比赛回放，适合演示长视频拆解、多局切分和赛后内容生成",
    status: "可导入",
  },
  {
    title: "总决赛发育路对位专题",
    source: "玩加电竞 / KPL 官方微博来源",
    url: "https://www.wanplus.cn/kog/video/1557654",
    scene: "发育路英雄、选手表达和出装决策，可接声线陪玩 Demo",
    status: "可导入",
  },
  {
    title: "赛中镜头：AG 反打零换三",
    source: "玩加电竞 / KPL 官方微博来源",
    url: "https://m.wanplus.cn/kog/video/1448245",
    scene: "短高光片段，适合演示自动切片、标题生成和发布审核",
    status: "高光样本",
  },
];

const videoPipeline = [
  ["导入视频 URL", "记录来源、版权备注、比赛/节目元数据，不把视频文件写入仓库"],
  ["抽帧 + OCR", "识别比分、时间、英雄头像、装备栏和团战 UI 变化"],
  ["ASR + 解说转写", "把解说语音转成文本，按英雄、战队、选手、战术标签入库"],
  ["高光检测", "融合击杀播报、经济变化、音量峰值和画面切换，产出候选切片"],
  ["内容生成", "生成短视频标题、封面文案、官方解说稿、主播口播和陪玩回复"],
  ["发布审核", "模型评估通过后进入待发布队列，保留来源链接和人工复核记录"],
];

const publishQueue = [
  ["00:08:30-00:08:47", "孙尚香两枪收割", "标题/口播已生成", "待人工复核"],
  ["00:14:02-00:14:18", "龙坑反打零换三", "解说语料已入库", "可发布"],
  ["00:21:40-00:22:05", "高地防守翻盘", "声线陪玩脚本已生成", "待评估"],
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
  if (feature === "kpl") {
    return {
      eyebrow: "KPL Hub",
      title: "KPL 赛事中心",
      body: "把节目视频、赛程和战队资料汇成赛事内容入口，AI 功能直接融入节目流：切片、生成、入库、陪玩和评估。",
    };
  }
  if (feature === "knowledge") {
    return {
      eyebrow: "Knowledge Base",
      title: "英雄语料库",
      body: "维护英雄定位、技能机制、分路打法、KPL 高频表达和易错事实，作为 Agent 的业务知识源。",
    };
  }
  if (feature === "voice") {
    return {
      eyebrow: "Voice Companion",
      title: "选手声线陪玩",
      body: "把 KPL 语料、英雄知识和局内场景压缩成短语音回复，先做语音对话 Demo，后续可接 TTS 声线和实时游戏状态。",
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
        "用事实准确性、王者专业度、赛事沉浸感、传播适配度和安全合规做加权评分，低分样本进入人工复核池。",
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
    "孙尚香在巅峰 2000 分以上的局都是做什么出装？",
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

                    {activeFeature === "kpl" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ["节目", "Videos", "节目流接 AI 切片和语料入库"],
                            ["赛程", "Schedule", "比赛前自动生成看点和任务"],
                            ["战队", "Teams", "战队风格沉淀到解说与陪玩"],
                          ].map(([name, label, desc]) => (
                            <div
                              className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                              key={name}
                            >
                              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                                {label}
                              </p>
                              <p className="mt-1 text-sm font-semibold">{name}</p>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                                {desc}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">节目流工作台</p>
                            <span className="rounded-md bg-black/20 px-2 py-1 text-[11px] text-emerald-100">
                              AI 嵌入点
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {kplPrograms.map((program) => (
                              <div
                                className="rounded-xl border border-white/10 bg-black/20 p-3"
                                key={program.title}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold">{program.title}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                      {program.match} / {program.tag}
                                    </p>
                                  </div>
                                  <span className="rounded-md bg-emerald-300 px-2 py-1 text-[11px] font-semibold text-slate-950">
                                    可用分 {program.score}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-300">
                                  {program.focus}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {["切片", "解说", "入库", "陪玩", "评估"].map((item) => (
                                    <span
                                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300"
                                      key={item}
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-sky-300/20 bg-sky-300/8 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">真实视频素材池</p>
                            <span className="rounded-md bg-black/20 px-2 py-1 text-[11px] text-sky-100">
                              外链导入
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {kplVideoSources.map((video) => (
                              <a
                                className="group rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-sky-300/40 hover:bg-sky-300/10"
                                href={video.url}
                                key={video.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-100">
                                      {video.title}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                      {video.source} / {video.status}
                                    </p>
                                  </div>
                                  <ExternalLink
                                    className="text-slate-500 group-hover:text-sky-100"
                                    size={15}
                                  />
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-300">
                                  {video.scene}
                                </p>
                              </a>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                            <div className="flex items-center gap-2">
                              <CalendarDays size={15} className="text-sky-200" />
                              <p className="text-sm font-medium">赛程看点</p>
                            </div>
                            <div className="mt-3 space-y-2">
                              {kplSchedule.map(([time, left, right, tag]) => (
                                <div
                                  className="rounded-lg bg-black/20 px-3 py-2 text-xs"
                                  key={`${time}-${left}`}
                                >
                                  <p className="text-slate-400">{time}</p>
                                  <p className="mt-1 text-slate-100">
                                    {left} vs {right}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-emerald-200">{tag}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                            <div className="flex items-center gap-2">
                              <Trophy size={15} className="text-amber-200" />
                              <p className="text-sm font-medium">战队资料</p>
                            </div>
                            <div className="mt-3 space-y-2">
                              {kplTeams.map(([team, style, count]) => (
                                <div
                                  className="rounded-lg bg-black/20 px-3 py-2 text-xs"
                                  key={team}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-slate-100">{team}</p>
                                    <span className="text-[11px] text-slate-500">{count}</span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-400">{style}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {activeFeature === "knowledge" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100"
                            href="/knowledge/heroes"
                          >
                            英雄总览
                            <p className="mt-1 text-[11px] font-normal text-slate-400">
                              全英雄图片、定位、详情页
                            </p>
                          </Link>
                          <Link
                            className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-3 text-sm font-semibold text-sky-100"
                            href="/knowledge/equipment"
                          >
                            装备总览
                            <p className="mt-1 text-[11px] font-normal text-slate-400">
                              全装备分类、价格、属性
                            </p>
                          </Link>
                        </div>
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
                        {knowledge?.rankedBuilds?.length ? (
                          <div className="grid gap-2">
                            {knowledge.rankedBuilds.slice(0, 3).map((sample) => (
                              <div
                                className="rounded-xl border border-amber-300/20 bg-amber-300/8 p-3"
                                key={`${sample.hero}-${sample.scenario}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-medium text-amber-100">
                                    {sample.segment} / {sample.scenario}
                                  </p>
                                  <span className="rounded-md bg-black/20 px-2 py-1 text-[11px] text-amber-100">
                                    置信 {sample.confidence}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-300">
                                  {sample.build.join(" → ")}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {sample.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
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
                                {hero.skills[0]?.description ||
                                  "KPL 解说语料待沉淀：记录比赛、解说、原话和适用场景，用于让 Agent 学会这个英雄在赛事里的真实表达。"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {activeFeature === "voice" ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-sky-300/20 bg-sky-300/8 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">语音对话场景</p>
                            <span className="rounded-md bg-black/20 px-2 py-1 text-[11px] text-sky-100">
                              Demo: text → voice script
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-300">
                            玩家：我孙尚香现在 9 分钟两件套，对面兰陵王一直切我，下一件先破晓还是保命？
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {voicePresets.map(([name, description]) => (
                            <div
                              className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                              key={name}
                            >
                              <Headphones size={16} className="text-emerald-200" />
                              <p className="mt-2 text-sm font-medium">{name}</p>
                              <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-slate-500">
                                {description}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
                          <div className="flex items-center gap-2 text-emerald-100">
                            <Volume2 size={16} />
                            <p className="text-sm font-medium">陪玩回复脚本</p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-100">
                            先别急着补破晓。兰陵王一直盯你，这波先做名刀小件，团战站辅助身后，等他露头再一技能拉开反打。破晓下一件补，输出不会断。
                          </p>
                          <div className="mt-3 grid gap-2">
                            {voiceAgentSteps.map(([title, description], index) => (
                              <div
                                className="flex items-start gap-3 rounded-lg bg-black/20 px-3 py-2"
                                key={title}
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-300 text-xs font-bold text-slate-950">
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="text-xs font-medium text-slate-100">{title}</p>
                                  <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                                    {description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
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
                      <div className="space-y-3">
                        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
                          <p className="text-sm font-medium">评分机制</p>
                          <p className="mt-2 text-xs leading-5 text-slate-300">
                            总分 = Σ(维度分 × 权重)。85 分以上可发布，70-84 分进入人工复核，低于 70 分禁止发布并回收为负样本。
                          </p>
                        </div>
                        <div className="grid gap-2">
                          {evaluationDimensions.map(([name, weight, score, rule]) => (
                            <div
                              className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                              key={name as string}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-100">{name}</span>
                                <span className="text-emerald-200">
                                  {score as number} × {Math.round((weight as number) * 100)}%
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-emerald-300"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                {rule}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="grid gap-2">
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

                  {activeFeature === "evaluation" ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-medium">评估样本池</p>
                      <div className="mt-2 space-y-2">
                        {evaluationSamples.map(([id, name, score, status, note]) => (
                          <div
                            className="rounded-lg bg-black/20 px-3 py-2 text-xs"
                            key={id}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-slate-100">{name}</span>
                              <span
                                className={`rounded-md px-2 py-1 text-[11px] ${
                                  status === "通过"
                                    ? "bg-emerald-300/15 text-emerald-100"
                                    : "bg-amber-300/15 text-amber-100"
                                }`}
                              >
                                {score} / {status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">
                              {note}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeFeature === "voice" ? (
                    <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-300/8 p-3">
                      <p className="text-xs font-medium text-sky-100">语音陪玩验收</p>
                      <div className="mt-2 grid gap-2 text-xs text-slate-300">
                        <p>延迟目标：单轮回复 2.5 秒内</p>
                        <p>播报长度：6-8 秒，不遮挡关键团战信息</p>
                        <p>安全边界：声线风格化，不宣称真人实时陪玩</p>
                      </div>
                    </div>
                  ) : null}

                  {activeFeature === "kpl" ? (
                    <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
                      <p className="text-xs font-medium text-emerald-100">视频处理链路</p>
                      <div className="mt-2 space-y-2">
                        {videoPipeline.map(([name, desc]) => (
                          <div className="rounded-lg bg-black/20 px-3 py-2 text-xs" key={name}>
                            <p className="font-medium text-slate-100">{name}</p>
                            <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                              {desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeFeature === "kpl" ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-medium">发布队列</p>
                      <div className="mt-2 space-y-2">
                        {publishQueue.map(([time, title, artifact, status]) => (
                          <div className="rounded-lg bg-black/20 px-3 py-2 text-xs" key={time}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-100">{title}</span>
                              <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300">
                                {status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {time} / {artifact}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

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
