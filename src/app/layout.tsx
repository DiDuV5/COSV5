/**
 * @fileoverview 根布局组件
 * @description Next.js 14 App Router 的根布局组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - next-auth: ^4.24.0
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { SmartFloatingButton } from "@/components/ui/smart-floating-button";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 强制动态渲染，避免静态生成时的tRPC Context问题
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    default: "兔图",
    template: "%s | 兔图",
  },
  description: "专业的cosplay和写真分享平台",
  keywords: ["cosplay", "写真", "分享", "社交", "平台"],
  authors: [{ name: "兔图团队" }],
  creator: "兔图",
  publisher: "兔图",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.COSEREEDEN_NEXTAUTH_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    title: "兔图",
    description: "专业的cosplay和写真分享平台",
    siteName: "兔图",
  },
  twitter: {
    card: "summary_large_image",
    title: "兔图",
    description: "专业的cosplay和写真分享平台",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background font-sans antialiased">
            <div className="relative flex min-h-screen flex-col">
              <main className="flex-1 pb-20 sm:pb-24">{children}</main>
              <BottomNavigation />
              <SmartFloatingButton />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
