'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Cloud,
  FolderOpen,
  ArrowRightLeft,
  Loader2
} from 'lucide-react'

interface AutoBackupPanelProps {
  compact?: boolean
  driveConnected?: boolean
  r2Connected?: boolean
  lastSync?: string | null
  onSyncComplete?: () => void
}

interface AutoBackupStatus {
  isBackingUp: boolean
  progress: number
  currentStep: string
  result?: {
    success: boolean
    hasChanges: boolean
    totalChecked: number
    newFilesBackedUp: number
    modifiedFilesBackedUp: number
    skippedFiles: number
    errors: { filename: string; error: string }[]
    message: string
  }
  checkResult?: {
    needsBackup: boolean
    newFilesCount: number
    modifiedFilesCount: number
    unchangedFilesCount: number
  }
}

export function AutoBackupPanel({ 
  compact = false, 
  driveConnected, 
  r2Connected, 
  lastSync,
  onSyncComplete 
}: AutoBackupPanelProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState<AutoBackupStatus>({
    isBackingUp: false,
    progress: 0,
    currentStep: '',
  })

  const [connected, setConnected] = useState({
    drive: driveConnected ?? false,
    r2: r2Connected ?? false
  })

  // Update connected status when props change
  useEffect(() => {
    if (driveConnected !== undefined && r2Connected !== undefined) {
      setConnected({ drive: driveConnected, r2: r2Connected })
    }
  }, [driveConnected, r2Connected])

  // Fetch connection status if not provided
  useEffect(() => {
    if (driveConnected === undefined || r2Connected === undefined) {
      const fetchStatus = async () => {
        try {
          const [driveRes, r2Res] = await Promise.all([
            fetch('/api/drive/status'),
            fetch('/api/r2/status')
          ])
          const driveData = await driveRes.json()
          const r2Data = await r2Res.json()
          setConnected({
            drive: driveData?.connected ?? false,
            r2: r2Data?.connected ?? false
          })
        } catch (error) {
          console.error('Failed to fetch storage status:', error)
        }
      }
      fetchStatus()
    }
  }, [driveConnected, r2Connected])

  const handleAutoBackup = async () => {
    if (!connected.drive || !connected.r2) {
      toast({
        title: '⚠️ Storage Tidak Siap',
        description: 'Pastikan Google Drive dan Cloudflare R2 terhubung sebelum backup',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    setStatus(prev => ({
      ...prev,
      isBackingUp: true,
      progress: 0,
      currentStep: 'Memeriksa perubahan file...',
      result: undefined,
      checkResult: undefined
    }))

    const progressSteps = [
      { progress: 10, step: 'Menghubungkan ke Cloudflare R2...' },
      { progress: 25, step: 'Memeriksa file di R2...' },
      { progress: 40, step: 'Membandingkan dengan Google Drive...' },
      { progress: 55, step: 'Mendeteksi file baru dan yang berubah...' },
      { progress: 70, step: 'Memproses backup...' },
      { progress: 85, step: 'Menyelesaikan backup...' },
    ]

    const progressInterval = setInterval(() => {
      setStatus(prev => {
        if (prev.progress >= 85) return prev
        const nextStep = progressSteps.find(s => s.progress > prev.progress)
        if (nextStep) {
          return {
            ...prev,
            progress: nextStep.progress,
            currentStep: nextStep.step
          }
        }
        return prev
      })
    }, 700)

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' })
      })
      
      const data = await res.json()
      
      clearInterval(progressInterval)
      
      if (data.success) {
        const result = data.result
        setStatus(prev => ({
          ...prev,
          isBackingUp: false,
          progress: 100,
          currentStep: result.hasChanges ? 'Backup selesai!' : 'Tidak ada perubahan',
          result: {
            success: result.success,
            hasChanges: result.hasChanges,
            totalChecked: result.totalChecked,
            newFilesBackedUp: result.newFilesBackedUp,
            modifiedFilesBackedUp: result.modifiedFilesBackedUp,
            skippedFiles: result.skippedFiles,
            errors: result.errors,
            message: result.message
          }
        }))

        if (result.hasChanges) {
          toast({
            title: '✅ Backup Berhasil!',
            description: `${result.newFilesBackedUp} file baru, ${result.modifiedFilesBackedUp} file diperbarui`,
            duration: 5000
          })
        } else {
          toast({
            title: '✅ Tidak Ada Perubahan',
            description: 'Semua file sudah up-to-date. Tidak ada file yang perlu di-backup.',
            duration: 5000
          })
        }

        onSyncComplete?.()
      } else {
        throw new Error(data.error || 'Backup failed')
      }
    } catch (error) {
      clearInterval(progressInterval)
      
      setStatus(prev => ({
        ...prev,
        isBackingUp: false,
        progress: 0,
        currentStep: '',
        result: {
          success: false,
          hasChanges: false,
          totalChecked: 0,
          newFilesBackedUp: 0,
          modifiedFilesBackedUp: 0,
          skippedFiles: 0,
          errors: [{ filename: 'backup', error: error instanceof Error ? error.message : 'Unknown error' }],
          message: 'Backup gagal'
        }
      }))

      toast({
        title: '❌ Backup Gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat backup',
        variant: 'destructive',
        duration: 5000
      })
    }
  }

  const checkBackupNeeds = async () => {
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setStatus(prev => ({
          ...prev,
          checkResult: {
            needsBackup: data.result.needsBackup,
            newFilesCount: data.result.newFilesCount,
            modifiedFilesCount: data.result.modifiedFilesCount,
            unchangedFilesCount: data.result.unchangedFilesCount
          }
        }))
      }
    } catch (error) {
      console.error('Check backup error:', error)
    }
  }

  // Compact mode for sidebar
  if (compact) {
    if (!connected.drive || !connected.r2) {
      return null
    }

    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Auto Backup</span>
          </div>
        </div>
        <CardContent className="p-3">
          {/* Progress */}
          {status.isBackingUp && (
            <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span className="text-xs text-amber-700">{status.currentStep}</span>
                <span className="text-xs font-bold text-amber-600 ml-auto">{status.progress}%</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-1.5">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Result */}
          {status.result && !status.isBackingUp && (
            <div className={`mb-3 p-2 rounded-lg text-xs ${
              status.result.success 
                ? status.result.hasChanges 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-1.5">
                {status.result.success ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span className="font-medium">
                  {status.result.hasChanges ? 'Backup berhasil!' : 'Tidak ada perubahan'}
                </span>
              </div>
              {status.result.hasChanges && (
                <div className="mt-1.5 flex gap-2 text-[10px]">
                  <span>{status.result.newFilesBackedUp} baru</span>
                  <span>{status.result.modifiedFilesBackedUp} diubah</span>
                  <span>{status.result.skippedFiles} skip</span>
                </div>
              )}
            </div>
          )}

          {/* Check Result */}
          {status.checkResult && !status.result && !status.isBackingUp && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              {status.checkResult.needsBackup ? (
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{status.checkResult.newFilesCount} baru, {status.checkResult.modifiedFilesCount} berubah</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-blue-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>Up-to-date ({status.checkResult.unchangedFilesCount} file)</span>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAutoBackup}
              disabled={status.isBackingUp || !connected.drive || !connected.r2}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white h-8"
            >
              {status.isBackingUp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 mr-1.5" />
                  Backup
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={checkBackupNeeds}
              disabled={status.isBackingUp}
              className="h-8 w-8 p-0 border-amber-300 text-amber-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Last sync */}
          {lastSync && (
            <p className="mt-2 text-[10px] text-gray-400 text-center">
              Terakhir: {new Date(lastSync).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full mode for dashboard
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Auto Backup</p>
              <p className="text-xs text-amber-100">R2 → Google Drive (Otomatis)</p>
            </div>
          </div>
          {lastSync && (
            <div className="text-right">
              <p className="text-xs text-amber-100">Backup terakhir</p>
              <p className="text-sm text-white font-medium">
                {new Date(lastSync).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        {/* Progress */}
        {status.isBackingUp && (
          <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">{status.currentStep}</p>
                <p className="text-xs text-amber-500">Memproses backup otomatis...</p>
              </div>
              <span className="text-lg font-bold text-amber-600">{status.progress}%</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 relative"
                style={{ width: `${status.progress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </div>
            </div>
            
            <div className="flex justify-center mt-4 gap-2 items-center text-amber-600">
              <div className="flex items-center gap-1">
                <Cloud className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-medium">R2</span>
              </div>
              <ArrowRightLeft className="w-4 h-4 animate-bounce" />
              <div className="flex items-center gap-1">
                <FolderOpen className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-medium">Drive</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Result */}
        {status.result && !status.isBackingUp && (
          <div className={`mb-4 p-4 rounded-xl ${
            status.result.success 
              ? status.result.hasChanges 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200'
              : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {status.result.success ? (
                status.result.hasChanges ? (
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                )
              ) : (
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${
                  status.result.success 
                    ? status.result.hasChanges ? 'text-green-800' : 'text-blue-800'
                    : 'text-red-800'
                }`}>
                  {status.result.success 
                    ? status.result.hasChanges ? 'Backup Berhasil!' : 'Tidak Ada Perubahan'
                    : 'Backup Gagal'}
                </p>
                
                {status.result.hasChanges ? (
                  <div className="mt-2 grid grid-cols-4 gap-3 text-sm">
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-800">{status.result.totalChecked}</p>
                      <p className="text-xs text-gray-500">Diperiksa</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-600">{status.result.newFilesBackedUp}</p>
                      <p className="text-xs text-gray-500">Baru</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-amber-600">{status.result.modifiedFilesBackedUp}</p>
                      <p className="text-xs text-gray-500">Diubah</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-blue-600">{status.result.skippedFiles}</p>
                      <p className="text-xs text-gray-500">Skip</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-600 mt-2">
                    {status.result.message}
                  </p>
                )}
                
                {status.result.errors && status.result.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    {status.result.errors.slice(0, 3).map((e, i) => (
                      <p key={i}>• {e.filename}: {e.error}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Check Result */}
        {status.checkResult && !status.result && (
          <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-4 text-sm">
              {status.checkResult.needsBackup ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-700 font-medium">Perlu backup:</span>
                  </div>
                  <div className="flex gap-3 text-gray-600">
                    <span>{status.checkResult.newFilesCount} baru</span>
                    <span>{status.checkResult.modifiedFilesCount} berubah</span>
                    <span>{status.checkResult.unchangedFilesCount} tidak berubah</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Semua file sudah up-to-date ({status.checkResult.unchangedFilesCount} file)</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleAutoBackup}
            disabled={status.isBackingUp || !connected.drive || !connected.r2}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
          >
            {status.isBackingUp ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 mr-2" />
                Cek & Backup Otomatis
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={checkBackupNeeds}
            disabled={status.isBackingUp}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Cek Status
          </Button>
        </div>
        
        {/* Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-orange-600">R2</span> adalah storage utama. 
            Sistem akan otomatis mendeteksi file baru/berubah dan backup ke <span className="font-medium text-green-600">Google Drive</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
