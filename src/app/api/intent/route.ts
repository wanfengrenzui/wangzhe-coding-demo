import { classifyIntent } from "@/lib/intent";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    query?: string;
  } | null;

  const query = body?.query?.trim();

  if (!query) {
    return Response.json({ error: "缺少 query" }, { status: 400 });
  }

  return Response.json(await classifyIntent(query));
}
