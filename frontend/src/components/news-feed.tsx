"use client";

import { useMemo, useState } from "react";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import type { NewsItem } from "@/lib/news";

const PAGE_SIZE = 12;

export function NewsFeed({ items }: { items: NewsItem[] }) {
  const [source, setSource] = useState("全部");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const cardExpansion = useCardExpansion();
  const sources = useMemo(() => ["全部", ...new Set(items.map((item) => item.source))], [items]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return items.filter((item) =>
      (source === "全部" || item.source === source) &&
      (!term || `${item.title} ${item.source} ${item.category} ${item.summary}`.toLocaleLowerCase().includes(term))
    );
  }, [items, query, source]);

  function chooseSource(nextSource: string) {
    setSource(nextSource);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section aria-labelledby="feed-title" className="mt-9 sm:mt-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#8994a3]">TODAY’S BRIEF</p>
          <h2 id="feed-title" className="text-[23px] font-semibold tracking-[-.045em] text-[#252b38]">简报内容 <span className="ml-1 align-middle text-[13px] font-normal tracking-normal text-[#949ca8]">{filtered.length} 条新闻</span></h2>
        </div>
        <label className="relative block w-full sm:w-[245px]">
          <span className="sr-only">搜索新闻</span>
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ba4af]" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4.2 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="搜索标题或内容" className="h-10 w-full rounded-[10px] border border-[#e4e7ec] bg-white pl-10 pr-3 text-[13px] text-[#283344] outline-none transition-colors placeholder:text-[#a3aab4] focus:border-[#8a9db7] focus:ring-2 focus:ring-[#8a9db7]/15" />
        </label>
      </div>

      <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="按来源筛选新闻">
        {sources.map((name) => (
          <button key={name} type="button" onClick={() => chooseSource(name)} aria-pressed={source === name} className={`shrink-0 rounded-lg px-3.5 py-2 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586985] ${source === name ? "bg-[#2c3545] text-white" : "border border-[#e8eaf0] bg-white text-[#738092] hover:border-[#bac5d3] hover:text-[#344054]"}`}>
            {name}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <>
          <div className="mt-5 grid gap-3.5">
            {filtered.slice(0, visibleCount).map((item, index) => <NewsCard key={item.id} news={item} index={index} expanded={cardExpansion.isExpanded(item.id)} onToggle={() => cardExpansion.toggle(item.id)} />)}
          </div>
          {visibleCount < filtered.length && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-[10px] border border-[#dfe4eb] bg-white px-6 py-2.5 text-[13px] font-medium text-[#536176] transition-colors hover:border-[#aebbc9] hover:bg-[#f6f8fa] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#586985]">
                加载更多 <span className="ml-1 text-[#9aa5b2]">↓</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-5 rounded-[18px] border border-dashed border-[#dce1e8] bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-[#364152]">没有找到相关新闻</p>
          <p className="mt-2 text-[13px] text-[#8a94a3]">试试其他关键词或切换来源。</p>
        </div>
      )}
    </section>
  );
}
