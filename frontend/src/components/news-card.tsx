"use client";

import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { formatDate } from "@/lib/format";
import type { NewsItem } from "@/lib/news";

type Props = { news: NewsItem; date?: string; index: number; expanded: boolean; onToggle: () => void };

export function NewsCard({ news, date, index, expanded, onToggle }: Props) {
  const detailsId = `news-details-${news.id}`;
  const summaryLabel = news.summaryKind === "ai" ? "AI 摘要" : news.summaryKind === "source" ? "来源摘要" : "暂无摘要";
  const canExpand = Boolean(news.summary || news.keyPoints.length);

  return (
    <article className="news-entry grid gap-2 border-b border-[#e1e3de] py-7 sm:grid-cols-[54px_minmax(0,1fr)] sm:gap-5 sm:py-9">
      <span className="pt-1 font-mono text-[12px] tabular-nums text-[#9b9f97]" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#798079]">
          <span className="font-medium text-[#4c6659]">{news.category}</span>
          <span aria-hidden="true">·</span>
          <span>{news.source}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time>
        </div>

        <h3 className="mt-3 max-w-[820px] text-[20px] font-semibold leading-[1.5] tracking-[-.03em] text-[#26332d] sm:text-[23px]">
          <Link href={date ? `/news/${news.id}?date=${date}` : `/news/${news.id}`} className="transition-colors hover:text-[#2d6c57] focus-visible:underline focus-visible:underline-offset-4">{news.title}</Link>
        </h3>

        <div id={detailsId} className="max-w-[800px]">
          <p className={`mt-3 text-[14px] leading-[1.85] text-[#626e66] ${expanded ? "" : "line-clamp-2"}`}>
            {news.summary || "暂无可用摘要，可直接阅读原文。"}
          </p>
          <p className="mt-2 text-[11px] text-[#969e95]">{summaryLabel}</p>
          {news.keyPoints.length > 0 && <div className={`reveal-grid ${expanded ? "is-open" : "is-closed"}`} aria-hidden={!expanded} inert={!expanded}>
            <div className="min-h-0 overflow-hidden">
              <div className="mt-5 border-l-2 border-[#d5dfd4] pl-4">
                <p className="text-[12px] font-medium text-[#50665a]">关键事实</p>
                <ol className="mt-2 space-y-2 text-[13px] leading-[1.8] text-[#657169]">
                  {news.keyPoints.map((fact, factIndex) => <li key={`${factIndex}-${fact}`}>{factIndex + 1}. {fact}</li>)}
                </ol>
              </div>
            </div>
          </div>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#edeee9] pt-2 sm:gap-x-5">
          <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-[12px] font-medium text-[#416653] transition-colors hover:text-[#234d3d] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]" aria-label={`查看原文：${news.title}`}>查看原文 <span aria-hidden="true">↗</span></a>
          <FavoriteButton news={news} />
          {canExpand && <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle} className="inline-flex min-h-10 items-center gap-1 text-[12px] font-medium text-[#586a5f] transition-colors hover:text-[#285c46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]">{expanded ? "收起" : "展开阅读"}<svg className={`size-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>}
        </div>
      </div>
    </article>
  );
}
