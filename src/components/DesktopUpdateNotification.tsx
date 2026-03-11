'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DownloadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DesktopUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<{ version: string; body: string } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  
  // We use dynamic import for Tauri APIs to avoid breaking web builds
  const checkUpdate = async () => {
    try {
      // @ts-ignore
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      
      if (update?.available) {
        setUpdateInfo({
          version: update.version,
          body: update.body || 'Versi baru E-Katalog SOP telah tersedia.',
        })
        setUpdateAvailable(true)
      }
    } catch (err) {
      console.log('Tauri updater not available or check failed:', err)
      // Ignore gracefully if not running in Tauri
    }
  }

  useEffect(() => {
    // Only run if we think we might be in Tauri.
    // The window['__TAURI__'] check is a common heuristic.
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      // Small delay on startup before checking
      setTimeout(() => {
        checkUpdate()
      }, 3000)
    }
  }, [])

  const handleUpdate = async () => {
    try {
      setIsUpdating(true)
      setUpdateError(null)
      // @ts-ignore
      const { check } = await import('@tauri-apps/plugin-updater')
      // @ts-ignore
      const { relaunch } = await import('@tauri-apps/plugin-process')
      
      const update = await check()
      
      if (update?.available) {
        // Download the update bytes
        console.log('Downloading update...')
        await update.downloadAndInstall()
        
        // Relaunch the application after installation
        console.log('Update installed, relaunching...')
        await relaunch()
      } else {
        setUpdateError('Update tidak ditemukan atau sudah dibatalkan.')
        setTimeout(() => setUpdateAvailable(false), 3000)
      }
    } catch (err: any) {
      console.error('Failed to install update:', err)
      setUpdateError(err.message || 'Gagal menginstal pembaruan.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 w-[350px]"
        >
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden text-white relative">
            
            {/* Soft top gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-sky-500" />
            
            <button 
              onClick={() => setUpdateAvailable(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
              disabled={isUpdating}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                  <DownloadCloud className="w-5 h-5 text-blue-400" />
                </div>
                
                <div>
                  <h3 className="font-bold text-base">Versi Baru Tersedia!</h3>
                  <p className="text-xs text-blue-300 font-medium mb-2">v{updateInfo?.version}</p>
                  
                  <div className="text-xs text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-700 max-h-24 overflow-y-auto whitespace-pre-line leading-relaxed scrollbar-thin scrollbar-thumb-slate-600">
                    {updateInfo?.body}
                  </div>
                  
                  {updateError && (
                    <p className="text-xs text-red-400 mt-2 font-medium bg-red-500/10 p-2 rounded-md border border-red-500/20">
                      Error: {updateError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => setUpdateAvailable(false)}
                  disabled={isUpdating}
                >
                  Nanti
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Mengunduh...' : 'Update Sekarang'}
                </Button>
              </div>
            </div>

            {/* Progress indication overlay */}
            {isUpdating && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 10, ease: "linear" }} 
                  // In a real app we'd use downloadProgress event listener
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

