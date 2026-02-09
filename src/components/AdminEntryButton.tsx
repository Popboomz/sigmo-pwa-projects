'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export function AdminEntryButton() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 如果在问卷链接页面，隐藏管理员入口
    if (pathname.startsWith('/protocol/')) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [pathname]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link href="/admin">
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2 shadow-lg"
        >
          <Lock className="w-4 h-4" />
          {t('admin.entry')}
        </Button>
      </Link>
    </div>
  );
}
