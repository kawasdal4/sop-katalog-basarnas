'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Cloud,
  CloudOff,
  Database,
  ChevronDown,
  ArrowRightLeft,
  Upload,
  HardDrive,
  Clock,
  Zap,
  Stethoscope,
  FileSpreadsheet
} from 'lucide-react'

interface StorageStatusProps {
  compact?: boolean
  onRefresh?: () => void
  onBackup?: () => void
  isBackingUp?: boolean
  syncStatus?: {
    isSyncing: boolean
    progress: number
    currentStep: string
    direction?: 'drive-to-r2' | 'r2-to-drive' | 'bidirectional' | null
    result?: {
      success: boolean
      r2?: string
      googleDrive?: string
    }
  }
  lastSyncResult?: {
    r2: 'synced' | 'pending' | 'error'
    googleDrive: 'synced' | 'pending' | 'error'
    timestamp?: Date
  }
  onDiagnose?: () => void
  isDiagnosing?: boolean
}

interface DriveStatusType {
  connected: boolean
  status: string
  message: string
  details?: {
    folderId?: string
    folderName?: string
    folderOwner?: string
    tokenValid?: boolean
    lastChecked?: string
  }
}

interface R2StatusType {
  connected: boolean
  status: string
  message: string
  details?: {
    bucket?: string
    accountId?: string
  }
  setupInstructions?: string[]
}

