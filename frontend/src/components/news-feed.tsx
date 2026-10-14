"use client";

import { useMemo, useRef, useState } from "react";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import type { NewsItem } from "@/lib/news";

const PAGE_SIZE = 10;

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
    <section ref={feedRef} aria-labelledby="feed-title" className="mt-12 scroll-mt-28 sm:mt-16">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 ref={headingRef} id="feed-title" tabIndex={-1} className="text-[28px] font-semibold tracking-[-.055em] text-[#1d3032] outline-none sm:text-[34px]">新闻列表 <span className="ml-2 align-middle text-[12px] font-normal tracking-normal text-[#6f8380]">{filtered.length} 条新闻</span></h2>
          <p className="mt-2 text-[12px] text-[#87968f]">按来源筛选，或从标题和摘要中找到想读的内容。</p>
        </div>
        {showSearch && <label className="relative block w-full sm:w-[270px]">
          <span className="sr-only">搜索新闻</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ca09f]" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4.2 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="搜索标题或内容" className="h-11 w-full rounded-xl border border-[#dfe7e6] bg-white pl-10 pr-3 text-[13px] text-[#23343c] outline-none transition-[border-color,box-shadow] placeholder:text-[#a2afb0] focus:border-[#6fa79d] focus:ring-3 focus:ring-[#6fa79d]/15" />
        </label>}
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
            {pageItems.map((item, index) => <NewsCard key={item.id} news={item} date={date} index={startIndex + index} expanded={cardExpansion.isExpanded(item.id)} onToggle={() => cardExpansion.toggle(item.id)} />)}
          </div>
          <nav aria-label="新闻分页" className="mt-8 border-t border-[#e0e9e2] pt-5">
            <div className="h-0.5 overflow-hidden rounded-full bg-[#e7eee8]" aria-hidden="true"><div className="h-full rounded-full bg-[#77a68e] transition-[width] duration-300" style={{ width: `${currentPage / pageCount * 100}%` }} /></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div><p aria-live="polite" className="text-[13px] font-semibold text-[#365d4e]">第 {currentPage} 页 <span className="font-normal text-[#9aaba1]">/ 共 {pageCount} 页</span></p><p className="mt-1 text-[11px] text-[#8a9b91]">本页 {startIndex + 1}–{startIndex + pageItems.length} 条 · 每页 10 条</p></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#dce7df] bg-white px-4 text-[12px] font-medium text-[#426d59] transition-colors hover:border-[#a8c8b4] hover:bg-[#f3f8f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#dce7df] disabled:hover:bg-white"><span aria-hidden="true">←</span> 上一页</button>
                <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#dce7df] bg-white px-4 text-[12px] font-medium text-[#426d59] transition-colors hover:border-[#a8c8b4] hover:bg-[#f3f8f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#dce7df] disabled:hover:bg-white">下一页 <span aria-hidden="true">→</span></button>
              </div>
            </div>
          </nav>
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
