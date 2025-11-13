/**
 * Retry Logic System
 * Implements exponential backoff and retry strategies
 */

import { errorHandler } from './errorHandler';

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryOn?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryOn: (error: any) => {
    if (error?.response?.status) {
      const status = error.response.status;
      return status === 408 || status === 429 || status >= 500;
    }
    return true;
  },
  onRetry: () => {}
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: any;
  let delay = finalConfig.initialDelay;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === finalConfig.maxRetries) {
        await errorHandler.logError(
          `Failed after ${finalConfig.maxRetries} retries`,
          'high',
          { error: error instanceof Error ? error.message : String(error) }
        );
        throw error;
      }

      if (!finalConfig.retryOn(error)) {
        throw error;
      }

      finalConfig.onRetry(attempt + 1, error);

      await sleep(delay);
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
    }
  }

  throw lastError;
}

export class RetryableRequest<T> {
  private config: Required<RetryConfig>;
  private abortController: AbortController | null = null;

  constructor(config: RetryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute(fn: () => Promise<T>): Promise<T> {
    this.abortController = new AbortController();
    return withRetry(fn, this.config);
  }

  cancel() {
    this.abortController?.abort();
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    },
    config
  );
}

export async function supabaseQueryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  config: RetryConfig = {}
): Promise<T> {
  return withRetry(
    async () => {
      const { data, error } = await queryFn();

      if (error) {
        throw new Error(error.message || 'Supabase query failed');
      }

      if (data === null) {
        throw new Error('No data returned from query');
      }

      return data;
    },
    {
      ...config,
      retryOn: (error) => {
        const message = error?.message || '';
        const isNetworkError = message.includes('network') || message.includes('timeout');
        const isServerError = message.includes('500') || message.includes('503');
        return isNetworkError || isServerError;
      }
    }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      errorHandler.logWarning('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.threshold
      });
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failures = 0;
    this.state = 'closed';
  }
}

export const globalCircuitBreaker = new CircuitBreaker();

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: CircuitBreaker = globalCircuitBreaker
): Promise<T> {
  return circuitBreaker.execute(fn);
}

export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private concurrency: number;
  private activeRequests = 0;

  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.concurrency) {
      const fn = this.queue.shift();
      if (fn) {
        this.activeRequests++;
        fn().finally(() => {
          this.activeRequests--;
          this.process();
        });
      }
    }

    this.processing = false;
  }

  clear() {
    this.queue = [];
  }

  size() {
    return this.queue.length;
  }
}

export const globalRequestQueue = new RequestQueue(5);
