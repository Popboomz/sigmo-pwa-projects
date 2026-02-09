'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Smartphone, RefreshCw, Wifi, WifiOff, Check, X, Share2, Plus, AlertCircle, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAPage() {
  const { t } = useLanguage();
  const [isClient, setIsClient] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // 检测设备类型
    const checkDevice = () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(ios);

      setIsInstalled(
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-ignore
        window.navigator.standalone === true
      );
    };

    // 监听 beforeinstallprompt 事件
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    // 监听 appinstalled 事件
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    // 监听网络状态
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    checkDevice();
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const features = [
    {
      title: '离线访问',
      description: '即使在无网络的情况下，也能访问应用的核心功能',
      icon: WifiOff,
      status: true,
    },
    {
      title: '桌面图标',
      description: '安装后，应用会像原生应用一样显示在桌面上',
      icon: Smartphone,
      status: true,
    },
    {
      title: '快速启动',
      description: '应用启动速度更快，体验更流畅',
      icon: RefreshCw,
      status: true,
    },
    {
      title: '推送通知',
      description: '支持接收推送通知，及时获取重要信息',
      icon: Download,
      status: false,
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
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 bg-primary/5 text-primary transition-all duration-300 px-3 py-2 relative nav-link" disabled>
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">PWA</span>
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 pt-32 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-enter">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#6B8E6F] rounded-2xl mb-4 shadow-lg shadow-[#6B8E6F]/25">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight font-display">
            PWA 应用
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed font-body">
            渐进式 Web 应用 - 享受原生应用的体验
          </p>
          {isIOS && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#6B8E6F]/10 rounded-full border border-[#6B8E6F]/20">
              <AlertCircle className="w-4 h-4 text-[#6B8E6F]" />
              <span className="text-sm text-primary font-medium">
                iOS 设备已检测，请使用下方指南安装
              </span>
            </div>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                安装状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isInstalled ? (
                  <>
                    <Check className="w-5 h-5 text-[#6B8E6F]" />
                    <span className="text-lg font-semibold text-primary">
                      已安装
                    </span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-muted-foreground" />
                    <span className="text-lg font-semibold text-primary">
                      未安装
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                网络状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-5 h-5 text-[#6B8E6F]" />
                    <span className="text-lg font-semibold text-primary">
                      在线
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-muted-foreground" />
                    <span className="text-lg font-semibold text-primary">
                      离线
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                安装选项
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canInstall && !isInstalled && !isIOS ? (
                <Button onClick={handleInstall} className="w-full bg-[#6B8E6F] hover:bg-[#5E8062]">
                  <Download className="w-4 h-4 mr-2" />
                  安装应用
                </Button>
              ) : isInstalled ? (
                <Badge variant="secondary" className="w-full justify-center">
                  已安装在设备上
                </Badge>
              ) : isIOS ? (
                <div className="text-sm text-[#6B8E6F] font-medium">
                  iOS 设备
                  <div className="text-xs text-muted-foreground mt-1">
                    请查看下方安装指南
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  使用支持 PWA 的浏览器访问
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <Card className="premium-card mb-8">
          <CardHeader>
            <CardTitle>PWA 功能特性</CardTitle>
            <CardDescription>
              了解渐进式 Web 应用提供的所有功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 p-4 border border-border rounded-xl hover:bg-primary/5 transition-colors">
                  <div className={`p-2 rounded-xl ${feature.status ? 'bg-[#6B8E6F]/10' : 'bg-muted'}`}>
                    <feature.icon className={`w-5 h-5 ${feature.status ? 'text-[#6B8E6F]' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-primary font-display">
                        {feature.title}
                      </h3>
                      {feature.status && (
                        <Badge variant="secondary" className="text-xs">
                          支持
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Installation Guide */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>如何安装 PWA</CardTitle>
            <CardDescription>
              根据您的设备选择相应的安装方法
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* iOS 安装指南 - 突出显示 */}
            {isIOS && (
              <div className="p-6 bg-[#6B8E6F]/5 border-2 border-[#6B8E6F]/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#6B8E6F] rounded-xl flex items-center justify-center shadow-lg shadow-[#6B8E6F]/25">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary font-display">
                      iOS Safari (iPhone/iPad)
                    </h3>
                    <Badge variant="secondary" className="mt-1">
                      当前设备
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6B8E6F] text-white flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary mb-1 font-display">
                        点击分享按钮
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        点击 Safari 底部工具栏中的分享图标 <span className="inline-block px-2 py-1 bg-muted rounded text-sm font-mono ml-1">⎋</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6B8E6F] text-white flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary mb-1 font-display">
                        向下滚动并添加
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        在分享菜单中向下滚动，找到并点击 <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#6B8E6F]/10 rounded text-sm text-[#6B8E6F] font-medium"><Share2 className="w-3 h-3" /> 添加到主屏幕</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6B8E6F] text-white flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary mb-1 font-display">
                        确认安装
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        点击右上角的 <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#6B8E6F]/10 rounded text-sm text-[#6B8E6F] font-medium"><Plus className="w-3 h-3" /> 添加</span> 按钮
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chrome/Edge 安装指南 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#6B8E6F] rounded-xl flex items-center justify-center shadow-lg shadow-[#6B8E6F]/25">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary font-display">
                    Chrome / Edge (桌面)
                  </h3>
                  {!isIOS && <Badge variant="secondary" className="mt-1">推荐</Badge>}
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground ml-4 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span>点击地址栏右侧的安装图标 <span className="inline-block px-2 py-1 bg-[#6B8E6F]/10 rounded ml-1 font-mono text-[#6B8E6F]">⊕</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span>在弹出的对话框中点击"安装"按钮</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>应用将添加到桌面和开始菜单</span>
                </li>
              </ol>
            </div>

            {/* Android Chrome 安装指南 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#6B8E6F] rounded-xl flex items-center justify-center shadow-lg shadow-[#6B8E6F]/25">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary font-display">
                    Android Chrome
                  </h3>
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground ml-4 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span>点击地址栏右侧的菜单图标 (三个点 ⋮)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>选择"添加到主屏幕"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>点击"添加"完成安装</span>
                </li>
              </ol>
            </div>

            {/* Firefox 安装指南 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#6B8E6F] rounded-xl flex items-center justify-center shadow-lg shadow-[#6B8E6F]/25">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary font-display">
                    Firefox
                  </h3>
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground ml-4 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span>点击地址栏右侧的安装图标</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>在弹出的对话框中点击"安装"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>应用将添加到桌面和开始菜单</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
