'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LogOut, FileText, ClipboardList, Plus, Share2, AlertCircle, 
  Sparkles, Download, Trash2, Loader2, MessageSquare, 
  CheckCircle, Calendar, Copy, Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ErrorLogViewer } from '@/components/ErrorLogViewer';
import { useToast } from '@/components/ui/use-toast';
import { toast } from '@/components/ui/pwa-toast';
import { actionSheet } from '@/components/ui/action-sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

interface Protocol {
  id: string;
  title: string;
  description: string | null;
  shareLink: string;
  productName?: string;
  testPeriodDays?: number;
  createdBy: string;
  createdAt: string;
}

interface Message {
  id: string;
  authorName: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

interface QuestionnaireAnswer {
  id: string;
  questionnaireId: string;
  protocolId: string;
  dayIndex: number;
  answers: Array<{
    questionId: string;
    score: number;
    question: string;
  }>;
  remark: string | null;
  submittedAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { toast: shadcnToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('');

  // 留言相关状态
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageAuthorName, setMessageAuthorName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // 创建协议相关状态
  const [newProtocolTitle, setNewProtocolTitle] = useState('');
  const [newProtocolDesc, setNewProtocolDesc] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newTestPeriodDays, setNewTestPeriodDays] = useState(28);
  const [isCreatingProtocol, setIsCreatingProtocol] = useState(false);

  // PPT 生成相关状态
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  // AI 分析相关状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 问卷答案相关状态
  const [isProcessingAnswers, setIsProcessingAnswers] = useState(false);
  const [answersAnalysisResult, setAnswersAnalysisResult] = useState<any>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [processStep, setProcessStep] = useState<'analyzing' | 'exporting' | 'done'>('done');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('/api/admin/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);
      fetchData();
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('admin_token');
      router.push('/admin/login');
    }
  };

