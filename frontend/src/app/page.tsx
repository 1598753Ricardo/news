import Link from "next/link";

import { NewsFeed } from "@/components/news-feed";
import { formatDate } from "@/lib/format";
import { getNewsSnapshot } from "@/lib/news";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getNewsSnapshot();
  const isToday = snapshot.date === snapshot.today && !snapshot.isMock;
  const items = snapshot.items;
  const aiCount = items.filter((item) => item.summaryKind === "ai").length;
  const sourceCount = new Set(items.map((item) => item.source)).size;
  const lead = items[0];
  const stats = [
    { label: isToday ? "今日收录" : "当前简报", value: isToday ? snapshot.todayCount : items.length, unit: "条新闻" },
    { label: "AI 原文摘录", value: aiCount, unit: "篇内容" },
    { label: "信息来源", value: sourceCount, unit: "个来源" },
  ];

  return (
    <main className="site-container pb-24 pt-7 sm:pt-10">
      <section aria-labelledby="page-title" className="brief-hero relative overflow-hidden rounded-[28px] px-6 pb-7 pt-7 text-white sm:px-10 sm:pb-9 sm:pt-9 lg:px-12 lg:pb-11 lg:pt-11">
        <div className="brief-orbit" aria-hidden="true" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[.18em] text-[#b8ccdd]">
            <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/25 text-[15px] text-[#bde2e2]" aria-hidden="true">✦</span>
            DAILY INTELLIGENCE <span className="font-normal text-white/35">/</span> 每日简报
          </div>
          <time dateTime={snapshot.date} className="rounded-full border border-white/20 bg-white/[.06] px-3 py-1.5 text-[11px] font-medium tracking-wide text-[#d8e5ee]">{formatDate(snapshot.date)}</time>
        </div>

        <div className="relative z-10 grid gap-9 pt-11 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.72fr)] lg:items-end lg:gap-12 lg:pt-14">
          <div>
            <p className="mb-4 flex items-center gap-2.5 text-[12px] font-medium tracking-[.12em] text-[#a6c7d3]"><span className="size-1.5 rounded-full bg-[#8dd9cd] shadow-[0_0_0_4px_rgba(141,217,205,.12)]" aria-hidden="true" /> 今日情报 · {isToday ? "实时更新" : "最近一期"}</p>
            <h1 id="page-title" className="max-w-[640px] text-[38px] font-semibold leading-[1.22] tracking-[-.065em] sm:text-[52px] lg:text-[58px]">看见今天，<br /><span className="text-[#b6d5d8]">读懂重点。</span></h1>
            <p className="mt-6 max-w-[470px] text-[14px] leading-[1.9] text-[#b8c7d3] sm:text-[15px]">从分散的新闻里提取有价值的信息。快速浏览 AI 原文摘录，再按自己的节奏深入阅读。</p>
            <a href="#feed-title" className="mt-8 inline-flex min-h-11 items-center gap-3 rounded-xl bg-white px-5 text-[13px] font-semibold text-[#1d303e] shadow-[0_10px_26px_rgba(2,12,23,.18)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#edf7f5] hover:shadow-[0_15px_30px_rgba(2,12,23,.24)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">进入今日简报 <span aria-hidden="true">↗</span></a>
          </div>

          {lead && <Link href={`/news/${lead.id}`} className="lead-story group block rounded-[20px] border border-white/20 bg-white/[.07] p-5 backdrop-blur-sm transition-[background-color,border-color,transform] duration-300 hover:-translate-y-1 hover:border-white/40 hover:bg-white/[.12] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-6">
            <div className="flex items-center justify-between gap-4 text-[10px] font-semibold tracking-[.15em] text-[#a9cbd3]"><span>FROM THE BRIEF</span><span className="flex size-8 items-center justify-center rounded-full border border-white/25 text-[15px] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">↗</span></div>
            <p className="mt-5 text-[11px] font-medium text-[#c8d9e3]">{lead.source} <span className="mx-1.5 text-white/35">·</span> {lead.category}</p>
            <h2 className="mt-3 line-clamp-3 text-[18px] font-semibold leading-[1.55] tracking-[-.035em] text-white sm:text-[20px]">{lead.title}</h2>
            <p className="mt-4 line-clamp-2 text-[12px] leading-[1.8] text-[#aec2d0]">{lead.summary || "打开新闻，查看详细信息与原文。"}</p>
            <span className="mt-6 inline-flex items-center gap-2 border-t border-white/15 pt-4 text-[11px] font-medium text-[#d7e7eb]">阅读这条新闻 <span aria-hidden="true">→</span></span>
          </Link>}
        </div>
      </section>

      <section aria-labelledby="stats-title" className="overview-panel mt-5 rounded-[22px] border border-[#e4e9ea] bg-white px-6 py-5 shadow-[0_10px_36px_rgba(30,52,60,.035)] sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5"><span className="size-2 rounded-full bg-[#5a9e99]" aria-hidden="true" /><h2 id="stats-title" className="text-[12px] font-semibold tracking-[.07em] text-[#354553]">数据概览</h2></div>
          <span className="text-[11px] text-[#89979d]">{isToday ? "截至当前 · 北京时间" : `简报日期 · ${formatDate(snapshot.date)}`}</span>
        </div>
        <dl className="mt-5 grid grid-cols-3 divide-x divide-[#e8edee] border-t border-[#e8edee] pt-5">
          {stats.map((stat) => <div key={stat.label} className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-8">
            <dt className="text-[11px] font-medium text-[#849198]">{stat.label}</dt>
            <dd className="mt-2 flex flex-wrap items-baseline gap-x-2"><strong className="text-[28px] font-semibold leading-none tracking-[-.07em] text-[#243843] sm:text-[34px]">{String(stat.value).padStart(2, "0")}</strong><span className="hidden text-[11px] text-[#9aa7aa] sm:inline">{stat.unit}</span></dd>
          </div>)}
        </dl>
      </section>

      {snapshot.isMock && <p className="data-notice mt-5">正在展示本地示例数据。将采集结果放入 <code>data/YYYY-MM-DD.json</code> 后，页面会自动读取最新数据。</p>}
      {!snapshot.isMock && !isToday && <p className="data-notice mt-5">今天尚无新采集记录，以下展示 {formatDate(snapshot.date)} 的新闻。</p>}

      <NewsFeed items={items} />

      <footer className="mt-20 flex flex-col justify-between gap-2 border-t border-[#dfe6e7] pt-6 text-[11px] text-[#8c9a9e] sm:flex-row"><span>学有渔力 News · 保持好奇，清晰阅读</span><span>摘要仅供快速浏览，请以原文为准</span></footer>
    </main>
  );
}
