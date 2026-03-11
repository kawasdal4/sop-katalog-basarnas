'use client'

import { useEffect } from 'react'
import { syncService } from '@/lib/sync/syncService'

export function ClientSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize sync service if we're running in Tauri
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined
    
    if (isTauri) {
      console.log('Initializing SyncService for Tauri...')
      syncService.init().then(() => {
        syncService.startAutoSync()
      }).catch(err => {
        console.error('Failed to initialize SyncService:', err)
      })
    } else {
      console.log('Running in browser, skipping SQLite sync initialization.')
    }
  }, [])

  return <>{children}</>
}
