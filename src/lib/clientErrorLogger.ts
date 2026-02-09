/**
 * 客户端错误日志工具
 * 用于捕获和报告客户端异常
 */

interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

class ClientErrorLogger {
  private static instance: ClientErrorLogger;
  private logs: ErrorLog[] = [];
  private maxLogs = 50; // 最多保留 50 条日志
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // 初始化时不立即启动，等待组件挂载
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
      this.startAutoFlush();
      this.setupGlobalHandlers();
    }
  }

  public static getInstance(): ClientErrorLogger {
    if (!ClientErrorLogger.instance) {
      ClientErrorLogger.instance = new ClientErrorLogger();
    }
    return ClientErrorLogger.instance;
  }

  /**
   * 捕获错误
   */
  public captureError(error: Error | string, additionalData?: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalData,
    };

    this.addLog(errorLog);
  }

  /**
   * 捕获 Promise 拒绝
   */
  public capturePromiseRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error ? event.reason : String(event.reason);
    this.captureError(`Unhandled Promise Rejection: ${error}`, {
      promise: 'unhandled',
      reason: event.reason,
    });
  }

  /**
   * 添加日志
   */
  private addLog(log: ErrorLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.saveToLocalStorage();
    console.error('[ClientError]', log);
  }

  /**
   * 保存到 localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('client_error_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Failed to save error logs to localStorage:', e);
    }
  }

  /**
   * 从 localStorage 加载
   */
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('client_error_logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load error logs from localStorage:', e);
    }
  }

  /**
   * 获取所有日志
   */
  public getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * 清除日志
   */
  public clearLogs(): void {
    this.logs = [];
    this.saveToLocalStorage();
  }

  /**
   * 启动自动刷新
   */
  private startAutoFlush(): void {
    // 每 30 秒尝试上报一次
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  /**
   * 上报错误到服务器
   */
  private async flush(): Promise<void> {
    if (this.logs.length === 0) return;

    const logsToSend = [...this.logs];
    try {
      // TODO: 实现上报到服务器的逻辑
      // await fetch('/api/client-errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ logs: logsToSend }),
      // });

      // 上报成功后清除这些日志
      this.logs = this.logs.slice(logsToSend.length);
      this.saveToLocalStorage();
    } catch (e) {
      console.warn('Failed to flush error logs:', e);
    }
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalHandlers(): void {
    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      this.captureError(event.error || event.message, {
        lineno: event.lineno,
        colno: event.colno,
        filename: event.filename,
      });
    });

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.capturePromiseRejection(event);
      // 阻止默认的控制台输出
      event.preventDefault();
    });
  }

  /**
   * 销毁
   */
  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    window.removeEventListener('error', () => {});
    window.removeEventListener('unhandledrejection', () => {});
  }
}

// 导出 toast 用于 UI 反馈
import { toast as sonnerToast } from 'sonner';
export const toast = sonnerToast;

// 导出单例（延迟初始化）
export const clientErrorLogger = {
  getInstance: () => ClientErrorLogger.getInstance(),
};

// 导出快捷方法
export const captureError = (error: Error | string, additionalData?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  ClientErrorLogger.getInstance().captureError(error, additionalData);
};

export const getErrorLogs = () => {
  if (typeof window === 'undefined') return [];
  return ClientErrorLogger.getInstance().getLogs();
};

export const clearErrorLogs = () => {
  if (typeof window === 'undefined') return;
  ClientErrorLogger.getInstance().clearLogs();
};
