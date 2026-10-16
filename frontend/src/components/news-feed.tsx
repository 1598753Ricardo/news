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
  const editorialLayout = source === "全部" && !query.trim() && currentPage === 1;

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
    <section ref={feedRef} aria-labelledby="feed-title" className="reading-section" >
      <div className="reading-section__head">
        <div>
          <p className="section-kicker"><span aria-hidden="true" />每日阅读</p>
          <h2 ref={headingRef} id="feed-title" tabIndex={-1}>新闻列表</h2>
          <p aria-live="polite" aria-atomic="true" className="reading-section__count">{query.trim() || source !== "全部" ? `找到 ${filtered.length} 条新闻` : `共 ${filtered.length} 条新闻`}，从感兴趣的一条开始。</p>
        </div>
        <span className="reading-section__ornament" aria-hidden="true">阅</span>
      </div>

      <div className="reading-tools">
        {showSearch && <label className="reading-search">
          <span className="sr-only">搜索新闻</span>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4.2 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="搜索标题、摘要或关键词" />
          <span className="reading-search__hint" aria-hidden="true">搜索</span>
        </label>}
        <div className="reading-sources" role="group" aria-label="按来源筛选新闻">
          <span className="reading-sources__label">来源</span>
          <div className="reading-sources__list">
            {sources.map((name) => <button key={name} type="button" onClick={() => chooseSource(name)} aria-pressed={source === name}>{name}</button>)}
          </div>
        </div>
      </div>

      {filtered.length ? (
        <>
          <div className="story-collection">
            {editorialLayout && pageItems[0] && <div className="story-feature-row"><NewsCard key={pageItems[0].id} news={pageItems[0]} date={date} index={0} variant="feature" expanded={cardExpansion.isExpanded(pageItems[0].id)} onToggle={() => cardExpansion.toggle(pageItems[0].id)} /></div>}
            {editorialLayout && pageItems.length > 1 && <div className="story-support-grid">{pageItems.slice(1, 3).map((item, index) => <NewsCard key={item.id} news={item} date={date} index={index + 1} variant="support" expanded={cardExpansion.isExpanded(item.id)} onToggle={() => cardExpansion.toggle(item.id)} />)}</div>}
            <div className="story-standard-list">{(editorialLayout ? pageItems.slice(3) : pageItems).map((item, index) => <NewsCard key={item.id} news={item} date={date} index={startIndex + index + (editorialLayout ? 3 : 0)} expanded={cardExpansion.isExpanded(item.id)} onToggle={() => cardExpansion.toggle(item.id)} />)}</div>
          </div>
          <nav aria-label="新闻分页" className="reading-pagination">
            <p aria-live="polite">第 <strong>{currentPage}</strong> / {pageCount} 页 <span aria-hidden="true">·</span> 显示 {startIndex + 1}–{startIndex + pageItems.length} 条</p>
            <div>
              <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}><span aria-hidden="true">←</span> 上一页</button>
              <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount}>下一页 <span aria-hidden="true">→</span></button>
            </div>
          </nav>
        </>
      ) : (
        <div className="reading-empty"><p>没有找到相关新闻</p><span>试试其他关键词或切换来源。</span></div>
      )}
    </section>
  );
}
