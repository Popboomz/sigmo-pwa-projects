'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, AlertCircle, CheckCircle, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  calculateStructuredScoresFromAnswers,
  type StructuredScores,
} from '@/lib/questionnaire/themes';

interface Question {
  id: string;
  theme?: string;
  title: string;
  text?: string; // 兼容旧格式
  description?: string;
  options?: string[]; // 兼容旧格式，可选
  followupRule?: string;
}

// 默认的5级选项
const DEFAULT_OPTIONS = ['很差', '差', '可以接受', '好', '很好'];

interface TodayQuestionsResponse {
  success: boolean;
  state: 'normal' | 'ended';
  message?: string;
  questions?: Question[];
  testDay?: number;
  isGenerated?: boolean;
  materialState?: string;
  lifecyclePhase?: string;
  logicBranch?: string;
  completedDays?: number;
  testPeriodDays?: number;
}

export default function ProtocolQuestionnaireDayPage() {
  const params = useParams();
  const shareLink = params.shareLink as string;
  const day = params.day as string;
  const router = useRouter();

  const [todayResponse, setTodayResponse] = useState<TodayQuestionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 5个问题的答案
  const [answers, setAnswers] = useState<{ [key: string]: number | undefined }>({});

  // 备注相关状态
  const [originalRemark, setOriginalRemark] = useState('');
  const [optimizedRemark, setOptimizedRemark] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  /**
   * 根据问题的 theme 映射到 5 维度评分
   */
  const buildStructuredScores = (questions: Question[], answers: { [key: string]: number | undefined }): StructuredScores => {
    return calculateStructuredScoresFromAnswers(
      questions.map((question) => ({
        score: answers[question.id] ?? 3,
        theme: question.theme,
      })),
      3,
    );
  };

  useEffect(() => {
    loadTodayQuestions();
  }, [shareLink]);

  const loadTodayQuestions = async () => {
    try {
      setIsLoading(true);

      // 使用新的 today 接口
      const response = await fetch(
        `/api/public/questionnaire/today?shareLink=${shareLink}`
      );

      if (!response.ok) {
        throw new Error('Failed to load questions');
      }

      const data: TodayQuestionsResponse = await response.json();

      // 检查测试状态
      if (data.state === 'ended') {
        setMessage({ type: 'error', text: data.message || '测试已结束' });
        setTimeout(() => {
          router.push(`/protocol/${shareLink}/completed`);
        }, 2000);
        return;
      }

      setTodayResponse(data);

      // 验证 testDay 是否匹配 URL 中的 day
      if (data.testDay && parseInt(day) !== data.testDay) {
        // 不匹配，重定向到正确的天数
        router.replace(`/protocol/${shareLink}/day/${data.testDay}`);
        return;
      }

      // 初始化答案状态
      if (data.questions) {
        const initialAnswers: { [key: string]: number | undefined } = {};
        data.questions.forEach((q: Question) => {
          initialAnswers[q.id] = undefined;
        });
        setAnswers(initialAnswers);
      }
    } catch (error) {
      console.error('Failed to load questionnaire:', error);
      setMessage({ type: 'error', text: '问卷加载失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizeRemark = async () => {
    if (!originalRemark.trim()) {
      setMessage({ type: 'error', text: '请先输入备注内容' });
      return;
    }

    setIsOptimizing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/optimize-remark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: originalRemark,
          productType: '产品',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage({ type: 'error', text: data.error || '优化失败' });
        return;
      }

      setOptimizedRemark(data.data.optimizedText);
    } catch {
      setMessage({ type: 'error', text: '优化失败，请重试' });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async () => {
    // 验证所有问题都已回答
    const allAnswered = todayResponse?.questions?.every((q) => {
      return answers[q.id] !== undefined;
    });

    if (!allAnswered) {
      setMessage({ type: 'error', text: '请回答所有问题' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const answersArray = todayResponse!.questions!.map((q) => ({
        questionId: q.id,
        score: answers[q.id]!,
        question: q.title,
        theme: q.theme,
      }));

      // 构建 5 维度评分
      const structuredScores = buildStructuredScores(todayResponse!.questions!, answers);

      const response = await fetch('/api/public/questionnaire/daily-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shareLink,
          testDay: todayResponse!.testDay,
          answers: answersArray,
          structuredScores,
          remark: optimizedRemark || originalRemark,
          userId: 'anonymous', // 匿名用户
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage({ type: 'error', text: data.error || '提交失败' });
        return;
      }

      setMessage({ type: 'success', text: '提交成功！' });

      // 延迟跳转回主页
      setTimeout(() => {
        router.push(`/protocol/${shareLink}`);
      }, 1500);
    } catch {
      setMessage({ type: 'error', text: '提交失败，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen mesh-bg y2k-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--y2k-blue)] mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const questions = todayResponse?.questions || [];
  const testDay = todayResponse?.testDay || parseInt(day);
  const testPeriodDays = todayResponse?.testPeriodDays || 21;

  return (
    <div className="min-h-screen mesh-bg y2k-shell">
      {/* Header */}
      <div className="glass y2k-nav border-b border-[rgba(122,168,255,0.14)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push(`/protocol/${shareLink}`)}
              className="flex items-center gap-2 y2k-ghost"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-[#1A1A1A]">产品测试</h1>
              <p className="text-xs text-[color:var(--brand-medium-gray)] font-medium">
                第 {testDay} 天 / 共 {testPeriodDays} 天
              </p>
            </div>
            <div className="w-20" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'error'
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-green-50 text-green-900 border border-green-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {todayResponse && questions.length > 0 ? (
          <div className="space-y-6">
            {/* Questions */}
            <Card
              className="rounded-[20px] y2k-panel y2k-question-card border-[rgba(122,168,255,0.14)]"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--y2k-blue)]" />
                  第 {testDay} 天问卷
                </CardTitle>
                <CardDescription className="text-[color:var(--brand-dark-gray)]">
                  请根据今天的实际使用情况，如实回答以下问题
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question, index) => {
                  const questionIndex = index + 1;
                  const selectedScore = answers[question.id];

                  // 兼容旧格式：使用text字段或title字段
                  const questionTitle = question.title || question.text || '';
                  // 兼容旧格式：使用默认选项
                  const questionOptions = question.options && question.options.length > 0 ? question.options : DEFAULT_OPTIONS;
                  // 兼容旧格式：使用theme字段或默认值
                  const questionTheme = question.theme || question.followupRule || '';

                  return (
                    <div key={question.id} className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          Q{questionIndex}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-base font-medium text-[#1A1A1A]">{questionTitle}</p>
                          {question.description && (
                            <p className="text-sm text-[color:var(--brand-medium-gray)] mt-1">{question.description}</p>
                          )}
                          {questionTheme && (
                            <Badge variant="secondary" className="mt-2 text-xs y2k-chip">
                              {questionTheme}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <RadioGroup
                        value={selectedScore?.toString()}
                        onValueChange={(value) =>
                          setAnswers({ ...answers, [question.id]: parseInt(value) })
                        }
                        className="grid grid-cols-5 gap-2"
                      >
                        {questionOptions.map((option, optionIndex) => {
                          const score = optionIndex + 1;
                          return (
                            <div key={option} className="space-y-1">
                              <div
                                className={`flex flex-col items-center p-3 border-2 rounded-lg transition-colors cursor-pointer y2k-score-option ${
                                  selectedScore === score
                                    ? 'is-selected border-[var(--y2k-blue)] bg-[rgba(122,168,255,0.12)]'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setAnswers({ ...answers, [question.id]: score })}
                              >
                                <RadioGroupItem
                                  value={score.toString()}
                                  id={`${question.id}-score-${score}`}
                                  className="sr-only"
                                />
                                <Label
                                  htmlFor={`${question.id}-score-${score}`}
                                  className="cursor-pointer flex flex-col items-center"
                                >
                                  <span className="text-lg font-bold text-gray-900 mb-1">
                                    {score}
                                  </span>
                                  <span className="text-xs text-gray-600 text-center">
                                    {option}
                                  </span>
                                </Label>
                              </div>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Remark */}
            <Card
              className="rounded-[20px] y2k-panel y2k-question-card border-[rgba(122,168,255,0.14)]"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <CardHeader>
                <CardTitle>使用感受备注</CardTitle>
                <CardDescription className="text-[color:var(--brand-dark-gray)]">
                  可以详细描述今天的使用感受（可选）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="remark-input" className="text-sm font-medium mb-2 block">
                    备注内容
                  </Label>
                  <Textarea
                    id="remark-input"
                    placeholder="描述您的使用感受、遇到的问题或建议..."
                    value={originalRemark}
                    onChange={(e) => setOriginalRemark(e.target.value)}
                    rows={4}
                  />
                </div>

                {originalRemark.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOptimizeRemark}
                    disabled={isOptimizing}
                    className="w-full flex items-center justify-center gap-2 y2k-ghost"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI优化中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        AI智能优化
                      </>
                    )}
                  </Button>
                )}

                {optimizedRemark && (
                  <div className="p-4 rounded-lg y2k-question-card">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      AI优化后的备注
                    </p>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                      {optimizedRemark}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full rounded-[14px] font-semibold text-base y2k-button"
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #7ee8ff, #6da7ff 42%, #d0b6ff)',
                boxShadow: '0 10px 24px rgba(108, 167, 255, 0.24)',
              }}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  提交答案
                </>
              )}
            </Button>
          </div>
        ) : (
          <Card className="rounded-[20px] border-[rgba(122,168,255,0.14)] y2k-panel y2k-question-card">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">问卷加载失败或不存在</p>
              <Button
                variant="outline"
                onClick={() => router.push(`/protocol/${shareLink}`)}
                className="mt-4 y2k-ghost"
              >
                返回
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
