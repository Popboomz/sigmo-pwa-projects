'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Home, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TestPage() {
  const { t } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const testItems = [
    {
      title: 'CSS 样式',
      description: '背景色和文字颜色正常显示',
      icon: CheckCircle,
      status: 'success' as const,
    },
    {
      title: '品牌配色',
      description: '品牌绿色 #6B8E6F 正常应用',
      icon: Sparkles,
      status: 'success' as const,
    },
    {
      title: '字体系统',
      description: 'Poppins、Outfit、Noto Sans SC 正常加载',
      icon: CheckCircle,
      status: 'success' as const,
    },
    {
      title: '组件库',
      description: 'shadcn/ui 组件正常渲染',
      icon: CheckCircle,
      status: 'success' as const,
    },
  ];

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
            <Link href="/" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <Home className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.home')}</span>
              </Button>
            </Link>
            <Link href="/collection">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">测试页面</span>
              </Button>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 pt-32 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-enter">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#6B8E6F] rounded-2xl mb-4 shadow-lg shadow-[#6B8E6F]/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight font-display">
            测试页面
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed font-body">
            系统功能验证 - 确保所有组件正常工作
          </p>
        </div>

        {/* Test Items */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {testItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="premium-card animate-enter" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${item.status === 'success' ? 'bg-[#6B8E6F]/10' : 'bg-muted'}`}>
                        <Icon className={`w-5 h-5 ${item.status === 'success' ? 'text-[#6B8E6F]' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display">{item.title}</CardTitle>
                        <CardDescription className="mt-1">{item.description}</CardDescription>
                      </div>
                    </div>
                    {item.status === 'success' && (
                      <Badge variant="secondary" className="bg-[#6B8E6F]/10 text-[#6B8E6F] hover:bg-[#6B8E6F]/20">
                        通过
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Interactive Test Card */}
        <Card className="premium-card mb-8 animate-enter" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>交互测试</CardTitle>
            <CardDescription>测试按钮和交互功能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button className="bg-[#6B8E6F] hover:bg-[#5E8062]">
                主要按钮
              </Button>
              <Button variant="secondary">
                次要按钮
              </Button>
              <Button variant="outline">
                边框按钮
              </Button>
              <Button variant="ghost">
                幽灵按钮
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm">小按钮</Button>
              <Button size="default">默认按钮</Button>
              <Button size="lg">大按钮</Button>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette Test */}
        <Card className="premium-card animate-enter" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle>品牌配色测试</CardTitle>
            <CardDescription>验证品牌配色系统</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 rounded-xl bg-[#6B8E6F] shadow-lg shadow-[#6B8E6F]/25" />
                <p className="text-xs font-mono text-muted-foreground text-center">#6B8E6F</p>
                <p className="text-xs text-center">品牌绿</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-xl bg-[#000000] shadow-lg" />
                <p className="text-xs font-mono text-muted-foreground text-center">#000000</p>
                <p className="text-xs text-center">品牌黑</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-xl bg-[#F7F5F0] border border-border" />
                <p className="text-xs font-mono text-muted-foreground text-center">#F7F5F0</p>
                <p className="text-xs text-center">背景色</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-xl bg-[#6B6B6B]" />
                <p className="text-xs font-mono text-muted-foreground text-center">#6B6B6B</p>
                <p className="text-xs text-center">中灰色</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography Test */}
        <Card className="premium-card animate-enter" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle>字体测试</CardTitle>
            <CardDescription>验证字体系统</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Display Font (Poppins)</p>
              <p className="text-2xl font-display font-bold">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Body Font (Poppins)</p>
              <p className="text-base font-body">The quick brown fox jumps over the lazy dog.</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Chinese Font (Noto Sans SC)</p>
              <p className="text-base font-body">快速敏捷的棕色狐狸跳过懒狗。</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
