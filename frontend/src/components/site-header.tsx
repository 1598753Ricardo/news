import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e4e5df] bg-[#fafaf7]/95 backdrop-blur-sm">
      <div className="site-container flex h-[66px] items-center justify-between">
        <Link href="/" className="group flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3d8179]" aria-label="学有渔力 News 首页">
          <span className="flex size-8 items-center justify-center rounded-md bg-[#314e3e] text-white" aria-hidden="true">
            <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
              <path d="M4 5.5h6.5M4 9.5h10M4 13.5h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="15.7" cy="14.2" r="2.2" fill="#c6dec9" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-[-.035em] text-[#26332d]">学有渔力 <span className="font-normal text-[#78857a]">News</span></span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href="/favorites" className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[#536a5a] transition-colors hover:bg-[#f0f2ec] hover:text-[#2d6046] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8179] sm:px-3" aria-label="查看我的收藏">
            <span className="text-[15px] leading-none" aria-hidden="true">☆</span><span className="sm:hidden">收藏</span><span className="hidden sm:inline">我的收藏</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