  const fetchData = async () => {
    try {
      const [protocolsRes, messagesRes] = await Promise.all([
        fetch('/api/admin/protocols'),
        fetch('/api/admin/messages'),
      ]);

      if (protocolsRes.ok) {
        const protocolsData = await protocolsRes.json();
        setProtocols(protocolsData.data || []);

        // 设置默认选中的协议（第一个）并加载问卷答案
        if (protocolsData.data && protocolsData.data.length > 0) {
          const firstProtocolId = protocolsData.data[0].id;
          if (!selectedProtocolId) {
            setSelectedProtocolId(firstProtocolId);
          }
          await loadQuestionnaireAnswers(selectedProtocolId || firstProtocolId);
        }
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const loadQuestionnaireAnswers = async (protocolId: string) => {
    try {
      const answersRes = await fetch(`/api/admin/questionnaire-answers?protocolId=${protocolId}`);
      if (answersRes.ok) {
        const answersData = await answersRes.json();
        setQuestionnaireAnswers(answersData.data || []);
      }
    } catch (error) {
      console.error('Failed to load questionnaire answers:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingProtocol(true);

    try {
      const response = await fetch('/api/admin/protocols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newProtocolTitle,
          description: newProtocolDesc,
          productName: newProductName || '测试产品',
          testPeriodDays: newTestPeriodDays || 28,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewProtocolTitle('');
        setNewProtocolDesc('');
        setNewProductName('');
        setNewTestPeriodDays(28);
        fetchData();

        shadcnToast({
          title: '协议创建成功',
          description: `问卷正在后台生成中（${newTestPeriodDays || 28}天）`,
        });
      }
    } catch (error) {
      console.error('Failed to create protocol:', error);
      shadcnToast({
        title: '创建失败',
        description: '请稍后重试',
      });
    } finally {
      setIsCreatingProtocol(false);
    }
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingMessage(true);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          authorName: messageAuthorName,
          content: messageContent,
          createdBy: user?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessageAuthorName('');
        setMessageContent('');
        setShowMessageForm(false);
        const messagesRes = await fetch('/api/admin/messages');
        const messagesData = await messagesRes.json();
        setMessages(messagesData.data || []);
        
        shadcnToast({
          title: '留言创建成功',
        });
      }
    } catch (error) {
      console.error('Failed to create message:', error);
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, authorName: string) => {
    const confirmed = await actionSheet({
      title: '确定删除？',
      message: `此操作将删除留言 "${authorName}"，且无法恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
    });

    if (!confirmed) return;

    setDeletingMessageId(messageId);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        setMessages(messages.filter(m => m.id !== messageId));
        shadcnToast({
          title: '删除成功',
        });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const shareLink = async (title: string, shareLink: string) => {
    const url = `${window.location.origin}/protocol/${shareLink}`;
    const fullTitle = `${title} - 产品测试邀请`;
    const shareText = `邀请你参与「${title}」产品测试，点击链接开始填写问卷：`;
    
    // 检测是否支持 Web Share API 且在 HTTPS 或 localhost 环境
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (navigator.share && isSecureContext) {
      try {
        // 触觉反馈（仅支持振动的设备）
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }

        await navigator.share({
          title: fullTitle,
          text: shareText,
          url: url,
        });

        // 分享成功提示
        shadcnToast({
          title: '分享成功',
          description: '链接已通过系统分享菜单发送',
        });
        return;
      } catch (err: any) {
        // AbortError 表示用户取消了分享，静默处理
        if (err.name === 'AbortError') {
          return;
        }

        // NotAllowedError 或其他错误，降级到复制链接
        // 继续执行降级逻辑
      }
    }
    
    // 降级逻辑：复制链接到剪贴板
    try {
      await navigator.clipboard.writeText(url);
      shadcnToast({
        title: '链接已复制到剪贴板',
        description: isSecureContext 
          ? '系统分享暂不可用，已复制链接，请手动分享' 
          : '当前环境不支持系统分享，已复制链接到剪贴板',
      });
    } catch (clipboardErr) {
      // 连复制都失败了（可能浏览器不支持）
      shadcnToast({
        title: '复制失败',
        description: '请手动复制以下链接：' + url,
      });
    }
  };

  const handleDeleteProtocol = async (protocolId: string, protocolTitle: string) => {
    const confirmed = await actionSheet({
      title: '确定删除？',
      message: `此操作将同时删除协议 "${protocolTitle}" 下的所有问卷、问卷答案和日志数据，且无法恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/protocols/${protocolId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        shadcnToast({
          title: '删除失败',
          description: data.error || '请稍后重试',
        });
        return;
      }

      fetchData();
      shadcnToast({
        title: '删除成功',
      });
    } catch (error) {
      console.error('Failed to delete protocol:', error);
      shadcnToast({
        title: '删除失败',
        description: '请稍后重试',
      });
    }
  };

  const handleGeneratePPT = async () => {
    console.log('=== 开始生成 PPT ===');
    console.log('留言数量:', messages.length);

    if (messages.length === 0) {
      shadcnToast({
        title: '无法生成',
        description: '暂无留言数据，无法生成报告',
      });
      return;
    }

    setIsAnalyzing(true);
    setIsGeneratingPPT(true);

    try {
      // 第一步：调用 AI 分析接口
      console.log('步骤1: 调用 AI 分析接口');
      shadcnToast({
        title: '开始分析',
        description: '正在调用豆包 AI 分析留言数据...',
      });

      let analyzeResponse: Response;
      try {
        analyzeResponse = await fetch('/api/admin/messages/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // 发送空对象作为请求体
        });
      } catch (fetchError) {
        console.error('AI 分析请求失败:', fetchError);
        throw new Error('网络错误，无法连接到服务器');
      }

      console.log('AI 分析响应状态:', analyzeResponse.status);

      if (!analyzeResponse.ok) {
        let errorMessage = 'AI 分析失败';
        try {
          const errorData = await analyzeResponse.json();
          console.error('AI 分析错误响应:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.error('解析错误响应失败:', parseError);
        }
        throw new Error(errorMessage);
      }

      let analyzeData;
      try {
        analyzeData = await analyzeResponse.json();
      } catch (parseError) {
        console.error('解析 AI 分析响应失败:', parseError);
        throw new Error('解析 AI 分析结果失败');
      }

      console.log('AI 分析结果:', analyzeData);

      if (!analyzeData.success || !analyzeData.analysis) {
        throw new Error('分析结果获取失败: ' + (analyzeData.error || '未知错误'));
      }

      setAnalysisResult(analyzeData.analysis);
      setIsAnalyzing(false);

      shadcnToast({
        title: '分析完成',
        description: 'AI 分析已完成，正在生成 PPT...',
      });

      // 第二步：使用分析结果生成 PPT
      console.log('步骤2: 生成 PPT');
      let pptResponse: Response;
      try {
        pptResponse = await fetch('/api/admin/messages/generate-ppt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysis: analyzeData.analysis,
          }),
        });
      } catch (fetchError) {
        console.error('PPT 生成请求失败:', fetchError);
        throw new Error('网络错误，无法连接到服务器');
      }

      console.log('PPT 生成响应状态:', pptResponse.status);

      if (!pptResponse.ok) {
        throw new Error('PPT 生成失败');
      }

      // 第三步：下载文件
      console.log('步骤3: 下载文件');
      const blob = await pptResponse.blob();
      console.log('Blob 大小:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('生成的文件为空');
      }

      const url = window.URL.createObjectURL(blob);
      console.log('Blob URL:', url);

      const link = document.createElement('a');
      link.href = url;
      link.download = `留言分析报告_${new Date().toISOString().slice(0, 10)}.pptx`;
      console.log('开始下载:', link.download);

      link.click();
      window.URL.revokeObjectURL(url);

      shadcnToast({
        title: 'PPT 生成成功',
        description: '文件已开始下载',
      });

      console.log('=== PPT 生成完成 ===');
    } catch (error) {
      console.error('PPT 生成失败:', error);
      const errorMessage = error instanceof Error ? error.message : '请稍后重试';

      shadcnToast({
        title: '生成失败',
        description: errorMessage,
      });
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingPPT(false);
    }
  };

  const handleAnalyzeAndExport = async () => {
    console.log('=== 开始 AI 分析并导出 Excel ===');
    console.log('问卷答案数量:', questionnaireAnswers.length);

    if (!selectedProtocolId) {
      shadcnToast({
        title: '无法操作',
        description: '请先选择一个协议',
      });
      return;
    }

    if (questionnaireAnswers.length === 0) {
      shadcnToast({
        title: '无法操作',
        description: '暂无问卷答案，无法进行分析和导出',
      });
      return;
    }

    setIsProcessingAnswers(true);
    setProcessStep('analyzing');

    try {
      // 第一步：AI 分析
      shadcnToast({
        title: '开始分析',
        description: '正在调用豆包 AI 分析问卷答案...',
      });

      let analyzeResponse: Response;
      try {
        analyzeResponse = await fetch('/api/admin/questionnaire-answers/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            protocolId: selectedProtocolId,
          }),
        });
      } catch (fetchError) {
        console.error('AI 分析请求失败:', fetchError);
        throw new Error('网络错误，无法连接到服务器');
      }

      console.log('AI 分析响应状态:', analyzeResponse.status);

      if (!analyzeResponse.ok) {
        let errorMessage = 'AI 分析失败';
        try {
          const errorData = await analyzeResponse.json();
          console.error('AI 分析错误响应:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.error('解析错误响应失败:', parseError);
        }
        throw new Error(errorMessage);
      }

      let analyzeData;
      try {
        analyzeData = await analyzeResponse.json();
      } catch (parseError) {
        console.error('解析 AI 分析响应失败:', parseError);
        throw new Error('解析 AI 分析结果失败');
      }

      console.log('AI 分析结果:', analyzeData);

      if (!analyzeData.success || !analyzeData.analysis) {
        throw new Error('分析结果获取失败: ' + (analyzeData.error || '未知错误'));
      }

      setAnswersAnalysisResult(analyzeData.analysis);
      setProcessStep('exporting');

      shadcnToast({
        title: '分析完成',
        description: '正在导出 Excel...',
      });

      // 第二步：导出 Excel
      await exportExcel();

      setProcessStep('done');
      setShowAnalysisDialog(true);

      shadcnToast({
        title: '操作成功',
        description: 'AI 分析完成，Excel 文件已开始下载',
      });

      console.log('=== AI 分析并导出 Excel 完成 ===');
    } catch (error) {
      console.error('操作失败:', error);
      const errorMessage = error instanceof Error ? error.message : '请稍后重试';

      shadcnToast({
        title: '操作失败',
        description: errorMessage,
      });
    } finally {
      setIsProcessingAnswers(false);
      setProcessStep('done');
    }
  };

