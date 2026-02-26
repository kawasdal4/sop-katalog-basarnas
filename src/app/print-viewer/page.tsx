'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PrintViewerPage() {
  const searchParams = useSearchParams()
  const fileId = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId) {
      setError('File ID tidak ditemukan')
      setLoading(false)
      return
    }

    // Create iframe to load PDF and trigger print
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = `/api/print?id=${fileId}`
    
    iframe.onload = () => {
      setLoading(false)
      // Wait a bit for PDF to fully load in iframe
      setTimeout(() => {
        try {
          iframe.contentWindow?.print()
        } catch (e) {
          console.log('Auto print failed, user needs to press Ctrl+P')
        }
      }, 1000)
    }

    iframe.onerror = () => {
      setError('Gagal memuat file')
      setLoading(false)
    }

    document.body.appendChild(iframe)

    // Cleanup on unmount
    return () => {
      document.body.removeChild(iframe)
    }
  }, [fileId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat PDF untuk print...</p>
          <p className="text-gray-400 text-sm mt-2">Mohon tunggu, dialog print akan muncul otomatis</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Tutup
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Print Preview</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print (Ctrl+P)
            </button>
            <button 
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto h-full">
          {fileId && (
            <embed 
              src={`/api/print?id=${fileId}#toolbar=1&navpanes=0&scrollbar=1`}
              type="application/pdf"
              width="100%"
              height="100%"
              className="rounded-lg shadow-lg"
              style={{ minHeight: 'calc(100vh - 150px)' }}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-orange-50 border-t border-orange-200 p-3 text-center">
        <p className="text-orange-700 text-sm">
          💡 Dialog print akan muncul otomatis. Jika tidak, tekan <strong>Ctrl+P</strong> atau klik tombol Print di atas.
        </p>
      </div>
    </div>
  )
}
