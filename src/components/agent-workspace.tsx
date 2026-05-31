"use client";

import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  Loader2,
  MessageSquareText,
  Play,
  RadioTower,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AgentRunResult, AgentStep } from "@/lib/agent-types";

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

const navItems: Array<[string, LucideIcon, boolean]> = [
  ["Agent 任务中心", Sparkles, true],
  ["赛事内容生成", MessageSquareText, false],
  ["英雄语料库", BookOpenText, false],
  ["反馈分析", BarChart3, false],
  ["模型评估", ClipboardCheck, false],
];

function statusClass(status: AgentStep["status"]) {
  if (status === "completed") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (status === "running") return "border-cyan-400/40 bg-cyan-400/10 text-cyan-100";
  if (status === "failed") return "border-rose-400/40 bg-rose-400/10 text-rose-100";
  return "border-white/10 bg-white/[0.04] text-slate-400";
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

  const completedCount = useMemo(
    () => steps.filter((item) => item.status === "completed").length,
    [steps],
  );

  async function runAgent() {
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
              if (stepIndex === index + 1) return { ...stepItem, status: "running" };
              return stepItem;
            }),
          );
        }, index * 460);
      });

      window.setTimeout(() => {
        setSteps(data.steps);
        setIsRunning(false);
      }, data.steps.length * 460 + 200);
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
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0b1118] p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
              <Bot size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-400">KingAI Ops</p>
              <h1 className="text-base font-semibold">峡谷 AI 内容工作台</h1>
            </div>
          </div>

          <nav className="mt-8 space-y-1 text-sm">
            {navItems.map(([label, Icon, active]) => (
              <div
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                }`}
                key={String(label)}
              >
                <Icon size={17} />
                <span>{label}</span>
              </div>
            ))}
          </nav>

          <div className="mt-8 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-xs text-emerald-200">当前演示链路</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              素材输入 → Agent 拆解 → 语料检索 → 内容生成 → 质量评估 → 迭代建议
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#0b1118]/80 px-5 py-4 backdrop-blur md:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
                Controlled Agent Workflow
              </p>
              <h2 className="mt-1 text-xl font-semibold md:text-2xl">
                王者荣耀 AI 内容生产与验收
              </h2>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 md:flex">
              <Activity size={16} className="text-emerald-300" />
              wangzhe.asta.net.cn
            </div>
          </header>

          <div className="grid gap-4 p-5 md:grid-cols-4 md:p-8">
            {statCards.map(([label, value, delta, Icon]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
              >
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>{String(label)}</span>
                  <Icon size={17} className="text-emerald-300" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <strong className="text-2xl">{String(value)}</strong>
                  <span className="text-sm text-emerald-300">{String(delta)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid flex-1 gap-5 px-5 pb-8 md:px-8 xl:grid-cols-[1.1fr_1.35fr_0.9fr]">
            <section className="rounded-lg border border-white/10 bg-[#0d141d] p-5">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-300" />
                <h3 className="font-semibold">任务输入</h3>
              </div>
              <textarea
                value={task}
                onChange={(event) => setTask(event.target.value)}
                className="mt-4 h-56 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-100 outline-none transition focus:border-emerald-300/60"
              />
              <button
                onClick={runAgent}
                disabled={isRunning}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRunning ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
                {isRunning ? "Agent 执行中" : "运行内容策划 Agent"}
              </button>
              {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

              <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-medium">语料命中预览</p>
                <div className="mt-3 space-y-3">
                  {knowledgeItems.map(([name, status, tag]) => (
                    <div className="flex items-center justify-between text-sm" key={name}>
                      <div>
                        <p className="text-slate-200">{name}</p>
                        <p className="text-xs text-slate-500">{tag}</p>
                      </div>
                      <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#0d141d] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-300" />
                  <h3 className="font-semibold">Agent 执行链路</h3>
                </div>
                <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-slate-300">
                  {completedCount}/5 steps
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {steps.map((item, index) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition ${statusClass(item.status)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/25 text-xs font-semibold">
                          {item.status === "running" ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : item.status === "completed" ? (
                            <CheckCircle2 size={15} />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-100">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-400">Tool: {item.tool}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-black/20 px-2 py-1 text-xs">
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">输入摘要</p>
                        <p className="mt-1 line-clamp-3 text-slate-300">{item.input}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">输出摘要</p>
                        <p className="mt-1 line-clamp-4 text-slate-200">{item.output}</p>
                      </div>
                    </div>
                    {item.score ? (
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-300">
                        <span>质量分 {item.score}</span>
                        <span>风险 {item.risk}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#0d141d] p-5">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-emerald-300" />
                <h3 className="font-semibold">输出验收</h3>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">发布结论</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">
                  {result?.report.publishable || "等待评估"}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {result?.report.summary ||
                    "运行 Agent 后，这里会展示可发布版本、验收风险和模型迭代方向。"}
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-medium">内容产物</p>
                <div className="mt-3 space-y-3 text-sm text-slate-300">
                  <div>
                    <p className="text-xs text-slate-500">推荐版本</p>
                    <p className="mt-1">{result?.report.recommendedVersion || "短视频口播版"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">标题候选</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(result?.artifacts.titles || ["关键团战转折", "AI 生成后展示"]).map(
                        (title) => (
                          <span
                            key={title}
                            className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs"
                          >
                            {title}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-medium">下一步动作</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {(result?.report.nextActions || [
                    "等待 Agent 生成迭代建议",
                    "补充人工验收标准",
                    "沉淀可复用语料标签",
                  ]).map((item) => (
                    <li className="flex gap-2" key={item}>
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {result?.usedMock ? (
                <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                  当前未读取到 DEEPSEEK_API_KEY，线上会先展示 mock 链路。配置环境变量后即可接入 DeepSeek。
                </p>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
