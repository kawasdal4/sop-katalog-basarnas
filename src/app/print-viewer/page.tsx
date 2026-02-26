'use client'

import { Suspense } from 'react'
import PrintViewerContent from './PrintViewerContent'

export default function PrintViewerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat halaman print...</p>
        </div>
      </div>
    }>
      <PrintViewerContent />
    </Suspense>
  )
}
