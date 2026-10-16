import type { Metadata } from "next";
import Link from "next/link";

import { FavoritesView } from "@/components/favorites-view";

export const metadata: Metadata = {
  title: "我的收藏",
  description: "继续阅读你收藏的新闻。",
};

export default function FavoritesPage() {
  return (
    <main className="site-container pb-20 pt-6 sm:pt-8">
      <nav aria-label="面包屑导航" className="page-breadcrumb"><Link href="/">首页</Link><span aria-hidden="true">/</span><span>我的收藏</span></nav>
      <header className="collection-hero">
        <p className="collection-hero__kicker">学有渔力 · 阅读清单</p>
        <h1>我的收藏<span aria-hidden="true">。</span></h1>
        <p>把值得回看的新闻留在这里，随时继续阅读。</p>
        <span className="collection-hero__mark" aria-hidden="true">藏</span>
      </header>
      <FavoritesView />
    </main>
  );
}
