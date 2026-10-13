import { getHistoryDates } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET() {
  const dates = await getHistoryDates();
  return Response.json({ dates }, { headers: { "Cache-Control": "no-store" } });
}
