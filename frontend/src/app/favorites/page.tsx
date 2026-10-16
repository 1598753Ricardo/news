import type { Metadata } from "next";
import Link from "next/link";

import { FavoritesView } from "@/components/favorites-view";

export const metadata: Metadata = {
  title: "我的收藏",
  description: "继续阅读你收藏的新闻。",
};

export default function FavoritesPage() {
  return (
    <main className="site-container pb-24 pt-9 sm:pt-14">
      <nav aria-label="面包屑导航" className="mb-6 flex items-center gap-2 text-[12px] text-[#8b9a9d]">
        <Link href="/" className="rounded-sm transition-colors hover:text-[#347770] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3d8179]">首页</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#526c70]">我的收藏</span>
      </nav>
      <header className="border-b border-[#dedfda] pb-10">
        <p className="text-[12px] text-[#788279]">阅读清单</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.25] tracking-[-.05em] text-[#26332d] sm:text-[50px]">我的收藏</h1>
        <p className="mt-4 text-[14px] leading-[1.8] text-[#69736d]">把值得回看的新闻留在这里，随时继续阅读。</p>
      </header>
      <FavoritesView />
    </main>
  );
}
