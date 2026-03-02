'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, ExternalLink, Download, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface OfficeOnlineViewerProps {
  fileId: string
  fileName?: string
  onClose?: () => void
}

export function OfficeOnlineViewer({ fileId, fileName, onClose }: OfficeOnlineViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)

  // Ensure file is public and get URL
  const ensurePublicAndGetUrl = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Call API to ensure file is public and get the URL
      const res = await fetch(`/api/set-public?id=${fileId}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to access file')
      }
      
      // Use direct Google Drive download URL
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
      setPublicUrl(directUrl)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [fileId])

  useEffect(() => {
    ensurePublicAndGetUrl()
  }, [ensurePublicAndGetUrl])

  // Generate Office Online embed URL
  const getOfficeEmbedUrl = useCallback(() => {
    if (!publicUrl) return null
    const encodedUrl = encodeURIComponent(publicUrl)
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`
  }, [publicUrl])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading Excel Preview...</p>
        <p className="text-xs text-muted-foreground">Preparing Office Online Viewer</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 bg-background">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Preview</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={ensurePublicAndGetUrl}>
            Retry
          </Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    )
  }

  const embedUrl = getOfficeEmbedUrl()

  if (!embedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">No preview available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-[300px]">
            {fileName || 'Excel Preview'}
          </span>
          <span className="text-xs text-muted-foreground bg-green-100 text-green-700 px-2 py-0.5 rounded">
            Office Online
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Open in new tab */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Open in full Office Online viewer
              const fullUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl!)}`
              window.open(fullUrl, '_blank')
            }}
            title="Open in full viewer"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              window.open(publicUrl!, '_blank')
            }}
            title="Download file"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={ensurePublicAndGetUrl}
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Close">
              ✕
            </Button>
          )}
        </div>
      </div>
      
      {/* Office Online iframe - NO modifications to zoom or CSS */}
      <div 
        className="flex-1 overflow-hidden"
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ 
            border: 'none'
          }}
          title="Excel Preview - Office Online"
          allow="fullscreen"
        />
      </div>
      
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t bg-muted/50 text-xs text-muted-foreground">
        <div>
          Powered by Microsoft Office Online | 100% Layout Fidelity
        </div>
        <div>
          Shapes • Connectors • Charts preserved
        </div>
      </div>
    </div>
  )
}
