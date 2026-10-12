"use client";

import Link from "next/link";
import { useRef } from "react";

import { FavoriteButton } from "@/components/favorite-button";
import { formatDate } from "@/lib/format";
import type { NewsItem } from "@/lib/news";

type Props = { news: NewsItem; index: number; expanded: boolean; onToggle: () => void };

function OriginalLink({ news }: { news: NewsItem }) {
  return (
    <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-medium text-[#516884] transition-colors hover:bg-[#f3f6f9] hover:text-[#253d5d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586985]" aria-label={`查看原文：${news.title}`}>
      查看原文 <span aria-hidden="true">↗</span>
    </a>
  );
}

export function NewsCard({ news, index, expanded, onToggle }: Props) {
  const topToggleRef = useRef<HTMLButtonElement>(null);
  const detailsId = `news-details-${news.id}`;
  const hasSummary = Boolean(news.summary);
  const summaryLabel = news.summaryKind === "ai" ? "AI 摘要 · 原文摘录" : news.summaryKind === "source" ? "来源摘要" : "暂无摘要";
  const factsAreInSummary = news.keyPoints.length > 2 && news.keyPoints.every((point) => news.summary.includes(point));
  const visibleFacts = factsAreInSummary ? news.keyPoints.slice(0, 2) : news.keyPoints;
  const remainingFacts = news.keyPoints.length - visibleFacts.length;

  return (
    <article className="news-card group relative rounded-[18px] border border-[#e8eaf0] bg-white p-5 shadow-[0_2px_10px_rgba(20,29,43,.025)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cbd4e1] hover:shadow-[0_12px_32px_rgba(20,29,43,.07)] sm:p-6" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 pt-1 text-[11px] font-medium text-[#768092]">
          <span className="inline-flex items-center rounded-md bg-[#f2f5f8] px-2 py-1 text-[#52657c]">{news.category}</span>
          <span>{news.source}</span>
          <span className="size-0.5 rounded-full bg-[#b4bac5]" aria-hidden="true" />
          <time dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time>
        </div>
        <FavoriteButton news={news} />
      </div>

      <h3 className="max-w-[750px] text-[18px] font-semibold leading-[1.5] tracking-[-.035em] text-[#252b38] sm:text-[19px]">
        <Link href={`/news/${news.id}`} className="rounded-sm outline-none transition-colors hover:text-[#3f5676] focus-visible:underline focus-visible:underline-offset-4">
          {news.title}
        </Link>
      </h3>

      <div aria-hidden={expanded} className={`grid transition-[grid-template-rows,opacity] duration-[260ms] ease-out ${expanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className={`mt-5 border-l-[3px] pl-4 ${news.summaryKind === "ai" ? "border-[#a9bed1]" : "border-[#d7dee6]"}`}>
            <p className="text-[11px] font-semibold tracking-[.06em] text-[#687f98]">{summaryLabel}</p>
            <p className={`mt-2 line-clamp-2 max-w-[800px] text-[13px] leading-[1.85] ${hasSummary ? "text-[#566477]" : "italic text-[#a0a7b2]"}`}>
              {news.summary || "暂无可用摘要，可直接阅读原文。"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#f0f1f3] pt-2">
        {hasSummary ? (
          <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-[#8a93a1]">
            <span className={`size-1.5 shrink-0 rounded-full ${news.summaryKind === "ai" ? "bg-[#8ca9bc]" : "bg-[#c4cbd2]"}`} aria-hidden="true" />
            {news.summaryKind === "ai" ? "AI 原文摘录" : "来源摘要"}
          </span>
        ) : <OriginalLink news={news} />}
        <button ref={topToggleRef} type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-medium text-[#516884] transition-colors hover:bg-[#f3f6f9] hover:text-[#253d5d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586985]">
          {expanded ? "收起内容" : "展开阅读"}
          <svg className={`size-3.5 transition-transform duration-[260ms] ${expanded ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div id={detailsId} aria-hidden={!expanded} inert={!expanded} className={`grid transition-[grid-template-rows,opacity] duration-[260ms] ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 overflow-hidden">
          {hasSummary ? (
            <div className="mt-5 border-t border-[#f0f1f3] pt-5">
              <p className="text-[11px] font-semibold tracking-[.06em] text-[#687f98]">{news.summaryKind === "ai" ? "完整 AI 摘要" : "完整来源摘要"}</p>
              <p className="mt-2 max-w-[800px] text-[13px] leading-[1.9] text-[#566477]">{news.summary}</p>
            </div>
          ) : (
            <p className="mt-5 border-t border-[#f0f1f3] pt-5 text-[12px] leading-[1.75] text-[#8a94a3]">暂无摘要与关键事实，可通过上方链接阅读原文。</p>
          )}

          {visibleFacts.length > 0 && (
            <div className="mt-5 border-t border-[#f0f1f3] pt-4">
              <p className="text-[11px] font-semibold tracking-[.06em] text-[#7a8797]">关键事实{remainingFacts > 0 ? ` · 精选 ${visibleFacts.length} 条` : ""}</p>
              <ul className="mt-2 space-y-1.5">
                {visibleFacts.map((fact, factIndex) => (
                  <li key={`${factIndex}-${fact}`} className="flex gap-2.5 text-[12px] leading-[1.75] text-[#687586]">
                    <span className="mt-[8px] size-1 shrink-0 rounded-full bg-[#a8b9c9]" aria-hidden="true" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
              {remainingFacts > 0 && <p className="mt-2 text-[11px] leading-5 text-[#9aa3af]">其余 {remainingFacts} 条已包含在上方完整摘要中。</p>}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[#f0f1f3] pt-2">
            <span className="text-[11px] text-[#8a93a1]">发布时间 <time className="ml-1 text-[#687586]" dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time></span>
            {hasSummary && <OriginalLink news={news} />}
          </div>

          <button type="button" onClick={() => { onToggle(); requestAnimationFrame(() => topToggleRef.current?.focus()); }} aria-expanded={expanded} aria-controls={detailsId} className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[9px] border-t border-[#f0f1f3] text-[12px] font-medium text-[#718198] transition-colors hover:bg-[#f7f9fb] hover:text-[#354861] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586985]">
            收起内容 <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </article>
  );
}
