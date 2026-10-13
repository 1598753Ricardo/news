import type { Metadata } from "next";
import Link from "next/link";

import { NewsFeed } from "@/components/news-feed";
import { formatDate } from "@/lib/format";
import { getHistoryDates, getHistorySnapshot } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "历史简报",
  description: "按日期回看已生成的新闻摘要。",
};

type Props = { searchParams: Promise<{ date?: string | string[] }> };

export default async function HistoryPage({ searchParams }: Props) {
  const dates = await getHistoryDates();
  const requestedDate = (await searchParams).date;
  const selectedDate = typeof requestedDate === "string" ? requestedDate : dates[0];
  const snapshot = selectedDate ? await getHistorySnapshot(selectedDate) : null;
  const aiCount = snapshot?.items.filter((item) => item.summaryKind === "ai").length ?? 0;

  return (
    <main className="site-container pb-24 pt-8 sm:pt-10">
      <nav aria-label="面包屑导航" className="mb-6 flex items-center gap-2 text-[12px] text-[#8b9a9d]">
        <Link href="/" className="rounded-sm transition-colors hover:text-[#347770] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">首页</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#526c70]">历史简报</span>
      </nav>

      <header className="rounded-[26px] border border-[#dfe8e6] bg-white px-6 py-8 shadow-[0_12px_40px_rgba(30,55,50,.035)] sm:px-10 sm:py-10">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[.17em] text-[#4f8a83]"><span className="size-2 rounded-full bg-[#67a99c]" aria-hidden="true" /> ARCHIVE / 历史简报</p>
        <div className="mt-5 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-[34px] font-semibold leading-[1.25] tracking-[-.06em] text-[#23343c] sm:text-[43px]">把重要信息，<span className="text-[#5d9d94]">留给以后。</span></h1>
            <p className="mt-3 text-[13px] leading-[1.8] text-[#74878a]">按日期回看已生成的新闻摘要，接着读昨天关心的事。</p>
          </div>
          <div className="flex shrink-0 gap-6 border-t border-[#e9efed] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div><p className="text-[11px] text-[#8b9b9d]">可浏览日期</p><p className="mt-1 text-[25px] font-semibold tabular-nums tracking-[-.06em] text-[#29454a]">{String(dates.length).padStart(2, "0")}</p></div>
            <div><p className="text-[11px] text-[#8b9b9d]">当日摘要</p><p className="mt-1 text-[25px] font-semibold tabular-nums tracking-[-.06em] text-[#29454a]">{String(aiCount).padStart(2, "0")}</p></div>
          </div>
        </div>
      </header>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
        <aside aria-labelledby="date-list-title" className="rounded-[20px] border border-[#e3eae8] bg-white p-4 sm:p-5 lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between gap-3 border-b border-[#ebf0ee] pb-4">
            <h2 id="date-list-title" className="text-[13px] font-semibold text-[#314b50]">选择日期</h2>
            <span className="text-[11px] text-[#9aabaa]">{dates.length} 期</span>
          </div>
          {dates.length ? <nav aria-label="历史简报日期" className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:max-h-[65vh] lg:grid-cols-1 lg:overflow-y-auto">
            {dates.map((date, index) => <Link key={date} href={`/history?date=${date}`} aria-current={date === selectedDate ? "page" : undefined} className={`flex min-h-11 items-center justify-between gap-1 rounded-xl px-3 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] ${date === selectedDate ? "bg-[#e6f2ef] text-[#276c63]" : "text-[#697e80] hover:bg-[#f2f7f5] hover:text-[#347770]"}`}>
              <span>{formatDate(date)}</span>{index === 0 && <span className="hidden text-[10px] text-[#70a79e] sm:inline">最新</span>}
            </Link>)}
          </nav> : <p className="py-6 text-[12px] leading-6 text-[#899a9b]">暂时没有已生成的历史摘要。</p>}
        </aside>

        <div className="min-w-0">
          {snapshot ? <>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e1e9e7] pb-5">
              <div><p className="text-[11px] font-semibold tracking-[.16em] text-[#5a9189]">SELECTED BRIEF</p><h2 className="mt-2 text-[25px] font-semibold tracking-[-.05em] text-[#23343c] sm:text-[29px]"><time dateTime={snapshot.date}>{formatDate(snapshot.date)}</time></h2></div>
              <span className="text-[12px] text-[#849598]">{snapshot.items.length} 条新闻 · {aiCount} 条 AI 原文摘录</span>
            </div>
            <NewsFeed key={snapshot.date} date={snapshot.date} items={snapshot.items} showSearch={false} />
          </> : <div className="rounded-[20px] border border-dashed border-[#d4e2df] bg-white px-6 py-16 text-center">
            <p className="text-[16px] font-medium text-[#34494d]">{dates.length ? "该日期没有可用的历史简报" : "还没有历史简报"}</p>
            <p className="mt-2 text-[13px] leading-6 text-[#849598]">{dates.length ? "请从左侧选择一个已有日期。" : "生成新闻摘要后，日期会自动出现在这里。"}</p>
          </div>}
        </div>
      </div>
    </main>
  );
}
