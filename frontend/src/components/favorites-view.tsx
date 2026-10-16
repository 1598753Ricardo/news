"use client";

import Link from "next/link";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import { useFavorites } from "@/lib/favorites";

export function FavoritesView() {
  const { entries, hydrated } = useFavorites();
  const cardExpansion = useCardExpansion();

  if (!hydrated) {
    return <p className="saved-loading">正在读取收藏…</p>;
  }

  return (
    <section aria-labelledby="favorites-list-title" className="saved-section">
      <div className="saved-section__head"><div><p className="section-kicker"><span aria-hidden="true" />继续阅读</p><h2 id="favorites-list-title">收藏内容</h2></div><p>{entries.length} 条新闻</p></div>

      {entries.length ? (
        <div className="story-standard-list saved-list">
          {entries.map((entry, index) => <NewsCard key={entry.url} news={entry.news} index={index} expanded={cardExpansion.isExpanded(entry.news.id)} onToggle={() => cardExpansion.toggle(entry.news.id)} />)}
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
