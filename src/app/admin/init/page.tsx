'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function InitUserPage() {
  const [email, setEmail] = useState('sigmo@gmail.com');
  const [password, setPassword] = useState('0130');
  const [name, setName] = useState('Admin');
  const [isAdmin, setIsAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; user?: any } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/init-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          isAdmin,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: '操作失败：网络错误',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">创建/更新管理员用户</CardTitle>
          <CardDescription>
            使用此页面创建新的管理员用户或更新现有用户的信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="请输入密码"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Admin"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isAdmin" className="cursor-pointer">
                设为管理员
              </Label>
            </div>

            {result && (
              <div
                className={`p-4 rounded-lg flex items-center gap-2 ${
                  result.success
                    ? 'bg-green-50 text-green-900'
                    : 'bg-red-50 text-red-900'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{result.message}</p>
                  {result.user && (
                    <div className="mt-2 text-sm opacity-80">
                      <div>ID: {result.user.id}</div>
                      <div>邮箱: {result.user.email}</div>
                      <div>姓名: {result.user.name}</div>
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
                  处理中...
                </>
              ) : (
                '创建/更新用户'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-2">使用说明：</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 如果用户不存在，将创建新用户</li>
              <li>• 如果用户已存在，将更新密码和管理员权限</li>
              <li>• 创建完成后，可以使用该账户登录管理后台</li>
              <li>• 登录地址：<a href="/admin/login" className="text-blue-600 hover:underline">/admin/login</a></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
