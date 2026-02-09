import type { Metadata, Viewport } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Providers } from '@/components/Providers';
import { AdminEntryButton } from '@/components/AdminEntryButton';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import IOSInstallBanner from '@/components/IOSInstallBanner';
import { PaperGrain } from '@/components/PaperGrain';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SIGMÖ | 品牌展示应用',
    template: '%s | SIGMÖ',
  },
  description:
    'SIGMÖ - 一个优雅的品牌展示型应用，包含产品测试、问卷和日志管理功能',
  keywords: [
    'SIGMÖ',
    '品牌展示',
    '产品测试',
    '问卷调查',
    'PWA',
    'Web App',
  ],
  authors: [{ name: 'SIGMÖ Team' }],
  generator: 'Next.js',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SIGMÖ',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'SIGMÖ | 品牌展示应用',
    description:
      'SIGMÖ - 一个优雅的品牌展示型应用，包含产品测试、问卷和日志管理功能',
    url: '/',
    siteName: 'SIGMÖ',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6B8E6F' },
    { media: '(prefers-color-scheme: dark)', color: '#6B8E6F' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Font Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Primary Fonts - Preload for faster rendering */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <PaperGrain />
        {isDev && <Inspector />}
        <Providers>
          {children}
          <AdminEntryButton />
          <ServiceWorkerRegister />
          <PWAInstallPrompt />
          <IOSInstallBanner />
        </Providers>
      </body>
    </html>
  );
}
