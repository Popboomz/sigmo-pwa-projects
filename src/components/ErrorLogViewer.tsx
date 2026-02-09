'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AlertCircle, Trash2, Copy } from 'lucide-react';
import { getErrorLogs, clearErrorLogs, toast } from '@/lib/clientErrorLogger';

export function ErrorLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLogs(getErrorLogs());
    }
  }, [isOpen]);

  const handleClear = () => {
    clearErrorLogs();
    setLogs([]);
    toast.success('已清除', { description: '所有错误日志已清除' });
  };

  const handleCopy = async () => {
    const text = logs
      .map((log, index) => `[${index + 1}] ${log.timestamp}\n${log.message}\n${log.stack || ''}`)
      .join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制', { description: '错误日志已复制到剪贴板' });
    } catch (e) {
      toast.error('复制失败', { description: '无法复制到剪贴板' });
    }
  };

  const errorCount = getErrorLogs().length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {errorCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => setIsOpen(true)}
          >
            <AlertCircle className="h-4 w-4" />
            {errorCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {errorCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>客户端错误日志</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={logs.length === 0}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={logs.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              暂无错误日志
            </p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    #{index + 1}
                  </span>
                </div>
                <p className="text-sm font-medium text-destructive">
                  {log.message}
                </p>
                {log.stack && (
                  <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {log.stack}
                  </pre>
                )}
                {log.url && (
                  <p className="text-xs text-muted-foreground truncate">
                    URL: {log.url}
                  </p>
                )}
                {log.additionalData && Object.keys(log.additionalData).length > 0 && (
                  <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.additionalData, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
