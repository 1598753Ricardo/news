"use client";

import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { formatDate } from "@/lib/format";
import type { NewsItem } from "@/lib/news";

type Props = { news: NewsItem; date?: string; index: number; expanded: boolean; onToggle: () => void };

export function NewsCard({ news, date, index, expanded, onToggle }: Props) {
  const detailsId = `news-details-${news.id}`;
  const hasSummary = Boolean(news.summary);
  const isAi = news.summaryKind === "ai";
  const summaryLabel = isAi ? "AI 原文摘录" : news.summaryKind === "source" ? "来源摘要" : "暂无摘要";

  return (
    <article className="news-card group relative overflow-hidden rounded-[20px] border border-[#e3e9e9] bg-white p-5 shadow-[0_3px_18px_rgba(31,51,57,.025)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[#bfcfce] hover:shadow-[0_16px_44px_rgba(31,51,57,.075)] sm:p-7" style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
      <div className="flex gap-4 sm:gap-6">
        <span className="hidden w-7 shrink-0 pt-1 text-[11px] font-semibold tabular-nums tracking-[.06em] text-[#a5b2b4] sm:block" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[11px] font-medium text-[#829096]">
            <span className="rounded-md bg-[#edf4f3] px-2.5 py-1 text-[#3d726e]">{news.category}</span>
            <span className="text-[#596b73]">{news.source}</span>
            <span className="size-0.5 rounded-full bg-[#b3c0c1]" aria-hidden="true" />
            <time dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time>
          </div>

          <h3 className="mt-4 max-w-[820px] text-[18px] font-semibold leading-[1.5] tracking-[-.035em] text-[#23343c] sm:text-[21px]">
            <Link href={date ? `/news/${news.id}?date=${date}` : `/news/${news.id}`} className="rounded-sm outline-none transition-colors hover:text-[#347770] focus-visible:underline focus-visible:underline-offset-4">{news.title}</Link>
          </h3>

          <div aria-hidden={expanded} className={`reveal-grid ${expanded ? "is-closed" : "is-open"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className={`mt-5 rounded-[14px] border px-4 py-4 sm:px-5 ${isAi ? "border-[#dae9e7] bg-[#f4f9f8]" : "border-[#e9eded] bg-[#f8faf9]"}`}>
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[.07em] text-[#4b817c]"><span className="text-[15px] leading-none" aria-hidden="true">✦</span>{summaryLabel}</div>
                <p className={`mt-2 line-clamp-2 max-w-[810px] text-[13px] leading-[1.85] ${hasSummary ? "text-[#4c6067]" : "italic text-[#95a2a5]"}`}>{news.summary || "暂无可用摘要，可直接阅读原文。"}</p>
              </div>
              {news.keyPoints.length > 0 && <div className="mt-4 flex items-start gap-3 px-1 text-[12px] leading-[1.8]"><span className="shrink-0 font-semibold text-[#4a817c]">关键事实</span><span className="min-w-0 line-clamp-1 text-[#60737a]">{news.keyPoints[0]}</span></div>}
            </div>
          </div>

          <div id={detailsId} aria-hidden={!expanded} inert={!expanded} className={`reveal-grid ${expanded ? "is-open" : "is-closed"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className="mt-5 rounded-[14px] border border-[#dae9e7] bg-[#f4f9f8] px-4 py-5 sm:px-5">
                <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[.07em] text-[#4b817c]"><span className="text-[15px] leading-none" aria-hidden="true">✦</span>{hasSummary ? `完整${summaryLabel}` : summaryLabel}</p>
                <p className={`mt-3 max-w-[820px] text-[13px] leading-[1.95] ${hasSummary ? "text-[#465b63]" : "italic text-[#95a2a5]"}`}>{news.summary || "暂无可用摘要，可直接阅读原文。"}</p>
              </div>
              {news.keyPoints.length > 0 && <div className="mt-6">
                <p className="text-[11px] font-semibold tracking-[.07em] text-[#526b70]">关键事实 <span className="ml-1 font-normal tracking-normal text-[#99a6a8]">/ {news.keyPoints.length} 条</span></p>
                <ol className="mt-3 space-y-3">
                  {news.keyPoints.map((fact, factIndex) => <li key={`${factIndex}-${fact}`} className="flex gap-3 text-[12px] leading-[1.85] text-[#5a6c73]"><span className="shrink-0 pt-px font-semibold tabular-nums text-[#69a19b]">{String(factIndex + 1).padStart(2, "0")}</span><span>{fact}</span></li>)}
                </ol>
              </div>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0f0] pt-3">
            <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-[12px] font-medium text-[#5e747a] transition-colors hover:bg-[#f1f6f5] hover:text-[#28655e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]" aria-label={`查看原文：${news.title}`}>查看原文 <span aria-hidden="true">↗</span></a>
            <div className="flex items-center gap-1.5">
              <FavoriteButton news={news} />
              <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold text-[#346d68] transition-colors hover:bg-[#edf5f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]">{expanded ? "收起" : "展开阅读"}<svg className={`size-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
