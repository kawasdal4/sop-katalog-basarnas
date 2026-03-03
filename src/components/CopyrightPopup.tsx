'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Check, Radio, Target, Award, Zap, Shield, X } from 'lucide-react'

interface CopyrightPopupProps {
  show: boolean
  onClose: () => void
}

export default function CopyrightPopup({ show, onClose }: CopyrightPopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Popup Container */}
          <motion.div
            className="relative max-w-md w-full"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 via-yellow-400/30 to-orange-500/30 rounded-3xl blur-xl" />

            {/* Main Card */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-orange-500/30 overflow-hidden shadow-2xl">
              {/* Animated border */}
              <div className="absolute inset-0 rounded-3xl">
                <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 opacity-50" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor' }} />
              </div>

              {/* Header */}
              <div className="relative bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 p-6 text-center">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* Animated icon */}
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>

                <h2 className="text-2xl font-bold text-white tracking-wide">
                  HAK CIPTA
                </h2>
                <p className="text-orange-100/80 text-sm mt-1">Copyright Notice</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Developer Info */}
                <motion.div
                  className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-4">
                    {/* Developer Photo */}
                    <motion.div
                      className="relative shrink-0"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-orange-500/50 shadow-lg shadow-orange-500/20">
                        <img
                          src="/foe.jpg"
                          alt="Developer"
                          className="w-full h-full object-cover object-[center_30%]"
                        />
                      </div>
                      {/* Online indicator */}
                      <motion.div
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <p className="text-orange-300/90 text-xs font-semibold uppercase tracking-wider mb-1">
                        Developed & Maintained by:
                      </p>
                      <p className="text-white font-bold text-sm truncate">
                        Muhammad Fuadunnas, S.I.Kom., M.IKom.
                      </p>
                      <p className="text-orange-200/70 text-xs mt-0.5">
                        PKPP Ahli Muda – Direktorat Kesiapsiagaan
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Features */}
                <div className="space-y-3">
                  <motion.div
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Aplikasi Katalog SOP/IK</p>
                      <p className="text-gray-400 text-xs">Sistem Manajemen Dokumen</p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Direktorat Kesiapsiagaan</p>
                      <p className="text-gray-400 text-xs">Badan SAR Nasional</p>
                    </div>
                  </motion.div>
                </div>

                {/* Contact Info */}
                <motion.div
                  className="flex items-center justify-center gap-4 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center gap-2 text-orange-300/80">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Radio className="w-4 h-4" />
                    </motion.div>
                    <span>(+62) 811 9292 91</span>
                  </div>
                  <span className="text-gray-600">•</span>
                  <div className="flex items-center gap-2 text-orange-300/80">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      <Target className="w-4 h-4" />
                    </motion.div>
                    <span>Jakarta – Indonesia</span>
                  </div>
                </motion.div>

                {/* Footer */}
                <motion.div
                  className="text-center pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="text-gray-500 text-xs">
                    © 2026 FOE - All Rights Reserved
                  </p>
                </motion.div>

                {/* Close Button */}
                <motion.div
                  className="pt-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={onClose}
                      className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:via-orange-700 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-500/25 border border-orange-400/30"
                    >
                      <motion.span
                        className="flex items-center justify-center gap-2"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Check className="w-4 h-4" />
                        <span>TUTUP</span>
                      </motion.span>
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
