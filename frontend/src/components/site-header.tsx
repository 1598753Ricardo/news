import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e4eae9] bg-[#f7f9f8]/90 backdrop-blur-xl">
      <div className="site-container flex h-[68px] items-center justify-between">
        <Link href="/" className="group flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3d8179]" aria-label="学有渔力 News 首页">
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-[#1e3b45] text-white shadow-[0_4px_12px_rgba(28,55,62,.16)] transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true">
            <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
              <path d="M4 5.5h6.5M4 9.5h10M4 13.5h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="15.7" cy="14.2" r="2.2" fill="#9dd4cb" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-[-.035em] text-[#21353e]">学有渔力 <span className="font-medium text-[#748b90]">News</span></span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden items-center gap-2.5 border-r border-[#dde5e4] pr-5 text-[11px] font-medium tracking-[.04em] text-[#627876] sm:flex">
            <span className="size-1.5 rounded-full bg-[#70a69a]" aria-hidden="true" />
            <span>专注有价值的信息</span>
          </div>
          <Link href="/history" className="inline-flex min-h-10 items-center rounded-[9px] px-2 text-[12px] font-medium text-[#49635f] transition-colors hover:bg-[#eaf2f0] hover:text-[#2c6c64] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] sm:px-3" aria-label="浏览历史简报">
            <span className="sm:hidden">历史</span><span className="hidden sm:inline">历史简报</span>
          </Link>
          <Link href="/favorites" className="inline-flex min-h-10 items-center gap-1.5 rounded-[9px] px-2 text-[12px] font-medium text-[#49635f] transition-colors hover:bg-[#eaf2f0] hover:text-[#2c6c64] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] sm:px-3" aria-label="查看我的收藏">
            <span className="text-[15px] leading-none" aria-hidden="true">☆</span><span className="sm:hidden">收藏</span><span className="hidden sm:inline">我的收藏</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
