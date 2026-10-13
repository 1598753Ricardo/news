import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ date?: string | string[] }> };

export default async function HistoryPage({ searchParams }: Props) {
  const date = (await searchParams).date;
  redirect(typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `/?date=${date}` : "/");
}
