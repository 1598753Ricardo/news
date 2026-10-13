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
    <main className="site-container pb-24 pt-8 sm:pt-11">
      <nav aria-label="面包屑导航" className="mb-9 flex items-center gap-2 text-[12px] text-[#8b9a9d]">
        <Link href="/" className="rounded-sm transition-colors hover:text-[#347770] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">首页</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#526c70]">新闻详情</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12">
        <article className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2.5 text-[12px] font-medium">
            <span className="rounded-md bg-[#e6f2ef] px-2.5 py-1.5 text-[#36776e]">{news.category}</span>
            <span className="text-[#829296]">{news.source}</span>
          </div>
          <h1 className="max-w-[820px] text-[29px] font-semibold leading-[1.43] tracking-[-.05em] text-[#23343c] sm:text-[39px]">{news.title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[#dfe8e6] pb-7 text-[12px] text-[#849598]">
            <span>来源 <strong className="ml-1 font-medium text-[#50676b]">{news.source}</strong></span>
            <span>发布时间 <time className="ml-1 text-[#50676b]" dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time></span>
          </div>

          <section aria-labelledby="summary-title" className="mt-9">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#e3f1ed] text-[#397d74]" aria-hidden="true">✦</span>
              <h2 id="summary-title" className="text-[16px] font-semibold tracking-[-.03em] text-[#23343c]">{news.summaryKind === "ai" ? "AI 原文摘录" : news.summaryKind === "source" ? "来源摘要" : "摘要"}</h2>
            </div>
            {news.summary ? (
              <div className="rounded-[18px] border border-[#dceae6] bg-[#f4f9f7] px-6 py-6 shadow-[0_4px_22px_rgba(30,55,50,.025)] sm:px-8 sm:py-8">
                {news.summaryKind !== "ai" && <p className="mb-3 text-[11px] font-medium tracking-[.02em] text-[#7c9791]">来源提供的摘要 · AI 摘要暂不可用</p>}
                <p className="text-[15px] leading-[2.05] text-[#415b60]">{news.summary}</p>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#d4e2df] bg-white px-6 py-8 text-[13px] leading-7 text-[#849598]">这篇新闻暂无可用摘要。你仍可通过下方链接阅读原文。</div>
            )}
            {news.summaryKind === "ai" && <p className="mt-3 text-[11px] leading-5 text-[#91a09f]">由本地模型从原文选句生成，保留原文措辞。</p>}
          </section>

          <section aria-labelledby="points-title" className="mt-11">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#e3f1ed] text-[#397d74]" aria-hidden="true">≡</span>
              <h2 id="points-title" className="text-[16px] font-semibold tracking-[-.03em] text-[#23343c]">关键事实</h2>
            </div>
            {news.keyPoints.length ? (
              <ol className="overflow-hidden rounded-[18px] border border-[#e3e9e9] bg-white px-6 py-1 shadow-[0_4px_22px_rgba(30,55,50,.025)] sm:px-8">
                {news.keyPoints.map((point, index) => (
                  <li key={`${index}-${point}`} className="flex gap-4 border-b border-[#eaf0ee] py-5 last:border-b-0">
                    <span className="pt-0.5 text-[11px] font-semibold tabular-nums text-[#69a19b]">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-[14px] leading-[1.9] text-[#526a6e]">{point}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#d4e2df] bg-white px-6 py-8 text-[13px] leading-7 text-[#849598]">暂无可靠的关键内容摘录，请阅读原文了解完整信息。</div>
            )}
          </section>

          <div className="mt-11 flex flex-wrap items-center gap-4 border-t border-[#dfe8e6] pt-7">
            <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[10px] bg-[#244c50] px-5 py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#356d67] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">阅读原文 <span aria-hidden="true">↗</span></a>
            <Link href="/" className="rounded-[10px] px-2 py-3 text-[13px] font-medium text-[#6f8587] transition-colors hover:text-[#347770] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179]">← 返回新闻列表</Link>
          </div>
        </article>

        <aside className="self-start rounded-[18px] border border-[#e3e9e9] bg-white p-6 text-[12px] shadow-[0_4px_22px_rgba(30,55,50,.025)] lg:sticky lg:top-28" aria-label="阅读信息">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#67a097]">READING NOTE</p>
          <h2 className="mt-3 text-[15px] font-semibold text-[#23343c]">阅读信息</h2>
          <dl className="mt-5 space-y-4 border-t border-[#eaf0ee] pt-5">
            <div><dt className="text-[#91a09f]">新闻来源</dt><dd className="mt-1 font-medium text-[#50676b]">{news.source}</dd></div>
            <div><dt className="text-[#91a09f]">内容分类</dt><dd className="mt-1 font-medium text-[#50676b]">{news.category}</dd></div>
            <div><dt className="text-[#91a09f]">发布时间</dt><dd className="mt-1 font-medium text-[#50676b]">{formatDate(news.publishedAt, true)}</dd></div>
            <div><dt className="text-[#91a09f]">摘要状态</dt><dd className="mt-1 font-medium text-[#50676b]">{news.summaryKind === "ai" ? "AI 原文摘录" : news.summaryKind === "source" ? "仅来源摘要" : "暂无摘要"}</dd></div>
          </dl>
          <p className="mt-6 border-t border-[#eaf0ee] pt-5 leading-6 text-[#8b9c9d]">摘要帮助快速了解要点，完整事实与上下文请以原文为准。</p>
        </aside>
      </div>
    </main>
  );
}
