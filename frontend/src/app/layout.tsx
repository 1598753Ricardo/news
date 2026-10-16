import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "学有渔力 News · 让重要信息清晰可见",
    template: "%s · 学有渔力 News",
  },
  description: "学有渔力 News，把值得关注的消息放在一处，按自己的节奏阅读。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
