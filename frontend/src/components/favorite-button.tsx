"use client";

import { useState } from "react";

import { toggleFavorite, useFavorites } from "@/lib/favorites";
import type { NewsItem } from "@/lib/news";

export function FavoriteButton({ news }: { news: NewsItem }) {
  const { entries, hydrated } = useFavorites();
  const [error, setError] = useState(false);
  const isFavorite = entries.some((entry) => entry.url === news.url);

  return (
    <div className="relative z-10 shrink-0">
      <button
        type="button"
        disabled={!hydrated}
        onClick={() => setError(!toggleFavorite(news))}
        aria-label={`${isFavorite ? "取消收藏" : "收藏"}：${news.title}`}
        aria-pressed={isFavorite}
        title={isFavorite ? "取消收藏" : "收藏新闻"}
        className={`favorite-button flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-[color,background-color,transform] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] disabled:cursor-wait ${isFavorite ? "bg-[#e8f4f0] text-[#297468] hover:bg-[#dceee8]" : "text-[#7d9092] hover:bg-[#f1f6f5] hover:text-[#346d68]"}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 2.8 2.8 5.75 6.35.92-4.6 4.48 1.09 6.32L12 17.28l-5.64 2.99 1.09-6.32-4.6-4.48 6.35-.92L12 2.8Z" />
        </svg>
        <span>{isFavorite ? "已收藏" : "收藏"}</span>
      </button>
      {error && <span role="alert" className="sr-only">无法保存收藏，请检查浏览器存储设置。</span>}
    </div>
  );
}
