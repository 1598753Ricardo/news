import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate } from "@/lib/format";
import { getHistorySnapshot, getNewsById } from "@/lib/news";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string | string[] }> };

async function resolveNews(id: string, date?: string) {
  return date ? (await getHistorySnapshot(date))?.items.find((item) => item.id === id) : getNewsById(id);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const news = await resolveNews(id, typeof query.date === "string" ? query.date : undefined);
  return { title: news?.title ?? "新闻未找到", description: news?.summary || news?.title };
}

export default async function NewsDetailPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const date = typeof query.date === "string" ? query.date : undefined;
  const news = await resolveNews(id, date);
  if (!news) notFound();

  return (
    <main className="site-container detail-page">
      <nav aria-label="面包屑导航" className="page-breadcrumb"><Link href={date ? `/?date=${date}` : "/"}>首页</Link><span aria-hidden="true">/</span><span>新闻详情</span></nav>
      <header className="detail-hero">
        <p className="detail-hero__kicker">学有渔力 · 新闻阅读</p>
        <div className="detail-hero__meta"><span>{news.category}</span><span aria-hidden="true">·</span><span>{news.source}</span><span aria-hidden="true">·</span><time dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time></div>
        <h1>{news.title}</h1>
        <span className="detail-hero__mark" aria-hidden="true">读</span>
      </header>

      <article className="detail-paper">
        <section aria-labelledby="summary-title" className="detail-section">
          <div className="detail-section__head"><h2 id="summary-title">内容摘要</h2><span>{news.summaryKind === "ai" ? "AI 摘要" : news.summaryKind === "source" ? "来源摘要" : "暂无摘要"}</span></div>
          <p className="detail-summary">{news.summary || "这篇新闻暂无可用摘要，请阅读原文了解完整内容。"}</p>
          {news.summaryKind === "ai" && <p className="detail-provenance">由本地模型从原文选句生成，保留原文措辞。</p>}
        </section>

        {news.keyPoints.length > 0 && <section aria-labelledby="points-title" className="detail-section detail-section--facts">
          <div className="detail-section__head"><h2 id="points-title">关键事实</h2><span>{String(news.keyPoints.length).padStart(2, "0")} 条</span></div>
          <ol>{news.keyPoints.map((point, index) => <li key={`${index}-${point}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{point}</p></li>)}</ol>
        </section>}

        <div className="detail-actions"><a href={news.url} target="_blank" rel="noopener noreferrer">阅读原文 <span aria-hidden="true">↗</span></a><Link href={date ? `/?date=${date}` : "/"}>← 返回新闻列表</Link></div>
        <p className="detail-note">摘要帮助快速了解要点，完整事实与上下文请以原文为准。</p>
      </article>
    </main>
  );
}
