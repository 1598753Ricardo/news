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
      <section aria-labelledby="page-title" className="brief-hero relative isolate overflow-hidden rounded-[30px] px-6 pb-7 pt-6 text-white sm:px-10 sm:pb-9 sm:pt-8 lg:px-12">
        <div className="brief-orbit" aria-hidden="true" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
          <div className="flex items-center gap-3">
            <span className="brief-brand-mark flex size-10 items-center justify-center rounded-[13px] border border-white/20" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 6h10M4 11h15M4 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="17.5" cy="17" r="2.5" fill="currentColor" /></svg>
            </span>
            <div><p className="text-[11px] font-semibold tracking-[.16em] text-[#e4eeec]">学有渔力 <span className="text-[#9fc8c2]">/</span> NEWS INTELLIGENCE</p><p className="mt-1 text-[10px] font-medium tracking-[.16em] text-[#8fb7b4]">DAILY SIGNAL · 清晰阅读</p></div>
          </div>
          <Link href={snapshot.isMock ? "/history" : `/history?date=${snapshot.date}`} className="inline-flex min-h-10 items-center gap-3 rounded-full border border-white/25 bg-white/[.09] px-4 text-[11px] font-medium tracking-wide text-[#e4f1ee] transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-[#b8d7d0]/70 hover:bg-white/[.16] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" aria-label={`查看历史日期，当前简报 ${formatDate(snapshot.date)}`}>
            <time dateTime={snapshot.date}>{formatDate(snapshot.date)}</time><span className="h-3 w-px bg-white/25" aria-hidden="true" /><span>切换日期 <span aria-hidden="true">↗</span></span>
          </Link>
        </div>

        <div className="relative z-10 grid gap-10 pb-10 pt-11 lg:grid-cols-[minmax(0,1.06fr)_minmax(330px,.94fr)] lg:items-center lg:gap-14 lg:pb-14 lg:pt-14">
          <div>
            <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold tracking-[.18em] text-[#a8d1ca]"><span className="size-1.5 rounded-full bg-[#a7decf] shadow-[0_0_0_5px_rgba(167,222,207,.12)]" aria-hidden="true" /> TODAY’S INTELLIGENCE <span className="font-normal tracking-normal text-[#86a8aa]">/ {isToday ? "实时更新" : "最近一期"}</span></p>
            <h1 id="page-title" className="text-[43px] font-semibold leading-[1.17] tracking-[-.075em] sm:text-[60px] lg:text-[66px]">看见今天，<br /><span className="brief-title-accent">读懂重点。</span></h1>
            <p className="mt-6 max-w-[485px] text-[14px] leading-[1.9] text-[#a9c4c0] sm:text-[15px]">从分散的新闻里提取有价值的信息。快速浏览 AI 原文摘录，再按自己的节奏深入阅读。</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a href="#feed-title" className="inline-flex min-h-11 items-center gap-4 rounded-xl bg-[#e8f3ef] px-5 text-[13px] font-semibold text-[#183b3e] shadow-[0_10px_28px_rgba(2,12,23,.18)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_34px_rgba(2,12,23,.25)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">进入今日简报 <span aria-hidden="true">↗</span></a>
              <Link href="/history" className="inline-flex min-h-10 items-center gap-2 text-[12px] font-medium tracking-[.04em] text-[#b5d6d0] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">按日期浏览历史简报 <span aria-hidden="true">→</span></Link>
            </div>
          </div>

          {lead && <Link href={`/news/${lead.id}`} className="lead-story group block rounded-[22px] border border-white/20 p-6 backdrop-blur-sm transition-[background-color,border-color,transform] duration-300 hover:-translate-y-1 hover:border-[#b8d7d0]/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2.5 text-[10px] font-semibold tracking-[.17em] text-[#b4d4cf]"><span className="size-1.5 rounded-full bg-[#b8e7da]" aria-hidden="true" /> {isToday ? "TODAY’S FOCUS" : "ISSUE FOCUS"} <span className="font-normal tracking-normal text-[#9dbaba]">/ {isToday ? "今日重点" : "本期重点"}</span></span>
              <span className="flex size-9 items-center justify-center rounded-full border border-white/25 text-[16px] text-[#e9f3f0] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">↗</span>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#9fbcb8]"><span>{lead.source}</span><span className="text-white/30">/</span><span>{lead.category}</span></div>
            <h2 className="mt-3 line-clamp-3 text-[23px] font-semibold leading-[1.38] tracking-[-.05em] text-[#f1f7f5] sm:text-[26px]">{lead.title}</h2>
            <div className="mt-5 rounded-xl bg-white/[.07] px-4 py-3"><span className="text-[10px] font-semibold tracking-[.14em] text-[#acd5c8]">{lead.keyPoints.length > 0 ? "关键事实" : "内容摘要"} <span className="font-mono text-[#83ada5]">/ 01</span></span><p className="mt-1 line-clamp-3 text-[12px] leading-[1.7] text-[#d5e6e1]">{lead.keyPoints[0] || lead.summary || "打开新闻，查看详细信息与原文。"}</p></div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4 text-[11px] font-medium text-[#d4e7e2]"><span>阅读{isToday ? "今日" : "本期"}重点</span><span className="font-mono text-[#9dbfbb]">01 / {String(items.length).padStart(2, "0")}</span></div>
          </Link>}
        </div>

        <section aria-labelledby="stats-title" className="brief-metrics relative z-10 rounded-[18px] border border-white/10 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="stats-title" className="flex items-center gap-2.5 text-[11px] font-semibold tracking-[.17em] text-[#bad5cf]"><span className="h-px w-5 bg-[#9ccac1]" aria-hidden="true" /> SIGNAL OVERVIEW <span className="font-normal tracking-normal text-[#91adaa]">/ 数据概览</span></h2>
            <span className="text-[11px] text-[#91adab]">{isToday ? "截至当前 · 北京时间" : `简报日期 · ${formatDate(snapshot.date)}`}</span>
          </div>
          <dl className="mt-5 grid grid-cols-3 divide-x divide-white/12 border-t border-white/10 pt-5">
            {stats.map((stat, index) => <div key={stat.label} className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-8">
              <dt className="flex items-center gap-2 text-[11px] font-medium text-[#9bb9b7]"><span className="hidden font-mono text-[10px] text-[#6f9d9c] sm:inline">0{index + 1}</span>{stat.label}</dt>
              <dd className="mt-2 flex flex-wrap items-baseline gap-x-2"><strong className="brief-metric-value text-[32px] font-semibold leading-none tracking-[-.075em] text-[#f1f8f4] sm:text-[40px]" style={{ animationDelay: `${index * 110}ms` }}>{String(stat.value).padStart(2, "0")}</strong><span className="hidden text-[11px] text-[#91abaa] sm:inline">{stat.unit}</span></dd>
            </div>)}
          </dl>
        </section>
      </section>

      {snapshot.isMock && <p className="data-notice mt-5">正在展示本地示例数据。将采集结果放入 <code>data/YYYY-MM-DD.json</code> 后，页面会自动读取最新数据。</p>}
      {!snapshot.isMock && !isToday && <p className="data-notice mt-5">今天尚无新采集记录，以下展示 {formatDate(snapshot.date)} 的新闻。</p>}

      <NewsFeed items={items} />

      <footer className="mt-20 flex flex-col justify-between gap-2 border-t border-[#dfe6e7] pt-6 text-[11px] text-[#8c9a9e] sm:flex-row"><span>学有渔力 News · 保持好奇，清晰阅读</span><span>摘要仅供快速浏览，请以原文为准</span></footer>
    </main>
  );
}
