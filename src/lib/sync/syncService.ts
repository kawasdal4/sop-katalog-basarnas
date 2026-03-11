// Mock/Stub for SyncService to prevent Vercel build errors
import { v4 as uuidv4 } from 'uuid';

export const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

export interface SyncItem {
  id: string;
  table_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data: string;
  timestamp: string;
  status: 'pending' | 'processing' | 'synced' | 'error';
  synced_at?: string;
}

class SyncService {
  private db: any = null;
  private isSyncing = false;

  async init() {
    if (this.db) return this.db;
    if (!isTauri) return null;
    
    try {
      // Dynamic import to avoid build-time issues on Vercel
      // @ts-ignore
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      this.db = await Database.load('sqlite:data.db');
      return this.db;
    } catch (err) {
      console.error('Failed to load Tauri database:', err);
      return null;
    }
  }

  async getPendingCount(): Promise<number> {
    return 0;
  }

  async addLocalData(table: string, data: any): Promise<void> {
    // No-op for web
  }

  async enqueueOperation(tableOrOp: any, action?: string, data?: any): Promise<void> {
    // No-op for web
  }

  async processQueue() {
    // No-op for web
  }

  async fetchLatestFromServer() {
    // No-op for web
  }

  startAutoSync(intervalMs = 60000) {
    // No-op for web
  }
}

export const syncService = new SyncService();
