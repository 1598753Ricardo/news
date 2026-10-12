import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e9ebef] bg-[#fafaf9]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1160px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#586985]" aria-label="学有渔力 News 首页">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-[#242b38] text-white shadow-[0_3px_10px_rgba(28,35,49,.12)] transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true">
            <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
              <path d="M4 5.5h6.5M4 9.5h10M4 13.5h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="15.7" cy="14.2" r="2.2" fill="#a9c5df" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-[-.035em] text-[#242b38]">学有渔力 <span className="font-medium text-[#768092]">News</span></span>
        </Link>
        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2.5 text-[12px] font-medium text-[#7d8593] sm:flex">
            <span className="size-1.5 rounded-full bg-[#8eb09f]" aria-hidden="true" />
            <span>为专注阅读而设计</span>
          </div>
          <Link href="/favorites" className="inline-flex items-center gap-1.5 rounded-[9px] px-2 py-2 text-[12px] font-medium text-[#667588] transition-colors hover:bg-[#f0f2f4] hover:text-[#354861] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#586985]" aria-label="查看我的收藏">
            <span className="text-[15px] leading-none" aria-hidden="true">☆</span> 收藏
          </Link>
        </div>
      </div>
    </header>
  );
}
