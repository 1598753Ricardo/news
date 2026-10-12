import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "学有渔力 News · 让重要信息清晰可见",
    template: "%s · 学有渔力 News",
  },
  description: "学有渔力 News，简洁专注的 AI 新闻收集与阅读工具。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
