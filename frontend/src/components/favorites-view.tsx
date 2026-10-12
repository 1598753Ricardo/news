"use client";

import Link from "next/link";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import { useFavorites } from "@/lib/favorites";

export function FavoritesView() {
  const { entries, hydrated } = useFavorites();
  const cardExpansion = useCardExpansion();

  if (!hydrated) {
    return <div className="mt-8 rounded-[18px] border border-[#e8eaf0] bg-white px-6 py-12 text-center text-[13px] text-[#8b96a5]">正在读取收藏…</div>;
  }

  return (
    <section aria-labelledby="favorites-list-title" className="mt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#8994a3]">SAVED FOR LATER</p>
          <h2 id="favorites-list-title" className="text-[23px] font-semibold tracking-[-.045em] text-[#252b38]">收藏内容 <span className="ml-1 align-middle text-[13px] font-normal tracking-normal text-[#949ca8]">{entries.length} 条新闻</span></h2>
        </div>
      </div>

      {entries.length ? (
        <div className="mt-6 grid gap-3.5">
          {entries.map((entry, index) => <NewsCard key={entry.url} news={entry.news} index={index} expanded={cardExpansion.isExpanded(entry.news.id)} onToggle={() => cardExpansion.toggle(entry.news.id)} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-[18px] border border-dashed border-[#dce1e8] bg-white px-6 py-16 text-center">
          <p className="text-[16px] font-medium text-[#364152]">还没有收藏的新闻</p>
          <p className="mt-2 text-[13px] text-[#8a94a3]">在新闻卡片上点击星标，稍后就能在这里继续阅读。</p>
          <Link href="/" className="mt-6 inline-flex rounded-[10px] border border-[#dfe4eb] bg-white px-5 py-2.5 text-[13px] font-medium text-[#536176] transition-colors hover:border-[#aebbc9] hover:bg-[#f6f8fa] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#586985]">浏览今日简报 →</Link>
        </div>
      )}
    </section>
  );
}
