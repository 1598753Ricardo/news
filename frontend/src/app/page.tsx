import { NewsFeed } from "@/components/news-feed";
import { formatDate } from "@/lib/format";
import { getNewsSnapshot } from "@/lib/news";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getNewsSnapshot();
  const todayItems = snapshot.date === snapshot.today && !snapshot.isMock ? snapshot.items : [];
  const summaryCount = todayItems.filter((item) => item.summaryKind === "ai").length;
  const sourceCount = new Set(todayItems.map((item) => item.source)).size;
  const stats = [
    { label: "新闻总数", value: snapshot.todayCount },
    { label: "AI 摘要数量", value: summaryCount },
    { label: "来源数量", value: sourceCount },
  ];

  return (
    <main className="mx-auto max-w-[1160px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
      <section aria-labelledby="page-title" className="rounded-[22px] border border-[#e6e9ed] bg-white px-6 py-7 shadow-[0_4px_30px_rgba(31,41,55,.025)] sm:px-9 sm:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="max-w-[700px]">
            <p className="text-[11px] font-semibold tracking-[.14em] text-[#8191a3]">学有渔力 News <span className="mx-1.5 text-[#bdc7d1]">/</span> DAILY AI BRIEF</p>
            <h1 id="page-title" className="mt-3 text-[30px] font-semibold leading-[1.32] tracking-[-.05em] text-[#222a37] sm:text-[38px]">每日 AI 新闻简报<span className="text-[#8da3b7]">。</span></h1>
            <p className="mt-3 max-w-[610px] text-[13px] leading-[1.8] text-[#768292] sm:text-[14px]">汇集公开新闻，以 AI 原文摘录呈现重点。让重要信息，清晰可见。</p>
          </div>
          <time dateTime={snapshot.date} className="shrink-0 self-start rounded-full border border-[#e8edf1] bg-[#f8fafb] px-3 py-1.5 text-[11px] font-medium text-[#6e7f92]">{formatDate(snapshot.date)}</time>
        </div>
      </section>

      <section aria-labelledby="stats-title" className="mt-4 rounded-[18px] border border-[#e6e9ed] bg-white px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="stats-title" className="text-[12px] font-semibold tracking-[.02em] text-[#5d6b7d]">今日统计</h2>
          <span className="text-[11px] text-[#9aa4b0]">北京时间 · {formatDate(snapshot.today)}</span>
        </div>
        <dl className="mt-4 grid grid-cols-3 border-t border-[#edf0f2] pt-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`min-w-0 ${index > 0 ? "pl-4 sm:pl-8" : ""} ${index < stats.length - 1 ? "border-r border-[#e8ebef]" : ""}`}>
              <dt className="text-[11px] text-[#8b95a3]">{stat.label}</dt>
              <dd className="mt-2 text-[26px] font-semibold leading-none tracking-[-.05em] text-[#2b3444] sm:text-[29px]">{stat.value.toString().padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
      </section>

      {snapshot.isMock && <p className="mt-4 rounded-[10px] border border-[#e6e9ed] bg-white px-4 py-3 text-[12px] text-[#788391]">正在展示本地示例数据。将项目的采集结果放入 <code>data/YYYY-MM-DD.json</code> 后，页面会自动读取最新数据。</p>}
      {!snapshot.isMock && snapshot.date !== snapshot.today && <p className="mt-4 rounded-[10px] border border-[#e6e9ed] bg-white px-4 py-3 text-[12px] text-[#788391]">今天尚无新采集记录，以下展示 {formatDate(snapshot.date)} 的新闻。</p>}

      <NewsFeed items={snapshot.items} />

      <footer className="mt-16 flex flex-col justify-between gap-2 border-t border-[#e8ebee] pt-5 text-[11px] text-[#9aa2ae] sm:flex-row">
        <span>学有渔力 News · 保持好奇，清晰阅读</span>
        <span>摘要仅供快速浏览，请以原文为准</span>
      </footer>
    </main>
  );
}
