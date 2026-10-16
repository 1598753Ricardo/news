"use client";

import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { formatDate } from "@/lib/format";
import type { NewsItem } from "@/lib/news";

type Variant = "feature" | "support" | "standard";
type Props = { news: NewsItem; date?: string; index: number; expanded: boolean; onToggle: () => void; variant?: Variant };

export function NewsCard({ news, date, index, expanded, onToggle, variant = "standard" }: Props) {
  const detailsId = `news-details-${news.id}`;
  const canExpand = Boolean(news.summary || news.keyPoints.length);
  const summaryLabel = news.summaryKind === "ai" ? "AI 摘要" : news.summaryKind === "source" ? "来源摘要" : "暂无摘要";

  return (
    <article className={`story story--${variant}${expanded ? " story--expanded" : ""}`}>
      <span className="story-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <div className="story-main">
        <div className="story-meta">
          <span className="story-category">{news.category}</span>
          <span className="story-meta__dot" aria-hidden="true" />
          <span>{news.source}</span>
          <span className="story-meta__dot" aria-hidden="true" />
          <time dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time>
        </div>

        <h3 className="story-title"><Link href={date ? `/news/${news.id}?date=${date}` : `/news/${news.id}`}>{news.title}</Link></h3>

        <div id={detailsId} className="story-body">
          <p className={`story-summary${news.summary ? "" : " story-summary--empty"}`}>{news.summary || "暂无可用摘要，可直接阅读原文。"}</p>
          <p className="story-summary-label">{summaryLabel}</p>
          {news.keyPoints.length > 0 && <div className={`reveal-grid ${expanded ? "is-open" : "is-closed"}`} aria-hidden={!expanded} inert={!expanded}>
            <div className="min-h-0 overflow-hidden">
              <div className="story-facts">
                <p className="story-facts__label">关键事实 <span>{String(news.keyPoints.length).padStart(2, "0")}</span></p>
                <ol>{news.keyPoints.map((fact, factIndex) => <li key={`${factIndex}-${fact}`}><span aria-hidden="true">{String(factIndex + 1).padStart(2, "0")}</span>{fact}</li>)}</ol>
              </div>
            </div>
          </div>}
        </div>

        <div className="story-actions">
          <a href={news.url} target="_blank" rel="noopener noreferrer" className="story-action story-action--primary" aria-label={`查看原文：${news.title}`}>查看原文 <span aria-hidden="true">↗</span></a>
          <FavoriteButton news={news} />
          {canExpand && <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle} className="story-action story-action--expand">{expanded ? "收起阅读" : "展开阅读"}<svg className={expanded ? "is-rotated" : ""} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>}
        </div>
      </div>
    </article>
  );
}
