import { getHistorySnapshot } from "@/lib/news";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { date } = await params;
  const snapshot = await getHistorySnapshot(date);
  if (!snapshot) return Response.json({ error: "该日期没有可用的历史简报" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
