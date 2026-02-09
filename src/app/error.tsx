'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">出错了</h2>
          <p className="text-muted-foreground">
            抱歉，页面加载时出现了意外错误。请尝试刷新页面或联系管理员。
          </p>
          {error.message && (
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新页面
          </Button>
          <Button
            onClick={reset}
            variant="outline"
            className="w-full sm:w-auto"
          >
            重试
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          错误 ID: {error.digest || 'unknown'}
        </div>
      </div>
    </div>
  );
}
