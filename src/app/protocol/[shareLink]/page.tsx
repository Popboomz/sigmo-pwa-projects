'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Calendar, AlertCircle, CheckCircle, Share2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface TodayQuestionsResponse {
  success: boolean;
  state: 'normal' | 'ended';
  message?: string;
  questions?: any[];
  testDay?: number;
  isGenerated?: boolean;
  materialState?: string;
  lifecyclePhase?: string;
  logicBranch?: string;
  completedDays?: number;
  testPeriodDays?: number;
}

async function fetchWithTimeout(input: RequestInfo | URL, timeoutMs = 30000, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'AbortError'));
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function ProtocolLandingPage() {
  const params = useParams();
  const shareLink = params.shareLink as string;
  const router = useRouter();
  const { toast } = useToast();

  const [protocol, setProtocol] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 进度信息（从 today 接口获取）
  const [progressInfo, setProgressInfo] = useState<{
    completedDays: number;
    testPeriodDays: number;
    materialState?: string;
    currentDay?: number;
  }>({
    completedDays: 0,
    testPeriodDays: 21,
  });

  // 提前结束测试相关状态
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEndingTest, setIsEndingTest] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [endMessage, setEndMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProtocolData();
  }, [shareLink]);

  const loadProtocolData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // 加载协议信息（添加10秒超时）
      const protocolRes = await fetchWithTimeout(`/api/public/protocol/${shareLink}`);

      if (!protocolRes.ok) {
        if (protocolRes.status === 404) {
          setLoadError('测试协议不存在，请检查链接是否正确');
          return;
        }
        throw new Error('Failed to load protocol');
      }
      const protocolData = await protocolRes.json();
      setProtocol(protocolData.data);

      // 获取今日问卷和进度信息（添加10秒超时）
      const todayRes = await fetchWithTimeout(`/api/public/questionnaire/today?shareLink=${shareLink}`);
      if (todayRes.ok) {
        const todayData: TodayQuestionsResponse = await todayRes.json();

        setProgressInfo({
          completedDays: todayData.completedDays || 0,
          testPeriodDays: todayData.testPeriodDays || protocolData.data.testPeriodDays || 21,
          materialState: todayData.materialState,
          currentDay: todayData.testDay,
        });

        // 如果测试已结束，跳转到完成页面
        if (todayData.state === 'ended') {
          router.replace(`/protocol/${shareLink}/completed`);
          return;
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && error?.message !== 'Failed to fetch') {
        console.error('Failed to load protocol data:', error);
      }
      
      // 提供更详细的错误信息
      if (error.name === 'AbortError') {
        setLoadError('请求超时，请检查网络连接后刷新页面重试');
      } else if (error.message) {
        setLoadError(`加载失败：${error.message}，请稍后重试`);
      } else {
        setLoadError('加载测试协议失败，请稍后重试或联系管理员');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTest = async () => {
    setIsStarting(true);

    try {
      // 调用 today 接口获取今日问卷（添加10秒超时）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/public/questionnaire/today?shareLink=${shareLink}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data: TodayQuestionsResponse = await response.json();

      if (!response.ok || data.state === 'ended') {
        toast({
          title: '提示',
          description: data.message || '测试已结束',
        });
        router.replace(`/protocol/${shareLink}/completed`);
        return;
      }

      // 跳转到问卷填写页面
      const targetUrl = `/protocol/${shareLink}/day/${data.testDay}`;
      router.push(targetUrl);
    } catch (error: any) {
      if (error?.name !== 'AbortError' && error?.message !== 'Failed to fetch') {
        console.error('Failed to start test:', error);
      }
      
      let errorMessage = '加载问卷失败，请重试';
      if (error.name === 'AbortError') {
        errorMessage = '请求超时，请检查网络连接后重试';
      } else if (error.message) {
        errorMessage = `加载失败：${error.message}`;
      }
      
      toast({
        title: '错误',
        description: errorMessage,
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndTest = async () => {
    if (!endReason.trim()) {
      setEndMessage({ type: 'error', text: '请填写结束原因' });
      return;
    }

    setIsEndingTest(true);
    setEndMessage(null);

    try {
      const response = await fetch('/api/public/protocol/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareLink,
          endReason,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setEndMessage({ type: 'error', text: data.error || '提交失败' });
        return;
      }

      setEndMessage({ type: 'success', text: '测试已结束，感谢您的参与！' });

      setTimeout(() => {
        setShowEndDialog(false);
        router.replace(`/protocol/${shareLink}/completed`);
      }, 2000);
    } catch (error) {
      setEndMessage({ type: 'error', text: '提交失败，请重试' });
    } finally {
      setIsEndingTest(false);
    }
  };

  const getProgress = () => {
    const { completedDays, testPeriodDays } = progressInfo;
    return Math.round((completedDays / testPeriodDays) * 100);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/protocol/${shareLink}`;
    const productName = protocol?.productName || '产品';

    // 检测是否支持 Web Share API 且在 HTTPS 或 localhost 环境
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (navigator.share && isSecureContext) {
      try {
        // 触觉反馈（仅支持振动的设备）
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }

        await navigator.share({
          title: `${productName} 测试`,
          text: '邀请你参与产品测试，填写问卷反馈使用体验',
          url: url
        });
        return;
      } catch (err: any) {
        // AbortError 表示用户取消了分享，静默处理
        if (err.name === 'AbortError') {
          return;
        }
        
        // 其他错误（包括 NotAllowedError），降级到复制链接
        // 继续执行降级逻辑
      }
    }
    
    // 降级逻辑：复制链接到剪贴板
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: '链接已复制到剪贴板',
        description: isSecureContext 
          ? '系统分享暂不可用，已复制链接，请手动分享' 
          : '当前环境不支持系统分享，已复制链接到剪贴板',
      });
    } catch (err) {
      toast({
        title: '复制失败',
        description: '请手动复制链接：' + url,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen mesh-bg y2k-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (loadError || !protocol) {
    return (
      <div className="min-h-screen mesh-bg y2k-shell flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="border-red-200 premium-card y2k-panel">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900">加载失败</CardTitle>
                  <CardDescription className="text-red-700">
                    {loadError || '测试协议不存在'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                请检查分享链接是否正确，或联系管理员获取新的测试链接。
              </p>
              <div className="flex gap-2">
                <Button onClick={() => router.push('/')} variant="outline" className="flex-1">
                  返回首页
                </Button>
                <Button onClick={() => window.location.reload()} variant="default" className="flex-1">
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const { completedDays, testPeriodDays } = progressInfo;
  const productName = protocol?.productName || '产品';
  const protocolTitle = protocol?.title || '产品测试';
  const protocolDescription =
    protocol?.description?.trim() ||
    '请根据真实使用体验完成测试。你的评分、吐槽和建议都会直接用于后续产品优化。';

  return (
    <div className="min-h-screen mesh-bg y2k-shell relative overflow-hidden">
      {/* Floating Gradients */}
      <div className="fixed top-[-30%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[rgba(122,168,255,0.14)] blur-[140px] pointer-events-none mix-blend-multiply animate-float-slow" />
      <div className="fixed bottom-[-30%] left-[-10%] w-[800px] h-[800px] rounded-full bg-[rgba(213,192,255,0.16)] blur-[140px] pointer-events-none mix-blend-multiply animate-float-slow delay-200" />

      {/* Header */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-20px)] max-w-[1200px] glass y2k-nav rounded-2xl shadow-sm z-50 px-4 py-2.5 sm:top-4 sm:w-[calc(100%-32px)] sm:px-6 sm:py-3">
        <div className="flex justify-between items-center">
          {/* Logo and Brand Name - Centered */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105 navbar-logo">
              <span className="text-2xl font-display font-bold brand-mark-text">Σ</span>
            </div>
            <div className="font-display font-bold text-lg sm:text-xl tracking-tight brand-wordmark">
              SIGMÖ
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 y2k-ghost"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">分享</span>
            </Button>
            <Badge variant="outline" className="max-w-[120px] sm:max-w-none truncate text-xs sm:text-sm y2k-chip">
              {productName}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-5 pt-24 sm:py-6 sm:pt-28 relative z-10">
        {/* Welcome Card */}
        <Card className="mb-6 premium-card y2k-panel">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="y2k-chip text-primary">
                {protocolTitle}
              </Badge>
              <Badge variant="outline" className="y2k-chip">
                {testPeriodDays} 天测试周期
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-lg sm:text-xl font-semibold text-primary font-display leading-tight">
                {productName}
              </CardTitle>
              <p className="text-sm text-primary/90 font-medium">
                正在参与：{protocolTitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl px-3 py-3 y2k-stat">
                <div className="text-[11px] text-[color:var(--brand-medium-gray)] font-semibold mb-1">测试名称</div>
                <div className="text-sm font-medium text-primary leading-5 line-clamp-2">{protocolTitle}</div>
              </div>
              <div className="rounded-2xl px-3 py-3 y2k-stat">
                <div className="text-[11px] text-[color:var(--brand-medium-gray)] font-semibold mb-1">测试产品</div>
                <div className="text-sm font-medium text-primary leading-5 line-clamp-2">{productName}</div>
              </div>
              <div className="rounded-2xl px-3 py-3 y2k-stat col-span-2 sm:col-span-1">
                <div className="text-[11px] text-[color:var(--brand-medium-gray)] font-semibold mb-1">测试周期</div>
                <div className="text-sm font-medium text-primary leading-5">{testPeriodDays} 天</div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3">
              <div className="text-xs font-medium text-primary mb-2">测试说明</div>
              <CardDescription className="text-sm text-[color:var(--brand-dark-gray)] whitespace-pre-line leading-7">
                {protocolDescription}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary font-display">
              测试信息
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-white/50 p-4">
              <div className="text-xs text-muted-foreground mb-2">测试名称</div>
              <div className="text-sm font-medium text-primary leading-6">{protocolTitle}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white/50 p-4">
              <div className="text-xs text-muted-foreground mb-2">测试产品</div>
              <div className="text-sm font-medium text-primary leading-6">{productName}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white/50 p-4">
              <div className="text-xs text-muted-foreground mb-2">测试周期</div>
              <div className="text-sm font-medium text-primary leading-6">{testPeriodDays} 天</div>
            </div>
          </CardContent>
        </Card>

        {/* Start Test Card */}
        <Card className="mb-6 premium-card y2k-panel">
          <CardHeader className="space-y-2">
            <CardTitle
              className="flex items-center gap-2.5 text-lg"
              style={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: '600',
                color: '#1A1A1A'
              }}
            >
              <Play className="w-5 h-5 text-[var(--y2k-blue)]" />
              开始测试
            </CardTitle>
            <CardDescription className="text-[color:var(--brand-dark-gray)] text-sm leading-7">
              今天填写 1 次反馈，系统会根据你的历史评分继续追踪问题变化。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/70 y2k-stat px-4 py-3 text-sm text-primary">
              当前进度 {completedDays}/{testPeriodDays} 天
            </div>
            <Button
              onClick={handleStartTest}
              disabled={isStarting || completedDays >= testPeriodDays}
              className="w-full rounded-[14px] font-semibold text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(108,167,255,0.32)] active:translate-y-0 text-white y2k-button"
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #7ee8ff, #6da7ff 42%, #d0b6ff)',
                boxShadow: '0 10px 24px rgba(108, 167, 255, 0.24)'
              }}
              size="lg"
            >
              {isStarting ? '加载中...' : completedDays >= testPeriodDays ? '测试已完成' : '开始填写'}
            </Button>
            {completedDays >= testPeriodDays && (
              <p className="text-sm text-primary text-center font-medium">
                所有测试日已完成
              </p>
            )}
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="mb-6 premium-card y2k-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2.5 text-xl font-semibold text-primary font-display">
                <Calendar className="w-5 h-5 text-primary" />
                测试进度
              </CardTitle>
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold y2k-chip">
                {progress}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-primary"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Days Status */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: testPeriodDays }, (_, i) => i + 1).map((day) => {
                  const isCompleted = day <= completedDays;
                  const isCurrent = day === completedDays + 1 && !isCompleted;

                  return (
                    <div
                      key={day}
                      className={`flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 ${
                        isCompleted
                          ? 'bg-primary border-primary text-primary-foreground'
                          : isCurrent
                          ? 'border-2 border-primary bg-primary/10 text-primary'
                          : 'bg-muted/30 border-border text-muted-foreground'
                      }`}
                      style={{ width: '42px', height: '50px' }}
                    >
                      <span className="text-sm font-medium">
                        {day}
                      </span>
                      {isCompleted && <CheckCircle className="w-4 h-4 mt-0.5" />}
                    </div>
                  );
                })}
              </div>

              {/* Statistics */}
              <div className="flex justify-center gap-12 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary font-display">
                    {completedDays}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">已提交</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary font-display">
                    {testPeriodDays - completedDays}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">待提交</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground font-display">
                    {testPeriodDays}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">总天数</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* End Test Card */}
        <Card className="mb-6 premium-card y2k-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-xl font-semibold text-primary font-display">
              <Square className="w-5 h-5 text-destructive" />
              提前结束
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              如果产品用完或特殊情况，可以提前结束测试
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowEndDialog(true)}
              variant="outline"
              disabled={completedDays >= testPeriodDays}
              className="w-full rounded-xl font-medium transition-all duration-200 hover:border-destructive hover:text-destructive hover:bg-destructive/5 y2k-ghost"
              size="lg"
            >
              提前结束测试
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              需要填写结束原因
            </p>
          </CardContent>
        </Card>
      </div>

      {/* End Test Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提前结束测试</DialogTitle>
            <DialogDescription>
              请填写结束测试的原因，这将帮助我们改进产品。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="endReason">结束原因 *</Label>
              <Textarea
                id="endReason"
                placeholder="请详细说明结束测试的原因..."
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                rows={4}
              />
            </div>
            {endMessage && (
              <p className={`text-sm ${endMessage.type === 'error' ? 'text-destructive' : 'text-primary'}`}>
                {endMessage.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEndDialog(false);
                setEndReason('');
                setEndMessage(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleEndTest}
              disabled={isEndingTest}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isEndingTest ? '提交中...' : '确认结束'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
