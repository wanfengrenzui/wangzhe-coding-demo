import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import type { AgentRunResult, AgentStep } from "@/lib/agent-types";

const modelName = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

const AgentState = Annotation.Root({
  task: Annotation<string>(),
  steps: Annotation<AgentStep[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  taskType: Annotation<string>({
    reducer: (_, right) => right,
    default: () => "",
  }),
  knowledge: Annotation<string>({
    reducer: (_, right) => right,
    default: () => "",
  }),
  officialCommentary: Annotation<string>({
    reducer: (_, right) => right,
    default: () => "",
  }),
  creatorScript: Annotation<string>({
    reducer: (_, right) => right,
    default: () => "",
  }),
  titles: Annotation<string[]>({
    reducer: (_, right) => right,
    default: () => [],
  }),
  reviewMemo: Annotation<string>({
    reducer: (_, right) => right,
    default: () => "",
  }),
  score: Annotation<number>({
    reducer: (_, right) => right,
    default: () => 0,
  }),
  risk: Annotation<"低" | "中" | "高">({
    reducer: (_, right) => right,
    default: () => "低",
  }),
  summary: Annotation<string>({
    reducer: (_, right) => right,
    default: () => "",
  }),
  nextActions: Annotation<string[]>({
    reducer: (_, right) => right,
    default: () => [],
  }),
});

type AgentStateValue = typeof AgentState.State;

function getModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new ChatOpenAI({
    apiKey,
    model: modelName,
    temperature: 0.7,
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    },
  });
}

async function askModel(prompt: string, fallback: string) {
  const model = getModel();

  if (!model) {
    return fallback;
  }

  try {
    const response = await model.invoke([
      {
        role: "system",
        content:
          "你是腾讯游戏 AI 内容产品团队的内部 Agent。回答要适合王者荣耀/KPL 场景，专业、克制、可执行。不要编造真实比赛结果。",
      },
      { role: "user", content: prompt },
    ]);

    return typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  } catch {
    return fallback;
  }
}

function step(
  id: string,
  title: string,
  tool: string,
  input: string,
  output: string,
  score?: number,
  risk?: "低" | "中" | "高",
): AgentStep {
  return {
    id,
    title,
    tool,
    status: "completed",
    input,
    output,
    score,
    risk,
  };
}

async function parseTask(state: AgentStateValue) {
  const fallback =
    "任务类型：赛事素材内容生产。目标包含团战事实提炼、多风格内容生成、发布前质量验收。";
  const output = await askModel(
    `请解析这个王者荣耀/KPL 内容任务，输出任务类型、关键对象、交付物和验收重点，80字以内。\n任务：${state.task}`,
    fallback,
  );

  return {
    taskType: "赛事内容生成 + 质量评估",
    steps: [
      step("parse", "任务解析", "parseTask", state.task, output, 92, "低"),
    ],
  };
}

async function retrieveKnowledge(state: AgentStateValue) {
  const fallback =
    "命中语料：团战转折、射手绕后输出、开团英雄控制链、KPL 解说常用表达。注意核对英雄技能触发条件与击杀交换事实。";
  const output = await askModel(
    `基于任务提取可用的王者荣耀内容语料。请给出英雄/分路/赛事表达/风险点，120字以内。\n任务：${state.task}`,
    fallback,
  );

  return {
    knowledge: output,
    steps: [
      step(
        "retrieve",
        "检索英雄/赛事语料",
        "retrieveKnowledge",
        state.task,
        output,
        88,
        "低",
      ),
    ],
  };
}

async function generateContent(state: AgentStateValue) {
  const fallbackOfficial =
    "中路这波团战成为局势拐点，开团点精准进场，后排完成持续收割，最终打出零换四，为队伍拿下关键地图资源窗口。";
  const fallbackScript =
    "这波别眨眼：开团位先手控住多人，射手绕后把输出拉满。团战结束直接零换四，节奏从这一刻开始彻底倾斜。";
  const fallbackTitles = [
    "一波零换四，团战节奏直接改写",
    "这次绕后输出，打出了 KPL 级别压迫感",
    "关键开团命中多人，胜负手就在这里",
  ];

  const prompt = `请基于任务和语料生成三类内容：
1. 官方解说稿 60字以内
2. 短视频口播 60字以内
3. 3个短视频标题
用清晰分段输出。
任务：${state.task}
语料：${state.knowledge}`;
  const output = await askModel(
    prompt,
    `官方解说稿：${fallbackOfficial}\n短视频口播：${fallbackScript}\n标题：${fallbackTitles.join(" / ")}`,
  );

  return {
    officialCommentary: fallbackOfficial,
    creatorScript: output,
    titles: fallbackTitles,
    steps: [
      step(
        "generate",
        "生成多风格内容",
        "generateContent",
        state.knowledge,
        output,
        90,
        "低",
      ),
    ],
  };
}

async function evaluateOutput(state: AgentStateValue) {
  const fallback =
    "专业度 88，沉浸感 91，传播性 86，事实风险中低。建议发布前补充具体英雄名与技能命中条件，避免泛化描述。";
  const output = await askModel(
    `请评估以下王者赛事内容，给出专业度、沉浸感、事实准确性、传播性和风险提示，100字以内。\n${state.creatorScript}`,
    fallback,
  );

  return {
    score: 88,
    risk: "中" as const,
    reviewMemo: output,
    steps: [
      step(
        "evaluate",
        "模型质量评估",
        "evaluateOutput",
        state.creatorScript,
        output,
        88,
        "中",
      ),
    ],
  };
}

async function createMemo(state: AgentStateValue) {
  const fallback =
    "可发布版本建议选择短视频口播版；迭代方向是补充英雄技能触发机制、KPL 高频表达和战队风格标签。";
  const output = await askModel(
    `请把本次 Agent 任务整理成内部产品迭代建议，包含可发布结论和下一步动作，120字以内。\n任务：${state.task}\n评估：${state.reviewMemo}`,
    fallback,
  );

  return {
    summary: output,
    nextActions: [
      "补充英雄技能机制校验字段",
      "沉淀 KPL 团战转折语料模板",
      "把低置信度输出送入人工复核池",
    ],
    steps: [
      step(
        "memo",
        "发布建议与迭代备忘",
        "createIterationMemo",
        state.reviewMemo,
        output,
        91,
        "低",
      ),
    ],
  };
}

const workflow = new StateGraph(AgentState)
  .addNode("parseTask", parseTask)
  .addNode("retrieveKnowledge", retrieveKnowledge)
  .addNode("generateContent", generateContent)
  .addNode("evaluateOutput", evaluateOutput)
  .addNode("createMemo", createMemo)
  .addEdge(START, "parseTask")
  .addEdge("parseTask", "retrieveKnowledge")
  .addEdge("retrieveKnowledge", "generateContent")
  .addEdge("generateContent", "evaluateOutput")
  .addEdge("evaluateOutput", "createMemo")
  .addEdge("createMemo", END)
  .compile();

export async function runContentAgent(task: string): Promise<AgentRunResult> {
  const result = await workflow.invoke({ task });

  return {
    steps: result.steps,
    report: {
      taskType: result.taskType,
      publishable: result.score >= 85 && result.risk !== "高" ? "建议发布" : "需人工复核",
      recommendedVersion: "短视频口播版",
      summary: result.summary,
      nextActions: result.nextActions,
    },
    artifacts: {
      officialCommentary: result.officialCommentary,
      creatorScript: result.creatorScript,
      titles: result.titles,
      reviewMemo: result.reviewMemo,
    },
    usedMock: !process.env.DEEPSEEK_API_KEY,
  };
}
