'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface ExcelPreviewProps {
  documentId: string
  documentName?: string
  onClose?: () => void
  onReconnect?: () => void
}

interface PageData {
  page: number
  pngBase64: string
  width: number
  height: number
}

export function ExcelPreview({ documentId, documentName, onClose, onReconnect }: ExcelPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresReconnect, setRequiresReconnect] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Fetch preview image
  const fetchPreview = useCallback(async (page: number = 1, forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      setRequiresReconnect(false)
      
      const url = forceRefresh 
        ? `/api/excel-preview?id=${documentId}&page=${page}&_t=${Date.now()}`
        : `/api/excel-preview?id=${documentId}&page=${page}`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (!response.ok) {
        // Check if it's a token expired error
        if (response.status === 401 || result.requiresReconnect) {
          setRequiresReconnect(true)
          setError(result.error || 'Session expired')
          throw new Error('TOKEN_EXPIRED')
        }
        throw new Error(result.error || 'Failed to load preview')
      }
      
      setPageData({
        page: result.page,
        pngBase64: result.pngBase64,
        width: result.width,
        height: result.height
      })
      setTotalPages(result.totalPages || 1)
      setCurrentPage(result.page)
      
    } catch (err) {
      if (err instanceof Error && err.message !== 'TOKEN_EXPIRED') {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [documentId])

  // Initial load
  useEffect(() => {
    fetchPreview(1)
  }, [fetchPreview])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(100)
  }, [])

  // Page navigation
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      fetchPreview(currentPage - 1)
    }
  }, [currentPage, fetchPreview])

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      fetchPreview(currentPage + 1)
    }
  }, [currentPage, totalPages, fetchPreview])

  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    // Clear cache by adding timestamp
    await fetchPreview(currentPage, true)
  }, [currentPage, fetchPreview])

  // Download PNG
  const handleDownload = useCallback(() => {
    if (!pageData || !documentName) return
    
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${pageData.pngBase64}`
    link.download = `${documentName.replace(/\.[^.]+$/, '')}_page_${currentPage}.png`
    link.click()
  }, [pageData, documentName, currentPage])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          handleZoomIn()
        } else if (e.key === '-') {
          e.preventDefault()
          handleZoomOut()
        } else if (e.key === '0') {
          e.preventDefault()
          handleZoomReset()
        }
      }
      // Page navigation
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        handlePrevPage()
      }
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        handleNextPage()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleZoomIn, handleZoomOut, handleZoomReset, handlePrevPage, handleNextPage])

  if (loading && !pageData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Generating preview...</p>
        <p className="text-xs text-muted-foreground">Converting Excel to PNG (300 DPI)</p>
      </div>
    )
  }

  // Session expired error
  if (requiresReconnect) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 bg-background">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Session Expired</AlertTitle>
          <AlertDescription>
            {error || 'Google Drive session expired. Please reconnect your Google Drive account.'}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          {onReconnect && (
            <Button onClick={onReconnect} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reconnect Google Drive
            </Button>
          )}
          <Button variant="outline" onClick={() => fetchPreview(1)}>
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4 bg-background">
        <p className="text-destructive text-center font-medium">Error: {error}</p>
        <p className="text-muted-foreground text-sm text-center">
          Pastikan file Excel tersedia atau coba lagi.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchPreview(1)}>
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

  if (!pageData) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">No preview available</p>
      </div>
    )
  }

  const scale = zoom / 100
  const scaledWidth = pageData.width * scale
  const scaledHeight = pageData.height * scale

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-background h-full overflow-hidden",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-[200px]">
            {documentName || 'Excel Preview'}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
        
        {/* Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              title="Previous page (←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm w-20 text-center">
              {currentPage} / {totalPages}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              title="Next page (→)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh preview"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          
          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download PNG"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l pl-2">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom out (Ctrl+-)">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-sm font-medium">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom in (Ctrl++)">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomReset} title="Reset zoom (Ctrl+0)">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Fullscreen toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Zoom slider */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground">Zoom:</span>
        <Slider
          value={[zoom]}
          onValueChange={([v]) => setZoom(v)}
          min={25}
          max={300}
          step={25}
          className="w-32"
        />
        <span className="text-xs text-muted-foreground">
          {Math.round(scaledWidth)} × {Math.round(scaledHeight)} px
        </span>
      </div>
      
      {/* Image container with scroll */}
      <div 
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900"
        style={{
          scrollbarWidth: 'thin',
        }}
      >
        <div 
          className="relative bg-white dark:bg-gray-800 shadow-lg mx-auto my-2"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* PNG Image */}
          <img
            ref={imageRef}
            src={`data:image/png;base64,${pageData.pngBase64}`}
            alt={`Excel Preview Page ${currentPage}`}
            className="block"
            style={{
              width: scaledWidth,
              height: scaledHeight,
              imageRendering: zoom > 100 ? 'pixelated' : 'auto'
            }}
          />
        </div>
      </div>
      
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t bg-muted/50 text-xs text-muted-foreground">
        <div>
          Render: PNG 300 DPI | Scale: {zoom}%
        </div>
        <div>
          Original: {pageData.width} × {pageData.height} px
        </div>
      </div>
    </div>
  )
}
