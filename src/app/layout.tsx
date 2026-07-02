import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "十三雾沉浸式剧本体验馆",
  description: "将原生 HTML 原型迁移为可维护、可复用的 Next.js 设计系统与页面体系。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
