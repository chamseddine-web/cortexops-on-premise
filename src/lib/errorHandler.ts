/**
 * Global Error Handler
 * Centralized error handling and logging system
 */

import { supabase } from './supabase';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLog {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorLog[] = [];
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    this.setupGlobalHandlers();
    this.setupOnlineDetection();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalHandlers() {
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        stack: event.error?.stack,
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        severity: 'high',
        context: {
          promise: event.promise
        }
      });
    });
  }

  private setupOnlineDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async handleError(error: Omit<ErrorLog, 'timestamp' | 'userAgent' | 'url'>) {
    const errorLog: ErrorLog = {
      ...error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('[ErrorHandler]', errorLog);

    if (this.isOnline) {
      await this.logToDatabase(errorLog);
    } else {
      this.errorQueue.push(errorLog);
      this.saveErrorQueueToStorage();
    }
  }

  private async logToDatabase(error: ErrorLog) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('error_logs').insert({
        user_id: user?.id || null,
        message: error.message,
        stack: error.stack,
        severity: error.severity,
        context: error.context,
        user_agent: error.userAgent,
        url: error.url,
        created_at: error.timestamp
      });
    } catch (err) {
      console.error('Failed to log error to database:', err);
      this.errorQueue.push(error);
      this.saveErrorQueueToStorage();
    }
  }

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (const error of errors) {
      await this.logToDatabase(error);
    }

    this.clearErrorQueueFromStorage();
  }

  private saveErrorQueueToStorage() {
    try {
      localStorage.setItem('errorQueue', JSON.stringify(this.errorQueue));
    } catch (err) {
      console.error('Failed to save error queue to storage:', err);
    }
  }

  private clearErrorQueueFromStorage() {
    try {
      localStorage.removeItem('errorQueue');
    } catch (err) {
      console.error('Failed to clear error queue from storage:', err);
    }
  }

  async logError(message: string, severity: ErrorSeverity = 'medium', context?: Record<string, any>) {
    await this.handleError({ message, severity, context });
  }

  async logWarning(message: string, context?: Record<string, any>) {
    await this.handleError({ message, severity: 'low', context });
  }

  async logCritical(message: string, context?: Record<string, any>) {
    await this.handleError({ message, severity: 'critical', context });
  }
}

export const errorHandler = ErrorHandler.getInstance();

export async function handleAsyncError<T>(
  promise: Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<[T | null, Error | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await errorHandler.logError(`${errorMessage}: ${err.message}`, 'medium', {
      stack: err.stack
    });
    return [null, err];
  }
}

export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  errorMessage?: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorHandler.logError(
            errorMessage || `Error in ${fn.name || 'anonymous function'}`,
            'medium',
            { error: error.message, args }
          );
          throw error;
        });
      }
      return result;
    } catch (error) {
      errorHandler.logError(
        errorMessage || `Error in ${fn.name || 'anonymous function'}`,
        'medium',
        { error: error instanceof Error ? error.message : String(error), args }
      );
      throw error;
    }
  }) as T;
}
