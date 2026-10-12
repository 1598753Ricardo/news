import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate } from "@/lib/format";
import { getNewsById } from "@/lib/news";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const news = await getNewsById(id);
  return { title: news?.title ?? "新闻未找到", description: news?.summary || news?.title };
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;
  const news = await getNewsById(id);
  if (!news) notFound();

  return (
    <main className="mx-auto max-w-[1160px] px-5 pb-24 pt-8 sm:px-8 sm:pt-11">
      <nav aria-label="面包屑导航" className="mb-9 flex items-center gap-2 text-[12px] text-[#9099a6]">
        <Link href="/" className="rounded-sm transition-colors hover:text-[#415979] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#586985]">首页</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#637085]">新闻详情</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12">
        <article className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2.5 text-[12px] font-medium">
            <span className="rounded-md bg-[#eaf0f5] px-2.5 py-1.5 text-[#516984]">{news.category}</span>
            <span className="text-[#8f99a6]">{news.source}</span>
          </div>
          <h1 className="max-w-[820px] text-[29px] font-semibold leading-[1.43] tracking-[-.05em] text-[#222b39] sm:text-[39px]">{news.title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[#e8ebef] pb-7 text-[12px] text-[#8994a2]">
            <span>来源 <strong className="ml-1 font-medium text-[#536175]">{news.source}</strong></span>
            <span>发布时间 <time className="ml-1 text-[#536175]" dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time></span>
          </div>

          <section aria-labelledby="summary-title" className="mt-9">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#edf2f6] text-[#627c98]" aria-hidden="true">✦</span>
              <h2 id="summary-title" className="text-[16px] font-semibold tracking-[-.03em] text-[#2a3443]">AI 摘要</h2>
            </div>
            {news.summary ? (
              <div className="rounded-[18px] border border-[#e6eaf0] bg-white px-6 py-6 shadow-[0_4px_22px_rgba(30,40,55,.025)] sm:px-8 sm:py-8">
                {news.summaryKind !== "ai" && <p className="mb-3 text-[11px] font-medium tracking-[.02em] text-[#8291a2]">{news.summaryKind === "source" ? "来源提供的摘要 · AI 摘要暂不可用" : "暂无 AI 摘要"}</p>}
                <p className="text-[15px] leading-[2.05] text-[#425064]">{news.summary}</p>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#dce2e9] bg-white px-6 py-8 text-[13px] leading-7 text-[#8793a2]">这篇新闻暂无可用摘要。你仍可通过下方链接阅读原文。</div>
            )}
            {news.summaryKind === "ai" && <p className="mt-3 text-[11px] leading-5 text-[#9aa3af]">由本地模型从原文选句生成，保留原文措辞。</p>}
          </section>

          <section aria-labelledby="points-title" className="mt-11">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#edf2f6] text-[#627c98]" aria-hidden="true">≡</span>
              <h2 id="points-title" className="text-[16px] font-semibold tracking-[-.03em] text-[#2a3443]">关键内容</h2>
            </div>
            {news.keyPoints.length ? (
              <ol className="overflow-hidden rounded-[18px] border border-[#e6eaf0] bg-white px-6 py-1 shadow-[0_4px_22px_rgba(30,40,55,.025)] sm:px-8">
                {news.keyPoints.map((point, index) => (
                  <li key={`${index}-${point}`} className="flex gap-4 border-b border-[#eef0f2] py-5 last:border-b-0">
                    <span className="pt-0.5 text-[11px] font-semibold tabular-nums text-[#9aabbc]">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-[14px] leading-[1.9] text-[#536174]">{point}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#dce2e9] bg-white px-6 py-8 text-[13px] leading-7 text-[#8793a2]">暂无可靠的关键内容摘录，请阅读原文了解完整信息。</div>
            )}
          </section>

          <div className="mt-11 flex flex-wrap items-center gap-4 border-t border-[#e8ebef] pt-7">
            <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[10px] bg-[#2c3545] px-5 py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#40506a] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#586985]">阅读原文 <span aria-hidden="true">↗</span></a>
            <Link href="/" className="rounded-[10px] px-2 py-3 text-[13px] font-medium text-[#6d7b8d] transition-colors hover:text-[#354861] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586985]">← 返回新闻列表</Link>
          </div>
        </article>

        <aside className="self-start rounded-[18px] border border-[#e8ebef] bg-white p-6 text-[12px] lg:sticky lg:top-28" aria-label="阅读信息">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#9ba7b4]">READING NOTE</p>
          <h2 className="mt-3 text-[15px] font-semibold text-[#334155]">阅读信息</h2>
          <dl className="mt-5 space-y-4 border-t border-[#eef0f2] pt-5">
            <div><dt className="text-[#9aa3af]">新闻来源</dt><dd className="mt-1 font-medium text-[#4b5b70]">{news.source}</dd></div>
            <div><dt className="text-[#9aa3af]">内容分类</dt><dd className="mt-1 font-medium text-[#4b5b70]">{news.category}</dd></div>
            <div><dt className="text-[#9aa3af]">发布时间</dt><dd className="mt-1 font-medium text-[#4b5b70]">{formatDate(news.publishedAt, true)}</dd></div>
            <div><dt className="text-[#9aa3af]">摘要状态</dt><dd className="mt-1 font-medium text-[#4b5b70]">{news.summaryKind === "ai" ? "AI 原文摘录" : news.summaryKind === "source" ? "仅来源摘要" : "暂无摘要"}</dd></div>
          </dl>
          <p className="mt-6 border-t border-[#eef0f2] pt-5 leading-6 text-[#98a2af]">摘要帮助快速了解要点，完整事实与上下文请以原文为准。</p>
        </aside>
      </div>
    </main>
  );
}
