import { runContentAgent } from "@/lib/agent-workflow";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    task?: string;
  } | null;

  const task = body?.task?.trim();

  if (!task) {
    return Response.json({ error: "缺少任务内容" }, { status: 400 });
  }

  const result = await runContentAgent(task);

  return Response.json(result);
}
