'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Search, Shield, Activity, Zap, Target, Plane } from 'lucide-react'

interface SARLoadingOverlayProps {
  isVisible: boolean
  message?: string
  submessage?: string
}

// Pre-computed sparkle positions for SSR safety
const SPARKLE_POSITIONS = [
  { x: 15, y: 20, size: 3, delay: 0 },
  { x: 85, y: 25, size: 2, delay: 0.3 },
  { x: 25, y: 75, size: 2.5, delay: 0.6 },
  { x: 75, y: 80, size: 2, delay: 0.9 },
  { x: 10, y: 50, size: 2, delay: 1.2 },
  { x: 90, y: 55, size: 3, delay: 0.15 },
  { x: 40, y: 10, size: 2, delay: 0.45 },
  { x: 60, y: 90, size: 2.5, delay: 0.75 },
]

// SAR Logo with animation
function SARAnimatedLogo() {
  const logoUrl = '/logo.png'

  return (
    <motion.div
      className="relative w-24 h-24"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            '0 0 20px rgba(251, 146, 60, 0.3), 0 0 40px rgba(251, 146, 60, 0.2)',
            '0 0 30px rgba(251, 146, 60, 0.5), 0 0 60px rgba(251, 146, 60, 0.3)',
            '0 0 20px rgba(251, 146, 60, 0.3), 0 0 40px rgba(251, 146, 60, 0.2)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Spinning radar ring */}
      <motion.div
        className="absolute inset-[-8px] rounded-full border-2 border-orange-400/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50" />
      </motion.div>

      {/* Second spinning ring */}
      <motion.div
        className="absolute inset-[-16px] rounded-full border border-orange-300/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-300 rounded-full" />
      </motion.div>

      {/* Main logo */}
      <motion.img
        src={logoUrl}
        alt="BASARNAS Logo"
        className="relative z-10 w-full h-full object-contain"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 z-20 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%)',
            backgroundSize: '200% 100%',
          }}
          animate={{
            backgroundPosition: ['200% 0', '-200% 0'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// Animated loading dots
function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-orange-400 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// SAR-themed floating icons
function FloatingSARICons() {
  const icons = [
    { Icon: Radio, x: 20, y: 30, delay: 0 },
    { Icon: Search, x: 80, y: 35, delay: 0.5 },
    { Icon: Shield, x: 15, y: 70, delay: 1 },
    { Icon: Activity, x: 85, y: 65, delay: 1.5 },
    { Icon: Target, x: 50, y: 15, delay: 0.25 },
    { Icon: Zap, x: 50, y: 85, delay: 0.75 },
    { Icon: Plane, x: 30, y: 50, delay: 0.4 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map(({ Icon, x, y, delay }, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${x}%`, top: `${y}%` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.4, 0],
            scale: [0.5, 1, 0.5],
            y: [-10, 10, -10],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: delay,
            ease: 'easeInOut',
          }}
        >
          <Icon className="w-6 h-6 text-orange-300/40" />
        </motion.div>
      ))}
    </div>
  )
}

// Radar sweep effect
function RadarSweep() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.div
        className="w-[400px] h-[400px] rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(251, 146, 60, 0.1) 30deg, transparent 60deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  )
}

export default function SARLoadingOverlay({
  isVisible,
  message = 'Memuat Data',
  submessage = 'Mengambil informasi dari server...'
}: SARLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Glassmorphism backdrop */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Radar sweep */}
          <RadarSweep />

          {/* Floating SAR icons */}
          <FloatingSARICons />

          {/* Sparkle particles */}
          <div className="absolute inset-0 pointer-events-none">
            {SPARKLE_POSITIONS.map((sparkle, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${sparkle.x}%`,
                  top: `${sparkle.y}%`,
                  width: sparkle.size,
                  height: sparkle.size,
                  background: i % 2 === 0
                    ? 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(251,146,60,0.8) 0%, transparent 70%)',
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: sparkle.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {/* SAR Logo */}
            <SARAnimatedLogo />

            {/* Loading text */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-bold text-white tracking-wide">
                {message}
              </h3>
              <p className="text-sm text-orange-300/80 mt-1">
                {submessage}
              </p>
            </motion.div>

            {/* Loading dots */}
            <LoadingDots />

            {/* Progress bar */}
            <motion.div
              className="mt-4 w-48 h-1 bg-slate-700/50 rounded-full overflow-hidden"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 192 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ width: '50%' }}
              />
            </motion.div>

            {/* SAR branding */}
            <motion.div
              className="mt-6 flex items-center gap-2 text-xs text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Shield className="w-3 h-3" />
              <span> Direktorat Kesiapsiagaan - BASARNAS</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Mini loading spinner for inline use
export function SARSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} border-orange-400/30 border-t-orange-400 rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )
}

// Skeleton loader for table rows
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-b border-slate-200/10"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <motion.div
            className="h-4 bg-slate-200/20 rounded"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        </td>
      ))}
    </motion.tr>
  )
}

// Skeleton loader for cards
export function CardSkeleton() {
  return (
    <motion.div
      className="bg-white/80 backdrop-blur rounded-xl p-6 border border-slate-200/50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <motion.div
            className="h-3 w-20 bg-slate-200/40 rounded"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="h-6 w-16 bg-slate-200/60 rounded"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          />
        </div>
        <motion.div
          className="w-12 h-12 bg-slate-200/40 rounded-xl"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
      </div>
    </motion.div>
  )
}

// Skeleton loader for stat cards
export function StatCardSkeleton() {
  return (
    <motion.div
      className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 border border-slate-200 shadow-lg"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <motion.div
            className="h-3 w-24 bg-slate-300/50 rounded"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="h-8 w-16 bg-slate-400/50 rounded"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          />
        </div>
        <motion.div
          className="w-14 h-14 bg-slate-300/40 rounded-xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
      </div>
    </motion.div>
  )
}
