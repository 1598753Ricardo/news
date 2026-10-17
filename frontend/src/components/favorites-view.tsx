"use client";

import Link from "next/link";
import { useEffect } from "react";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import { type FavoriteEntry, useFavorites } from "@/lib/favorites";
import { setReadStatus, useReadingProgress } from "@/lib/reading-progress";

function SavedNewsCard({ entry, index, expanded, onToggle }: { entry: FavoriteEntry; index: number; expanded: boolean; onToggle: () => void }) {
  const collectedDate = entry.news.collectedAt.slice(0, 10);
  const issueDate = /^\d{4}-\d{2}-\d{2}$/.test(collectedDate) ? collectedDate : entry.news.publishedAt.slice(0, 10);
  const { readUrls } = useReadingProgress(issueDate);
  const read = readUrls.has(entry.url);

  return <NewsCard news={entry.news} index={index} expanded={expanded} onToggle={() => { if (!expanded) setReadStatus(issueDate, entry.url, true); onToggle(); }} read={read} onReadToggle={() => setReadStatus(issueDate, entry.url, !read)} />;
}

export function FavoritesView() {
  const { entries, hydrated } = useFavorites();
  const cardExpansion = useCardExpansion();
  const closeExpanded = cardExpansion.close;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !(event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]"))) closeExpanded();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeExpanded]);

  if (!hydrated) {
    return <p className="saved-loading">正在读取收藏…</p>;
  }

  return (
    <section aria-labelledby="favorites-list-title" className="saved-section">
      <div className="saved-section__head"><div><p className="section-kicker"><span aria-hidden="true" />继续阅读</p><h2 id="favorites-list-title">收藏内容</h2></div><p>{entries.length} 条新闻</p></div>

      {entries.length ? (
        <div className="story-standard-list saved-list">
          {entries.map((entry, index) => <SavedNewsCard key={entry.url} entry={entry} index={index} expanded={cardExpansion.isExpanded(entry.news.id)} onToggle={() => cardExpansion.toggle(entry.news.id)} />)}
        </div>
      ) : (
        <div className="saved-empty">
          <p>还没有收藏的新闻</p>
          <span>在新闻列表中点击收藏，稍后就能在这里继续阅读。</span>
          <Link href="/">浏览今日简报 <span aria-hidden="true">→</span></Link>
        </div>
      )}
    </section>
  );
}
