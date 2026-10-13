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
  const aiCount = items.filter((item) => item.summaryKind === "ai").length;
  const sourceCount = new Set(items.map((item) => item.source)).size;
  const lead = items[0];
  const stats = [
    { label: isToday ? "今日收录" : "本期新闻", value: isToday ? latest.todayCount : items.length, unit: "条" },
    { label: "AI 摘录", value: aiCount, unit: "篇" },
    { label: "信息来源", value: sourceCount, unit: "个" },
  ];
  const heading = isToday ? "今日简报" : selectedDate === latest.date ? "最新简报" : "往期简报";
  const detailDate = history ? `?date=${selectedDate}` : "";

  return (
    <main className="site-container pb-24 pt-8 sm:pt-11">
      <section aria-labelledby="page-title" className="brief-hero border-b border-[#dce6e0] pb-9 sm:pb-11">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-medium tracking-[.08em] text-[#548271]"><span className="size-1.5 rounded-full bg-[#7eae91]" aria-hidden="true" />学有渔力 · 每日阅读</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
              <h1 id="page-title" className="text-[38px] font-semibold leading-[1.2] tracking-[-.065em] text-[#203b37] sm:text-[48px]">{heading}</h1>
              <DatePicker selectedDate={selectedDate} latestDate={latest.date} today={latest.today} availableDates={availableDates} />
            </div>
            <p className="mt-3 text-[13px] leading-[1.8] text-[#82928c]">把值得关注的消息放在一处，按自己的节奏阅读。</p>
          </div>
          <a href="#feed-title" className="inline-flex min-h-10 items-center gap-2 text-[12px] font-medium text-[#3d7564] transition-colors hover:text-[#225848] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">开始阅读 <span aria-hidden="true">↓</span></a>
        </div>

        {lead && <Link href={`/news/${lead.id}${detailDate}`} className="lead-story group mt-8 grid gap-5 rounded-[20px] border border-[#dce9e1] p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[#aac9b7] hover:shadow-[0_15px_38px_rgba(35,68,52,.07)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179] sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,.82fr)] lg:gap-10">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[#729085]"><span className="font-semibold text-[#36765e]">本期重点</span><span className="text-[#b2c3b8]">·</span>{lead.source}<span className="text-[#b2c3b8]">·</span>{lead.category}</p>
            <h2 className="mt-3 line-clamp-3 text-[23px] font-semibold leading-[1.43] tracking-[-.05em] text-[#243b37] transition-colors group-hover:text-[#296b53] sm:text-[27px]">{lead.title}</h2>
          </div>
          <div className="flex min-w-0 flex-col justify-between border-t border-[#dfe9e1] pt-4 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div><p className="text-[11px] font-semibold text-[#5c8b74]">{lead.keyPoints.length ? "关键事实" : "内容摘要"}</p><p className="mt-2 line-clamp-3 text-[13px] leading-[1.85] text-[#536c62]">{lead.keyPoints[0] || lead.summary || "打开新闻，查看详细信息与原文。"}</p></div>
            <span className="mt-4 text-[11px] font-medium text-[#4d826c]">阅读全文 <span aria-hidden="true">↗</span></span>
          </div>
        </Link>}

        <section aria-labelledby="stats-title" className="brief-metrics mt-6">
          <h2 id="stats-title" className="sr-only">简报概览</h2>
          <dl className="grid grid-cols-3 divide-x divide-[#e0e9e2]">
            {stats.map((stat, index) => <div key={stat.label} className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-6">
              <dt className="text-[11px] font-medium text-[#82978b]">{stat.label}</dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-1"><strong className="brief-metric-value text-[27px] font-semibold leading-none tracking-[-.06em] text-[#31594a] sm:text-[31px]" style={{ animationDelay: `${index * 110}ms` }}>{String(stat.value).padStart(2, "0")}</strong><span className="text-[11px] text-[#9aa9a1]">{stat.unit}</span></dd>
            </div>)}
          </dl>
        </section>
      </section>

      {isMock && <p className="data-notice mt-5">正在展示本地示例数据。将采集结果放入 <code>data/YYYY-MM-DD.json</code> 后，页面会自动读取最新数据。</p>}
      {!isMock && selectedDate === latest.date && !isToday && <p className="data-notice mt-5">今天尚无新采集记录，以下展示 {formatDate(selectedDate)} 的新闻。</p>}

      <NewsFeed key={selectedDate} items={items} date={history ? selectedDate : undefined} />

      <footer className="mt-20 flex flex-col justify-between gap-2 border-t border-[#dfe6e7] pt-6 text-[11px] text-[#8c9a9e] sm:flex-row"><span>学有渔力 News · 保持好奇，清晰阅读</span><span>摘要仅供快速浏览，请以原文为准</span></footer>
    </main>
  );
}
