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
  const [os, setOs] = useState<'windows' | 'mac' | 'linux' | 'other'>('windows')

  useEffect(() => {
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

  const handleDownloadClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDownloading || isComplete || os !== 'windows') return

    setIsDownloading(true)
    setProgress(0)
    onDownloadStart?.()

    const duration = 2500
    const steps = 50
    const stepTime = duration / steps
    
    try {
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
        
        setTimeout(() => {
          setIsComplete(false)
          setProgress(0)
        }, 5000)
      } else {
        setProgress(currentProgress)
      }
    }, stepTime)
  }

  return (
    <div 
      className="relative group/download w-full mt-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow Pulse Effect Behind the Button */}
      <motion.div 
        className="absolute -inset-0.5 bg-blue-500/30 rounded-xl blur-lg opacity-50 group-hover/download:opacity-100 transition-opacity"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <div
        className="relative p-3 rounded-xl bg-blue-500/10 border border-white/5 flex items-center gap-3 backdrop-blur-sm cursor-pointer hover:bg-blue-500/20 hover:border-blue-500/30 transition-all overflow-hidden"
        onClick={handleDownloadClick}
      >
        {/* Progress Background */}
        <AnimatePresence>
          {isDownloading && (
            <motion.div
              key="progress-bar"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              exit={{ opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 bg-blue-500/20 z-0"
              style={{ borderRight: '1px solid rgba(59, 130, 246, 0.5)' }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <div className="relative z-10 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center group-hover/download:scale-110 transition-transform shrink-0">
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          ) : isDownloading ? (
            <Download className="w-4 h-4 text-blue-400 animate-bounce" />
          ) : (
            <Monitor className="w-4 h-4 text-blue-400" />
          )}
        </div>
        
        {/* Text Details */}
        <div className="relative z-10 flex-1 overflow-hidden">
          <p className="text-[10px] font-black text-white uppercase tracking-tight group-hover/download:text-blue-400 transition-colors truncate">
            {isComplete 
              ? 'Download Selesai!' 
              : isDownloading 
              ? `Mengunduh... ${Math.round(progress)}%` 
              : 'Download Aplikasi Desktop'}
          </p>
          <p className="text-[9px] text-gray-500 truncate mt-0.5">
            {os !== 'windows' 
              ? 'Hanya tersedia untuk Windows' 
              : 'Versi Windows (.exe) Terbaru'}
          </p>
        </div>
      </div>
    </div>
  )
}
