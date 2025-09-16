/**
 * Offline Queue Service for Behavioral Analytics
 * Uses IndexedDB to store events when offline for later retry
 */

export interface QueuedEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueueService {
  private static instance: OfflineQueueService;
  private dbName = 'behavioralAnalytics';
  private storeName = 'pendingEvents';
  private db: IDBDatabase | null = null;

  private constructor() {
    this.initializeDB();
  }

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  private async initializeDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('retryCount', 'retryCount', { unique: false });
        }
      };
    });
  }

  async addEvent(event: any): Promise<void> {
    if (typeof window === 'undefined') return;

    const queuedEvent: QueuedEvent = {
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'behavioral_event',
      data: event,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(queuedEvent);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPendingEvents(limit: number = 100): Promise<QueuedEvent[]> {
    if (typeof window === 'undefined') return [];

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'next');
      
      const events: QueuedEvent[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && events.length < limit) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async removeEvent(eventId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(eventId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async incrementRetryCount(eventId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const event = await this.getEvent(eventId);
    if (event) {
      event.retryCount++;
      await this.updateEvent(event);
    }
  }

  private async getEvent(eventId: string): Promise<QueuedEvent | null> {
    if (typeof window === 'undefined') return null;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(eventId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async updateEvent(event: QueuedEvent): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(event);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearOldEvents(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (typeof window === 'undefined') return;

    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const offlineQueue = OfflineQueueService.getInstance();