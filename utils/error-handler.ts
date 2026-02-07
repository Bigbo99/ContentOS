import toast from 'react-hot-toast';

export type ErrorType =
  | 'network'
  | 'api'
  | 'validation'
  | 'auth'
  | 'timeout'
  | 'unknown';

interface ErrorConfig {
  title?: string;
  description?: string;
  type?: ErrorType;
  duration?: number;
}

/**
 * 统一错误处理工具
 */
export class ErrorHandler {
  /**
   * 显示错误提示
   */
  static showError(error: unknown, config?: ErrorConfig): void {
    const { title, description, type = 'unknown', duration = 4000 } = config || {};

    let message = '';

    // 解析错误信息
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String(error.message);
    } else {
      message = '操作失败';
    }

    // 根据错误类型添加前缀
    const prefix = this.getErrorPrefix(type);
    const fullMessage = title
      ? `${prefix}${title}: ${message}`
      : `${prefix}${message}`;

    toast.error(fullMessage, {
      duration,
      position: 'top-right',
      style: {
        background: '#FEE2E2',
        color: '#991B1B',
        border: '1px solid #FCA5A5',
      },
    });

    // 在控制台输出详细错误信息
    console.error(`[ErrorHandler ${type}]`, {
      title,
      message,
      description,
      originalError: error,
    });
  }

  /**
   * 显示成功提示
   */
  static showSuccess(message: string, duration = 3000): void {
    toast.success(message, {
      duration,
      position: 'top-right',
      style: {
        background: '#D1FAE5',
        color: '#065F46',
        border: '1px solid #6EE7B7',
      },
    });
  }

  /**
   * 显示警告提示
   */
  static showWarning(message: string, duration = 3500): void {
    toast(message, {
      duration,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #FCD34D',
      },
    });
  }

  /**
   * 显示加载状态
   */
  static showLoading(message: string): string {
    return toast.loading(message, {
      position: 'top-right',
    });
  }

  /**
   * 关闭加载状态
   */
  static dismissLoading(toastId: string): void {
    toast.dismiss(toastId);
  }

  /**
   * 处理网络错误
   */
  static handleNetworkError(error: unknown): void {
    this.showError(error, {
      title: '网络错误',
      type: 'network',
      description: '请检查网络连接后重试',
    });
  }

  /**
   * 处理API错误
   */
  static handleApiError(error: unknown, apiName?: string): void {
    this.showError(error, {
      title: apiName ? `${apiName} API 错误` : 'API 错误',
      type: 'api',
    });
  }

  /**
   * 处理验证错误
   */
  static handleValidationError(fieldName: string, reason: string): void {
    this.showError(`${fieldName} ${reason}`, {
      type: 'validation',
    });
  }

  /**
   * 处理认证错误
   */
  static handleAuthError(error: unknown): void {
    this.showError(error, {
      title: '认证失败',
      type: 'auth',
      description: '请检查密钥或重新登录',
    });
  }

  /**
   * 获取错误类型前缀
   */
  private static getErrorPrefix(type: ErrorType): string {
    const prefixes: Record<ErrorType, string> = {
      network: '🌐 ',
      api: '⚡ ',
      validation: '📝 ',
      auth: '🔐 ',
      timeout: '⏱️ ',
      unknown: '❌ ',
    };
    return prefixes[type] || '';
  }

  /**
   * 包装异步函数，自动处理错误
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    config?: {
      loadingMessage?: string;
      successMessage?: string;
      errorConfig?: ErrorConfig;
    }
  ): Promise<T | null> {
    const { loadingMessage, successMessage, errorConfig } = config || {};

    let toastId: string | undefined;

    try {
      if (loadingMessage) {
        toastId = this.showLoading(loadingMessage);
      }

      const result = await fn();

      if (toastId) {
        this.dismissLoading(toastId);
      }

      if (successMessage) {
        this.showSuccess(successMessage);
      }

      return result;
    } catch (error) {
      if (toastId) {
        this.dismissLoading(toastId);
      }

      this.showError(error, errorConfig);
      return null;
    }
  }
}

/**
 * 简化的错误处理函数
 */
export const handleError = (error: unknown, config?: ErrorConfig) => {
  ErrorHandler.showError(error, config);
};

export const showSuccess = (message: string) => {
  ErrorHandler.showSuccess(message);
};

export const showWarning = (message: string) => {
  ErrorHandler.showWarning(message);
};
