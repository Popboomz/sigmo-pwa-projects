'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage, isHydrated } = useLanguage();

  // 避免 hydration mismatch：只在客户端水合完成后渲染完整内容
  if (!isHydrated) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 flex-shrink-0 admin-nav-link"
        disabled
      >
        <Languages className="w-4 h-4" />
        <span className="hidden sm:inline">EN</span>
        <span className="sm:hidden">EN</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 flex-shrink-0 admin-nav-link"
    >
      <Languages className="w-4 h-4" />
      <span className="hidden sm:inline">{language === 'en' ? '中文' : 'EN'}</span>
      <span className="sm:hidden">{language === 'en' ? '中' : 'EN'}</span>
    </Button>
  );
}
