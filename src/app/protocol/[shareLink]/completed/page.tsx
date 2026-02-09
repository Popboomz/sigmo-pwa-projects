'use client';

import { CheckCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ProtocolCompletedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-blue-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            测试已完成！
          </h1>
          <p className="text-gray-600 mb-8">
            感谢您的参与和宝贵反馈
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
