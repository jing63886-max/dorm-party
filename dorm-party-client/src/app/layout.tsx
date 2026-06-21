import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/* Inter 字体配置 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/* 元数据 */
export const metadata: Metadata = {
  title: 'Dorm Party - 宿舍派对',
  description: '多人实时互动派对游戏，和室友一起嗨翻天！',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

/* 移动端视口配置 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1a1a2e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="bg-dark min-h-screen min-h-[100dvh] font-sans antialiased">
        {/* 主内容区域 */}
        <main className="mobile-container">
          {children}
        </main>
      </body>
    </html>
  );
}
