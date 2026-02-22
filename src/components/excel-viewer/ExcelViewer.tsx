'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Grid3X3,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface ExcelCell {
  address: string
  value: string | number | boolean | null
  formula?: string
  style?: {
    font?: {
      bold?: boolean
      italic?: boolean
      size?: number
      color?: string
    }
    fill?: string
    alignment?: {
      horizontal?: string
      vertical?: string
      wrapText?: boolean
    }
  }
}

interface ExcelRow {
  index: number
  height: number
  hidden: boolean
}

interface ExcelColumn {
  index: number
  width: number
  hidden: boolean
}

interface ExcelShape {
  id: string
  type: 'shape' | 'connector' | 'image' | 'textbox'
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  text?: string
  fill?: string
  stroke?: string
}

interface ExcelSheet {
  name: string
  index: number
  cells: ExcelCell[]
  rows: ExcelRow[]
  columns: ExcelColumn[]
  shapes: ExcelShape[]
  mergedCells: string[]
  dimensions: {
    minRow: number
    maxRow: number
    minCol: number
    maxCol: number
  }
  totalWidth: number
  totalHeight: number
}

interface ExcelData {
  fileName: string
  sheets: ExcelSheet[]
  activeSheet: number
}

interface ExcelViewerProps {
  documentId: string
  onClose?: () => void
}

