'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Monitor, AlertCircle, CheckCircle2 } from 'lucide-react'

interface DesktopDownloadButtonProps {
  onDownloadStart?: () => void
}

export default function DesktopDownloadButton({ onDownloadStart }: DesktopDownloadButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])
  const [os, setOs] = useState<'windows' | 'mac' | 'linux' | 'other'>('windows') // Default to Windows initially

  // Ripple effect logic
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  useEffect(() => {
    // Basic OS detection
    if (typeof window !== 'undefined') {
      const platform = window.navigator.platform.toLowerCase()
      const userAgent = window.navigator.userAgent.toLowerCase()
      
      if (platform.includes('win') || userAgent.includes('windows')) {
        setOs('windows')
      } else if (platform.includes('mac') || userAgent.includes('mac')) {
        setOs('mac')
      } else if (platform.includes('linux') || userAgent.includes('linux')) {
        setOs('linux')
      } else {
        setOs('other')
      }
    }
  }, [])

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || isDownloading || isComplete || os !== 'windows') return

    const rect = buttonRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newRipple = { x, y, id: Date.now() }
    setRipples((prev) => [...prev, newRipple])

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 1000)
  }

  const handleDownloadClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    handleRipple(e)
    if (isDownloading || isComplete || os !== 'windows') return

    setIsDownloading(true)
    setProgress(0)
    onDownloadStart?.()

    // Simulate progress animation for UX (even if actual download is handled by browser)
    // The browser will start downloading the file via the API redirect
    const duration = 2500 // 2.5 seconds visual progress
    const steps = 50
    const stepTime = duration / steps
    
    // Trigger actual download quietly
    try {
      // In a real app we'd fetch the download URL and create an invisible a tag
      // For now, we assume the API redirects to the file
      window.location.href = '/api/download-desktop'
    } catch(err) {
      console.error(err)
    }

    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += 100 / steps
      if (currentProgress >= 100) {
        clearInterval(interval)
        setProgress(100)
        setIsDownloading(false)
        setIsComplete(true)
        
        // Reset after complete
        setTimeout(() => {
          setIsComplete(false)
          setProgress(0)
        }, 5000)
      } else {
        setProgress(currentProgress)
      }
    }, stepTime)
  }

  // Not Windows State
  if (os !== 'windows') {
    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <Monitor className="w-8 h-8 text-slate-400 mb-1" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">
          Versi desktop saat ini hanya tersedia untuk Windows.
        </p>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> OS Terdeteksi: {os === 'mac' ? 'macOS' : os === 'linux' ? 'Linux' : 'Lainnya'}
        </span>
      </div>
    )
  }

  // Windows State (Main Button)
  return (
    <div className="relative group perspective-1000">
      {/* Outer Neon Glow Layer */}
      <motion.div
        className="absolute -inset-1 rounded-[1.5rem] blur-md opacity-70 group-hover:opacity-100 transition duration-500"
        animate={{
          background: isHovered
            ? 'linear-gradient(90deg, #0ea5e9, #2dd4bf, #0ea5e9)'
            : 'linear-gradient(90deg, #0369a1, #0891b2, #0369a1)',
          backgroundSize: '200% 200%',
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 3,
        }}
      />
      
      {/* Background Pulse Animation */}
      <motion.div
        className="absolute -inset-2 rounded-[2rem] bg-cyan-500/20 blur-xl"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <button
        ref={buttonRef}
        onClick={handleDownloadClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isDownloading || isComplete}
        className="relative flex items-center gap-4 bg-gradient-to-b from-slate-900 to-slate-950 px-8 py-5 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all duration-300 transform-gpu preserve-3d group-hover:-translate-y-1 w-full sm:w-[380px]"
      >
        {/* Ripples */}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute bg-cyan-400/30 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 100,
              height: 100,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        {/* Progress Bar Fill */}
        <AnimatePresence>
          {isDownloading && (
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              exit={{ opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 bg-blue-600/20"
              style={{ borderRight: '2px solid rgba(56, 189, 248, 0.5)' }}
            />
          )}
        </AnimatePresence>

        {/* Button Content */}
        <div className="relative z-10 flex-shrink-0 bg-gradient-to-br from-cyan-400 to-blue-600 w-12 h-12 rounded-full flex items-center justify-center shadow-inner shadow-black/20 text-white">
          {isComplete ? (
             <CheckCircle2 className="w-6 h-6" />
          ) : isDownloading ? (
             <Download className="w-6 h-6 animate-bounce" />
          ) : (
             <Download className="w-6 h-6 transition-transform group-hover:scale-110" />
          )}
        </div>
        
        <div className="relative z-10 flex flex-col items-start text-left flex-grow">
          <AnimatePresence mode="wait">
             <motion.span 
               key={isComplete ? 'complete' : isDownloading ? 'downloading' : 'idle'}
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -5 }}
               className="font-bold tracking-tight text-white text-lg"
             >
               {isComplete 
                 ? 'Download Selesai!' 
                 : isDownloading 
                 ? `Mengunduh... ${Math.round(progress)}%` 
                 : 'Download Aplikasi Desktop'
               }
             </motion.span>
          </AnimatePresence>
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-0.5">
             Versi Windows (.exe)
          </span>
        </div>
        
        {/* Subtle right-side accent */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
      </button>

      {/* Optional: Add a subtle reflection below for premium feel */}
      <div className="absolute -bottom-8 left-10 right-10 h-8 opacity-20 blur-md bg-gradient-to-t from-cyan-500/40 to-transparent pointer-events-none transform scale-y-[-1]" />
    </div>
  )
}
