'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Package, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AccountPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setIsClient(true);

    // 检查登录状态
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsLoggedIn(true);
      // 这里可以调用 API 验证 token 并获取用户信息
      fetch('/api/admin/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsAdmin(data.user.isAdmin);
          }
        })
        .catch(() => {
          // Token 无效
          setIsLoggedIn(false);
          localStorage.removeItem('admin_token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navigation - Floating Glassmorphism */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1200px] glass rounded-2xl shadow-sm z-50 px-6 py-3">
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
            <Link href="/" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <Home className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.home')}</span>
              </Button>
            </Link>
            <Link href="/collection" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.collection')}</span>
              </Button>
            </Link>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 bg-primary/5 text-primary transition-all duration-300 px-3 py-2 relative nav-link" disabled>
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t('nav.account')}</span>
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-32">
        <div className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-primary mb-4">
            {t('account.title')}
          </h1>
          <p className="font-body text-xl text-muted-foreground leading-relaxed">
            {t('account.subtitle')}
          </p>
        </div>

        {isLoading ? (
          <Card className="rounded-3xl border border-border/50 bg-card shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ) : !isLoggedIn ? (
          <Card className="rounded-3xl border border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-primary flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary/50 rounded-2xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                {t('account.notLoggedIn.title')}
              </CardTitle>
              <CardDescription className="font-body text-muted-foreground leading-relaxed">
                {t('account.notLoggedIn.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-body text-muted-foreground leading-relaxed">
                {t('account.notLoggedIn.adminHint')}
              </p>
            </CardContent>
          </Card>
        ) : !isAdmin ? (
          <Card className="rounded-3xl border border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-interactive flex items-center gap-3">
                <div className="w-12 h-12 bg-interactive/20 rounded-2xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-interactive" />
                </div>
                {t('account.noPermission.title')}
              </CardTitle>
              <CardDescription className="font-body text-muted-foreground leading-relaxed">
                {t('account.noPermission.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-body text-muted-foreground leading-relaxed">
                {t('account.noPermission.note')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl border border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-accent flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6 text-accent" />
                </div>
                {t('account.adminAccount.title')}
              </CardTitle>
              <CardDescription className="font-body text-muted-foreground leading-relaxed">
                {t('account.adminAccount.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-body text-muted-foreground leading-relaxed">
                {t('account.adminAccount.adminAccessHint')}
              </p>
              <Link href="/admin">
                <Button className="rounded-2xl px-8 py-6 shadow-md hover:shadow-lg transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90">
                  {t('account.adminAccount.goToDashboard')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
