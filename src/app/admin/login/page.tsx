'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          provider: 'email',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 密码错误
        if (response.status === 401) {
          setError(data.error || t('admin.errors.invalidPassword'));
        } else {
          setError(data.error || t('admin.errors.loginFailed'));
        }
        return;
      }

      if (!data.success) {
        // 无管理员权限
        if (data.error === 'No admin permission' || data.isAdmin === false) {
          setError(t('admin.errors.noAdminPermission') + '. 请联系现有管理员或使用管理员账户登录。');
        } else {
          setError(data.error || t('admin.errors.loginFailed'));
        }
        return;
      }

      // 保存 token
      localStorage.setItem('admin_token', data.token);
      router.push('/admin');
    } catch (err) {
      setError(t('admin.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      // 模拟 Google 登录
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@gmail.com',
          provider: 'google',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || t('admin.errors.loginFailed'));
        setIsLoading(false);
        return;
      }

      // 保存 token
      localStorage.setItem('admin_token', data.token);
      router.push('/admin');
    } catch (err) {
      setError(t('admin.errors.networkError'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">{t('admin.portal')}</span>
              <span className="sm:hidden">{t('admin.signIn')}</span>
            </CardTitle>
            <LanguageSwitcher />
          </div>
          <CardDescription className="text-sm sm:text-base">
            {t('admin.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">{t('admin.emailTab')}</TabsTrigger>
              <TabsTrigger value="google">{t('admin.googleTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('admin.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('admin.placeholder.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('admin.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('admin.placeholder.password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                  <strong>提示：</strong>如果您无法登录，请联系现有管理员获取权限，或使用已注册的管理员账户。
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('admin.signingIn') : t('admin.signIn')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="google">
              <div className="space-y-4">
                <div className="text-sm text-gray-600 text-center py-4">
                  {t('admin.googleDescription')}
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isLoading ? t('admin.signingIn') : t('admin.signInWithGoogle')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
