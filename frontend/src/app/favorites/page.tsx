import type { Metadata } from "next";
import Link from "next/link";

import { FavoritesView } from "@/components/favorites-view";

export const metadata: Metadata = {
  title: "我的收藏",
  description: "继续阅读你收藏的新闻。",
};

export default function FavoritesPage() {
  return (
    <main className="mx-auto max-w-[1160px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
      <nav aria-label="面包屑导航" className="mb-6 flex items-center gap-2 text-[12px] text-[#9099a6]">
        <Link href="/" className="rounded-sm transition-colors hover:text-[#415979] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#586985]">首页</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#637085]">我的收藏</span>
      </nav>
      <header className="rounded-[22px] border border-[#e6e9ed] bg-white px-6 py-7 shadow-[0_4px_30px_rgba(31,41,55,.025)] sm:px-9 sm:py-8">
        <p className="text-[11px] font-semibold tracking-[.14em] text-[#8191a3]">学有渔力 News <span className="mx-1.5 text-[#bdc7d1]">/</span> YOUR READING LIST</p>
        <h1 className="mt-3 text-[30px] font-semibold leading-[1.32] tracking-[-.05em] text-[#222a37] sm:text-[38px]">我的收藏<span className="text-[#8da3b7]">。</span></h1>
        <p className="mt-3 text-[13px] leading-[1.8] text-[#768292] sm:text-[14px]">把值得回看的新闻留在这里，随时继续阅读。</p>
      </header>
      <FavoritesView />
    </main>
  );
}
