'use client';

import { useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化客户端错误日志记录器（确保只在客户端执行）
    if (typeof window !== 'undefined') {
      // 延迟初始化，避免阻塞渲染
      setTimeout(() => {
        import('@/lib/clientErrorLogger').then(() => {
          console.log('[Providers] Client error logger initialized');
        });
      }, 100);
    }

    return () => {
      // 清理
      // clientErrorLogger.destroy();
    };
  }, []);

  return (
    <LanguageProvider>
      {children}
      <Toaster />
    </LanguageProvider>
  );
}
