import { getKnowledge } from "@/lib/knowledge";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    query?: string;
  } | null;

  return Response.json(await getKnowledge(body?.query || ""));
}
