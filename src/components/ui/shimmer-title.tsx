'use client'

import React from 'react'
import { motion } from 'framer-motion'

export function ShimmerTitle({ children, subtitle, size = 'md' }: { children: React.ReactNode; subtitle?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'text-lg md:text-xl font-semibold',
    md: 'text-xl md:text-2xl font-bold',
    lg: 'text-2xl md:text-3xl font-bold'
  }

  const subtitleSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs md:text-sm',
    lg: 'text-sm'
  }

  return (
    <div className="relative group cursor-default">
      <h2 className={`${sizeClasses[size]} relative inline-flex overflow-hidden pb-1.5 tracking-tight`} style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
        {/* Text Container */}
        <div className="relative z-10 flex">
          <span
            className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500"
            style={{
              textShadow: '0 1px 8px rgba(251, 146, 60, 0.15)',
              letterSpacing: '-0.01em',
            }}
          >
            {children}
          </span>
        </div>

        {/* Subtle underline accent */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
          initial={{ width: '0%' }}
          animate={{ width: '40%' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p className={`${subtitleSizeClasses[size]} text-slate-500 mt-1 font-medium tracking-wide flex items-center gap-2`}>
          <span className="w-4 h-[1px] bg-orange-400/60 rounded-full inline-block" />
          {subtitle}
        </p>
      )}
    </div>
  )
}
