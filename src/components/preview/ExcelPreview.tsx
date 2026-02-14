'use client'

import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, Table, FileSpreadsheet } from 'lucide-react'

interface ExcelPreviewProps {
  data: string // Base64 encoded Excel file
  fileName: string
}

export function ExcelPreview({ data, fileName }: ExcelPreviewProps) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

  // Parse workbook from base64 data using useMemo
  const workbookData = useMemo(() => {
    try {
      const binaryString = atob(data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const workbook = XLSX.read(bytes, { type: 'array' })
      return {
        sheets: workbook.SheetNames,
        workbook
      }
    } catch {
      return null
    }
  }, [data])

  // Get sheet data
  const sheetData = useMemo(() => {
    if (!workbookData?.workbook) return []
    const sheetName = workbookData.sheets[activeSheetIndex]
    if (!sheetName) return []
    
    const sheet = workbookData.workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]
  }, [workbookData, activeSheetIndex])

  // Get max columns for proper display
  const maxCols = useMemo(() => {
    return Math.max(...sheetData.map(row => row?.length || 0), 1)
  }, [sheetData])

  // Handle sheet change
  const handleSheetChange = useCallback((index: number) => {
    setActiveSheetIndex(index)
  }, [])

  // Loading state
  if (!workbookData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FileSpreadsheet className="w-12 h-12 text-gray-300" />
        <p className="text-red-500">Gagal membaca file Excel</p>
      </div>
    )
  }

  if (workbookData.sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-gray-500">Memuat file Excel...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sheet Tabs */}
      {workbookData.sheets.length > 1 && (
        <div className="flex gap-1 p-2 bg-gray-100 border-b overflow-x-auto">
          {workbookData.sheets.map((sheet, index) => (
            <button
              key={sheet}
              onClick={() => handleSheetChange(index)}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors whitespace-nowrap ${
                activeSheetIndex === index
                  ? 'bg-white text-orange-600 font-medium border-t border-l border-r'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <Table className="w-3 h-3 inline mr-1" />
              {sheet}
            </button>
          ))}
        </div>
      )}

      {/* Excel Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {sheetData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-orange-50 font-medium' : ''}>
                {/* Row number */}
                <td className="border border-gray-200 bg-gray-50 text-gray-400 text-xs px-2 py-1 text-center w-10">
                  {rowIndex + 1}
                </td>
                {/* Data cells */}
                {Array.from({ length: maxCols }).map((_, colIndex) => {
                  const cell = row?.[colIndex]
                  return (
                    <td
                      key={colIndex}
                      className={`border border-gray-200 px-2 py-1 ${
                        rowIndex === 0 ? 'bg-orange-50 font-medium text-orange-800' : ''
                      }`}
                    >
                      {cell !== undefined && cell !== null ? String(cell) : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {sheetData.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            Sheet kosong
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="p-2 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
        <span>📄 {fileName}</span>
        <span>📊 {sheetData.length} baris × {maxCols} kolom</span>
      </div>
    </div>
  )
}
