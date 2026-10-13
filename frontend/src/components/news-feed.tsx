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
    <section aria-labelledby="feed-title" className="mt-12 scroll-mt-28 sm:mt-16">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.18em] text-[#4f8a83]"><span className="h-px w-7 bg-[#79aaa3]" aria-hidden="true" /> THE BRIEFING</p>
          <h2 id="feed-title" className="text-[25px] font-semibold tracking-[-.05em] text-[#23343c] sm:text-[29px]">阅读简报 <span className="ml-2 align-middle text-[12px] font-normal tracking-normal text-[#8b9a9d]">{filtered.length} 条新闻</span></h2>
          <p className="mt-2 text-[12px] text-[#829296]">每一条消息，都有清晰的阅读入口。</p>
        </div>
        <label className="relative block w-full sm:w-[270px]">
          <span className="sr-only">搜索新闻</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ca09f]" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4.2 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="搜索标题或内容" className="h-11 w-full rounded-xl border border-[#dfe7e6] bg-white pl-10 pr-3 text-[13px] text-[#23343c] outline-none transition-[border-color,box-shadow] placeholder:text-[#a2afb0] focus:border-[#6fa79d] focus:ring-3 focus:ring-[#6fa79d]/15" />
        </label>
      </div>

      <div className="-mx-1 mt-7 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="按来源筛选新闻">
        {sources.map((name) => (
          <button key={name} type="button" onClick={() => chooseSource(name)} aria-pressed={source === name} className={`min-h-9 shrink-0 rounded-lg px-3.5 text-[12px] font-medium transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] ${source === name ? "bg-[#244c50] text-white shadow-[0_4px_12px_rgba(35,76,80,.13)]" : "border border-[#e0e8e7] bg-white text-[#708186] hover:border-[#a8c8c1] hover:text-[#346d68]"}`}>
            {name}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <>
          <div className="mt-5 grid gap-4">
            {filtered.slice(0, visibleCount).map((item, index) => <NewsCard key={item.id} news={item} index={index} expanded={cardExpansion.isExpanded(item.id)} onToggle={() => cardExpansion.toggle(item.id)} />)}
          </div>
          {visibleCount < filtered.length && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="min-h-11 rounded-xl border border-[#dbe5e3] bg-white px-6 text-[13px] font-medium text-[#446a68] transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-[#9fc4ba] hover:bg-[#f1f7f5] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">
                加载更多 <span className="ml-1 text-[#9aa5b2]">↓</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-5 rounded-[20px] border border-dashed border-[#d4e2df] bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-[#34494d]">没有找到相关新闻</p>
          <p className="mt-2 text-[13px] text-[#849598]">试试其他关键词或切换来源。</p>
        </div>
      )}
    </section>
  );
}