  const exportExcel = async () => {
    console.log('导出 Excel 文件');
    let exportResponse: Response;
    try {
      exportResponse = await fetch('/api/admin/questionnaire-answers/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocolId: selectedProtocolId,
        }),
      });
    } catch (fetchError) {
      console.error('Excel 导出请求失败:', fetchError);
      throw new Error('网络错误，无法连接到服务器');
    }

    console.log('Excel 导出响应状态:', exportResponse.status);

    if (!exportResponse.ok) {
      let errorMessage = 'Excel 导出失败';
      try {
        const errorData = await exportResponse.json();
        console.error('Excel 导出错误响应:', errorData);
        errorMessage = errorData.error || errorData.details || errorMessage;
      } catch (parseError) {
        console.error('解析错误响应失败:', parseError);
      }
      throw new Error(errorMessage);
    }

    // 下载文件
    const blob = await exportResponse.blob();
    console.log('Blob 大小:', blob.size, 'bytes');

    if (blob.size === 0) {
      throw new Error('生成的文件为空');
    }

    const url = window.URL.createObjectURL(blob);
    console.log('Blob URL:', url);

    const link = document.createElement('a');
    link.href = url;
    link.download = `问卷答案_${new Date().toISOString().slice(0, 10)}.xlsx`;
    console.log('开始下载:', link.download);

    link.click();
    window.URL.revokeObjectURL(url);

    console.log('=== Excel 导出完成 ===');
  };

  if (!user) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6B8E6F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg relative overflow-hidden font-body text-primary">
      {/* Floating Gradients */}
      <div className="fixed top-[-30%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#6B8E6F]/8 blur-[140px] pointer-events-none mix-blend-multiply animate-float-slow" />
      <div className="fixed bottom-[-30%] left-[-10%] w-[800px] h-[800px] rounded-full bg-[#6B8E6F]/5 blur-[140px] pointer-events-none mix-blend-multiply animate-float-slow delay-200" />

      {/* Navigation */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1200px] glass rounded-2xl shadow-sm z-50 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6B8E6F] rounded-full flex items-center justify-center shadow-lg shadow-[#6B8E6F]/25">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-xl tracking-tight text-primary">
                管理后台
              </div>
              <div className="text-xs text-muted-foreground">{user.name}</div>
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2">
            <Link href="/" className="group">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300">
                <span className="hidden sm:inline">查看网站</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出</span>
            </Button>
            <ErrorLogViewer />
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-enter">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B8E6F]/10 rounded-full border border-[#6B8E6F]/20 mb-4">
            <Sparkles className="w-4 h-4 text-[#6B8E6F]" />
            <span className="text-sm font-medium text-[#6B8E6F]">管理仪表盘</span>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2 font-display">
            欢迎回来，{user.name}
          </h1>
          <p className="text-muted-foreground">
            管理测试协议、问卷数据和留言
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="premium-card">
            <CardHeader className="pb-2 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                测试协议
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">{protocols.length}</div>
                <ClipboardList className="w-6 h-6 text-[#6B8E6F]" />
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="pb-2 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                问卷答案
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">{questionnaireAnswers.length}</div>
                <FileText className="w-6 h-6 text-[#6B8E6F]" />
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="pb-2 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                留言数量
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">{messages.length}</div>
                <MessageSquare className="w-6 h-6 text-[#6B8E6F]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="protocols" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="protocols" className="data-[state=active]:bg-[#6B8E6F] data-[state=active]:text-white">
              <ClipboardList className="w-4 h-4 mr-2" />
              测试协议
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-[#6B8E6F] data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              留言管理
            </TabsTrigger>
            <TabsTrigger value="answers" className="data-[state=active]:bg-[#6B8E6F] data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              问卷答案
            </TabsTrigger>
          </TabsList>

          {/* Protocols Tab */}
          <TabsContent value="protocols" className="space-y-6">
            {/* Create Protocol */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>创建测试协议</CardTitle>
                <CardDescription>
                  创建新的产品测试协议并生成问卷
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProtocol} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">协议标题 *</Label>
                      <Input
                        id="title"
                        placeholder="例如：2024年春季面霜测试"
                        value={newProtocolTitle}
                        onChange={(e) => setNewProtocolTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productName">产品名称</Label>
                      <Input
                        id="productName"
                        placeholder="例如：修护面霜"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">协议描述</Label>
                    <Textarea
                      id="description"
                      placeholder="描述测试的目的和要求"
                      value={newProtocolDesc}
                      onChange={(e) => setNewProtocolDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testPeriodDays">测试周期（天）</Label>
                    <Input
                      id="testPeriodDays"
                      type="number"
                      min="1"
                      max="30"
                      placeholder="默认为21天"
                      value={newTestPeriodDays}
                      onChange={(e) => setNewTestPeriodDays(parseInt(e.target.value) || 21)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isCreatingProtocol}
                    className="w-full bg-[#6B8E6F] hover:bg-[#5E8062]"
                  >
                    {isCreatingProtocol ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        创建协议
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Existing Protocols */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>现有测试协议</CardTitle>
                <CardDescription>
                  管理现有的测试协议，分享链接或删除
                </CardDescription>
              </CardHeader>
              <CardContent>
                {protocols.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">暂无测试协议</p>
                    <p className="text-sm text-muted-foreground">
                      创建第一个测试协议开始收集数据
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {protocols.map((protocol) => (
                      <div
                        key={protocol.id}
                        className="p-4 border border-border rounded-xl hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-primary font-display mb-1">
                              {protocol.title}
                            </h4>
                            {protocol.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {protocol.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(protocol.createdAt).toLocaleDateString()}
                              </span>
                              {protocol.productName && (
                                <Badge variant="secondary" className="text-xs">
                                  {protocol.productName}
                                </Badge>
                              )}
                              {protocol.testPeriodDays && (
                                <Badge variant="outline" className="text-xs">
                                  {protocol.testPeriodDays}天
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => shareLink(protocol.title, protocol.shareLink)}
                            >
                              <Share2 className="w-4 h-4 mr-1" />
                              分享
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProtocol(protocol.id, protocol.title)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            {/* Generate PPT */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>生成分析报告</CardTitle>
                <CardDescription>
                  基于留言数据生成 PPT 报告
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleGeneratePPT}
                  disabled={isGeneratingPPT || messages.length === 0}
                  className="w-full bg-[#6B8E6F] hover:bg-[#5E8062]"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                      AI 分析中...
                    </>
                  ) : isGeneratingPPT ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成 PPT 中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      下载 PPT 报告
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  {isAnalyzing && (
                    <>
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      <span>正在调用豆包 AI 分析留言数据...</span>
                    </>
                  )}
                  {isGeneratingPPT && !isAnalyzing && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>正在生成 PPT 报告...</span>
                    </>
                  )}
                </div>
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    暂无留言数据，无法生成报告
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Create Message */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>添加留言</CardTitle>
                <CardDescription>
                  添加新的留言或观察记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateMessage} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="authorName">作者名称</Label>
                      <Input
                        id="authorName"
                        placeholder="您的姓名"
                        value={messageAuthorName}
                        onChange={(e) => setMessageAuthorName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">留言内容</Label>
                    <Textarea
                      id="content"
                      placeholder="输入留言内容..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmittingMessage}
                    className="w-full bg-[#6B8E6F] hover:bg-[#5E8062]"
                  >
                    {isSubmittingMessage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        添加留言
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Messages List */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>留言列表</CardTitle>
                <CardDescription>
                  查看和管理所有留言
                </CardDescription>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">暂无留言</p>
                    <p className="text-sm text-muted-foreground">
                      添加第一条留言开始记录
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 border border-border rounded-xl hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-primary font-display">
                                {message.authorName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {message.content}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMessage(message.id, message.authorName)}
                            disabled={deletingMessageId === message.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingMessageId === message.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questionnaire Answers Tab */}
          <TabsContent value="answers" className="space-y-6">
            <Card className="premium-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>问卷答案</CardTitle>
                    <CardDescription>
                      查看用户提交的问卷答案
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleAnalyzeAndExport}
                    disabled={isProcessingAnswers || !selectedProtocolId || questionnaireAnswers.length === 0}
                    className="bg-[#6B8E6F] hover:bg-[#5E8062]"
                  >
                    {isProcessingAnswers ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {processStep === 'analyzing' ? 'AI 分析中...' : '导出 Excel 中...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI 分析并导出
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {protocols.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">暂无测试协议</p>
                    <p className="text-sm text-muted-foreground">
                      创建测试协议后即可查看问卷答案
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Protocol Selector */}
                    <div className="space-y-2 mb-6">
                      <Label htmlFor="answer-protocol-select">选择协议</Label>
                      <Select
                        value={selectedProtocolId}
                        onValueChange={(value) => {
                          setSelectedProtocolId(value);
                          loadQuestionnaireAnswers(value);
                        }}
                      >
                        <SelectTrigger id="answer-protocol-select">
                          <SelectValue placeholder="选择一个协议" />
                        </SelectTrigger>
                        <SelectContent>
                          {protocols.map((protocol) => (
                            <SelectItem key={protocol.id} value={protocol.id}>
                              {protocol.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Answers List */}
                    {questionnaireAnswers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground mb-4">暂无问卷答案</p>
                        <p className="text-sm text-muted-foreground">
                          等待用户填写问卷后即可查看答案
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {questionnaireAnswers.map((answer) => (
                          <div
                            key={answer.id}
                            className="p-4 border border-border rounded-xl hover:bg-primary/5 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  第 {answer.dayIndex} 天
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(answer.submittedAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Answers */}
                            <div className="space-y-2">
                              {answer.answers.map((item, index) => (
                                <div key={index} className="text-sm">
                                  <div className="font-medium text-primary mb-1">
                                    {item.question}
                                  </div>
                                  <div className="text-muted-foreground">
                                    评分：{item.score} 分
                                    {item.score <= 2 && (
                                      <span className="ml-2 text-destructive">（需要关注）</span>
                                    )}
                                    {item.score >= 4 && (
                                      <span className="ml-2 text-green-600">（表现优秀）</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Remark */}
                            {answer.remark && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">
                                  备注：
                                </div>
                                <div className="text-sm">
                                  {answer.remark}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI 分析结果对话框 */}
        <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>问卷答案 AI 分析报告</DialogTitle>
                  <DialogDescription>
                    基于豆包大模型的智能分析结果
                  </DialogDescription>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      await exportExcel();
                      shadcnToast({
                        title: '导出成功',
                        description: 'Excel 文件已开始下载',
                      });
                    } catch (error) {
                      shadcnToast({
                        title: '导出失败',
                        description: error instanceof Error ? error.message : '请稍后重试',
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出 Excel
                </Button>
              </div>
            </DialogHeader>
            
            {answersAnalysisResult && (
              <div className="space-y-6">
                {/* 摘要 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">整体表现总结</h3>
                  <p className="text-sm text-muted-foreground">{answersAnalysisResult.summary}</p>
                </div>

                {/* 关键发现 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">关键发现</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {answersAnalysisResult.keyPoints?.map((point: string, index: number) => (
                      <li key={index} className="text-sm">{point}</li>
                    ))}
                  </ul>
                </div>

                {/* 情感分析 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">用户情感分析</h3>
                  <p className="text-sm text-muted-foreground">{answersAnalysisResult.sentimentAnalysis}</p>
                </div>

                {/* 改进建议 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">改进建议</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {answersAnalysisResult.recommendations?.map((rec: string, index: number) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>

                {/* 每日分析 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">每日分析</h3>
                  <div className="space-y-3">
                    {answersAnalysisResult.dayByDayAnalysis?.map((day: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">第 {day.day} 天</span>
                          <Badge variant="outline">平均评分: {day.avgScore}</Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-destructive">主要问题：</span>
                            <ul className="list-disc pl-5 mt-1">
                              {day.mainConcerns?.map((concern: string, i: number) => (
                                <li key={i} className="text-xs">{concern}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-green-600">正面反馈：</span>
                            <ul className="list-disc pl-5 mt-1">
                              {day.positiveFeedback?.map((feedback: string, i: number) => (
                                <li key={i} className="text-xs">{feedback}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 整体趋势 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">整体趋势</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {answersAnalysisResult.overallTrends?.map((trend: string, index: number) => (
                      <li key={index} className="text-sm">{trend}</li>
                    ))}
                  </ul>
                </div>

                {/* 用户参与度 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">用户参与度</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-lg p-3">
                      <div className="text-2xl font-bold">{answersAnalysisResult.userEngagement?.totalSubmissions}</div>
                      <div className="text-xs text-muted-foreground">总提交数</div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="text-sm font-medium">{answersAnalysisResult.userEngagement?.averageResponseQuality}</div>
                      <div className="text-xs text-muted-foreground">响应质量</div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="text-sm font-medium">{answersAnalysisResult.userEngagement?.mostCommonIssue}</div>
                      <div className="text-xs text-muted-foreground">最常见问题</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
