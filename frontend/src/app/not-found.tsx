import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[680px] px-5 py-28 text-center">
      <p className="text-[12px] font-semibold tracking-[.2em] text-[#9aa9b8]">404 · NOT FOUND</p>
      <h1 className="mt-4 text-[28px] font-semibold tracking-[-.04em] text-[#293545]">这篇新闻暂时找不到了</h1>
      <p className="mt-3 text-[14px] leading-7 text-[#8591a0]">新闻列表会随本地采集结果更新，你可以返回首页继续阅读。</p>
      <Link href="/" className="mt-8 inline-block rounded-[10px] bg-[#2c3545] px-5 py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#40506a]">返回首页</Link>
    </main>
  );
}
