"use client";

import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  CalendarDays,
  CheckCircle2,
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
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AgentRunResult, AgentStep } from "@/lib/agent-types";
import type { IntentResult } from "@/lib/intent";
import { currentKplBpMatches, type KplPick } from "@/lib/kpl-bp-data";
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

const kplBpMatches = [
  {
    id: "ag-wolves-g1-real",
    date: "2024-11-16",
    stage: "2024 KPL \u5e74\u5ea6\u603b\u51b3\u8d5b \u51b3\u8d5b",
    game: "Game 1",
    blueTeam: "\u6210\u90fd AG \u8d85\u73a9\u4f1a",
    redTeam: "\u91cd\u5e86\u72fc\u961f",
    result: "AG \u5148\u4e0b\u4e00\u57ce",
    patch: "\u516c\u5f00\u6218\u62a5\u672a\u6807\u660e\u7248\u672c",
    duration: "\u516c\u5f00\u6218\u62a5\u672a\u62ab\u9732",
    source: "\u5207\u6e38\u7f51\u6218\u62a5\u6807\u6ce8\u6765\u6e90\u4e3a\u738b\u8005\u8363\u8000\u5b98\u65b9\uff1b\u73a9\u52a0\u7535\u7ade\u8d5b\u4e8b\u9875\u786e\u8ba4 AG 4:2 \u91cd\u5e86\u72fc\u961f",
    confidence: "\u9635\u5bb9\u5df2\u67e5\u516c\u5f00\u6765\u6e90\uff1b\u9010\u624b pick \u987a\u5e8f\u9700\u901a\u8fc7\u6bd4\u8d5b\u89c6\u9891/OCR \u4e8c\u6b21\u6821\u51c6",
    status: "verified-lineup",
    bans: {
      blue: ["\u949f\u9997", "\u5f20\u826f", "\u9a6c\u8d85", "\u5927\u53f8\u547d", "\u6851\u542f"],
      red: ["\u5b59\u5c1a\u9999", "\u590f\u4faf\u60c7", "\u6768\u7389\u73af", "\u66f9\u64cd", "\u5143\u6d41\u4e4b\u5b50"],
    },
    picks: [
      { order: "AG-1", side: "blue", hero: "\u6c88\u68a6\u6eaa", lane: "\u4e2d\u8def", player: "AG", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 1 \u4f4d\uff1b\u8fdc\u7a0b\u6d88\u8017\u4e0e\u62a2\u7ebf\u80fd\u529b" },
      { order: "AG-2", side: "blue", hero: "\u516c\u5b59\u79bb", lane: "\u53d1\u80b2\u8def", player: "AG", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 2 \u4f4d\uff1b\u673a\u52a8\u5c04\u624b\u627f\u62c5\u4e3b\u8981\u8f93\u51fa" },
      { order: "AG-3", side: "blue", hero: "\u5c11\u53f8\u7f18", lane: "\u6e38\u8d70", player: "AG", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 3 \u4f4d\uff1b\u8865\u529f\u80fd\u6027\u4e0e\u4fdd\u62a4" },
      { order: "AG-4", side: "blue", hero: "\u72c2\u94c1", lane: "\u5bf9\u6297\u8def", player: "AG", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 4 \u4f4d\uff1b\u63d0\u5347\u524d\u6392\u548c\u8fb9\u8def\u5bf9\u6297\u5f3a\u5ea6" },
      { order: "AG-5", side: "blue", hero: "\u68a6\u5947", lane: "\u6253\u91ce/\u8fb9\u8def", player: "AG", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 5 \u4f4d\uff1b\u8865\u6b63\u9762\u627f\u4f24\u548c\u6301\u7eed\u8f93\u51fa" },
      { order: "WOL-1", side: "red", hero: "\u4e0d\u77e5\u706b\u821e", lane: "\u4e2d\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 1 \u4f4d\uff1b\u7206\u53d1\u8fdb\u573a\u70b9" },
      { order: "WOL-2", side: "red", hero: "\u50b2\u9690", lane: "\u53d1\u80b2\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 2 \u4f4d\uff1b\u540e\u671f\u8f93\u51fa\u6838\u5fc3" },
      { order: "WOL-3", side: "red", hero: "\u94e0", lane: "\u6253\u91ce", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 3 \u4f4d\uff1b\u5355\u70b9\u7a81\u8fdb\u4e0e\u524d\u6392\u538b\u529b" },
      { order: "WOL-4", side: "red", hero: "\u8fbe\u6469", lane: "\u5bf9\u6297\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 4 \u4f4d\uff1b\u5f00\u56e2\u548c\u5730\u5f62\u63a7\u5236" },
      { order: "WOL-5", side: "red", hero: "\u6735\u8389\u4e9a", lane: "\u6e38\u8d70", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9635\u5bb9\u5217\u8868\u7b2c 5 \u4f4d\uff1b\u5237\u65b0\u5173\u952e\u6280\u80fd\uff0c\u589e\u5f3a\u56e2\u6218\u4e0a\u9650" },
    ],
    analysis: [
      "AG \u9635\u5bb9\u540c\u65f6\u5177\u5907\u6c88\u68a6\u6eaa\u8fdc\u7a0b\u6d88\u8017\u3001\u516c\u5b59\u79bb\u673a\u52a8\u8f93\u51fa\u3001\u72c2\u94c1/\u68a6\u5947\u6b63\u9762\u5f3a\u5ea6\uff0c\u6574\u4f53\u66f4\u504f\u6301\u7eed\u538b\u8feb\u3002",
      "\u72fc\u961f\u9635\u5bb9\u6709\u4e0d\u77e5\u706b\u821e\u3001\u94e0\u3001\u8fbe\u6469\u4e09\u6bb5\u8fdb\u573a\u70b9\uff0c\u518d\u52a0\u6735\u8389\u4e9a\u5237\u65b0\u673a\u5236\uff0c\u56e2\u6218\u7206\u53d1\u4e0a\u9650\u5f88\u9ad8\u3002",
      "\u516c\u5f00\u8d44\u6599\u53ea\u63d0\u4f9b BP/\u9009\u4eba\u540d\u5355\uff0c\u672a\u7ed9\u9010\u624b\u65f6\u95f4\u7ebf\uff1b\u4ea7\u54c1\u5e94\u901a\u8fc7\u89c6\u9891 OCR/\u8d5b\u4e8b\u63a5\u53e3\u8865\u9f50 B1/R1/R2 \u7b49\u771f\u5b9e\u987a\u5e8f\u3002",
    ],
    turningPoint: "\u5df2\u77e5\u7ed3\u679c\uff1aAG \u5728\u7b2c\u4e00\u5c40\u5148\u4e0b\u4e00\u57ce\uff1b\u5b8c\u6574\u80dc\u8d1f\u624b\u9700\u7ee7\u7eed\u4ece\u6bd4\u8d5b\u89c6\u9891\u5207\u7247\u6216\u5b98\u65b9\u6218\u62a5\u7ec6\u8282\u8865\u9f50\u3002",
    tags: ["\u771f\u5b9e\u516c\u5f00\u6765\u6e90", "BP \u9635\u5bb9", "\u5f85\u6821\u51c6\u9010\u624b\u987a\u5e8f", "\u5e74\u5ea6\u603b\u51b3\u8d5b"],
    sourceLinks: [
      "https://kpl.wanplus.cn/schedule/83028.html",
      "https://www.qieyou.com/content/111084",
      "https://slide.sports.sina.com.cn/o/slide_2_730_301154.html",
    ],
  },
  {
    id: "ag-wolves-g2-report",
    date: "2024-11-16",
    stage: "2024 KPL \u5e74\u5ea6\u603b\u51b3\u8d5b \u51b3\u8d5b",
    game: "Game 2",
    blueTeam: "\u6210\u90fd AG \u8d85\u73a9\u4f1a",
    redTeam: "\u91cd\u5e86\u72fc\u961f",
    result: "AG \u518d\u4e0b\u4e00\u57ce",
    patch: "\u516c\u5f00\u6218\u62a5\u672a\u6807\u660e\u7248\u672c",
    duration: "\u516c\u5f00\u6218\u62a5\u672a\u62ab\u9732",
    source: "\u5207\u6e38\u7f51 111085 \u6218\u62a5\u63d0\u4f9b BP \u548c\u9009\u4eba\uff1b\u73a9\u52a0\u8d5b\u7a0b\u9875\u786e\u8ba4\u5206\u5c40\u80dc\u8d1f",
    confidence: "\u9635\u5bb9\u5df2\u67e5\u516c\u5f00\u6218\u62a5\uff1b\u9010\u624b pick \u987a\u5e8f\u9700\u89c6\u9891/OCR \u6821\u51c6",
    status: "verified-lineup",
    bans: {
      blue: ["\u9c81\u73ed\u5927\u5e08", "\u50b2\u9690", "\u5f20\u826f", "\u8521\u6587\u59ec", "\u949f\u9997"],
      red: ["\u5b59\u5c1a\u9999", "\u738b\u662d\u541b", "\u66f9\u64cd", "\u5c11\u53f8\u7f18", "\u5173\u7fbd"],
    },
    picks: [
      { order: "AG-1", side: "blue", hero: "\u5927\u4e54", lane: "\u6e38\u8d70", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u8f6c\u7ebf\u4f53\u7cfb\u6838\u5fc3" },
      { order: "AG-2", side: "blue", hero: "\u72c4\u4ec1\u6770", lane: "\u53d1\u80b2\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u7a33\u5b9a\u5bf9\u7ebf\u548c\u6301\u7eed\u8f93\u51fa" },
      { order: "AG-3", side: "blue", hero: "\u5143\u6d41\u4e4b\u5b50", lane: "\u6253\u91ce/\u8fb9\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u7075\u6d3b\u8865\u4f4d\u4e0e\u8282\u594f\u8865\u5f3a" },
      { order: "AG-4", side: "blue", hero: "\u590f\u6d1b\u7279", lane: "\u5bf9\u6297\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u5355\u5e26\u4e0e\u524d\u6392\u538b\u529b" },
      { order: "AG-5", side: "blue", hero: "\u5b34\u653f", lane: "\u4e2d\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u8fdc\u7a0b\u6e05\u7ebf\u4e0e\u538b\u5854" },
      { order: "WOL-1", side: "red", hero: "\u5b89\u742a\u62c9", lane: "\u4e2d\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u63a7\u5236\u7206\u53d1\u5f00\u7a97" },
      { order: "WOL-2", side: "red", hero: "\u5927\u53f8\u547d", lane: "\u6253\u91ce", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u91ce\u533a\u8282\u594f\u4e0e\u6536\u5272" },
      { order: "WOL-3", side: "red", hero: "\u4f3d\u7f57", lane: "\u53d1\u80b2\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u540e\u671f\u957f\u624b\u8f93\u51fa" },
      { order: "WOL-4", side: "red", hero: "\u5ec9\u9887", lane: "\u6e38\u8d70/\u5bf9\u6297\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u524d\u6392\u548c\u5f00\u56e2" },
      { order: "WOL-5", side: "red", hero: "\u8499\u606c", lane: "\u5bf9\u6297\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u6b63\u9762\u9635\u5730\u6218\u5f3a\u5ea6" },
    ],
    analysis: [
      "AG \u62ff\u5230\u5927\u4e54+\u72c4\u4ec1\u6770+\u5b34\u653f\uff0c\u4f53\u7cfb\u66f4\u504f\u8f6c\u7ebf\u3001\u538b\u5854\u548c\u7a33\u5b9a\u62c9\u626f\u3002",
      "\u72fc\u961f\u9635\u5bb9\u4f9d\u8d56\u5b89\u742a\u62c9\u5148\u624b\u548c\u4f3d\u7f57\u540e\u671f\u8f93\u51fa\uff0c\u9700\u8981\u524d\u6392\u7ad9\u4f4f\u6b63\u9762\u6218\u573a\u3002",
      "\u62a5\u9053\u63d0\u5230 AG \u4e2d\u540e\u6bb5\u56e2\u6218\u53d1\u529b\u7ed3\u675f\u6bd4\u8d5b\uff0c\u53ef\u4f5c\u4e3a\u8d5b\u51b5\u8bed\u6599\u5165\u5e93\u3002",
    ],
    turningPoint: "\u5207\u6e38\u6218\u62a5\u8bb0\u5f55\uff1a\u5341\u4e94\u5206\u949f AG \u53d1\u529b\u56e2\u706d\u72fc\u961f\u540e\u7ed3\u675f\u6bd4\u8d5b\u3002",
    tags: ["\u771f\u5b9e\u516c\u5f00\u6765\u6e90", "BP \u9635\u5bb9", "\u5f85\u6821\u51c6\u9010\u624b\u987a\u5e8f", "Game 2"],
    sourceLinks: [
      "https://www.wanplus.cn/schedule/86638.html",
      "https://www.qieyou.com/content/111085",
    ],
  },
  {
    id: "ag-wolves-g3-report",
    date: "2024-11-16",
    stage: "2024 KPL \u5e74\u5ea6\u603b\u51b3\u8d5b \u51b3\u8d5b",
    game: "Game 3",
    blueTeam: "\u6210\u90fd AG \u8d85\u73a9\u4f1a",
    redTeam: "\u91cd\u5e86\u72fc\u961f",
    result: "\u72fc\u961f\u6273\u56de\u4e00\u5c40",
    patch: "\u516c\u5f00\u6218\u62a5\u672a\u6807\u660e\u7248\u672c",
    duration: "\u516c\u5f00\u6218\u62a5\u672a\u62ab\u9732",
    source: "\u5207\u6e38\u7f51 111086 \u6218\u62a5\u63d0\u4f9b BP \u548c\u9009\u4eba\uff1b\u73a9\u52a0\u8d5b\u7a0b\u9875\u786e\u8ba4\u5206\u5c40\u80dc\u8d1f",
    confidence: "\u9635\u5bb9\u5df2\u67e5\u516c\u5f00\u6218\u62a5\uff1b\u9010\u624b pick \u987a\u5e8f\u9700\u89c6\u9891/OCR \u6821\u51c6",
    status: "verified-lineup",
    bans: {
      blue: ["\u9c81\u73ed\u5927\u5e08", "\u5173\u7fbd", "\u50b2\u9690", "\u590f\u6d1b\u7279", "\u72c4\u4ec1\u6770"],
      red: ["\u5b59\u5c1a\u9999", "\u5c11\u53f8\u7f18", "\u5927\u53f8\u547d", "\u955c", "\u6768\u7389\u73af"],
    },
    picks: [
      { order: "AG-1", side: "blue", hero: "\u738b\u662d\u541b", lane: "\u4e2d\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u5206\u5272\u5730\u5f62\u4e0e\u9635\u5730\u63a7\u573a" },
      { order: "AG-2", side: "blue", hero: "\u592a\u4e59\u771f\u4eba", lane: "\u6e38\u8d70", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u4fdd\u6838\u548c\u590d\u6d3b\u5bb9\u9519" },
      { order: "AG-3", side: "blue", hero: "\u6208\u5a05", lane: "\u53d1\u80b2\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u673a\u52a8\u62c9\u626f\u8f93\u51fa" },
      { order: "AG-4", side: "blue", hero: "\u9a6c\u8d85", lane: "\u5bf9\u6297\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u8fb9\u8def\u7a81\u8fdb\u4e0e\u6536\u5272" },
      { order: "AG-5", side: "blue", hero: "\u963f\u53e4\u6735", lane: "\u6253\u91ce", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u91ce\u533a\u63a7\u56fe\u548c\u63a8\u8fdb" },
      { order: "WOL-1", side: "red", hero: "\u5f20\u826f", lane: "\u4e2d\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u70b9\u63a7\u514b\u5236\u7a81\u8fdb" },
      { order: "WOL-2", side: "red", hero: "\u590f\u4faf\u60c7", lane: "\u6e38\u8d70/\u5bf9\u6297\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u524d\u6392\u4e0e\u5148\u624b\u63a7\u5236" },
      { order: "WOL-3", side: "red", hero: "\u5e72\u5c06\u83ab\u90aa", lane: "\u4e2d\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u8fdc\u7a0b poke \u548c\u538b\u8840\u7ebf" },
      { order: "WOL-4", side: "red", hero: "\u66f9\u64cd", lane: "\u5bf9\u6297\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u7eed\u822a\u8fdb\u573a\u4e0e\u6b63\u9762\u538b\u529b" },
      { order: "WOL-5", side: "red", hero: "\u674e\u5143\u82b3", lane: "\u53d1\u80b2\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u63a8\u8fdb\u548c\u7206\u53d1\u70b9\u6740" },
    ],
    analysis: [
      "AG \u9635\u5bb9\u6709\u738b\u662d\u541b\u63a7\u573a\u548c\u592a\u4e59\u4fdd\u6838\uff0c\u4f46\u9700\u8981\u6208\u5a05/\u9a6c\u8d85\u5b89\u5168\u53d1\u80b2\u5230\u4f24\u5bb3\u7a97\u53e3\u3002",
      "\u72fc\u961f\u5f20\u826f+\u5e72\u5c06\u83ab\u90aa\u7684\u4e2d\u8def\u7ec4\u5408\u63d0\u4f9b\u70b9\u63a7\u548c\u8fdc\u7a0b\u538b\u8840\uff0c\u524d\u4e2d\u671f\u80fd\u66f4\u5feb\u6253\u51fa\u8282\u594f\u3002",
      "\u62a5\u9053\u8bb0\u5f55\u72fc\u961f\u5341\u4e09\u5206\u949f\u56e2\u706d AG \u7ed3\u675f\u6bd4\u8d5b\uff0c\u662f\u672c\u5c40\u5173\u952e\u80dc\u8d1f\u624b\u3002",
    ],
    turningPoint: "\u5207\u6e38\u6218\u62a5\u8bb0\u5f55\uff1a\u5341\u4e09\u5206\u949f\u72fc\u961f\u518d\u6b21\u56e2\u706d AG\uff0c\u76f4\u63a5\u7ed3\u675f\u6bd4\u8d5b\u3002",
    tags: ["\u771f\u5b9e\u516c\u5f00\u6765\u6e90", "BP \u9635\u5bb9", "\u5f85\u6821\u51c6\u9010\u624b\u987a\u5e8f", "Game 3"],
    sourceLinks: [
      "https://www.wanplus.cn/schedule/86638.html",
      "https://www.qieyou.com/content/111086",
    ],
  },
  {
    id: "ag-wolves-g4-report",
    date: "2024-11-16",
    stage: "2024 KPL \u5e74\u5ea6\u603b\u51b3\u8d5b \u51b3\u8d5b",
    game: "Game 4",
    blueTeam: "\u6210\u90fd AG \u8d85\u73a9\u4f1a",
    redTeam: "\u91cd\u5e86\u72fc\u961f",
    result: "\u72fc\u961f\u8ffd\u5e73\u5927\u6bd4\u5206",
    patch: "\u516c\u5f00\u6218\u62a5\u672a\u6807\u660e\u7248\u672c",
    duration: "\u516c\u5f00\u6218\u62a5\u672a\u62ab\u9732",
    source: "\u5207\u6e38\u7f51 111087 \u6218\u62a5\u63d0\u4f9b BP \u548c\u9009\u4eba\uff1b\u539f\u6587\u5b58\u5728\u4e2a\u522b\u82f1\u96c4\u540d\u5b57\u7b14\u8bef\uff0c\u5df2\u6309\u738b\u8005\u82f1\u96c4\u540d\u89c4\u8303\u5316",
    confidence: "\u9635\u5bb9\u6765\u81ea\u516c\u5f00\u6218\u62a5\uff1b\u300c\u540e\u88d4\u300d\u6309\u300c\u540e\u7fbf\u300d\u3001\u300c\u5173\u4e8e\u300d\u6309\u300c\u5173\u7fbd\u300d\u6821\u6b63\uff1b\u9010\u624b\u987a\u5e8f\u5f85 OCR",
    status: "verified-lineup",
    bans: {
      blue: ["\u50b2\u9690", "\u4e0d\u77e5\u706b\u821e", "\u590f\u6d1b\u7279", "\u9a6c\u8d85", "\u5f71"],
      red: ["\u6c88\u68a6\u6eaa", "\u5e72\u5c06\u83ab\u90aa", "\u9a6c\u53ef\u6ce2\u7f57", "\u540e\u7fbf", "\u767e\u91cc\u5b88\u7ea6"],
    },
    picks: [
      { order: "AG-1", side: "blue", hero: "\u5f20\u98de", lane: "\u6e38\u8d70", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u5f00\u56e2\u548c\u4fdd\u62a4\u524d\u6392" },
      { order: "AG-2", side: "blue", hero: "\u955c", lane: "\u6253\u91ce", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u91ce\u533a\u8282\u594f\u548c\u5207\u540e" },
      { order: "AG-3", side: "blue", hero: "\u897f\u65bd", lane: "\u4e2d\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u62c9\u4eba\u5f00\u8282\u594f" },
      { order: "AG-4", side: "blue", hero: "\u674e\u5143\u82b3", lane: "\u53d1\u80b2\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u63a8\u8fdb\u4e0e\u7206\u53d1\u8f93\u51fa" },
      { order: "AG-5", side: "blue", hero: "\u4e9a\u8fde", lane: "\u5bf9\u6297\u8def", player: "AG", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u6301\u7eed\u8fdb\u573a\u548c\u5355\u70b9\u538b\u529b" },
      { order: "WOL-1", side: "red", hero: "\u9c81\u73ed\u5927\u5e08", lane: "\u6e38\u8d70", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u5f00\u56e2\u548c\u4fdd\u62a4\u6838\u5fc3" },
      { order: "WOL-2", side: "red", hero: "\u9c81\u73ed\u4e03\u53f7", lane: "\u53d1\u80b2\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u540e\u671f\u70b9\u5c04\u6838\u5fc3" },
      { order: "WOL-3", side: "red", hero: "\u5178\u97e6", lane: "\u6253\u91ce/\u5bf9\u6297\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u8fd1\u8eab\u53cd\u6253\u548c\u6536\u5272" },
      { order: "WOL-4", side: "red", hero: "\u5173\u7fbd", lane: "\u5bf9\u6297\u8def", player: "\u72fc\u961f", intent: "\u539f\u6587\u5199\u4f5c\u300c\u5173\u4e8e\u300d\uff0c\u6309\u82f1\u96c4\u540d\u89c4\u8303\u4e3a\u5173\u7fbd\uff1b\u7ed5\u540e\u5207\u5165\u548c\u63a7\u573a" },
      { order: "WOL-5", side: "red", hero: "\u6768\u7389\u73af", lane: "\u4e2d\u8def", player: "\u72fc\u961f", intent: "\u6765\u6e90\u9009\u4eba\u5217\u8868\uff1b\u56e2\u961f\u7eed\u822a\u548c\u62c9\u626f" },
    ],
    analysis: [
      "AG \u62ff\u5230\u955c+\u897f\u65bd+\u674e\u5143\u82b3\uff0c\u524d\u4e2d\u671f\u6709\u5f88\u5f3a\u7684\u627e\u4eba\u548c\u63a8\u8fdb\u80fd\u529b\u3002",
      "\u72fc\u961f\u9c81\u73ed\u5927\u5e08+\u9c81\u73ed\u4e03\u53f7\u7ec4\u5408\u4fdd\u969c\u540e\u671f\u8f93\u51fa\uff0c\u5173\u7fbd\u548c\u5178\u97e6\u63d0\u4f9b\u4fa7\u7ffc\u538b\u529b\u3002",
      "\u539f\u6587\u300c\u540e\u88d4\u300d\u300c\u5173\u4e8e\u300d\u5e94\u4e3a\u7b14\u8bef\uff0c\u5165\u5e93\u65f6\u9700\u540c\u65f6\u4fdd\u7559 raw_text \u548c normalized_hero\u3002",
    ],
    turningPoint: "\u5207\u6e38\u6218\u62a5\u8bb0\u5f55\uff1a\u5341\u516d\u5206\u949f\u540e\u72fc\u961f\u4f9d\u9760\u9c81\u73ed\u8f93\u51fa\u8fde\u7eed\u6253\u8d62\u56e2\u6218\uff0c\u4e8c\u5341\u4e00\u5206\u949f\u62ff\u4e0b\u6bd4\u8d5b\u3002",
    tags: ["\u771f\u5b9e\u516c\u5f00\u6765\u6e90", "BP \u9635\u5bb9", "\u539f\u6587\u7b14\u8bef\u5df2\u6807\u6ce8", "\u5f85\u6821\u51c6\u9010\u624b\u987a\u5e8f"],
    sourceLinks: [
      "https://www.wanplus.cn/schedule/86638.html",
      "https://www.qieyou.com/content/111087",
    ],
  },
  {
    id: "future-import-placeholder",
    date: "TBD",
    stage: "KPL Match DB",
    game: "Import Slot",
    blueTeam: "Blue Side",
    redTeam: "Red Side",
    result: "Pending",
    patch: "Pending",
    duration: "Pending",
    source: "Waiting for KPL video/OCR/report import.",
    confidence: "Placeholder; not a real match fact.",
    status: "placeholder",
    bans: { blue: ["TBD"], red: ["TBD"] },
    picks: [],
    analysis: ["After importing a real match, this panel will show BP, roster tags, turning points and RAG fields."],
    turningPoint: "Pending video import.",
    tags: ["pending", "video OCR", "ASR report"],
    sourceLinks: [],
  },
];

const legacyKplBpMatches = [
  {
    id: "2026-spring-wolves-ag-g1",
    date: "2026-03-21",
    stage: "2026 KPL 春季赛常规赛",
    game: "Game 1",
    blueTeam: "重庆狼队",
    redTeam: "成都 AG 超玩会",
    result: "狼队先下一城",
    patch: "公开帖未标明版本",
    duration: "公开帖未披露",
    source: "虎扑赛后帖整理 2026 KPL 春季赛常规赛狼队 3:0 AG，正文列出三局 Ban/Pick。",
    confidence: "2026 公开赛后帖可确认阵容级 BP；逐手 pick 顺序仍需比赛视频/OCR 校准。",
    status: "verified-lineup",
    bans: {
      blue: ["影", "鲁班大师", "海月", "元流之子（坦克）", "杨玉环"],
      red: ["曹操", "少司缘", "张飞", "阿古朵", "嫦娥"],
    },
    picks: [
      { order: "WOL-1", side: "blue", hero: "马超", lane: "对抗路", player: "狼队", intent: "来源 Pick 列表第 1 位；边路机动突进与收割。" },
      { order: "WOL-2", side: "blue", hero: "西施", lane: "中路", player: "狼队", intent: "来源 Pick 列表第 2 位；拉人开节奏，配合边野找机会。" },
      { order: "WOL-3", side: "blue", hero: "夏侯惇", lane: "打野/前排", player: "狼队", intent: "来源 Pick 列表第 3 位；前排控制和野区对抗。" },
      { order: "WOL-4", side: "blue", hero: "莱西奥", lane: "发育路", player: "狼队", intent: "来源 Pick 列表第 4 位；团战持续输出和高地处理。" },
      { order: "WOL-5", side: "blue", hero: "朵莉亚", lane: "游走", player: "狼队", intent: "来源 Pick 列表第 5 位；刷新关键技能，提高团战上限。" },
      { order: "AG-1", side: "red", hero: "达摩", lane: "对抗路", player: "AG", intent: "来源 Pick 列表第 1 位；地形开团和侧翼威胁。" },
      { order: "AG-2", side: "red", hero: "梦奇", lane: "打野/边路", player: "AG", intent: "来源 Pick 列表第 2 位；正面承伤与持续输出。" },
      { order: "AG-3", side: "red", hero: "王昭君", lane: "中路", player: "AG", intent: "来源 Pick 列表第 3 位；阵地控制和守区能力。" },
      { order: "AG-4", side: "red", hero: "公孙离", lane: "发育路", player: "AG", intent: "来源 Pick 列表第 4 位；机动输出和拉扯。" },
      { order: "AG-5", side: "red", hero: "太乙真人", lane: "游走", player: "AG", intent: "来源 Pick 列表第 5 位；保核复活和经济加速。" },
    ],
    analysis: [
      "狼队首局拿到马超、西施、夏侯惇的主动找人组合，侧翼和中路控制都有先手窗口。",
      "AG 使用公孙离+太乙真人保核，同时用王昭君守阵地，团战更依赖拉扯和反打。",
      "公开来源只有最终 Ban/Pick 集合，不能直接视作真实 B1/R1/R2 顺序。",
    ],
    turningPoint: "公开帖赛况记录：狼队首局击败 AG，作为 3:0 系列赛开局。",
    tags: ["2026 KPL", "春季赛常规赛", "阵容级 BP", "待校准逐手顺序"],
    sourceLinks: ["https://bbs.hupu.com/638025067.html"],
  },
  {
    id: "2026-spring-wolves-ag-g2",
    date: "2026-03-21",
    stage: "2026 KPL 春季赛常规赛",
    game: "Game 2",
    blueTeam: "成都 AG 超玩会",
    redTeam: "重庆狼队",
    result: "狼队再下一城",
    patch: "公开帖未标明版本",
    duration: "公开帖未披露",
    source: "虎扑赛后帖整理 2026 KPL 春季赛常规赛狼队 3:0 AG，正文列出三局 Ban/Pick。",
    confidence: "2026 公开赛后帖可确认阵容级 BP；逐手 pick 顺序仍需比赛视频/OCR 校准。",
    status: "verified-lineup",
    bans: {
      blue: ["孙尚香", "鲁班大师", "裴擒虎", "露娜", "杨玉环"],
      red: ["影", "少司缘", "元流之子（坦克）", "牛魔", "张飞"],
    },
    picks: [
      { order: "AG-1", side: "blue", hero: "达摩", lane: "对抗路", player: "AG", intent: "来源 Pick 列表第 1 位；开团与地形控制。" },
      { order: "AG-2", side: "blue", hero: "镜", lane: "打野", player: "AG", intent: "来源 Pick 列表第 2 位；野区节奏和切后排。" },
      { order: "AG-3", side: "blue", hero: "王昭君", lane: "中路", player: "AG", intent: "来源 Pick 列表第 3 位；阵地分割和守区。" },
      { order: "AG-4", side: "blue", hero: "敖隐", lane: "发育路", player: "AG", intent: "来源 Pick 列表第 4 位；后期输出核心。" },
      { order: "AG-5", side: "blue", hero: "朵莉亚", lane: "游走", player: "AG", intent: "来源 Pick 列表第 5 位；刷新关键技能，增强团战容错。" },
      { order: "WOL-1", side: "red", hero: "马超", lane: "对抗路", player: "狼队", intent: "来源 Pick 列表第 1 位；边路突破和收割。" },
      { order: "WOL-2", side: "red", hero: "大司命", lane: "打野", player: "狼队", intent: "来源 Pick 列表第 2 位；野区节奏和团战切入。" },
      { order: "WOL-3", side: "red", hero: "安琪拉", lane: "中路", player: "狼队", intent: "来源 Pick 列表第 3 位；控制爆发和草丛威胁。" },
      { order: "WOL-4", side: "red", hero: "公孙离", lane: "发育路", player: "狼队", intent: "来源 Pick 列表第 4 位；机动输出和拉扯。" },
      { order: "WOL-5", side: "red", hero: "苏烈", lane: "游走", player: "狼队", intent: "来源 Pick 列表第 5 位；强开团和正面前排。" },
    ],
    analysis: [
      "AG 二局选择镜+敖隐+朵莉亚，后期上限不低，但需要稳定拖到关键装备窗口。",
      "狼队马超、大司命、公孙离三点机动性很强，能持续撕扯 AG 的阵地站位。",
      "苏烈提供稳定开团，安琪拉补爆发控制，狼队阵容更偏主动进攻。",
    ],
    turningPoint: "公开帖记录第二局狼队击败 AG，将大比分扩大到 2:0。",
    tags: ["2026 KPL", "春季赛常规赛", "阵容级 BP", "待校准逐手顺序"],
    sourceLinks: ["https://bbs.hupu.com/638025067.html"],
  },
  {
    id: "2026-spring-wolves-ag-g3",
    date: "2026-03-21",
    stage: "2026 KPL 春季赛常规赛",
    game: "Game 3",
    blueTeam: "成都 AG 超玩会",
    redTeam: "重庆狼队",
    result: "狼队 3:0 取胜",
    patch: "公开帖未标明版本",
    duration: "公开帖未披露",
    source: "虎扑赛后帖整理 2026 KPL 春季赛常规赛狼队 3:0 AG，正文列出三局 Ban/Pick。",
    confidence: "2026 公开赛后帖可确认阵容级 BP；逐手 pick 顺序仍需比赛视频/OCR 校准。新英雄/冷门字形保留原文写法。",
    status: "verified-lineup",
    bans: {
      blue: ["影", "大司命", "大乔", "阿古朵", "杨玉环"],
      red: ["孙尚香", "少司缘", "裴擒虎", "鲁班大师", "梦奇"],
    },
    picks: [
      { order: "AG-1", side: "blue", hero: "蚩奼", lane: "对抗路", player: "AG", intent: "来源 Pick 列表第 1 位；保留公开帖原文写法，需后续对照官方英雄库。" },
      { order: "AG-2", side: "blue", hero: "露娜", lane: "打野", player: "AG", intent: "来源 Pick 列表第 2 位；野区节奏和持续进场。" },
      { order: "AG-3", side: "blue", hero: "王昭君", lane: "中路", player: "AG", intent: "来源 Pick 列表第 3 位；控场和阵地防守。" },
      { order: "AG-4", side: "blue", hero: "敖隐", lane: "发育路", player: "AG", intent: "来源 Pick 列表第 4 位；后期输出核心。" },
      { order: "AG-5", side: "blue", hero: "朵莉亚", lane: "游走", player: "AG", intent: "来源 Pick 列表第 5 位；刷新关键技能，提高核心容错。" },
      { order: "WOL-1", side: "red", hero: "达摩", lane: "对抗路", player: "狼队", intent: "来源 Pick 列表第 1 位；侧翼开团和地形控制。" },
      { order: "WOL-2", side: "red", hero: "镜", lane: "打野", player: "狼队", intent: "来源 Pick 列表第 2 位；野区节奏和切后排。" },
      { order: "WOL-3", side: "red", hero: "海月", lane: "中路", player: "狼队", intent: "来源 Pick 列表第 3 位；单点限制和团战拆分。" },
      { order: "WOL-4", side: "red", hero: "公孙离", lane: "发育路", player: "狼队", intent: "来源 Pick 列表第 4 位；机动射手承担输出。" },
      { order: "WOL-5", side: "red", hero: "元流之子（坦克）", lane: "游走/前排", player: "狼队", intent: "来源 Pick 列表第 5 位；前排承伤和阵型保护。" },
    ],
    analysis: [
      "AG 三局继续围绕敖隐+朵莉亚建立后期核心，但前中期需要露娜稳定发育和进场空间。",
      "狼队使用镜、公孙离双机动点，海月负责拆关键人，阵容对 AG 核心威胁更直接。",
      "该局英雄「蚩奼」保留来源原文，后续应与 2026 官方英雄列表做规范化校验。",
    ],
    turningPoint: "公开帖记录第三局狼队取胜，最终以 3:0 击败成都 AG 超玩会。",
    tags: ["2026 KPL", "春季赛常规赛", "阵容级 BP", "英雄名待规范化"],
    sourceLinks: ["https://bbs.hupu.com/638025067.html"],
  },
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
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("kpl");
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

            {activeFeature === "kpl" ? <KplBpModule /> : null}

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
  const [expandedStepIds, setExpandedStepIds] = useState<string[]>([]);

  function toggleStep(stepId: string) {
    setExpandedStepIds((current) =>
      current.includes(stepId)
        ? current.filter((item) => item !== stepId)
        : [...current, stepId],
    );
  }

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
          {steps.map((item, index) => {
            const isExpanded = expandedStepIds.includes(item.id);

            return (
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
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="rounded-md border border-white/10 bg-black/15 px-2 py-1 text-[11px] text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
                    onClick={() => toggleStep(item.id)}
                    type="button"
                  >
                    {isExpanded ? "收起" : "展开"}
                  </button>
                  <span className="rounded-md bg-black/20 px-2 py-1 text-[11px]">
                    {statusLabel(item.status)}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                <div>
                  <p className="text-[11px] text-slate-500">输入摘要</p>
                  <p className={`mt-1 whitespace-pre-wrap leading-5 text-slate-300 ${isExpanded ? "" : "line-clamp-2"}`}>
                    {item.input}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">输出摘要</p>
                  <p className={`mt-1 whitespace-pre-wrap leading-5 text-slate-200 ${isExpanded ? "" : "line-clamp-2"}`}>
                    {item.output}
                  </p>
                </div>
              </div>
            </div>
            );
          })}
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

function KplBpModule() {
  const [selectedMatchId, setSelectedMatchId] = useState(currentKplBpMatches[0].id);
  const selectedMatch =
    currentKplBpMatches.find((match) => match.id === selectedMatchId) || currentKplBpMatches[0];
  const bluePicks = selectedMatch.picks.filter((pick) => pick.side === "blue");
  const redPicks = selectedMatch.picks.filter((pick) => pick.side === "red");
  const totalGames = currentKplBpMatches.length;
  const totalTeams = new Set(currentKplBpMatches.flatMap((match) => [match.blueTeam, match.redTeam])).size;
  const pickRows = Array.from({ length: Math.max(bluePicks.length, redPicks.length, 5) }, (_, index) => ({
    blue: bluePicks[index],
    red: redPicks[index],
  }));

  return (
    <div className="mx-auto w-full max-w-[1540px] rounded-2xl border border-white/10 bg-[#081019] p-4">
      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[300px_minmax(560px,1fr)_360px]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d1622] p-4">
          <div className="border-b border-white/10 pb-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200">KPL Database</p>
            <h3 className="mt-1 text-lg font-semibold">2026 BP 样本库</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              已录入 {totalGames} 局，覆盖 {totalTeams} 支战队；用于常选英雄、选手英雄池和蓝红方响应聚类。
            </p>
          </div>

          <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {currentKplBpMatches.map((match) => (
              <button
                className={
                  "w-full rounded-xl border p-3 text-left transition " +
                  (selectedMatch.id === match.id
                    ? "border-emerald-300/50 bg-emerald-300/10"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20")
                }
                key={match.id}
                onClick={() => setSelectedMatchId(match.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{match.game}</p>
                  <span className="rounded-md bg-black/20 px-2 py-1 text-[10px] text-slate-300">
                    {match.status === "verified-lineup" ? "已验证" : "待导入"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">
                  {match.blueTeam} vs {match.redTeam}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{match.date}</p>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold text-slate-200">聚类字段</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-slate-400">
              {["match_id", "team", "side", "ban", "pick", "player", "hero", "lane", "source", "confidence"].map((field) => (
                <span className="rounded-md bg-white/[0.04] px-2 py-1" key={field}>{field}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d1622] p-4">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200">16:9 Draft Board</p>
              <h3 className="mt-1 break-words text-xl font-semibold leading-7">{selectedMatch.blueTeam} vs {selectedMatch.redTeam}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {selectedMatch.stage} / {selectedMatch.result}
              </p>
            </div>
            <span className="max-w-[320px] rounded-md bg-white/[0.06] px-3 py-1.5 text-right text-xs leading-5 text-slate-300">
              {selectedMatch.confidence}
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-sky-300/20 bg-sky-300/8 p-3">
              <div className="flex items-center justify-between">
                <p className="min-w-0 break-words text-sm font-semibold text-sky-100">{selectedMatch.blueTeam} Ban</p>
                <span className="shrink-0 text-[11px] text-slate-500">蓝色方</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedMatch.bans.blue.map((hero) => (
                  <span className="rounded-md border border-sky-300/20 px-2 py-1 text-[11px]" key={hero}>{hero}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-rose-300/20 bg-rose-300/8 p-3">
              <div className="flex items-center justify-between">
                <p className="min-w-0 break-words text-sm font-semibold text-rose-100">{selectedMatch.redTeam} Ban</p>
                <span className="shrink-0 text-[11px] text-slate-500">红色方</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedMatch.bans.red.map((hero) => (
                  <span className="rounded-md border border-rose-300/20 px-2 py-1 text-[11px]" key={hero}>{hero}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid min-h-0 flex-1 grid-rows-5 gap-2">
            {pickRows.map(({ blue, red }, index) => (
              <div className="grid min-h-0 grid-cols-[1fr_56px_1fr] items-stretch gap-2" key={index}>
                <PickCell pick={blue} side="blue" fallback={selectedMatch.blueTeam + " " + (index + 1)} />
                <div className="flex items-center justify-center rounded-xl border border-white/10 bg-black/20 text-xs font-semibold text-slate-400">
                  P{index + 1}
                </div>
                <PickCell pick={red} side="red" fallback={selectedMatch.redTeam + " " + (index + 1)} />
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d1622] p-4">
          <h3 className="text-lg font-semibold">选手英雄映射</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniRoster title={selectedMatch.blueTeam} picks={bluePicks} tone="blue" />
            <MiniRoster title={selectedMatch.redTeam} picks={redPicks} tone="red" />
          </div>

          <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
            <p className="text-sm font-semibold text-emerald-100">来源与可信度</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{selectedMatch.source}</p>
            <p className="mt-2 text-[11px] leading-5 text-amber-100">{selectedMatch.confidence}</p>
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {selectedMatch.analysis.map((item) => (
              <p className="rounded-lg bg-black/20 p-2 text-xs leading-5 text-slate-300" key={item}>{item}</p>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs text-slate-500">赛果 / 标签</p>
            <p className="mt-2 text-xs leading-5 text-slate-200">{selectedMatch.turningPoint}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedMatch.tags.map((tag) => (
                <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-emerald-100" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PickCell({
  fallback,
  pick,
  side,
}: {
  fallback: string;
  pick?: KplPick;
  side: "blue" | "red";
}) {
  const isBlue = side === "blue";

  return (
    <div className={"min-h-[94px] rounded-xl border p-2 " + (isBlue ? "border-sky-300/25 bg-sky-300/8" : "border-rose-300/25 bg-rose-300/8")}>
      <div className="flex items-center justify-between gap-2">
        <span className={"shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold " + (isBlue ? "bg-sky-300 text-slate-950" : "bg-rose-300 text-slate-950")}>
          {pick?.order || fallback}
        </span>
        <span className="min-w-0 truncate text-[10px] text-slate-500">{pick?.lane || "待导入"}</span>
      </div>
      <p className="mt-1 break-words text-sm font-semibold leading-5">
        {pick ? `${pick.player} / ${pick.hero}` : "待导入"}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">
        {pick?.intent || "等待视频 OCR 或公开战报导入"}
      </p>
    </div>
  );
}

function MiniRoster({
  picks,
  title,
  tone,
}: {
  picks: KplPick[];
  title: string;
  tone: "blue" | "red";
}) {
  return (
    <div className={"rounded-xl border p-3 " + (tone === "blue" ? "border-sky-300/20 bg-sky-300/8" : "border-rose-300/20 bg-rose-300/8")}>
      <p className="break-words text-xs font-semibold leading-5 text-slate-200">{title}</p>
      <div className="mt-2 max-h-[190px] space-y-1.5 overflow-y-auto pr-1">
        {picks.length ? picks.map((pick) => (
          <div className="grid grid-cols-[48px_1fr] gap-2 rounded-md bg-black/20 px-2 py-1.5 text-[11px]" key={pick.order}>
            <span className="text-slate-500">{pick.lane}</span>
            <strong className="min-w-0 break-words text-right">{pick.player} / {pick.hero}</strong>
          </div>
        )) : <p className="text-[11px] text-slate-500">待导入</p>}
      </div>
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [queuedItems, setQueuedItems] = useState(publishQueue);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const selectedSlice = slices[selectedIndex] || slices[0];
  const generatedTitle = selectedSlice
    ? `等一个${selectedSlice.type}，比赛节奏直接变天`
    : "等待候选切片";
  const generatedScript = selectedSlice
    ? `这一波发生在 ${selectedSlice.time}。${selectedSlice.title}。从画面看，关键点不是单个击杀，而是技能链和站位同时打开，适合剪成 15 秒高光。`
    : "点击生成候选切片后，这里会自动生成解说口播。";

  function addSelectedSliceToQueue() {
    if (!selectedSlice) return;
    const [minute = "00", second = "00"] = selectedSlice.time.split(":");
    const endSecond = Number(second) + 15;
    const range = `00:${minute.padStart(2, "0")}:${second.padStart(2, "0")}-00:${minute.padStart(2, "0")}:${String(endSecond).padStart(2, "0")}`;
    const nextItem = [
      range,
      selectedSlice.title,
      regenerateCount > 0 ? `标题/口播已重新生成 ${regenerateCount} 次` : "标题/口播已生成",
      "待人工复核",
    ];
    setQueuedItems((current) => [
      nextItem,
      ...current.filter((item) => item[0] !== range),
    ]);
  }

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
        <div className="mt-3 flex gap-2">
          <button
            className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
            onClick={() => {
              generateSlices();
              setSelectedIndex(0);
              setRegenerateCount(0);
            }}
            type="button"
          >
            生成候选切片
          </button>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200"
            onClick={() => setMatchLog(defaultMatchLog)}
            type="button"
          >
            重置转写
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {[
            ["1", "视频转写", matchLog.trim() ? "已导入" : "等待"],
            ["2", "候选切片", slices.length ? `${slices.length} 条` : "待生成"],
            ["3", "标题口播", selectedSlice ? "已生成" : "等待"],
            ["4", "发布队列", `${queuedItems.length} 条`],
          ].map(([step, label, status]) => (
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2" key={label}>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{step}. {label}</span>
                <span className="text-emerald-200">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">切片结果</h3>
        <div className="mt-4 grid gap-3">
          {slices.map((item, index) => (
            <button
              className={`rounded-xl border p-3 text-left transition ${
                selectedIndex === index
                  ? "border-emerald-300/50 bg-emerald-300/10"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20"
              }`}
              key={`${item.time}-${item.title}`}
              onClick={() => {
                setSelectedIndex(index);
                setRegenerateCount(0);
              }}
              type="button"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-sky-300/15 px-2 py-1 text-xs text-sky-100">{item.time}</span>
                  <span className="rounded-md bg-emerald-300/15 px-2 py-1 text-xs text-emerald-100">{item.type}</span>
                </div>
                <span className="text-xs text-emerald-200">高光分 {item.score}</span>
              </div>
              <p className="mt-2 text-sm">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <h3 className="text-lg font-semibold">生成与发布</h3>
        <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
          <p className="text-xs text-slate-500">短视频标题</p>
          <p className="mt-2 text-sm font-semibold text-emerald-100">{generatedTitle}</p>
          <p className="mt-3 text-xs text-slate-500">解说口播</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{generatedScript}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <button
              className="rounded-lg bg-emerald-300 px-2 py-2 font-semibold text-slate-950 disabled:opacity-60"
              disabled={!selectedSlice}
              onClick={addSelectedSliceToQueue}
              type="button"
            >
              加入发布队列
            </button>
            <button
              className="rounded-lg border border-white/10 px-2 py-2 text-slate-200"
              onClick={() => setRegenerateCount((count) => count + 1)}
              type="button"
            >
              重新生成
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {queuedItems.map(([time, title, artifact, status]) => (
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
  const [voicePreset, setVoicePreset] = useState(voicePresets[0][0]);
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
    utterance.rate =
      voicePreset === "KPL 解说声线" ? 1.18 : voicePreset === "战术教练声线" ? 1.02 : 1.08;
    utterance.pitch =
      voicePreset === "KPL 解说声线" ? 1.08 : voicePreset === "战术教练声线" ? 0.86 : 0.94;
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

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">演示视频</p>
              <p className="mt-1 text-xs text-slate-500">语音输入、意图识别、知识检索与陪玩播报链路</p>
            </div>
            <span className="rounded-md bg-emerald-300/15 px-2 py-1 text-xs text-emerald-100">
              16:9 Demo
            </span>
          </div>
          <video
            className="aspect-video w-full bg-black object-cover"
            controls
            muted
            playsInline
            preload="metadata"
            src="/voice-companion-demo.mp4"
          />
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
            <button
              className={`rounded-xl border p-3 text-left transition ${
                voicePreset === name
                  ? "border-emerald-300/50 bg-emerald-300/10"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20"
              }`}
              key={name}
              onClick={() => setVoicePreset(name)}
              type="button"
            >
              <Headphones size={16} className="text-emerald-200" />
              <p className="mt-2 font-semibold">{name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </button>
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
  const [posts, setPosts] = useState(
    feedbackPosts.map(([user, tag, content, sentiment], index) => ({
      id: index + 1,
      user,
      tag,
      content,
      sentiment,
      likes: [24, 18, 31, 16][index] || 8,
      replies: [6, 4, 9, 3][index] || 1,
    })),
  );
  const [activeTag, setActiveTag] = useState("全部");
  const [draft, setDraft] = useState("希望视频切片能自动标出胜负手，比如谁先开团、谁打满输出。");
  const filteredPosts =
    activeTag === "全部" ? posts : posts.filter((post) => post.tag === activeTag);
  const tags = ["全部", ...Array.from(new Set(posts.map((post) => post.tag)))];

  function publishPost() {
    const content = draft.trim();
    if (!content) return;
    const sentiment = /希望|想|能不能|需要/.test(content) ? "需求" : "讨论";
    setPosts((current) => [
      {
        id: Date.now(),
        user: "Demo 用户",
        tag: activeTag === "全部" ? "节目剪辑" : activeTag,
        content,
        sentiment,
        likes: 0,
        replies: 0,
      },
      ...current,
    ]);
    setDraft("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1622] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">玩家论坛</h3>
          <div className="flex gap-2">
            {tags.map((tag) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  activeTag === tag
                    ? "bg-emerald-300 text-slate-950"
                    : "border border-white/10 text-slate-300"
                }`}
                key={tag}
                onClick={() => setActiveTag(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <textarea
            className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/25 p-3 text-sm leading-6 outline-none focus:border-emerald-300/60"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="发布一条玩家反馈..."
            value={draft}
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">套用论坛壳：发帖、筛选、点赞、回复数、情绪标签</p>
            <button
              className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
              onClick={publishPost}
              type="button"
            >
              发布反馈
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {filteredPosts.map((post) => (
            <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4" key={post.id}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{post.user}</p>
                <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs">{post.sentiment}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-200">{post.tag}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{post.content}</p>
              <div className="mt-3 flex gap-2 text-xs text-slate-400">
                <button
                  className="rounded-md border border-white/10 px-2 py-1 hover:text-emerald-100"
                  onClick={() =>
                    setPosts((current) =>
                      current.map((item) =>
                        item.id === post.id ? { ...item, likes: item.likes + 1 } : item,
                      ),
                    )
                  }
                  type="button"
                >
                  赞 {post.likes}
                </button>
                <span className="rounded-md border border-white/10 px-2 py-1">回复 {post.replies}</span>
              </div>
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
