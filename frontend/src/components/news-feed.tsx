"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import { useFavorites } from "@/lib/favorites";
import type { NewsItem } from "@/lib/news";
import { setReadStatus, useReadingProgress } from "@/lib/reading-progress";

const PAGE_SIZE = 10;

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']"));
}

export function NewsFeed({ items, date, issueDate, isToday = false, showSearch = true }: { items: NewsItem[]; date?: string; issueDate: string; isToday?: boolean; showSearch?: boolean }) {
  const [source, setSource] = useState("全部");
  const [query, setQuery] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [notice, setNotice] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shortcutButtonRef = useRef<HTMLButtonElement>(null);
  const cardExpansion = useCardExpansion();
  const { readUrls, hydrated } = useReadingProgress(issueDate);
  const { entries: favorites } = useFavorites();
  const favoriteUrls = new Set(favorites.map((entry) => entry.url));
  const sources = useMemo(() => ["全部", ...new Set(items.map((item) => item.source))], [items]);
  const total = new Set(items.map((item) => item.url)).size;
  const readCount = items.filter((item) => readUrls.has(item.url)).length;
  const term = query.trim().toLocaleLowerCase();
  const filtered = items.filter((item) =>
      (source === "全部" || item.source === source) &&
      (!term || `${item.title} ${item.source} ${item.category} ${item.summary}`.toLocaleLowerCase().includes(term)) &&
      (!onlyUnread || !readUrls.has(item.url)) && (!onlyFavorites || favoriteUrls.has(item.url))
    );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const currentId = pageItems.some((item) => item.id === activeId) ? activeId : pageItems[0]?.id;
  const hasFilters = source !== "全部" || !!query.trim() || onlyUnread || onlyFavorites;
  const editorialLayout = !hasFilters && currentPage === 1;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function resetFilters() {
    setQuery(""); setSource("全部"); setOnlyUnread(false); setOnlyFavorites(false);
    setPage(1); setActiveId(null);
  }

  function focusStory(id: string) {
    setActiveId(id);
    const node = document.getElementById(`news-card-${id}`);
    node?.focus({ preventScroll: true });
    node?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }

  function toggleExpanded(item: NewsItem) {
    if (!cardExpansion.isExpanded(item.id) && !readUrls.has(item.url)) {
      if (!setReadStatus(issueDate, item.url, true)) setNotice("无法保存阅读状态，请检查浏览器存储设置。");
    }
    setActiveId(item.id);
    cardExpansion.toggle(item.id);
  }

  function toggleRead(item: NewsItem) {
    if (!setReadStatus(issueDate, item.url, !readUrls.has(item.url))) {
      setNotice("无法保存阅读状态，请检查浏览器存储设置。");
    }
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    cardExpansion.close();
    const next = filtered[(nextPage - 1) * PAGE_SIZE];
    setActiveId(next?.id ?? null);
    if (next) window.requestAnimationFrame(() => focusStory(next.id));
    else headingRef.current?.focus({ preventScroll: true });
  }

  function jumpToNextUnread() {
    const currentIndex = filtered.findIndex((item) => item.id === currentId);
    const next = [...filtered.slice(currentIndex + 1), ...filtered.slice(0, currentIndex + 1)]
      .find((item) => !readUrls.has(item.url));
    if (!next) { setNotice("当前结果已全部读完。"); return; }
    const nextPage = Math.floor(filtered.indexOf(next) / PAGE_SIZE) + 1;
    if (nextPage !== currentPage) setPage(nextPage);
    window.requestAnimationFrame(() => focusStory(next.id));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTypingTarget(event.target)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".hero-date, .date-popover")) return;
      if (event.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
          shortcutButtonRef.current?.focus();
          event.preventDefault();
        } else if (cardExpansion.expandedId) {
          cardExpansion.close();
          event.preventDefault();
        }
        return;
      }
      if (showShortcuts || !pageItems.length) return;
      const index = pageItems.findIndex((item) => item.id === currentId);
      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") {
        const nextIndex = Math.max(0, Math.min(pageItems.length - 1, index + (key === "j" ? 1 : -1)));
        focusStory(pageItems[nextIndex].id);
        event.preventDefault();
      } else if (key === "s") {
        document.getElementById(`news-card-${currentId}`)?.querySelector<HTMLButtonElement>(".favorite-button")?.click();
        event.preventDefault();
      } else if (event.key === "Enter" && !target?.closest("a, button, [role='button']")) {
        const item = pageItems[index < 0 ? 0 : index];
        if (item.summary || item.keyPoints.length) { toggleExpanded(item); event.preventDefault(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function renderCard(item: NewsItem, index: number, variant?: "feature" | "support") {
    return <NewsCard key={item.id} news={item} date={date} index={index} variant={variant} expanded={cardExpansion.isExpanded(item.id)} onToggle={() => toggleExpanded(item)} read={readUrls.has(item.url)} onReadToggle={() => toggleRead(item)} current={currentId === item.id} onSelect={() => setActiveId(item.id)} />;
  }

  return (
    <section aria-labelledby="feed-title" className="reading-section" >
      <div className="reading-section__head">
        <div>
          <p className="section-kicker"><span aria-hidden="true" />每日阅读</p>
          <h2 ref={headingRef} id="feed-title" tabIndex={-1}>新闻列表</h2>
          <p aria-live="polite" aria-atomic="true" className="reading-section__count">{hasFilters ? `找到 ${filtered.length} 条新闻` : `共 ${filtered.length} 条新闻`}，从感兴趣的一条开始。</p>
        </div>
        <span className="reading-section__ornament" aria-hidden="true">阅</span>
      </div>

      <div className="reading-progress">
        <div className="reading-progress__top"><p>{isToday ? "今日阅读" : "本期阅读"} <strong>{hydrated ? readCount : "–"}</strong> / {total}</p><button type="button" onClick={jumpToNextUnread} disabled={!hydrated || !filtered.length}>下一条未读 <span aria-hidden="true">→</span></button></div>
        <div className="reading-progress__track" role="progressbar" aria-label="阅读进度" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hydrated ? readCount : 0}><span style={{ width: `${total && hydrated ? readCount / total * 100 : 0}%` }} /></div>
      </div>

      <div className="reading-tools">
        {showSearch && <label className="reading-search">
          <span className="sr-only">搜索新闻</span>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4.2 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setActiveId(null); }} placeholder="搜索标题、摘要或关键词" />
          <span className="reading-search__hint" aria-hidden="true">搜索</span>
        </label>}
        <div className="reading-sources" role="group" aria-label="按来源筛选新闻">
          <span className="reading-sources__label">来源</span>
          <div className="reading-sources__list">
            {sources.map((name) => <button key={name} type="button" onClick={() => { setSource(name); setPage(1); setActiveId(null); }} aria-pressed={source === name}>{name}</button>)}
          </div>
        </div>
      </div>

      <div className="reading-quick-filters">
        <div role="group" aria-label="快速筛选"><button type="button" aria-pressed={onlyUnread} onClick={() => { setOnlyUnread(!onlyUnread); setPage(1); setActiveId(null); }}>只看未读</button><button type="button" aria-pressed={onlyFavorites} onClick={() => { setOnlyFavorites(!onlyFavorites); setPage(1); setActiveId(null); }}>只看收藏</button></div>
        <div className="reading-quick-filters__right">{hasFilters && <button type="button" onClick={resetFilters}>清除筛选</button>}<button ref={shortcutButtonRef} type="button" aria-expanded={showShortcuts} aria-controls="reading-shortcuts" onClick={() => setShowShortcuts(!showShortcuts)}>快捷键 <span aria-hidden="true">?</span></button></div>
      </div>
      {showShortcuts && <div id="reading-shortcuts" className="reading-shortcuts"><span><kbd>J</kbd> 下一条</span><span><kbd>K</kbd> 上一条</span><span><kbd>S</kbd> 收藏</span><span><kbd>Enter</kbd> 展开 / 收起</span><span><kbd>Esc</kbd> 收起</span></div>}

      {filtered.length ? (
        <>
          <div className="story-collection">
            {editorialLayout && pageItems[0] && <div className="story-feature-row">{renderCard(pageItems[0], 0, "feature")}</div>}
            {editorialLayout && pageItems.length > 1 && <div className="story-support-grid">{pageItems.slice(1, 3).map((item, index) => renderCard(item, index + 1, "support"))}</div>}
            <div className="story-standard-list">{(editorialLayout ? pageItems.slice(3) : pageItems).map((item, index) => renderCard(item, startIndex + index + (editorialLayout ? 3 : 0)))}</div>
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
        <div className="reading-empty"><p>没有找到相关新闻</p><span>试试其他关键词或调整筛选条件。</span>{hasFilters && <button type="button" onClick={resetFilters}>清除全部筛选</button>}</div>
      )}
      {notice && <div className="reading-toast" role="status">{notice}</div>}
    </section>
  );
}
