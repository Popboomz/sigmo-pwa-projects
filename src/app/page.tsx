'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Package, User, Smartphone, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="min-h-screen mesh-bg relative overflow-hidden font-body text-primary">
      {/* Floating Gradients */}
      <div className="fixed top-[-30%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#6B8E6F]/8 blur-[140px] pointer-events-none mix-blend-multiply animate-float-slow" />
      <div className="fixed bottom-[-30%] left-[-10%] w-[800px] h-[800px] rounded-full bg-[#6B8E6F]/5 blur-[140px] pointer-events-none mix-blend-multiply animate-float-slow delay-200" />

      {/* Navigation */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1200px] glass rounded-2xl shadow-sm z-50 px-6 py-3 animate-enter">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105 navbar-logo">
              <span className="text-2xl text-primary font-display font-bold">Σ</span>
            </div>
            <div className="font-display font-bold text-xl tracking-tight text-primary">
              {isClient ? t('nav.brand') : 'SIGMÖ'}
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2">
            <Link href="/collection" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.collection')}</span>
              </Button>
            </Link>
            <Link href="/account" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.account')}</span>
              </Button>
            </Link>
            <Link href="/pwa" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <Smartphone className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.pwa')}</span>
              </Button>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-40 pb-24 relative z-10">
        {/* Header */}
        <div className="mb-16 text-center animate-enter">
          <div className="relative inline-block mb-8">
            <div className="w-32 h-32 rounded-full border-[6px] border-[#6B8E6F] bg-white shadow-2xl flex items-center justify-center">
              <span className="text-6xl font-bold text-primary font-display mt-1">Σ</span>
            </div>
          </div>
          <h1 className="text-[48px] font-bold tracking-tight text-primary mb-4 leading-tight text-balance font-display">
            {t('brand.story.title')}
          </h1>
          <p className="text-[20px] text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light font-body">
            {t('brand.story.subtitle')}
          </p>
        </div>

        {/* Brand Story Cards */}
        <div className="space-y-6">
          <div className="premium-card p-8 animate-enter" style={{ animationDelay: '0.1s' }}>
            <p className="text-[17px] leading-relaxed text-primary">
              {t('brand.story.origin')}
            </p>
          </div>

          <div className="premium-card p-8 animate-enter" style={{ animationDelay: '0.2s' }}>
            <p className="text-[17px] leading-relaxed text-primary">
              {t('brand.story.philosophy')}
            </p>
          </div>

          <div className="premium-card p-8 animate-enter" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl border border-border bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-2xl text-[#6B8E6F] font-display font-bold">Σ</span>
              </div>
              <div>
                <h3 className="text-[20px] font-semibold text-primary mb-2 font-display">
                  {t('brand.story.meaning.title')}
                </h3>
                <p className="text-[17px] leading-relaxed text-primary">
                  {t('brand.story.meaning.content')}
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card p-8 animate-enter" style={{ animationDelay: '0.4s' }}>
            <p className="text-[17px] leading-relaxed text-primary">
              {t('brand.story.approach')}
            </p>
          </div>

          <div className="premium-card p-8 animate-enter" style={{ animationDelay: '0.5s' }}>
            <p className="text-[17px] leading-relaxed text-primary mb-4">
              {t('brand.story.result')}
            </p>
            <p className="text-[17px] leading-relaxed text-[#6B8E6F] font-semibold">
              {t('brand.story.benefit')}
            </p>
          </div>

          <div className="premium-card p-8 animate-enter" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-11 h-11 bg-[#6B8E6F] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6B8E6F]/25">
                <span className="text-2xl text-white font-display font-bold">Σ</span>
              </div>
              <h3 className="text-[24px] font-semibold text-primary font-display">
                {t('brand.story.vision.title')}
              </h3>
            </div>
            <p className="text-[17px] leading-relaxed text-primary mb-4">
              {t('brand.story.vision.content')}
            </p>
            <p className="text-[18px] font-semibold text-primary font-display">
              {t('brand.story.vision.tagline')}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-16 flex justify-center animate-enter" style={{ animationDelay: '0.7s' }}>
          <Link href="/collection">
            <Button className="premium-button flex items-center gap-2 text-[17px]">
              <BookOpen className="w-5 h-5" />
              {t('home.explore')}
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
