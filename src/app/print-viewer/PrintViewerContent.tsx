'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, Printer, X } from 'lucide-react'

type PrintStatus = 'loading' | 'generating-token' | 'converting' | 'ready' | 'printing' | 'error'

export default function PrintViewerContent() {
  const searchParams = useSearchParams()
  const fileId = searchParams.get('id')
  const [status, setStatus] = useState<PrintStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [fileTitle, setFileTitle] = useState<string | null>(null)
  const [printToken, setPrintToken] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const hasTriggeredPrint = useRef(false)
  const isMounted = useRef(true)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    // Intercept Ctrl+P / Cmd+P to print the PDF iframe instead of the React wrapper page
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        try {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.print()
          } else {
            window.print()
          }
        } catch (err) {
          console.error('Print blocked', err)
          window.print() // Fallback
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    // Skip if no valid fileId or already triggered
    if (!fileId || hasTriggeredPrint.current) return
    hasTriggeredPrint.current = true

    const loadAndDisplay = async () => {
      if (!isMounted.current) return

      try {
        // Step 1: Get file type info
        setStatus('loading')
        const checkRes = await fetch(`/api/print/check?id=${fileId}`)
        if (checkRes.ok) {
          const checkData = await checkRes.json()
          setFileType(checkData.fileType)
          setFileTitle(checkData.title)
        }

        // Step 2: Generate print token (authenticates the user)
        setStatus('generating-token')
        console.log('🎫 [Print] Generating print token...')
        const tokenRes = await fetch('/api/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId })
        })

        if (!tokenRes.ok) {
          const tokenError = await tokenRes.json()
          throw new Error(tokenError.error || 'Gagal membuat token print')
        }

        const tokenData = await tokenRes.json()
        const token = tokenData.token

        console.log('✅ [Print] Token generated, fetching PDF blob...')

        // Fetch the actual PDF data as a Base64 string directly
        // An <object> tag with a base64 data URI is the most resilient way to force inline PDF rendering without triggering download managers in strict environments
        const pdfRes = await fetch(`/api/print?token=${token}&format=base64`)
        if (!pdfRes.ok) {
          throw new Error('Gagal mengunduh data PDF')
        }

        const pdfData = await pdfRes.json()
        setPrintToken(pdfData.dataUri)
        console.log('✅ [Print] PDF Data URI created')

        // Show converting status for non-PDF files
        if (fileType && fileType !== 'pdf') {
          setStatus('converting')
          // Give a moment for the status text to show
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Set to ready — the embed viewer will display the PDF
        if (isMounted.current) {
          setStatus('ready')
        }
      } catch (err) {
        console.error('Print load error:', err)
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Gagal memuat file untuk print')
          setStatus('error')
        }
      }
    }

    loadAndDisplay()
  }, [fileId, fileType])

  // Loading/Converting screen with Basarnas theme
  if (status === 'loading' || status === 'generating-token' || status === 'converting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden relative">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />

        {/* Radar sweep effect */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(249, 115, 22, 0.1) 30deg, transparent 60deg)'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-orange-400/50"
            style={{
              left: `${15 + i * 10}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}

        {/* Main loading content */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* SAR Logo with pulse */}
          <motion.div
            className="relative mb-6"
            animate={{
              boxShadow: [
                '0 0 30px rgba(249, 115, 22, 0.5)',
                '0 0 60px rgba(249, 115, 22, 0.8)',
                '0 0 30px rgba(249, 115, 22, 0.5)'
              ]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <motion.div
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Shield className="w-12 h-12 text-white" />
            </motion.div>

            {/* Rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-orange-400/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-yellow-200 to-orange-300 mb-2"
            animate={{
              textShadow: [
                '0 0 10px rgba(249, 115, 22, 0.5)',
                '0 0 30px rgba(249, 115, 22, 0.8)',
                '0 0 10px rgba(249, 115, 22, 0.5)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {status === 'generating-token' ? 'MEMPROSES...' :
              status === 'converting' ? 'MENGKONVERSI FILE' : 'MEMUAT DOKUMEN'}
          </motion.h1>

          {/* Subtitle */}
          <div className="flex items-center gap-2 text-orange-400 text-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span>BASARNAS - Direktorat Kesiapsiagaan</span>
          </div>

          {/* Loading spinner */}
          <div className="relative w-16 h-16 mt-4">
            <motion.div
              className="absolute inset-0 border-4 border-orange-500/30 rounded-full"
            />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 border-4 border-transparent border-t-yellow-400 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* Loading text */}
          <motion.p
            className="text-gray-400 mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {status === 'generating-token' ? 'Memverifikasi akses...' :
              status === 'converting'
                ? 'Mengkonversi file ke PDF via Microsoft Graph API...'
                : 'Memuat PDF untuk print...'}
          </motion.p>

          {fileType && fileType !== 'pdf' && status === 'converting' && (
            <motion.p
              className="text-orange-300 text-sm mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              File {fileType?.toUpperCase()} akan dikonversi dengan print settings dari Office
            </motion.p>
          )}

          <motion.p
            className="text-gray-500 text-sm mt-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Dialog print akan muncul otomatis
          </motion.p>
        </motion.div>
      </div>
    )
  }

  // Error screen
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(239, 68, 68, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(239, 68, 68, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />

        <motion.div
          className="relative z-10 text-center bg-slate-800/80 backdrop-blur-lg p-8 rounded-2xl border border-red-500/30 shadow-2xl max-w-md"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {/* Error icon */}
          <motion.div
            className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"
            animate={{
              boxShadow: ['0 0 20px rgba(239, 68, 68, 0.3)', '0 0 40px rgba(239, 68, 68, 0.5)', '0 0 20px rgba(239, 68, 68, 0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </motion.div>

          <h1 className="text-xl font-bold text-white mb-2">Gagal Memuat File</h1>
          <p className="text-gray-400 mb-4">{error}</p>

          {fileType && (
            <p className="text-orange-400 text-sm mb-4">
              Tipe file: {fileType.toUpperCase()}
            </p>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.close()}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Success view with PDF viewer
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header with Basarnas theme */}
      <motion.div
        className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-5xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Print Preview</h1>
                <p className="text-orange-100 text-xs">
                  {fileTitle || 'BASARNAS - Direktorat Kesiapsiagaan'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={() => {
                  if (iframeRef.current && iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.print()
                  } else {
                    window.print()
                  }
                }}
                className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 font-medium shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Printer className="w-4 h-4" />
                Print (Ctrl+P)
              </motion.button>
              <motion.button
                onClick={() => window.close()}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-4 h-4" />
                Tutup
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* PDF Viewer */}
      <div className="flex-1 p-4">
        <motion.div
          className="max-w-5xl mx-auto h-full bg-white rounded-xl shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* We use an <object> tag with a base64 data URI. This is the most robust way to force inline PDF display without triggering arbitrary browser downloads. */}
          {printToken && (
            <>
              <object
                data={`${printToken}#toolbar=1&navpanes=0&scrollbar=1`}
                type="application/pdf"
                className="w-full h-full rounded-lg border-0"
                style={{ minHeight: 'calc(100vh - 180px)' }}
                title="PDF Preview"
              >
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
                  <AlertTriangle className="w-12 h-12 text-orange-500 mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Browser Tidak Mendukung PDF Inline</h3>
                  <p className="text-gray-600 mb-4">Silakan gunakan tombol Print di atas atau tekan Ctrl+P.</p>
                </div>
              </object>

              {/* Hidden iframe specifically for native printing via Ctrl+P */}
              <iframe
                ref={iframeRef}
                src={printToken}
                style={{ display: 'none' }}
                title="Print Frame"
              />
            </>
          )}
        </motion.div>
      </div>

      {/* Instructions footer */}
      <motion.div
        className="bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-200 p-3 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-orange-700 text-sm">
          <strong>Tip:</strong> Dialog print akan muncul otomatis. Jika tidak, tekan <kbd className="px-1.5 py-0.5 bg-orange-100 rounded text-orange-800 font-mono text-xs">Ctrl+P</kbd> atau klik tombol Print di atas.
        </p>
        {status === 'printing' && (
          <p className="text-green-600 text-sm mt-1">
            <Printer className="w-4 h-4 inline mr-1" />
            Dialog print sedang ditampilkan...
          </p>
        )}
      </motion.div>
    </div>
  )
}
