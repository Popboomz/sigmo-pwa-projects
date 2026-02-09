'use client';

import { useState, useEffect } from 'react';
import { X, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function IOSInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // 检测是否为 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // 检测是否在独立模式运行（已安装）
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // 只在 iOS 设备且未安装时显示
    if (isIOS && !isStandalone && !dismissed) {
      // 延迟显示，避免打扰用户
      const timer = setTimeout(() => {
        // 检查 localStorage 是否已关闭
        const wasDismissed = localStorage.getItem('ios-banner-dismissed');
        if (!wasDismissed) {
          setShowBanner(true);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('ios-banner-dismissed', 'true');
  };

  const handleLearnMore = () => {
    // 跳转到 PWA 页面查看详细说明
    window.location.href = '/pwa';
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/90 to-black/80 backdrop-blur-sm">
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    安装到主屏幕
                  </h3>
                  <p className="text-sm text-white/80">
                    获得更好的使用体验
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <strong>如何安装？</strong>
                </p>
                <ol className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                    <span>点击底部的"分享"图标 <span className="font-medium">⎋</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                    <span>向下滚动并选择"添加到主屏幕"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
                    <span>点击右上角的"添加"按钮</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="flex-1"
              >
                稍后再说
              </Button>
              <Button
                onClick={handleLearnMore}
                className="flex-1"
              >
                了解更多
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
