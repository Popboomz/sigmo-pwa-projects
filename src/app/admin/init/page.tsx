'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InitStatus {
  bootstrapAllowed: boolean;
  requiresAdmin: boolean;
  email: string | null;
}

interface InitUserResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
  };
}

export default function InitUserPage() {
  const [email, setEmail] = useState('sigmo@gmail.com');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Admin');
  const [isAdmin, setIsAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<InitStatus>({
    bootstrapAllowed: false,
    requiresAdmin: true,
    email: null,
  });
  const [result, setResult] = useState<InitUserResult | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setStatusLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/init-user', {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      const data = (await response.json()) as Partial<InitStatus> & { success?: boolean };
      setStatus({
        bootstrapAllowed: data.bootstrapAllowed === true,
        requiresAdmin: data.requiresAdmin === true,
        email: typeof data.email === 'string' ? data.email : null,
      });
    } catch {
      setStatus({
        bootstrapAllowed: false,
        requiresAdmin: true,
        email: null,
      });
    } finally {
      setStatusLoading(false);
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/init-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          name,
          isAdmin,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        user?: InitUserResult['user'];
      };

      setResult({
        success: response.ok && data.success === true,
        message: data.message || data.error || '请求失败',
        user: data.user,
      });

      if (response.ok) {
        setPassword('');
        void loadStatus();
      }
    } catch {
      setResult({
        success: false,
        message: '网络错误，请稍后重试。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requiresLoggedInAdmin = !status.bootstrapAllowed && status.requiresAdmin;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">创建/更新管理员账号</CardTitle>
          <CardDescription>
            这里会直接创建 Firebase 邮箱密码账号，并同步后台管理员权限。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              正在检查当前管理员状态...
            </div>
          ) : requiresLoggedInAdmin ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium mb-2">当前系统已经有管理员</div>
              <div>
                现在只有已登录管理员才能创建或修改后台账号。
                {status.email ? ` 当前登录：${status.email}` : ' 请先登录管理后台。'}
              </div>
              {!status.email && (
                <div className="mt-3">
                  <Link href="/admin/login" className="text-sm font-medium underline">
                    前往管理员登录
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              当前系统尚未建立正式管理员目录。提交后会创建第一个 Firebase 管理员账号。
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="请输入登录密码"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">显示名称</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Admin"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(event) => setIsAdmin(event.target.checked)}
                className="h-4 w-4"
              />
              设为管理员
            </label>

            {result && (
              <div
                className={`rounded-lg p-4 flex items-start gap-3 ${
                  result.success
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'bg-red-50 text-red-900'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{result.message}</p>
                  {result.user && (
                    <div className="mt-2 text-sm opacity-90 space-y-1">
                      <div>ID: {result.user.id}</div>
                      <div>邮箱: {result.user.email}</div>
                      <div>名称: {result.user.name}</div>
                      <div>管理员: {result.user.isAdmin ? '是' : '否'}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  正在处理...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  创建/更新 Firebase 账号
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-sm text-muted-foreground space-y-2">
            <div>说明：</div>
            <div>1. 这会直接创建或更新 Firebase 邮箱密码用户。</div>
            <div>2. 管理员权限现在保存在 Firebase 管理员目录里，不再依赖环境变量白名单。</div>
            <div>3. 如果系统里已经有管理员，后续只能由已登录管理员继续添加新管理员。</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
