"use client";

import Link from "next/link";

import { NewsCard } from "@/components/news-card";
import { useCardExpansion } from "@/lib/card-expansion";
import { useFavorites } from "@/lib/favorites";

export function FavoritesView() {
  const { entries, hydrated } = useFavorites();
  const cardExpansion = useCardExpansion();

  if (!hydrated) {
    return <div className="mt-8 rounded-[20px] border border-[#e3e9e9] bg-white px-6 py-12 text-center text-[13px] text-[#839496]">正在读取收藏…</div>;
  }

  return (
    <section aria-labelledby="favorites-list-title" className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#4f8a83]">SAVED FOR LATER</p>
          <h2 id="favorites-list-title" className="text-[25px] font-semibold tracking-[-.045em] text-[#23343c]">收藏内容 <span className="ml-1 align-middle text-[13px] font-normal tracking-normal text-[#8b9a9d]">{entries.length} 条新闻</span></h2>
        </div>
      </div>

      {entries.length ? (
        <div className="mt-6 grid gap-4">
          {entries.map((entry, index) => <NewsCard key={entry.url} news={entry.news} index={index} expanded={cardExpansion.isExpanded(entry.news.id)} onToggle={() => cardExpansion.toggle(entry.news.id)} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-[20px] border border-dashed border-[#d4e2df] bg-white px-6 py-16 text-center">
          <p className="text-[16px] font-medium text-[#34494d]">还没有收藏的新闻</p>
          <p className="mt-2 text-[13px] text-[#849598]">在新闻卡片上点击星标，稍后就能在这里继续阅读。</p>
          <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-[10px] border border-[#dbe5e3] bg-white px-5 text-[13px] font-medium text-[#446a68] transition-colors hover:border-[#9fc4ba] hover:bg-[#f1f7f5] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">浏览今日简报 →</Link>
        </div>
      )}
    </section>
  );
}
