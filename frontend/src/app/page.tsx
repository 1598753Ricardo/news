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
    <main className="site-container pb-20 pt-6 sm:pt-8">
      <section aria-labelledby="page-title" className="editorial-hero">
        <div className="hero-masthead">
          <span className="hero-masthead__brand">学有渔力 <span>NEWS</span></span>
          <span className="hero-masthead__rule" aria-hidden="true" />
          <span>每日新闻简报</span>
        </div>

        <div className="hero-grid">
          <div className="hero-intro">
            <p className="hero-kicker">把重要的，留给阅读。</p>
            <h1 id="page-title" className="hero-title">{heading}<span aria-hidden="true">。</span></h1>
            <p className="hero-description">从纷繁消息中提取值得关注的内容，<br className="hidden sm:block" />在这里，按自己的节奏读完今天。</p>
            <div className="hero-date"><DatePicker selectedDate={selectedDate} latestDate={latest.date} today={latest.today} availableDates={availableDates} /></div>
            <div className="hero-count"><span className="hero-count__line" aria-hidden="true" />{isToday ? "今日收录" : "本期收录"} <strong>{newsCount}</strong> 条新闻</div>
          </div>

          {lead && <article className="hero-feature">
            <div className="hero-feature__top"><span>本期重点</span><span className="hero-feature__mark" aria-hidden="true">↗</span></div>
            <div className="hero-feature__body">
              <p className="hero-feature__meta">{lead.category} <span aria-hidden="true">/</span> {lead.source}</p>
              <h2 className="hero-feature__title"><Link href={`/news/${lead.id}${detailDate}`}>{lead.title}</Link></h2>
              <p className="hero-feature__summary">{lead.summary || "打开新闻，查看详细信息与原文。"}</p>
            </div>
            <Link href={`/news/${lead.id}${detailDate}`} className="hero-feature__link">阅读重点新闻 <span aria-hidden="true">→</span></Link>
          </article>}
        </div>
        <div className="hero-bottom"><span>新闻有脉络，阅读有余地。</span><a href="#feed-title">进入新闻列表 <span aria-hidden="true">↓</span></a></div>
      </section>

      {isMock && <p className="data-notice mt-5">正在展示本地示例数据。将采集结果放入 <code>data/YYYY-MM-DD.json</code> 后，页面会自动读取最新数据。</p>}
      {!isMock && selectedDate === latest.date && !isToday && <p className="data-notice mt-5">今天尚无新采集记录，以下展示 {formatDate(selectedDate)} 的新闻。</p>}

      <NewsFeed key={selectedDate} items={items} date={history ? selectedDate : undefined} />

      <footer className="site-footer"><span>学有渔力 News <span aria-hidden="true">/</span> 保持好奇，清晰阅读</span><span>摘要仅供快速浏览，请以原文为准</span></footer>
    </main>
  );
}
