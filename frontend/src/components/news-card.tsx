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
  const statusLabel = isAi ? "AI 已提炼" : news.summaryKind === "source" ? "来源摘要" : "待补充";
  const panelClass = `intelligence-panel ${isAi ? "is-ai" : news.summaryKind === "source" ? "is-source" : "is-empty"}`;

  return (
    <article className="news-card group relative overflow-hidden rounded-[22px] border border-[#dce5e2] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(26,48,47,.025)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[#a9c7be] hover:shadow-[0_18px_48px_rgba(26,48,47,.08)] sm:px-7 sm:py-5" style={{ animationDelay: `${(index % 12) * 48}ms` }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[11px] font-medium text-[#6c7e7d]">
          <span className="mr-1 font-mono text-[10px] font-semibold tracking-[.06em] text-[#7d9d98]">{String(index + 1).padStart(2, "0")} /</span>
          <span className="rounded-md border border-[#dbe9e4] bg-[#eef5f2] px-2.5 py-1 text-[#326f63]">{news.category}</span>
          <span className="text-[#4d6465]">{news.source}</span>
          <span className="size-0.5 rounded-full bg-[#a5b8b4]" aria-hidden="true" />
          <time dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[.04em] ${isAi ? "border-[#cbe5db] bg-[#edf8f3] text-[#276d5c]" : hasSummary ? "border-[#e0e8e3] bg-[#f4f7f4] text-[#647a70]" : "border-[#eee5d5] bg-[#faf7ef] text-[#887258]"}`}>
          <span className={`size-1.5 rounded-full ${isAi ? "bg-[#5fae90]" : hasSummary ? "bg-[#94aaa0]" : "bg-[#ba9b72]"}`} aria-hidden="true" />{statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)] lg:gap-8">
        <div className="min-w-0">
          <h3 className="text-[20px] font-semibold leading-[1.43] tracking-[-.05em] text-[#1d3234] sm:text-[23px]">
            <Link href={date ? `/news/${news.id}?date=${date}` : `/news/${news.id}`} className="rounded-sm outline-none transition-colors hover:text-[#287965] focus-visible:underline focus-visible:underline-offset-4">{news.title}</Link>
          </h3>
        </div>

        <div className="min-w-0">
          <div aria-hidden={expanded} className={`reveal-grid ${expanded ? "is-closed" : "is-open"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className={panelClass}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold tracking-[.08em] text-[#40796d]"><span className="flex items-center gap-2"><span className="text-[14px] leading-none" aria-hidden="true">✦</span>{isAi ? "AI 摘录" : "摘要速览"}</span><span className="font-normal tracking-normal text-[#7e9c92]">{news.keyPoints.length > 0 ? `${news.keyPoints.length} 条关键事实` : summaryLabel}</span></div>
                <p className={`insight-copy mt-2 line-clamp-2 text-[13px] leading-[1.7] ${hasSummary ? "text-[#405658]" : "italic text-[#7d8d89]"}`}>{news.summary || "暂无可用摘要，可直接阅读原文。"}</p>
              </div>
            </div>
          </div>

          <div id={detailsId} aria-hidden={!expanded} inert={!expanded} className={`reveal-grid insight-expanded ${expanded ? "is-open" : "is-closed"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className={panelClass}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold tracking-[.08em] text-[#40796d]"><span className="flex items-center gap-2"><span className="text-[14px] leading-none" aria-hidden="true">✦</span>{isAi ? "AI 摘录" : "摘要速览"}</span><span className="font-normal tracking-normal text-[#7e9c92]">{hasSummary ? `完整${summaryLabel}` : summaryLabel}</span></div>
                <p className={`insight-copy mt-3 text-[13px] leading-[1.95] ${hasSummary ? "text-[#405658]" : "italic text-[#7d8d89]"}`}>{news.summary || "暂无可用摘要，可直接阅读原文。"}</p>
                {news.keyPoints.length > 0 && <div className="mt-5 border-t border-[#d9e7e1] pt-4"><p className="text-[10px] font-semibold tracking-[.08em] text-[#478578]">关键事实 <span className="ml-1 font-mono text-[#7eaaa0]">/ {news.keyPoints.length}</span></p><ol className="mt-3 space-y-3">{news.keyPoints.map((fact, factIndex) => <li key={`${factIndex}-${fact}`} className="flex gap-3 text-[12px] leading-[1.85] text-[#526b6a]"><span className="shrink-0 pt-px font-mono text-[10px] font-semibold text-[#5b9b8e]">{String(factIndex + 1).padStart(2, "0")}</span><span>{fact}</span></li>)}</ol></div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-[12px] font-medium text-[#526b68] transition-colors hover:bg-[#f0f6f2] hover:text-[#246c5a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]" aria-label={`查看原文：${news.title}`}>查看原文 <span aria-hidden="true">↗</span></a>
        <div className="flex items-center gap-1.5">
          <FavoriteButton news={news} />
          <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold text-[#2c6e60] transition-colors hover:bg-[#edf5f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]">{expanded ? "收起" : "展开阅读"}<svg className={`size-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        </div>
      </div>
    </article>
  );
}
