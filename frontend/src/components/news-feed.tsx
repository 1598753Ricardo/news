"use client";

import { useMemo, useRef, useState } from "react";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import type { NewsItem } from "@/lib/news";

const PAGE_SIZE = 5;

export function NewsFeed({ items, date, showSearch = true }: { items: NewsItem[]; date?: string; showSearch?: boolean }) {
  const [source, setSource] = useState("全部");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const feedRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardExpansion = useCardExpansion();
  const sources = useMemo(() => ["全部", ...new Set(items.map((item) => item.source))], [items]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return items.filter((item) =>
      (source === "全部" || item.source === source) &&
      (!term || `${item.title} ${item.source} ${item.category} ${item.summary}`.toLocaleLowerCase().includes(term))
    );
  }, [items, query, source]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  function chooseSource(nextSource: string) {
    setSource(nextSource);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    headingRef.current?.focus({ preventScroll: true });
    feedRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  return (
    <section ref={feedRef} aria-labelledby="feed-title" className="mt-10 scroll-mt-28">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 ref={headingRef} id="feed-title" tabIndex={-1} className="text-[27px] font-semibold tracking-[-.04em] text-[#26332d] outline-none sm:text-[32px]">新闻列表</h2>
          <p aria-live="polite" aria-atomic="true" className="mt-2 text-[12px] text-[#7a8279]">{query.trim() || source !== "全部" ? `找到 ${filtered.length} 条新闻` : `共 ${filtered.length} 条新闻`}，从感兴趣的一条开始。</p>
        </div>
        {showSearch && <label className="relative block w-full sm:w-[270px]">
          <span className="sr-only">搜索新闻</span>
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#89958a]" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4.2 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="搜索标题或摘要" className="h-10 w-full rounded-md border border-[#dedfda] bg-white pl-9 pr-3 text-[13px] text-[#26332d] outline-none transition-colors placeholder:text-[#9da59c] focus:border-[#7c9e8a] focus:ring-2 focus:ring-[#7c9e8a]/10" />
        </label>}
      </div>

      <div className="mt-5 flex gap-6 overflow-x-auto border-b border-[#dedfda]" role="group" aria-label="按来源筛选新闻">
        {sources.map((name) => (
          <button key={name} type="button" onClick={() => chooseSource(name)} aria-pressed={source === name} className={`min-h-10 shrink-0 border-b-2 px-0.5 pb-2 pt-1 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] ${source === name ? "border-[#476f57] text-[#2c5940]" : "border-transparent text-[#7a847b] hover:text-[#345741]"}`}>
            {name}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <>
          <div>
            {pageItems.map((item, index) => <NewsCard key={item.id} news={item} date={date} index={startIndex + index} expanded={cardExpansion.isExpanded(item.id)} onToggle={() => cardExpansion.toggle(item.id)} />)}
          </div>
          <nav aria-label="新闻分页" className="mt-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p aria-live="polite" className="text-[12px] text-[#7a8279]">第 {currentPage} / {pageCount} 页 · 显示 {startIndex + 1}–{startIndex + pageItems.length} 条</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} className="inline-flex min-h-10 items-center gap-2 px-2 text-[12px] font-medium text-[#416653] transition-colors hover:text-[#234d3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] disabled:cursor-not-allowed disabled:opacity-40"><span aria-hidden="true">←</span> 上一页</button>
                <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount} className="inline-flex min-h-10 items-center gap-2 px-2 text-[12px] font-medium text-[#416653] transition-colors hover:text-[#234d3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] disabled:cursor-not-allowed disabled:opacity-40">下一页 <span aria-hidden="true">→</span></button>
              </div>
            </div>
          </nav>
        </>
      ) : (
        <div className="border-b border-[#e1e3de] px-2 py-16 text-center">
          <p className="text-[15px] font-medium text-[#34433a]">没有找到相关新闻</p>
          <p className="mt-2 text-[13px] text-[#818a80]">试试其他关键词或切换来源。</p>
        </div>
      )}
    </section>
  );
}
