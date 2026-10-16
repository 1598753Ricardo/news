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
    <main className="site-container pb-24 pt-9 sm:pt-14">
      <div className="mx-auto max-w-[780px]">
        <nav aria-label="面包屑导航" className="mb-10 text-[12px] text-[#838a81]">
          <Link href={date ? `/?date=${date}` : "/"} className="transition-colors hover:text-[#346a4d] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">← 返回新闻列表</Link>
        </nav>

        <article>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#78847a]">
            <span className="font-medium text-[#496a53]">{news.category}</span><span aria-hidden="true">·</span><span>{news.source}</span><span aria-hidden="true">·</span>
            <time dateTime={news.publishedAt || undefined}>{formatDate(news.publishedAt, true)}</time>
          </div>
          <h1 className="mt-5 text-[30px] font-semibold leading-[1.42] tracking-[-.04em] text-[#26332d] sm:text-[40px]">{news.title}</h1>

          <section aria-labelledby="summary-title" className="mt-10 border-t border-[#dfe2db] pt-8">
            <div className="flex items-baseline gap-3">
              <h2 id="summary-title" className="text-[17px] font-semibold text-[#303d33]">内容摘要</h2>
              <span className="text-[11px] text-[#959e94]">{news.summaryKind === "ai" ? "AI 摘要" : news.summaryKind === "source" ? "来源摘要" : "暂无摘要"}</span>
            </div>
            <p className="mt-5 text-[16px] leading-[2] text-[#4e5d52]">{news.summary || "这篇新闻暂无可用摘要，请阅读原文了解完整内容。"}</p>
            {news.summaryKind === "ai" && <p className="mt-4 text-[11px] leading-5 text-[#929b91]">由本地模型从原文选句生成，保留原文措辞。</p>}
          </section>

          {news.keyPoints.length > 0 && <section aria-labelledby="points-title" className="mt-11 border-t border-[#dfe2db] pt-8">
            <h2 id="points-title" className="text-[17px] font-semibold text-[#303d33]">关键事实</h2>
            <ol className="mt-4 divide-y divide-[#eceee8]">
              {news.keyPoints.map((point, index) => <li key={`${index}-${point}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-4 text-[14px] leading-[1.9] text-[#59685c]"><span className="pt-0.5 font-mono text-[11px] text-[#9ca79b]">{String(index + 1).padStart(2, "0")}</span><span>{point}</span></li>)}
            </ol>
          </section>}

          <div className="mt-11 flex flex-wrap items-center gap-6 border-t border-[#dfe2db] pt-7">
            <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#355b42] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#284c36] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">阅读原文 <span aria-hidden="true">↗</span></a>
            <Link href={date ? `/?date=${date}` : "/"} className="text-[13px] text-[#6f7d70] transition-colors hover:text-[#2d6046] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">返回列表</Link>
          </div>
          <p className="mt-7 text-[12px] leading-[1.8] text-[#969e94]">摘要帮助快速了解要点，完整事实与上下文请以原文为准。</p>
        </article>
      </div>
    </main>
  );
}
