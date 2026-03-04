'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, FileText, FileOutput, Printer, X, AlertTriangle, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

const getInitialSteps = (fileType: string): PrintStep[] => {
  if (fileType === 'pdf') {
    return [
      { id: 'init', label: 'Memvalidasi File', description: 'Mengecek integritas dokumen...', status: 'pending' },
      { id: 'user', label: 'Autentikasi User', description: 'Mengamankan koneksi & identifikasi...', status: 'pending' },
      { id: 'download', label: 'Routing Storage', description: 'Mengambil data dari Cloudflare R2...', status: 'pending' },
      { id: 'footer', label: 'Injeksi Footer', description: 'Menambahkan metadata sistem...', status: 'pending' },
      { id: 'ready', label: 'Finalisasi', description: 'Menyiapkan unduhan PDF...', status: 'pending' },
    ]
  }
  return [
    { id: 'init', label: 'Memvalidasi File', description: 'Mengecek integritas dokumen...', status: 'pending' },
    { id: 'user', label: 'Autentikasi User', description: 'Mengamankan koneksi & identifikasi...', status: 'pending' },
    { id: 'download', label: 'Routing Storage', description: 'Mengambil data dari Cloudflare R2...', status: 'pending' },
    { id: 'upload', label: 'Cloud Pre-processing', description: 'Menyiapkan konversi engine...', status: 'pending' },
    { id: 'convert', label: 'Konversi Format', description: 'Format ulang menjadi PDF performa tinggi...', status: 'pending' },
    { id: 'footer', label: 'Injeksi Footer', description: 'Menambahkan metadata sistem...', status: 'pending' },
    { id: 'ready', label: 'Finalisasi', description: 'Menyiapkan unduhan PDF...', status: 'pending' },
  ]
}

const AmbientBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 blur-[120px] mix-blend-screen rounded-full" />
    <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-rose-500/10 blur-[120px] mix-blend-screen rounded-full" />
    {/* Micro grid pattern for aesthetic texture */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
    />
  </div>
)

