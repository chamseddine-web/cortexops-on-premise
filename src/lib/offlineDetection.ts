/**
 * Offline Detection and Recovery System
 * Handles network connectivity and offline mode
 */

import { errorHandler } from './errorHandler';

type NetworkStatus = 'online' | 'offline' | 'slow';

interface NetworkListener {
  id: string;
  callback: (status: NetworkStatus) => void;
}

class OfflineManager {
  private static instance: OfflineManager;
  private listeners: NetworkListener[] = [];
  private currentStatus: NetworkStatus = 'online';
  private offlineQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  private constructor() {
    this.setupListeners();
    this.checkInitialStatus();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });

    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', () => {
        this.checkConnectionQuality();
      });
    }
  }

  private checkInitialStatus() {
    if (!navigator.onLine) {
      this.handleOffline();
    } else {
      this.checkConnectionQuality();
    }
  }

  private async handleOnline() {
    this.currentStatus = 'online';
    this.notifyListeners('online');

    await errorHandler.logError('Network connection restored', 'low');

    this.showNotification('Connexion rétablie', 'success');

    this.processOfflineQueue();
  }

  private handleOffline() {
    this.currentStatus = 'offline';
    this.notifyListeners('offline');

    errorHandler.logWarning('Network connection lost');

    this.showNotification('Connexion perdue', 'warning');
  }

  private async checkConnectionQuality() {
    if (!navigator.onLine) {
      this.handleOffline();
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok) {
        if (latency > 2000) {
          this.currentStatus = 'slow';
          this.notifyListeners('slow');
          this.showNotification('Connexion lente', 'warning');
        } else {
          this.currentStatus = 'online';
          this.notifyListeners('online');
        }
      }
    } catch (error) {
      this.handleOffline();
    }
  }

  private notifyListeners(status: NetworkStatus) {
    this.listeners.forEach(listener => {
      try {
        listener.callback(status);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  addListener(callback: (status: NetworkStatus) => void): string {
    const id = Math.random().toString(36).substring(2);
    this.listeners.push({ id, callback });

    callback(this.currentStatus);

    return id;
  }

  removeListener(id: string) {
    this.listeners = this.listeners.filter(listener => listener.id !== id);
  }

  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  isOnline(): boolean {
    return this.currentStatus === 'online';
  }

  isOffline(): boolean {
    return this.currentStatus === 'offline';
  }

  isSlow(): boolean {
    return this.currentStatus === 'slow';
  }

  addToOfflineQueue(task: () => Promise<void>) {
    this.offlineQueue.push(task);
    this.saveQueueToStorage();
  }

  private async processOfflineQueue() {
    if (this.isProcessingQueue || this.offlineQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.offlineQueue.length > 0 && this.isOnline()) {
      const task = this.offlineQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Error processing offline queue task:', error);
          this.offlineQueue.unshift(task);
          break;
        }
      }
    }

    this.saveQueueToStorage();
    this.isProcessingQueue = false;
  }

  private saveQueueToStorage() {
    try {
      const queueSize = this.offlineQueue.length;
      localStorage.setItem('offlineQueueSize', String(queueSize));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'error') {
    const event = new CustomEvent('network-notification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }

  async waitForOnline(timeout: number = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.removeListener(listenerId);
        resolve(false);
      }, timeout);

      const listenerId = this.addListener((status) => {
        if (status === 'online') {
          clearTimeout(timeoutId);
          this.removeListener(listenerId);
          resolve(true);
        }
      });
    });
  }
}

export const offlineManager = OfflineManager.getInstance();

export function useNetworkStatus(callback: (status: NetworkStatus) => void): () => void {
  const listenerId = offlineManager.addListener(callback);
  return () => offlineManager.removeListener(listenerId);
}

export async function executeWhenOnline<T>(
  fn: () => Promise<T>,
  options: { timeout?: number; queueIfOffline?: boolean } = {}
): Promise<T> {
  const { timeout = 30000, queueIfOffline = true } = options;

  if (offlineManager.isOnline()) {
    return await fn();
  }

  if (queueIfOffline) {
    offlineManager.addToOfflineQueue(fn as () => Promise<void>);
  }

  const isOnline = await offlineManager.waitForOnline(timeout);

  if (!isOnline) {
    throw new Error('Network timeout: Unable to establish connection');
  }

  return await fn();
}

export class OfflineStorage {
  private storageKey: string;

  constructor(key: string) {
    this.storageKey = `offline_${key}`;
  }

  save(data: any): boolean {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now()
      });
      localStorage.setItem(this.storageKey, serialized);
      return true;
    } catch (error) {
      console.error('Failed to save to offline storage:', error);
      return false;
    }
  }

  load<T>(): T | null {
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (!serialized) {
        return null;
      }

      const { data, timestamp } = JSON.parse(serialized);

      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > maxAge) {
        this.clear();
        return null;
      }

      return data as T;
    } catch (error) {
      console.error('Failed to load from offline storage:', error);
      return null;
    }
  }

  clear(): boolean {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear offline storage:', error);
      return false;
    }
  }

  exists(): boolean {
    return localStorage.getItem(this.storageKey) !== null;
  }
}

export async function cacheFirst<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: { maxAge?: number; forceRefresh?: boolean } = {}
): Promise<T> {
  const { maxAge = 3600000, forceRefresh = false } = options;
  const storage = new OfflineStorage(key);

  if (!forceRefresh && !offlineManager.isOnline()) {
    const cached = storage.load<T>();
    if (cached) {
      return cached;
    }
  }

  if (!forceRefresh) {
    const cached = storage.load<T>();
    if (cached) {
      return cached;
    }
  }

  try {
    const data = await fetchFn();
    storage.save(data);
    return data;
  } catch (error) {
    const cached = storage.load<T>();
    if (cached) {
      console.warn('Using cached data due to fetch error');
      return cached;
    }
    throw error;
  }
}

export function createOfflineIndicator(): HTMLDivElement {
  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #ef4444;
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    display: none;
    animation: slideIn 0.3s ease-out;
  `;
  indicator.textContent = 'Mode hors ligne';

  document.body.appendChild(indicator);

  offlineManager.addListener((status) => {
    if (status === 'offline') {
      indicator.style.display = 'block';
      indicator.style.background = '#ef4444';
      indicator.textContent = 'Mode hors ligne';
    } else if (status === 'slow') {
      indicator.style.display = 'block';
      indicator.style.background = '#f59e0b';
      indicator.textContent = 'Connexion lente';
    } else {
      indicator.style.display = 'none';
    }
  });

  return indicator;
}
