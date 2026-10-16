"use client";

import Link from "next/link";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import { useFavorites } from "@/lib/favorites";

export function FavoritesView() {
  const { entries, hydrated } = useFavorites();
  const cardExpansion = useCardExpansion();

  if (!hydrated) {
    return <p className="mt-12 text-[13px] text-[#818a80]">正在读取收藏…</p>;
  }

  return (
    <section aria-labelledby="favorites-list-title" className="mt-11">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="favorites-list-title" className="text-[27px] font-semibold tracking-[-.04em] text-[#26332d]">收藏内容 <span className="ml-2 align-middle text-[12px] font-normal tracking-normal text-[#7a8279]">{entries.length} 条新闻</span></h2>
        </div>
      </div>

      {entries.length ? (
        <div className="mt-4 border-t border-[#e1e3de]">
          {entries.map((entry, index) => <NewsCard key={entry.url} news={entry.news} index={index} expanded={cardExpansion.isExpanded(entry.news.id)} onToggle={() => cardExpansion.toggle(entry.news.id)} />)}
        </div>
      ) : (
        <div className="mt-6 border-y border-[#e1e3de] px-6 py-16 text-center">
          <p className="text-[16px] font-medium text-[#34494d]">还没有收藏的新闻</p>
          <p className="mt-2 text-[13px] text-[#818a80]">在新闻列表中点击收藏，稍后就能在这里继续阅读。</p>
          <Link href="/" className="mt-6 inline-flex min-h-11 items-center text-[13px] font-medium text-[#416653] hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">浏览今日简报 →</Link>
        </div>
      )}
    </section>
  );
}