export default function PrintLoadingDialog({ open, onClose, fileId, fileName, fileType, onComplete }: PrintLoadingDialogProps) {
  const { toast } = useToast()
  const [steps, setSteps] = useState<PrintStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [readyUrl, setReadyUrl] = useState<string | null>(null)

  const progressPercent = steps.length > 0
    ? Math.round(((steps.filter(s => s.status === 'completed').length) / steps.length) * 100)
    : 0

  useEffect(() => {
    if (open && fileId) {
      setSteps(getInitialSteps(fileType))
      setCurrentStepIndex(-1)
      setError(null)
      setReadyUrl(null)
    }
  }, [open, fileId, fileType])

  const isPrintingRef = useRef(false)

  const startPrintProcess = useCallback(async () => {
    if (!fileId || isPrintingRef.current) return
    isPrintingRef.current = true

    setCurrentStepIndex(0)
    setError(null)
    setSteps(getInitialSteps(fileType).map((s, i) => i === 0 ? { ...s, status: 'processing' } : s))

    await new Promise(r => setTimeout(r, 600))
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'completed' } : s))

    try {
      setCurrentStepIndex(1)
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'processing' } : s))

      const tokenRes = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })
      if (!tokenRes.ok) throw new Error('Gagal membuat akses print')
      const { token: printToken } = await tokenRes.json()

      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'completed' } : s))

      setCurrentStepIndex(2)
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'processing' } : s))
      await new Promise(r => setTimeout(r, 600))
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'completed' } : s))

      const isOfficeFile = !['pdf'].includes(fileType)
      if (isOfficeFile) {
        setCurrentStepIndex(3)
        setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'processing' } : s))
        await new Promise(r => setTimeout(r, 500))
        setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'completed' } : s))

        setCurrentStepIndex(4)
        setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'processing' } : s))
        await new Promise(r => setTimeout(r, 800))
        setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'completed' } : s))
      }

      const footerIndex = isOfficeFile ? 5 : 3
      setCurrentStepIndex(footerIndex)
      setSteps(prev => prev.map((s, i) => i === footerIndex ? { ...s, status: 'processing' } : s))
      await new Promise(r => setTimeout(r, 500))
      setSteps(prev => prev.map((s, i) => i === footerIndex ? { ...s, status: 'completed' } : s))

      const readyIndex = isOfficeFile ? 6 : 4
      setCurrentStepIndex(readyIndex)
      setSteps(prev => prev.map((s, i) => i === readyIndex ? { ...s, status: 'processing' } : s))

      const pdfRes = await fetch(`/api/print?token=${printToken}`)
      if (!pdfRes.ok) {
        let errMessage = pdfRes.status === 404 ? 'object tidak ada' : 'Gagal mengunduh PDF dari server'
        try {
          const errData = await pdfRes.json()
          if (errData.details) errMessage = errData.details
          else if (errData.error) errMessage = errData.error
        } catch (e) { }
        throw new Error(errMessage)
      }

      const rawBlob = await pdfRes.blob()
      const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(pdfBlob)

      setReadyUrl(blobUrl)

      await new Promise(r => setTimeout(r, 400))
      setSteps(prev => prev.map((s, i) => i === readyIndex ? { ...s, status: 'completed' } : s))

      if (onComplete) onComplete()

      const newTab = window.open(blobUrl, '_blank')
      if (newTab) {
        setTimeout(() => onClose(), 2000)
      }
    } catch (err) {
      console.error('Print error:', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem')
      setSteps(prev => prev.map(s => s.status === 'processing' ? { ...s, status: 'error' } : s))
    } finally {
      isPrintingRef.current = false
    }
  }, [fileId, fileType, onComplete, onClose])

  useEffect(() => {
    if (open && fileId) {
      const timer = setTimeout(() => {
        if (!isPrintingRef.current) startPrintProcess()
      }, 400)
      return () => clearTimeout(timer)
    } else {
      isPrintingRef.current = false
    }
  }, [open, fileId, startPrintProcess])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] bg-[#0A0A0B]/95 border-white/10 text-white backdrop-blur-3xl shadow-2xl p-0 overflow-hidden rounded-3xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Proses Print</DialogTitle>
        <AmbientBackground />

        <div className="relative z-10 p-5 sm:p-7 max-h-[85vh] overflow-y-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 shadow-lg shadow-orange-500/30 shrink-0">
                <Printer className="w-6 h-6 text-white" />
                <motion.div
                  className="absolute inset-0 rounded-2xl border border-white/20"
                  animate={{ scale: [1, 1.1, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-white mb-0.5">Printing System</h2>
                <div className="flex items-start gap-2 text-slate-400 mt-1">
                  {fileType === 'pdf' ? <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <FileOutput className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                  <p className="text-xs line-clamp-2 max-w-[200px] sm:max-w-[300px] font-medium text-orange-200/60 leading-tight" title={fileName}>{fileName}</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white shrink-0">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            {/* Left: Holographic Visualizer */}
            <div className="flex-[0.8] flex flex-col items-center justify-center p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent h-[200px]"
                animate={{ top: ['-100%', '100%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />

              <div className="relative w-36 h-36 flex items-center justify-center mb-6 z-10">
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-2xl">
                  <circle cx="72" cy="72" r="68" className="stroke-white/5" strokeWidth="4" fill="none" />
                  <motion.circle
                    cx="72" cy="72" r="68"
                    className="stroke-orange-500"
                    strokeWidth="4" fill="none" strokeLinecap="round"
                    animate={{ strokeDasharray: "427", strokeDashoffset: 427 - (427 * progressPercent) / 100 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    filter: ['drop-shadow(0 0 10px rgba(249,115,22,0.3))', 'drop-shadow(0 0 25px rgba(249,115,22,0.8))', 'drop-shadow(0 0 10px rgba(249,115,22,0.3))']
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10"
                >
                  {fileType === 'pdf' ? <FileText className="w-14 h-14 text-orange-400" /> : <FileOutput className="w-14 h-14 text-orange-400" />}
                </motion.div>
              </div>

              <div className="text-center relative z-10">
                <motion.h3
                  key={progressPercent}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-black text-white tabular-nums tracking-tighter"
                >
                  {progressPercent}%
                </motion.h3>
                <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.2em] mt-2">
                  {progressPercent === 100 ? 'Selesai' : 'Processing'}
                </p>
              </div>
            </div>

            {/* Right: Glassmorphic Stepper */}
            <div className="flex-[1.2] flex flex-col justify-center gap-3">
              <div className="sm:hidden flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workflow Progres</span>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">{steps.filter(s => s.status === 'completed').length}/{steps.length} Selesai</span>
              </div>
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const isActive = currentStepIndex === index
                  const isCompleted = step.status === 'completed'
                  const isError = step.status === 'error'

                  return (
                    <motion.div
                      key={step.id}
                      layout
                      className={`relative flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-500 overflow-hidden ${isError ? 'bg-red-500/10 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]' :
                        isActive ? 'bg-orange-500/10 border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.1)]' :
                          isCompleted ? 'bg-white/[0.02] border border-white/5' :
                            'opacity-40 grayscale border border-transparent pb-2 pt-2'
                        }`}
                    >
                      {isActive && !isError && (
                        <motion.div
                          layoutId="activeGlowBg"
                          className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}

                      {isError && (
                        <motion.div
                          layoutId="errorGlowBg"
                          className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}

                      {/* Icon */}
                      <div className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${isError ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/30' :
                        isActive ? 'bg-gradient-to-br from-orange-400 to-rose-500 shadow-lg shadow-orange-500/30' :
                          isCompleted ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-white/5 text-white/30'
                        }`}>
                        {isError ? <X className="w-5 h-5 text-red-400" /> :
                          isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
                            isActive ? <Loader2 className="w-5 h-5 text-white animate-spin" /> :
                              <span className="text-xs font-bold">{index + 1}</span>}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-bold tracking-tight leading-tight transition-colors duration-300 ${isError ? 'text-red-300' : isActive ? 'text-white' : 'text-white/80'}`}>
                            {step.label}
                          </h4>
                          {isCompleted && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider shrink-0 hidden sm:block mt-0.5">OK</span>}
                        </div>
                        <AnimatePresence>
                          {(isActive || isError) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-1.5 pb-0.5">
                                <p className={`text-xs leading-relaxed pr-2 ${isError ? 'text-red-300/80' : 'text-orange-200/70'}`}>
                                  {step.description}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className="pt-2">
                      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </div>
                          <p className="text-sm text-red-300 font-medium leading-tight break-words flex-1">{error}</p>
                          <button
                            onClick={() => {
                              const copyText = `## Print Error Report\nFile: ${fileName}\nType: ${fileType}\nMessage: ${error}\n\nSteps:\n${steps.map(s => `- ${s.label}: ${s.status} (${s.description})`).join('\n')}`;
                              navigator.clipboard.writeText(copyText);
                              toast({ title: 'Tersalin', description: 'Detail error telah disalin untuk AI Builder.', variant: 'success' });
                            }}
                            className="p-2 h-max bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded-lg transition-all shrink-0"
                            title="Salin detail error"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <Button size="sm" onClick={startPrintProcess} className="shrink-0 w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20">
                          Coba Lagi
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Message / Preview Button */}
              <AnimatePresence>
                {readyUrl && !error && progressPercent === 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    className="mt-2"
                  >
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-sm text-emerald-300 font-medium leading-tight">Dokumen siap! Klik tombol berikut jika dokumen tidak otomatis terbuka.</p>
                      </div>
                      <Button size="sm" onClick={() => window.open(readyUrl, '_blank')} className="shrink-0 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                        Buka Preview
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
