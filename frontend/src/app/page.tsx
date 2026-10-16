import Link from "next/link";

import { DatePicker } from "@/components/date-picker";
import { NewsFeed } from "@/components/news-feed";
import { formatDate } from "@/lib/format";
import { getHistoryDates, getHistorySnapshot, getNewsSnapshot } from "@/lib/news";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ date?: string | string[] }> };

export default async function HomePage({ searchParams }: Props) {
  const [latest, historyDates, query] = await Promise.all([getNewsSnapshot(), getHistoryDates(), searchParams]);
  const requestedDate = typeof query.date === "string" && historyDates.includes(query.date) ? query.date : undefined;
  const history = requestedDate && (requestedDate !== latest.date || latest.isMock) ? await getHistorySnapshot(requestedDate) : null;
  const selectedDate = history?.date ?? latest.date;
  const items = history?.items ?? latest.items;
  const isMock = latest.isMock && !history;
  const isToday = selectedDate === latest.today && !isMock;
  const availableDates = [...new Set([...historyDates, ...(!latest.isMock ? [latest.date] : [])])].sort().reverse();
  const lead = items.find((item) => item.summary) ?? items[0];
  const newsCount = isToday ? latest.todayCount : items.length;
  const heading = isToday ? "今日简报" : selectedDate === latest.date ? "最新简报" : "往期简报";
  const detailDate = history ? `?date=${selectedDate}` : "";

  return (
    <main className="site-container pb-24 pt-9 sm:pt-10">
      <section aria-labelledby="page-title" className="border-b border-[#dedfda] pb-8 sm:pb-9">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <p className="text-[12px] tracking-[.04em] text-[#757a75]">学有渔力 · 每日阅读</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
              <h1 id="page-title" className="text-[40px] font-semibold leading-[1.2] tracking-[-.06em] text-[#25332e] sm:text-[50px]">{heading}</h1>
              <DatePicker selectedDate={selectedDate} latestDate={latest.date} today={latest.today} availableDates={availableDates} />
            </div>
            <p className="mt-4 text-[14px] leading-[1.8] text-[#69736d]">把值得关注的消息放在一处，按自己的节奏阅读。</p>
          </div>
          <p className="pb-1 text-[12px] text-[#858b83]">{isToday ? "今日收录" : "本期收录"} {newsCount} 条新闻</p>
        </div>

        {lead && <div className="mt-7 grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-8">
          <p className="pt-1 text-[12px] font-medium text-[#527365]">本期重点</p>
          <div className="max-w-[760px]">
            <h2 className="text-[23px] font-semibold leading-[1.5] tracking-[-.035em] text-[#26362f] sm:text-[27px]"><Link href={`/news/${lead.id}${detailDate}`} className="transition-colors hover:text-[#286858] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">{lead.title}</Link></h2>
            <p className="mt-3 line-clamp-2 text-[14px] leading-[1.8] text-[#6d7670]">{lead.summary || "打开新闻，查看详细信息与原文。"}</p>
            <Link href={`/news/${lead.id}${detailDate}`} className="mt-3 inline-flex min-h-8 items-center text-[12px] font-medium text-[#356d59] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]">阅读这条新闻 <span className="ml-1" aria-hidden="true">↗</span></Link>
          </div>
        </div>}
      </section>

      {isMock && <p className="data-notice mt-5">正在展示本地示例数据。将采集结果放入 <code>data/YYYY-MM-DD.json</code> 后，页面会自动读取最新数据。</p>}
      {!isMock && selectedDate === latest.date && !isToday && <p className="data-notice mt-5">今天尚无新采集记录，以下展示 {formatDate(selectedDate)} 的新闻。</p>}

      <NewsFeed key={selectedDate} items={items} date={history ? selectedDate : undefined} />

      <footer className="mt-20 flex flex-col justify-between gap-2 border-t border-[#dfe6e7] pt-6 text-[11px] text-[#8c9a9e] sm:flex-row"><span>学有渔力 News · 保持好奇，清晰阅读</span><span>摘要仅供快速浏览，请以原文为准</span></footer>
    </main>
  );
}
