export type AgentStepStatus = "waiting" | "running" | "completed" | "failed";

export type AgentStep = {
  id: string;
  title: string;
  tool: string;
  status: AgentStepStatus;
  input: string;
  output: string;
  score?: number;
  risk?: "低" | "中" | "高";
};

export type AgentReport = {
  taskType: string;
  publishable: string;
  recommendedVersion: string;
  summary: string;
  nextActions: string[];
};

export type AgentRunResult = {
  steps: AgentStep[];
  report: AgentReport;
  artifacts: {
    officialCommentary: string;
    creatorScript: string;
    titles: string[];
    reviewMemo: string;
  };
  usedMock: boolean;
};
