import { ChatOpenAI } from "@langchain/openai";

export type IntentKey =
  | "agent"
  | "content"
  | "knowledge"
  | "feedback"
  | "evaluation";

export type IntentResult = {
  intent: IntentKey;
  label: string;
  confidence: number;
  reason: string;
  nextStep: string;
};

const labels: Record<IntentKey, string> = {
  agent: "Agent 任务中心",
  content: "赛事内容生成",
  knowledge: "英雄语料库",
  feedback: "玩家反馈分析",
  evaluation: "模型效果评估",
};

const nextSteps: Record<IntentKey, string> = {
  agent: "拆解任务并调用完整工作流",
  content: "进入赛事切片与内容生成流程",
  knowledge: "检索英雄技能、装备和版本问答知识",
  feedback: "进入玩家论坛反馈聚类与需求沉淀",
  evaluation: "进入模型输出验收与评分流程",
};

function heuristicIntent(query: string): IntentResult {
  const text = query.toLowerCase();
  let intent: IntentKey = "agent";
  let confidence = 0.72;
  let reason = "该 query 更像一个综合任务，适合交给 Agent 工作流拆解。";

  if (
    /比赛|kpl|团战|解说|切片|高光|复盘|口播|标题|ag|狼队|estar|ttg|hero/i.test(
      query,
    )
  ) {
    intent = "content";
    confidence = 0.9;
    reason = "命中赛事、团战、解说或切片关键词，属于赛事内容生产意图。";
  }

  if (
    /英雄|技能|装备|出装|铭文|克制|孙尚香|达摩|廉颇|小乔|李白|鲁班|射手|打野|中路/i.test(
      query,
    )
  ) {
    intent = "knowledge";
    confidence = 0.92;
    reason = "命中英雄、技能、装备或出装关键词，属于游戏知识库问答意图。";
  }

  if (/反馈|吐槽|论坛|玩家|评论|版本|削弱|增强|体验|情绪|社区/i.test(query)) {
    intent = "feedback";
    confidence = 0.88;
    reason = "命中玩家反馈、版本体验或社区评论关键词，适合做反馈聚类。";
  }

  if (/评估|验收|打分|准确性|幻觉|质量|通过率|人工复核|风险/i.test(query)) {
    intent = "evaluation";
    confidence = 0.87;
    reason = "命中质量验收、评分或风险关键词，属于模型效果评估意图。";
  }

  return {
    intent,
    label: labels[intent],
    confidence,
    reason,
    nextStep: nextSteps[intent],
  };
}

function getModel() {
  if (!process.env.DEEPSEEK_API_KEY) return null;

  return new ChatOpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    temperature: 0,
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    },
  });
}

export async function classifyIntent(query: string): Promise<IntentResult> {
  const fallback = heuristicIntent(query);
  const model = getModel();

  if (fallback.intent !== "agent" && fallback.confidence >= 0.9) {
    return fallback;
  }

  if (!model) return fallback;

  try {
    const response = await model.invoke([
      {
        role: "system",
        content:
          "你是王者荣耀内部 AI 工作台的意图识别 Agent。只能从 agent、content、knowledge、feedback、evaluation 中选择一个 intent。请严格输出 JSON。",
      },
      {
        role: "user",
        content: `query: ${query}\n输出 JSON 字段：intent,label,confidence,reason,nextStep。`,
      },
    ]);
    const raw =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    const jsonText = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonText) as Partial<IntentResult>;

    if (
      parsed.intent &&
      ["agent", "content", "knowledge", "feedback", "evaluation"].includes(
        parsed.intent,
      )
    ) {
      return {
        intent: parsed.intent,
        label: labels[parsed.intent],
        confidence: Number(parsed.confidence || fallback.confidence),
        reason: parsed.reason || fallback.reason,
        nextStep: parsed.nextStep || nextSteps[parsed.intent],
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}
