'use client'

import React from 'react'
import { Zap, FolderOpen, RefreshCw } from 'lucide-react'
import DesktopDownloadButton from './DesktopDownloadButton'

export default function DesktopDownloadSection() {
  return (
    <section className="relative py-24 overflow-hidden rounded-3xl mt-16 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Decorative Background Elements */}
      <div className="absolute -right-40 -top-40 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -left-40 -bottom-40 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Text Content */}
          <div className="flex-1 text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-semibold tracking-wide border border-blue-200 dark:border-blue-500/20">
                <Zap className="w-4 h-4" />
                <span>Pengalaman Baru</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Gunakan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Aplikasi Desktop</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0">
                Akses E-Katalog SOP Direktorat Kesiapsiagaan lebih cepat, stabil, dan lancar melalui aplikasi desktop resmi (Windows).
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto lg:mx-0 text-left">
              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Kinerja Sangat Cepat</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ditenagai oleh teknologi Rust, aplikasi dimuat dalam hitungan detik.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Tampilan File Maksimal</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Preview dokumen PDF dan Excel secara native tanpa hambatan browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Pembaruan Otomatis</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Selalu dapatkan fitur terbaru otomatis dengan teknologi delta-update.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Content */}
          <div className="flex-1 flex flex-col items-center justify-center pt-8 lg:pt-0">
             <div className="bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 relative w-full max-w-lg mx-auto">
                <div className="absolute top-0 right-10 w-20 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-b-xl" />
                
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Siap Untuk Beralih?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Unduh installer gratis berukuran kecil.</p>
                </div>

                <div className="flex justify-center w-full">
                  <DesktopDownloadButton />
                </div>

                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
                  Tersedia untuk Windows 10 & 11 (64-bit).
                </p>
             </div>
          </div>

        </div>
      </div>
    </section>
  )
}
