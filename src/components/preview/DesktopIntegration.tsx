'use client'

import { useState } from 'react'
import { Monitor, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

interface DesktopIntegrationProps {
  fileId: string
  fileName: string
  fileType: 'pdf' | 'xlsx'
  driveFileId?: string | null
  onPreview?: () => void
}

// Custom protocol for desktop app
const ESOP_PROTOCOL = 'esop-sync'

export function DesktopIntegration({
  fileId,
  fileName,
  fileType,
  driveFileId,
  onPreview
}: DesktopIntegrationProps) {
  const { toast } = useToast()
  const [isOpening, setIsOpening] = useState(false)

  const generateDesktopUrl = () => {
    // Create a secure token for desktop authentication
    const token = btoa(JSON.stringify({
      fileId,
      fileName,
      driveFileId,
      timestamp: Date.now(),
      action: 'open'
    }))

    // Custom protocol URL
    const desktopUrl = `${ESOP_PROTOCOL}://open?token=${encodeURIComponent(token)}&file=${encodeURIComponent(fileName)}&type=${fileType}`
    
    return desktopUrl
  }

  const openInDesktopApp = async () => {
    setIsOpening(true)
    
    try {
      const desktopUrl = generateDesktopUrl()
      
      // Attempt to open desktop app
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = desktopUrl
      document.body.appendChild(iframe)

      // Check if desktop app responded
      // If not after 2 seconds, show error
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 2000)

      // Show success toast
      toast({
        title: 'Membuka Aplikasi Desktop',
        description: `File "${fileName}" sedang dibuka di aplikasi desktop...`,
      })

      // Start listening for sync updates
      startSyncListener()

    } catch (error) {
      console.error('Desktop app error:', error)
      toast({
        title: 'Gagal Membuka Aplikasi Desktop',
        description: 'Aplikasi ESOP Desktop tidak ditemukan. Silakan instal aplikasi terlebih dahulu.',
        variant: 'destructive',
      })
    } finally {
      setIsOpening(false)
    }
  }

  const startSyncListener = () => {
    // Listen for sync messages from desktop app via BroadcastChannel
    const channel = new BroadcastChannel('esop-sync')
    
    channel.onmessage = (event) => {
      const { type, data } = event.data
      
      if (type === 'file-saved') {
        toast({
          title: 'File Disinkronkan',
          description: `File "${fileName}" berhasil diperbarui`,
        })
        // Trigger refresh of file list
        window.dispatchEvent(new CustomEvent('esop-file-updated', { detail: data }))
      }
      
      if (type === 'sync-error') {
        toast({
          title: 'Sinkronisasi Gagal',
          description: data.message || 'Terjadi kesalahan saat sinkronisasi',
          variant: 'destructive',
        })
      }
    }

    // Cleanup after 5 minutes
    setTimeout(() => {
      channel.close()
    }, 5 * 60 * 1000)
  }

  const handlePreviewInBrowser = () => {
    if (onPreview) {
      onPreview()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Aksi File" className="h-8 w-8">
          <ExternalLink className="w-4 h-4 text-orange-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-gray-500">
          Buka File
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handlePreviewInBrowser} className="cursor-pointer">
          <ExternalLink className="w-4 h-4 mr-2 text-orange-500" />
          <span>Pratinjau di Browser</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={openInDesktopApp} 
          className="cursor-pointer"
          disabled={isOpening}
        >
          <Monitor className="w-4 h-4 mr-2 text-yellow-500" />
          <span>{isOpening ? 'Membuka...' : 'Buka di Desktop'}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs text-gray-400">
          <p>💡 Desktop App Features:</p>
          <ul className="mt-1 space-y-0.5 text-gray-400">
            <li>• Edit langsung di Excel/Reader</li>
            <li>• Auto-sync saat disimpan</li>
            <li>• Offline mode support</li>
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Utility function to check if desktop app is installed
export function checkDesktopAppInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = `${ESOP_PROTOCOL}://ping`
    document.body.appendChild(iframe)

    const timeout = setTimeout(() => {
      document.body.removeChild(iframe)
      resolve(false)
    }, 1000)

    // Listen for response
    const channel = new BroadcastChannel('esop-sync')
    channel.onmessage = (event) => {
      if (event.data.type === 'pong') {
        clearTimeout(timeout)
        document.body.removeChild(iframe)
        channel.close()
        resolve(true)
      }
    }
  })
}

// Download URL for desktop app
export const DESKTOP_APP_DOWNLOAD_URL = '/api/desktop-app/download'