// Convert column index to letter
function colToLetter(col: number): string {
  let letter = ''
  let temp = col
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

// Parse merged cell range
function parseMergedRange(range: string): { start: string; end: string; startCol: number; startRow: number; endCol: number; endRow: number } {
  const [start, end] = range.split(':')
  const startMatch = start.match(/^([A-Z]+)(\d+)$/)
  const endMatch = end.match(/^([A-Z]+)(\d+)$/)
  
  if (!startMatch || !endMatch) {
    return { start, end, startCol: 0, startRow: 0, endCol: 0, endRow: 0 }
  }
  
  const colToNum = (letters: string) => {
    let num = 0
    for (let i = 0; i < letters.length; i++) {
      num = num * 26 + (letters.charCodeAt(i) - 64)
    }
    return num - 1
  }
  
  return {
    start,
    end,
    startCol: colToNum(startMatch[1]),
    startRow: parseInt(startMatch[2]) - 1,
    endCol: colToNum(endMatch[1]),
    endRow: parseInt(endMatch[2]) - 1,
  }
}

// Check if cell is in merged range
function isMergedCell(address: string, mergedCells: string[]): { isMerged: boolean; isStart: boolean; range?: ReturnType<typeof parseMergedRange> } {
  for (const range of mergedCells) {
    const parsed = parseMergedRange(range)
    if (address === parsed.start) {
      return { isMerged: true, isStart: true, range: parsed }
    }
    if (address >= parsed.start && address <= parsed.end) {
      return { isMerged: true, isStart: false, range: parsed }
    }
  }
  return { isMerged: false, isStart: false }
}

// Convert hex color to CSS
function hexToCss(hex?: string): string {
  if (!hex) return 'transparent'
  // Handle theme colors (starting with FF)
  if (hex.length === 8 && hex.startsWith('FF')) {
    return `#${hex.slice(2)}`
  }
  if (hex.length === 6) {
    return `#${hex}`
  }
  return hex
}

export function ExcelViewer({ documentId, onClose }: ExcelViewerProps) {
  const [data, setData] = useState<ExcelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Fetch Excel data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/excel-viewer?id=${documentId}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to load Excel file')
      }
      
      setData(result.data)
      setActiveSheet(result.data.activeSheet || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 200))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(100)
  }, [])

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
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleZoomIn, handleZoomOut, handleZoomReset])

  // Get current sheet
  const currentSheet = data?.sheets[activeSheet]

  // Build cell map for faster lookup
  const cellMap = useRef<Map<string, ExcelCell>>(new Map())
  
  useEffect(() => {
    if (currentSheet) {
      cellMap.current.clear()
      currentSheet.cells.forEach(cell => {
        cellMap.current.set(cell.address, cell)
      })
    }
  }, [currentSheet])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Excel file...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4 p-4">
        <p className="text-destructive text-center">Error: {error}</p>
        <p className="text-muted-foreground text-sm text-center">
          Pastikan file Excel tersedia secara lokal atau dapat diunduh dari Google Drive.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
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

  if (!data || !currentSheet) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  const scale = zoom / 100

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-background border rounded-lg overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 rounded-none"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-[200px]">
            {data.fileName}
          </span>
        </div>
        
        {/* Sheet tabs */}
        {data.sheets.length > 1 && (
          <Tabs value={String(activeSheet)} onValueChange={(v) => setActiveSheet(Number(v))}>
            <TabsList className="h-8">
              {data.sheets.map((sheet, idx) => (
                <TabsTrigger key={sheet.name} value={String(idx)} className="h-6 px-3 text-xs">
                  {sheet.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        
        <div className="flex items-center gap-2">
          {/* Grid toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
            className={cn(showGrid && "bg-primary/10")}
            title="Toggle grid lines"
          >
            <Grid3X3 className="h-4 w-4" />
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
          max={200}
          step={25}
          className="w-32"
        />
      </div>
      
      {/* Main scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900"
        style={{
          scrollbarWidth: 'thin',
        }}
      >
        <div
          className="relative bg-white dark:bg-gray-800 shadow-lg"
          style={{
            width: currentSheet.totalWidth * scale + 60, // Extra for row header
            height: currentSheet.totalHeight * scale + 30, // Extra for col header
            minWidth: '100%',
          }}
        >
          {/* Column headers */}
          <div 
            className="sticky top-0 z-20 flex bg-gray-200 dark:bg-gray-700 border-b border-r"
            style={{ 
              marginLeft: 60 * scale,
              height: 24 * scale,
            }}
          >
            {currentSheet.columns.map((col) => (
              <div
                key={col.index}
                className={cn(
                  "flex-shrink-0 flex items-center justify-center text-xs font-medium border-r",
                  "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
                  showGrid && "border-gray-300 dark:border-gray-600"
                )}
                style={{
                  width: col.width * scale,
                  height: 24 * scale,
                }}
              >
                {colToLetter(col.index)}
              </div>
            ))}
          </div>
          
          {/* Row headers + Grid */}
          <div className="flex">
            {/* Row headers */}
            <div 
              className="sticky left-0 z-10 flex flex-col bg-gray-200 dark:bg-gray-700 border-r"
              style={{ top: 24 * scale }}
            >
              {currentSheet.rows.map((row) => (
                <div
                  key={row.index}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center text-xs font-medium border-b",
                    "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
                    showGrid && "border-gray-300 dark:border-gray-600"
                  )}
                  style={{
                    width: 60 * scale,
                    height: row.height * scale,
                  }}
                >
                  {row.index + 1}
                </div>
              ))}
            </div>
            
            {/* Grid container */}
            <div
              className="relative"
              style={{
                width: currentSheet.totalWidth * scale,
                height: currentSheet.totalHeight * scale,
              }}
            >
              {/* Grid lines */}
              {showGrid && (
                <>
                  {/* Vertical lines */}
                  {currentSheet.columns.map((col, idx) => {
                    let left = 0
                    for (let i = 0; i < idx; i++) {
                      left += currentSheet.columns[i].width * scale
                    }
                    return (
                      <div
                        key={`v-${col.index}`}
                        className="absolute top-0 bottom-0 border-r border-gray-200 dark:border-gray-700"
                        style={{ left: left + col.width * scale }}
                      />
                    )
                  })}
                  {/* Horizontal lines */}
                  {currentSheet.rows.map((row, idx) => {
                    let top = 0
                    for (let i = 0; i < idx; i++) {
                      top += currentSheet.rows[i].height * scale
                    }
                    return (
                      <div
                        key={`h-${row.index}`}
                        className="absolute left-0 right-0 border-b border-gray-200 dark:border-gray-700"
                        style={{ top: top + row.height * scale }}
                      />
                    )
                  })}
                </>
              )}
              
              {/* Cells */}
              {currentSheet.cells.map((cell) => {
                const merged = isMergedCell(cell.address, currentSheet.mergedCells)
                
                // Skip non-start merged cells
                if (merged.isMerged && !merged.isStart) {
                  return null
                }
                
                // Calculate cell position
                let left = 0
                let top = 0
                let width = currentSheet.columns[cell.address.match(/[A-Z]+/)?.[0] ? 
                  parseInt(cell.address.match(/[A-Z]+/)?.[0] || 'A'.charCodeAt(0) - 64 + '') - 1 : 0
                ]?.width * scale || 64 * scale
                let height = currentSheet.rows[parseInt(cell.address.match(/\d+/)?.[0] || '1') - 1]?.height * scale || 20 * scale
                
                // Calculate left position
                const colMatch = cell.address.match(/^[A-Z]+/)
                if (colMatch) {
                  let colIdx = 0
                  for (let i = 0; i < colMatch[0].length; i++) {
                    colIdx = colIdx * 26 + (colMatch[0].charCodeAt(i) - 64)
                  }
                  colIdx -= 1
                  
                  for (let i = 0; i < colIdx; i++) {
                    left += currentSheet.columns[i]?.width * scale || 64 * scale
                  }
                  
                  // Handle merged cells
                  if (merged.isMerged && merged.range) {
                    width = 0
                    for (let i = merged.range.startCol; i <= merged.range.endCol; i++) {
                      width += currentSheet.columns[i]?.width * scale || 64 * scale
                    }
                    height = 0
                    for (let i = merged.range.startRow; i <= merged.range.endRow; i++) {
                      height += currentSheet.rows[i]?.height * scale || 20 * scale
                    }
                  }
                }
                
                // Calculate top position
                const rowMatch = cell.address.match(/\d+$/)
                if (rowMatch) {
                  const rowIdx = parseInt(rowMatch[0]) - 1
                  for (let i = 0; i < rowIdx; i++) {
                    top += currentSheet.rows[i]?.height * scale || 20 * scale
                  }
                }
                
                return (
                  <div
                    key={cell.address}
                    className={cn(
                      "absolute flex items-center px-1 overflow-hidden",
                      "whitespace-nowrap text-sm",
                    )}
                    style={{
                      left,
                      top,
                      width,
                      height,
                      backgroundColor: cell.style?.fill ? hexToCss(cell.style.fill) : 'white',
                      color: cell.style?.font?.color ? hexToCss(cell.style.font.color) : undefined,
                      fontWeight: cell.style?.font?.bold ? 'bold' : undefined,
                      fontStyle: cell.style?.font?.italic ? 'italic' : undefined,
                      fontSize: cell.style?.font?.size ? `${cell.style.font.size * scale}px` : undefined,
                      justifyContent: cell.style?.alignment?.horizontal === 'center' ? 'center' :
                        cell.style?.alignment?.horizontal === 'right' ? 'flex-end' : 'flex-start',
                      alignItems: cell.style?.alignment?.vertical === 'center' ? 'center' :
                        cell.style?.alignment?.vertical === 'bottom' ? 'flex-end' : 'flex-start',
                      whiteSpace: cell.style?.alignment?.wrapText ? 'pre-wrap' : 'nowrap',
                      wordBreak: cell.style?.alignment?.wrapText ? 'break-word' : undefined,
                    }}
                    title={cell.formula ? `${cell.address}: ${cell.formula}` : cell.address}
                  >
                    {cell.value !== null && cell.value !== undefined ? String(cell.value) : ''}
                  </div>
                )
              })}
              
              {/* Shapes (if any) */}
              {currentSheet.shapes.map((shape) => (
                <div
                  key={shape.id}
                  className="absolute"
                  style={{
                    left: shape.x * scale,
                    top: shape.y * scale,
                    width: shape.width * scale,
                    height: shape.height * scale,
                    backgroundColor: shape.fill || 'transparent',
                    border: shape.stroke ? `${shape.strokeWidth || 1}px solid ${shape.stroke}` : undefined,
                    transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
                  }}
                >
                  {shape.text && (
                    <div className="w-full h-full flex items-center justify-center text-sm">
                      {shape.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t bg-muted/50 text-xs text-muted-foreground">
        <div>
          Sheet: {currentSheet.name} | 
          Dimensions: {currentSheet.dimensions.maxCol - currentSheet.dimensions.minCol + 1} cols × 
          {currentSheet.dimensions.maxRow - currentSheet.dimensions.minRow + 1} rows
        </div>
        <div>
          Canvas: {Math.round(currentSheet.totalWidth * scale)}px × {Math.round(currentSheet.totalHeight * scale)}px
        </div>
      </div>
    </div>
  )
}
