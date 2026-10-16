import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container site-header__inner">
        <Link href="/" className="site-brand" aria-label="学有渔力 News 首页">
          <span className="site-brand__mark" aria-hidden="true">
            <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
              <path d="M4 5.5h6.5M4 9.5h10M4 13.5h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="15.7" cy="14.2" r="2.2" fill="#d4c697" />
            </svg>
          </span>
          <span>学有渔力 <small>NEWS</small></span>
        </Link>
        <div className="site-header__nav">
          <Link href="/" className="site-header__home">今日简报</Link>
          <Link href="/favorites" className="site-header__favorites" aria-label="查看我的收藏">
            <span aria-hidden="true">☆</span><span>我的收藏</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