// Format date for display
function formatLastSync(date?: Date): string {
  if (!date) return 'Belum ada data'
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Baru saja'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
  
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function StorageStatus({
  compact = false,
  onRefresh,
  onBackup,
  isBackingUp = false,
  syncStatus,
  lastSyncResult,
  onDiagnose,
  isDiagnosing = false
}: StorageStatusProps) {
  const [driveStatus, setDriveStatus] = useState<DriveStatusType | null>(null)
  const [r2Status, setR2Status] = useState<R2StatusType | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [driveRes, r2Res] = await Promise.all([
        fetch('/api/drive/status'),
        fetch('/api/r2/status')
      ])
      const driveData = await driveRes.json()
      const r2Data = await r2Res.json()
      setDriveStatus(driveData)
      setR2Status(r2Data)
    } catch (error) {
      console.error('Failed to fetch storage status:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleRefresh = () => {
    fetchStatus()
    onRefresh?.()
  }

  const handleBackup = () => {
    onBackup?.()
  }

  // Compact mode for header
  if (compact) {
    const allConnected = driveStatus?.connected && r2Status?.connected
    const partialConnect = (driveStatus?.connected || r2Status?.connected) && !allConnected
    const noneConnected = !driveStatus?.connected && !r2Status?.connected
    const isCurrentlySyncing = syncStatus?.isSyncing || isBackingUp

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="gap-2 relative hover:bg-white/10 overflow-visible"
          >
            {/* Animated Storage Indicator */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              {/* Outer pulse ring - Green for all connected */}
              {allConnected && !isCurrentlySyncing && (
                <>
                  <div className="absolute inset-0 rounded-full animate-storage-pulse-green" 
                    style={{ 
                      background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                      animation: 'storagePulse 2s ease-in-out infinite'
                    }} 
                  />
                  <div className="absolute inset-1 rounded-full animate-storage-ring-green"
                    style={{
                      border: '2px solid rgba(34, 197, 94, 0.5)',
                      animation: 'storageRing 2s ease-in-out infinite'
                    }}
                  />
                </>
              )}
              
              {/* Outer pulse ring - Amber for partial connection */}
              {partialConnect && !isCurrentlySyncing && (
                <>
                  <div className="absolute inset-0 rounded-full" 
                    style={{ 
                      background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
                      animation: 'storagePulse 2s ease-in-out infinite'
                    }} 
                  />
                  <div className="absolute inset-1 rounded-full"
                    style={{
                      border: '2px solid rgba(251, 191, 36, 0.5)',
                      animation: 'storageRing 2s ease-in-out infinite'
                    }}
                  />
                </>
              )}

              {/* Outer pulse ring - Red for none connected */}
              {noneConnected && !isCurrentlySyncing && (
                <>
                  <div className="absolute inset-0 rounded-full" 
                    style={{ 
                      background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
                      animation: 'storagePulse 1.5s ease-in-out infinite'
                    }} 
                  />
                  <div className="absolute inset-1 rounded-full"
                    style={{
                      border: '2px solid rgba(239, 68, 68, 0.5)',
                      animation: 'storageRing 1.5s ease-in-out infinite'
                    }}
                  />
                </>
              )}

              {/* Syncing animation */}
              {isCurrentlySyncing && (
                <>
                  <div className="absolute inset-0 rounded-full"
                    style={{ 
                      background: 'radial-gradient(circle, rgba(249, 115, 22, 0.4) 0%, transparent 70%)',
                      animation: 'storagePulse 1s ease-in-out infinite'
                    }} 
                  />
                  <div className="absolute inset-1 rounded-full"
                    style={{
                      border: '2px dashed rgba(249, 115, 22, 0.7)',
                      animation: 'storageSpin 1s linear infinite'
                    }}
                  />
                </>
              )}

              {/* Icon */}
              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                isCurrentlySyncing ? 'bg-orange-500' :
                allConnected ? 'bg-green-500' : 
                partialConnect ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{
                boxShadow: isCurrentlySyncing 
                  ? '0 0 10px rgba(249, 115, 22, 0.6)' 
                  : allConnected 
                    ? '0 0 10px rgba(34, 197, 94, 0.6)'
                    : partialConnect
                      ? '0 0 10px rgba(251, 191, 36, 0.6)'
                      : '0 0 10px rgba(239, 68, 68, 0.6)'
              }}>
                {isCurrentlySyncing ? (
                  <Upload className="w-3.5 h-3.5 text-white animate-pulse" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-white" />
                )}
              </div>

              {/* Refresh indicator */}
              {isRefreshing && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                  <RefreshCw className="w-2 h-2 text-gray-800 animate-spin" />
                </div>
              )}
            </div>

            {/* Status text with glowing animation */}
            <span 
              className={`hidden sm:inline text-sm font-semibold ${
                isCurrentlySyncing ? 'text-orange-400' :
                allConnected ? 'text-green-400' : 
                partialConnect ? 'text-amber-400' : 'text-red-400'
              } ${!isCurrentlySyncing && (allConnected || partialConnect || noneConnected) ? 'animate-text-glow' : (isCurrentlySyncing ? 'animate-pulse' : '')}`}
              style={allConnected && !isCurrentlySyncing ? {
                textShadow: '0 0 4px rgba(34, 197, 94, 0.5), 0 0 8px rgba(34, 197, 94, 0.3)',
                animation: 'textGlowGreen 2s ease-in-out infinite'
              } : partialConnect && !isCurrentlySyncing ? {
                textShadow: '0 0 4px rgba(251, 191, 36, 0.5), 0 0 8px rgba(251, 191, 36, 0.3)',
                animation: 'textGlowAmber 2s ease-in-out infinite'
              } : noneConnected && !isCurrentlySyncing ? {
                textShadow: '0 0 4px rgba(239, 68, 68, 0.5), 0 0 8px rgba(239, 68, 68, 0.3)',
                animation: 'textGlowRed 2s ease-in-out infinite'
              } : {}}
            >
              {isCurrentlySyncing ? 'Syncing...' : allConnected ? 'Storage OK' : partialConnect ? 'Partial' : 'Offline'}
            </span>
            
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 overflow-hidden bg-gray-900 border border-gray-700">
          {/* Animated Header */}
          <DropdownMenuLabel className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isCurrentlySyncing ? 'bg-orange-500 animate-pulse' :
                allConnected ? 'bg-green-500' : 
                partialConnect ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{
                boxShadow: isCurrentlySyncing 
                  ? '0 0 8px rgba(249, 115, 22, 0.8)' 
                  : allConnected 
                    ? '0 0 8px rgba(34, 197, 94, 0.8)'
                    : partialConnect
                      ? '0 0 8px rgba(251, 191, 36, 0.8)'
                      : '0 0 8px rgba(239, 68, 68, 0.8)'
              }} />
              <span className="font-semibold">Storage Status</span>
            </div>
            <div className="flex items-center gap-1">
              {onDiagnose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDiagnose}
                  disabled={isDiagnosing}
                  className="h-7 px-2 text-xs gap-1 text-gray-300 hover:text-white hover:bg-white/10"
                  title="Diagnosa Excel Edit System"
                >
                  <Stethoscope className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">Diagnosa</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackup}
                disabled={isBackingUp || !allConnected}
                className="h-7 px-2 text-xs gap-1 text-gray-300 hover:text-white hover:bg-white/10"
              >
                <HardDrive className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Backup</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 p-0 text-gray-300 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Sync Progress */}
          {isCurrentlySyncing && (
            <>
              <div className="px-3 py-3 bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-b border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <ArrowRightLeft className="w-4 h-4 text-orange-400" />
                    <div className="absolute inset-0 animate-ping">
                      <ArrowRightLeft className="w-4 h-4 text-orange-400 opacity-40" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-orange-300">
                    {isBackingUp ? 'Membackup...' : 'Menyinkronkan...'}
                  </span>
                </div>
                <Progress value={syncStatus?.progress || 0} className="h-2 bg-gray-700" />
                <p className="text-xs text-gray-400 mt-1">{syncStatus?.currentStep || 'Processing...'}</p>
              </div>
              <DropdownMenuSeparator className="bg-gray-700" />
            </>
          )}

          {/* Last Sync Result */}
          {lastSyncResult && !isCurrentlySyncing && (
            <>
              <div className="px-3 py-2 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-b border-green-500/20">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-medium text-green-300">Sinkronisasi Terakhir</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className={`flex items-center gap-1 ${lastSyncResult.r2 === 'synced' ? 'text-green-400' : 'text-amber-400'}`}>
                    {lastSyncResult.r2 === 'synced' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    R2
                  </span>
                  <span className="text-gray-600">|</span>
                  <span className={`flex items-center gap-1 ${lastSyncResult.googleDrive === 'synced' ? 'text-green-400' : 'text-amber-400'}`}>
                    {lastSyncResult.googleDrive === 'synced' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    Drive
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatLastSync(lastSyncResult.timestamp)}</span>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-gray-700" />
            </>
          )}
          
          {/* R2 Status Card */}
          <DropdownMenuItem className="flex items-center gap-3 py-3 cursor-default hover:bg-gray-800/50">
            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${
              r2Status?.connected 
                ? 'bg-gradient-to-br from-orange-500 to-amber-600' 
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }`}>
              {r2Status?.connected && (
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
              )}
              {r2Status?.connected ? (
                <Cloud className="w-5 h-5 text-white relative z-10" />
              ) : (
                <CloudOff className="w-5 h-5 text-white/70" />
              )}
              {/* Animated ring for connected status */}
              {r2Status?.connected && (
                <div className="absolute inset-0 rounded-xl" style={{
                  border: '1px solid rgba(255,255,255,0.3)',
                  animation: 'storageRing 3s ease-in-out infinite'
                }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Cloudflare R2</span>
                {r2Status?.connected && (
                  <Badge className="text-[9px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-1.5">
                    <Zap className="w-2.5 h-2.5 mr-0.5" />PRIMARY
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {r2Status?.connected ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500" style={{
                      boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)'
                    }} />
                    <span className="text-xs text-gray-400 truncate">{r2Status.details?.bucket}</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" style={{
                      boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)'
                    }} />
                    <span className="text-xs text-gray-400">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </DropdownMenuItem>

          {/* Drive Status Card */}
          <DropdownMenuItem className="flex items-center gap-3 py-3 cursor-default hover:bg-gray-800/50">
            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${
              driveStatus?.connected 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }`}>
              {driveStatus?.connected && (
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
              )}
              {driveStatus?.connected ? (
                <FolderOpen className="w-5 h-5 text-white relative z-10" />
              ) : (
                <CloudOff className="w-5 h-5 text-white/70" />
              )}
              {/* Animated ring for connected status */}
              {driveStatus?.connected && (
                <div className="absolute inset-0 rounded-xl" style={{
                  border: '1px solid rgba(255,255,255,0.3)',
                  animation: 'storageRing 3s ease-in-out infinite',
                  animationDelay: '0.5s'
                }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Google Drive</span>
                {driveStatus?.connected && (
                  <Badge className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-1.5">
                    BACKUP
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {driveStatus?.connected ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500" style={{
                      boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)'
                    }} />
                    <span className="text-xs text-gray-400 truncate">{driveStatus.details?.folderName}</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" style={{
                      boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)'
                    }} />
                    <span className="text-xs text-gray-400">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </DropdownMenuItem>

          {!allConnected && (
            <>
              <DropdownMenuSeparator className="bg-gray-700" />
              <div className="px-3 py-2 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-t border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Storage tidak lengkap. Beberapa fitur mungkin tidak berfungsi.</span>
                </div>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full mode for sidebar/dashboard
  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Storage</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackup}
              disabled={isBackingUp}
              className="h-7 px-2 text-xs text-gray-400 hover:text-white gap-1"
              title="Backup Manual"
            >
              <HardDrive className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-pulse' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        {/* Sync Progress */}
        {(syncStatus?.isSyncing || isBackingUp) && (
          <div className="bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/30 rounded-lg p-2 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-3 h-3 text-orange-400 animate-pulse" />
              <span className="text-xs font-medium text-orange-300">
                {isBackingUp ? 'Membackup...' : syncStatus?.currentStep}
              </span>
            </div>
            <Progress value={syncStatus?.progress || 0} className="h-1.5 bg-gray-700" />
          </div>
        )}

        {/* Last Sync Result */}
        {lastSyncResult && !syncStatus?.isSyncing && !isBackingUp && (
          <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-lg p-2 mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-green-300 font-medium">Last Sync:</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className={lastSyncResult.r2 === 'synced' ? 'text-green-400' : 'text-amber-400'}>
                  {lastSyncResult.r2 === 'synced' ? '✅ R2' : '⏳ R2'}
                </span>
                <span className={lastSyncResult.googleDrive === 'synced' ? 'text-green-400' : 'text-amber-400'}>
                  {lastSyncResult.googleDrive === 'synced' ? '✅ Drive' : '⏳ Drive'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
              <Clock className="w-2.5 h-2.5" />
              <span>{formatLastSync(lastSyncResult.timestamp)}</span>
            </div>
          </div>
        )}

        {/* R2 Status */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          r2Status?.connected 
            ? 'bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-500/20' 
            : 'bg-red-900/30 border border-red-500/20'
        }`}>
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
            r2Status?.connected 
              ? 'bg-gradient-to-br from-orange-500 to-amber-600' 
              : 'bg-red-500'
          }`}>
            {r2Status?.connected ? (
              <Cloud className="w-4 h-4 text-white" />
            ) : (
              <CloudOff className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-white">R2</span>
              {r2Status?.connected && (
                <Badge className="text-[8px] bg-orange-500/30 text-orange-300 px-1 py-0 h-3.5">
                  PRIMARY
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-gray-400 truncate">
              {r2Status?.connected ? r2Status.details?.bucket : 'Disconnected'}
            </p>
          </div>
        </div>

        {/* Drive Status */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          driveStatus?.connected 
            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/20' 
            : 'bg-red-900/30 border border-red-500/20'
        }`}>
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
            driveStatus?.connected 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
              : 'bg-red-500'
          }`}>
            {driveStatus?.connected ? (
              <FolderOpen className="w-4 h-4 text-white" />
            ) : (
              <CloudOff className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-white">Drive</span>
              {driveStatus?.connected && (
                <Badge className="text-[8px] bg-green-500/30 text-green-300 px-1 py-0 h-3.5">
                  BACKUP
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-gray-400 truncate">
              {driveStatus?.connected ? driveStatus.details?.folderName : 'Disconnected'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
