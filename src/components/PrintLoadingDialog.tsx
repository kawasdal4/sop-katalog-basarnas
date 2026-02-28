'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  FileOutput,
  Printer,
  X
} from 'lucide-react'

interface PrintStep {
  id: string
  label: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

interface PrintLoadingDialogProps {
  open: boolean
  onClose: () => void
  fileId: string | null
  fileName: string
  fileType: string
  onComplete?: () => void
}

// Initial steps based on file type
const getInitialSteps = (fileType: string): PrintStep[] => {
  const isPdf = fileType === 'pdf'

  if (isPdf) {
    return [
      { id: 'init', label: 'Memvalidasi', description: 'Memvalidasi file dan izin akses...', status: 'pending' },
      { id: 'user', label: 'Mengambil Info User', description: 'Mengambil informasi pengguna...', status: 'pending' },
      { id: 'download', label: 'Mengunduh dari R2', description: 'Mengunduh file dari Cloudflare R2...', status: 'pending' },
      { id: 'footer', label: 'Menambahkan Footer', description: 'Menambahkan footer dinamis ke PDF...', status: 'pending' },
      { id: 'ready', label: 'Membuka PDF', description: 'Membuka PDF di tab baru...', status: 'pending' },
    ]
  }

  return [
    { id: 'init', label: 'Memvalidasi', description: 'Memvalidasi file dan izin akses...', status: 'pending' },
    { id: 'user', label: 'Mengambil Info User', description: 'Mengambil informasi pengguna...', status: 'pending' },
    { id: 'download', label: 'Mengunduh dari R2', description: 'Mengunduh file dari Cloudflare R2...', status: 'pending' },
    { id: 'upload', label: 'Upload ke OneDrive', description: 'Mengunggah ke Microsoft OneDrive...', status: 'pending' },
    { id: 'convert', label: 'Konversi ke PDF', description: 'Mengkonversi file ke format PDF...', status: 'pending' },
    { id: 'footer', label: 'Menambahkan Footer', description: 'Menambahkan footer dinamis ke PDF...', status: 'pending' },
    { id: 'ready', label: 'Membuka PDF', description: 'Membuka PDF di tab baru...', status: 'pending' },
  ]
}

// Step icon component
const StepIcon = ({ step, isActive }: { step: PrintStep; isActive: boolean }) => {
  if (step.status === 'completed') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
      >
        <CheckCircle2 className="w-5 h-5 text-white" />
      </motion.div>
    )
  }

  if (step.status === 'processing') {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center"
      >
        <Loader2 className="w-5 h-5 text-white" />
      </motion.div>
    )
  }

  if (step.status === 'error') {
    return (
      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
        <X className="w-5 h-5 text-white" />
      </div>
    )
  }

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
      isActive ? 'bg-orange-500/30 border-2 border-orange-500' : 'bg-gray-700 border-2 border-gray-600'
    }`}>
      <Circle className={`w-3 h-3 ${isActive ? 'text-orange-400' : 'text-gray-500'}`} />
    </div>
  )
}

// Animated background particles
const ParticleBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-orange-500/20 rounded-full"
        initial={{
          x: Math.random() * 100 + '%',
          y: '100%',
          opacity: 0
        }}
        animate={{
          y: '-10%',
          opacity: [0, 0.5, 0]
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
          ease: 'linear'
        }}
      />
    ))}
  </div>
)

export default function PrintLoadingDialog({
  open,
  onClose,
  fileId,
  fileName,
  fileType,
  onComplete
}: PrintLoadingDialogProps) {
  const [steps, setSteps] = useState<PrintStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open && fileId) {
      setSteps(getInitialSteps(fileType))
      setCurrentStepIndex(-1)
      setError(null)
    }
  }, [open, fileId, fileType])

  // Simulate step progress based on actual API call
  const startPrintProcess = useCallback(async () => {
    if (!fileId) return

    const initialSteps = getInitialSteps(fileType)
    setSteps(initialSteps)

    // Step 1: Initialize
    setCurrentStepIndex(0)
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'processing' } : s))
    await new Promise(r => setTimeout(r, 500))
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'completed' } : s))

    try {
      // Step 2: Get user info (part of API call)
      setCurrentStepIndex(1)
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'processing' } : s))

      // Generate print token
      const tokenRes = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })

      if (!tokenRes.ok) {
        throw new Error('Gagal membuat token print')
      }

      const tokenData = await tokenRes.json()
      const printToken = tokenData.token

      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'completed' } : s))

      // Step 3: Download from R2
      setCurrentStepIndex(2)
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'processing' } : s))

      // Start fetching PDF
      const pdfFetchUrl = `/api/print?token=${printToken}`

      // For Office files, show additional steps during the long wait
      const isOfficeFile = !['pdf'].includes(fileType)

      if (isOfficeFile) {
        // Simulate upload step during fetch
        await new Promise(r => setTimeout(r, 800))
        setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'completed' } : s))

        // Step 4: Upload to OneDrive
        setCurrentStepIndex(3)
        setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'processing' } : s))
        await new Promise(r => setTimeout(r, 1000))

        // Step 5: Convert to PDF
        setCurrentStepIndex(4)
        setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'completed' } : s))
        setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'processing' } : s))
      }

      // Fetch the PDF (this is the actual processing time)
      const pdfResponse = await fetch(pdfFetchUrl)

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Gagal memproses file')
      }

      // Mark download/upload/convert as complete
      if (isOfficeFile) {
        setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'completed' } : s))

        // Step 6: Add footer
        setCurrentStepIndex(5)
        setSteps(prev => prev.map((s, i) => i === 5 ? { ...s, status: 'processing' } : s))
        await new Promise(r => setTimeout(r, 300))
      } else {
        setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'completed' } : s))

        // Step 4: Add footer (for PDF)
        setCurrentStepIndex(3)
        setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'processing' } : s))
        await new Promise(r => setTimeout(r, 300))
      }

      // Mark footer as complete
      const footerIndex = isOfficeFile ? 5 : 3
      setSteps(prev => prev.map((s, i) => i === footerIndex ? { ...s, status: 'completed' } : s))

      // Step final: Ready - Open PDF in new tab
      const readyIndex = isOfficeFile ? 6 : 4
      setCurrentStepIndex(readyIndex)
      setSteps(prev => prev.map((s, i) => i === readyIndex ? { ...s, status: 'processing' } : s))

      // Open PDF directly in new tab
      window.open(pdfFetchUrl, '_blank')

      // Small delay to show "Opening" status
      await new Promise(r => setTimeout(r, 500))
      setSteps(prev => prev.map((s, i) => i === readyIndex ? { ...s, status: 'completed' } : s))

      // Close dialog and trigger callback
      if (onComplete) {
        onComplete()
      }

      // Auto close after success
      setTimeout(() => {
        onClose()
      }, 800)

    } catch (err) {
      console.error('Print error:', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')

      // Mark current step as error
      setSteps(prev => prev.map((s, i) =>
        s.status === 'processing' ? { ...s, status: 'error' } : s
      ))
    }
  }, [fileId, fileType, onComplete, onClose])

  // Start process when dialog opens
  useEffect(() => {
    if (open && fileId) {
      const timer = setTimeout(() => {
        startPrintProcess()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [open, fileId, startPrintProcess])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700 text-white overflow-hidden">
        {/* Accessibility: Hidden title and description for screen readers */}
        <DialogTitle className="sr-only">
          Mempersiapkan Print
        </DialogTitle>
        <DialogDescription className="sr-only">
          Dialog untuk mempersiapkan dan mencetak file {fileName}
        </DialogDescription>

        <ParticleBackground />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="p-3 rounded-xl bg-orange-500"
              >
                <Printer className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold">Mempersiapkan Print...</h2>
                <p className="text-sm text-gray-400 truncate max-w-[200px]">{fileName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Loading Animation */}
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              className="relative w-32 h-32 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 border-4 border-orange-500/30 rounded-full"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Spinning ring */}
              <motion.div
                className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              {/* Inner spinning ring */}
              <motion.div
                className="absolute inset-3 border-4 border-transparent border-b-orange-400 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              {/* Center icon */}
              <div className="absolute inset-6 flex items-center justify-center bg-gray-800 rounded-full">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {fileType === 'pdf' ? (
                    <FileText className="w-8 h-8 text-orange-400" />
                  ) : (
                    <FileOutput className="w-8 h-8 text-orange-400" />
                  )}
                </motion.div>
              </div>
            </motion.div>

            <motion.h3
              className="text-lg font-semibold text-white mb-2 text-center"
              key={steps[currentStepIndex]?.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {steps[currentStepIndex]?.label || 'Memulai...'}
            </motion.h3>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              {steps[currentStepIndex]?.description || 'Mohon tunggu...'}
            </p>

            {/* Animated dots */}
            <div className="flex gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-orange-500 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Proses Print</h3>

            <div className="space-y-1">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    currentStepIndex === index ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <StepIcon step={step} isActive={currentStepIndex === index} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-green-400' :
                      step.status === 'processing' ? 'text-orange-400' :
                      step.status === 'error' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <p className="text-sm text-red-400">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={startPrintProcess}
                >
                  Coba Lagi
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
