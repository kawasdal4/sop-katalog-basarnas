'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield,
    Upload,
    Eye,
    Download,
    Printer,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Stamp,
    Sparkles,
    FileCheck,
    CloudUpload,
    AlertTriangle,
    RefreshCw,
    Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface LegalisasiButtonProps {
    sopId: string
    sopJudul?: string
    hasFile: boolean
    endpointType?: 'catalog' | 'builder'
    onUploadSuccess?: () => void
    size?: 'sm' | 'md'
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export function LegalisasiButton({
    sopId,
    sopJudul,
    hasFile: propHasFile = false,
    endpointType = 'catalog',
    onUploadSuccess,
    size = 'md'
}: LegalisasiButtonProps) {
    const [mounted, setMounted] = useState(false)
    const [hasFile, setHasFile] = useState(propHasFile)
    const [isOpen, setIsOpen] = useState(false)
    const [uploadState, setUploadState] = useState<UploadState>('idle')
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadFileName, setUploadFileName] = useState('')
    const [uploadFileSize, setUploadFileSize] = useState('')
    const [uploadErrorMessage, setUploadErrorMessage] = useState('')

    const [isPreviewing, setIsPreviewing] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        setHasFile(propHasFile)
    }, [propHasFile])

    const apiBase = endpointType === 'builder'
        ? `/api/sop-builder/${sopId}/legalisasi`
        : `/api/sop/${sopId}/legalisasi`

    // Close preview on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showPreviewModal) {
                    if (previewUrl) URL.revokeObjectURL(previewUrl)
                    setPreviewUrl(null)
                    setShowPreviewModal(false)
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showPreviewModal, previewUrl])

    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            setUploadState('error')
            setUploadFileName(file.name)
            setUploadErrorMessage('Format file tidak valid. Hanya file PDF yang diperbolehkan.')
            toast.error('Hanya file PDF yang diizinkan')
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        // Validate size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
            setUploadState('error')
            setUploadFileName(file.name)
            setUploadErrorMessage('Ukuran file melebihi batas. Maksimal ukuran file 100MB.')
            toast.error('Ukuran file maksimal 100MB')
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
        const sizeStr = file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${sizeMb} MB`

        setUploadFileName(file.name)
        setUploadFileSize(sizeStr)
        setUploadState('uploading')
        setUploadProgress(15)
        setIsOpen(false)

        // Progress simulation for responsive feedback
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 88) return prev
                return prev + Math.floor(Math.random() * 12) + 5
            })
        }, 250)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch(apiBase, {
                method: 'POST',
                credentials: 'include',
                body: formData
            })

            clearInterval(interval)
            const data = await res.json()

            if (res.ok) {
                setUploadProgress(100)
                setUploadState('success')
                setHasFile(true)
                toast.success('File legalisasi berhasil diupload!')
                onUploadSuccess?.()
            } else {
                setUploadState('error')
                const errorMsg = data.error || data.details || 'Gagal mengunggah file legalisasi ke server'
                setUploadErrorMessage(errorMsg)
                toast.error(errorMsg)
            }
        } catch {
            clearInterval(interval)
            setUploadState('error')
            setUploadErrorMessage('Terjadi kesalahan jaringan atau koneksi server terputus.')
            toast.error('Terjadi kesalahan saat upload file')
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [apiBase, onUploadSuccess])

    const handlePreview = useCallback(async () => {
        if (!hasFile) {
            toast.info('File legalisasi belum tersedia')
            return
        }
        setIsPreviewing(true)
        try {
            const res = await fetch(`${apiBase}?action=preview`, {
                credentials: 'include'
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                setPreviewUrl(url)
                setShowPreviewModal(true)
                setIsOpen(false)
            } else {
                toast.error('Gagal memuat preview legalisasi')
            }
        } catch {
            toast.error('Terjadi kesalahan saat memuat preview')
        } finally {
            setIsPreviewing(false)
        }
    }, [apiBase, hasFile])

    const handleDownload = useCallback(async () => {
        if (!hasFile) {
            toast.info('File legalisasi belum tersedia')
            return
        }
        setIsDownloading(true)
        try {
            const res = await fetch(`${apiBase}?action=download`, {
                credentials: 'include'
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Legalisasi-${sopJudul?.replace(/[^a-zA-Z0-9]/g, '_') || sopId}.pdf`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('File legalisasi berhasil diunduh')
                setIsOpen(false)
            } else {
                toast.error('Gagal mendownload file legalisasi')
            }
        } catch {
            toast.error('Terjadi kesalahan saat mendownload file')
        } finally {
            setIsDownloading(false)
        }
    }, [apiBase, hasFile, sopJudul, sopId])

    const handlePrint = useCallback(async () => {
        if (!hasFile) {
            toast.info('File legalisasi belum tersedia')
            return
        }
        setIsPrinting(true)
        try {
            const res = await fetch(`${apiBase}?action=preview`, {
                credentials: 'include'
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const iframe = document.createElement('iframe')
                iframe.style.position = 'fixed'
                iframe.style.right = '0'
                iframe.style.bottom = '0'
                iframe.style.width = '0'
                iframe.style.height = '0'
                iframe.style.border = '0'
                iframe.src = url
                document.body.appendChild(iframe)
                iframe.onload = () => {
                    setTimeout(() => {
                        iframe.contentWindow?.focus()
                        iframe.contentWindow?.print()
                        setTimeout(() => {
                            document.body.removeChild(iframe)
                            URL.revokeObjectURL(url)
                        }, 2000)
                    }, 500)
                }
                toast.success('Membuka dialog cetak legalisasi...')
                setIsOpen(false)
            } else {
                toast.error('Gagal memuat file untuk dicetak')
            }
        } catch {
            toast.error('Terjadi kesalahan saat proses cetak')
        } finally {
            setIsPrinting(false)
        }
    }, [apiBase, hasFile])

    const closePreview = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setShowPreviewModal(false)
    }, [previewUrl])

    const closeUploadModal = useCallback(() => {
        setUploadState('idle')
        setUploadProgress(0)
        setUploadErrorMessage('')
    }, [])

    const handleDelete = useCallback(async () => {
        setIsDeleting(true)
        try {
            const res = await fetch(apiBase, {
                method: 'DELETE',
                credentials: 'include'
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('File legalisasi berhasil dihapus')
                setHasFile(false)
                setShowDeleteConfirm(false)
                onUploadSuccess?.()
            } else {
                toast.error(data.error || 'Gagal menghapus file legalisasi')
            }
        } catch {
            toast.error('Terjadi kesalahan saat menghapus file')
        } finally {
            setIsDeleting(false)
        }
    }, [apiBase, onUploadSuccess])

    const btnDim = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-xl'
    const iconDim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

    return (
        <>
            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleUpload}
                className="hidden"
            />

            {/* Radix Popover with Portal - Prevents any clipping from overflow-hidden parents */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                {/* Radix Tooltip with Portal - Prevents hover tooltip from being clipped */}
                <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            {hasFile ? (
                                /* ============================================================== */
                                /* ACTIVE STATE: Glowing RED Button with Pulse Animation          */
                                /* ============================================================== */
                                <div className="relative inline-block group/glow cursor-pointer">
                                    <motion.button
                                        id={`btn-legalisasi-${sopId}`}
                                        type="button"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.93 }}
                                        className={`relative ${btnDim} flex items-center justify-center overflow-hidden transition-all duration-300 z-10 cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.7)]`}
                                        title="Legalisasi SOP (File Tersedia)"
                                    >
                                        {/* Glowing Red Aura background */}
                                        <span className="absolute inset-0 bg-gradient-to-br from-red-600 via-rose-600 to-red-500 rounded-xl opacity-95" />
                                        <span className="absolute inset-[1px] bg-slate-950/70 rounded-xl backdrop-blur-sm" />

                                        {/* Red Pulsing Center Glow */}
                                        <span className="absolute inset-0 rounded-xl bg-red-500/30 animate-pulse" />

                                        {/* Outer Intense Red Neon Pulse Ring */}
                                        <span className="absolute -inset-1 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 opacity-80 blur-md group-hover/glow:opacity-100 group-hover/glow:blur-lg transition-all duration-300 -z-10 animate-pulse" />

                                        {/* Red Stamp Badge Icon & Sparkle */}
                                        <div className="relative z-20 flex items-center justify-center">
                                            <Stamp className={`${iconDim} text-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,1)]`} />
                                            <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 text-rose-300 animate-spin" style={{ animationDuration: '4s' }} />
                                        </div>

                                        {/* Shimmer sweep */}
                                        <span className="absolute inset-0 translate-x-[-150%] group-hover/glow:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                                    </motion.button>
                                </div>
                            ) : (
                                /* ============================================================== */
                                /* INACTIVE STATE: Dim button with hover tooltip "file legalisasi belum tersedia" */
                                /* ============================================================== */
                                <div className="relative inline-block cursor-pointer">
                                    <button
                                        id={`btn-legalisasi-${sopId}`}
                                        type="button"
                                        className={`${btnDim} flex items-center justify-center bg-slate-900/60 border border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all active:scale-95 cursor-pointer opacity-50 hover:opacity-80`}
                                    >
                                        <Stamp className={iconDim} />
                                    </button>
                                </div>
                            )}
                        </PopoverTrigger>
                    </TooltipTrigger>

                    {/* Portaled Tooltip Content: Outside parent's overflow-hidden */}
                    {!isOpen && uploadState === 'idle' && (
                        <TooltipContent
                            side="top"
                            sideOffset={8}
                            className={hasFile
                                ? "z-[9999] bg-slate-950/95 border border-red-500/40 text-red-300 rounded-xl px-3 py-1.5 shadow-[0_0_20px_rgba(239,68,68,0.35)] backdrop-blur-xl"
                                : "z-[9999] bg-slate-950/95 border border-rose-500/40 text-rose-300 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-xl"
                            }
                        >
                            {hasFile ? (
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-[10px] font-black text-red-300 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                                        Legalisasi Tersedia
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                        Klik untuk preview, download, print, ganti, atau hapus
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-[10px] font-bold text-rose-300 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                        file legalisasi belum tersedia
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                        Klik untuk upload PDF legalisasi
                                    </p>
                                </div>
                            )}
                        </TooltipContent>
                    )}
                </Tooltip>

                {/* Portaled Popover Menu Content: Outside parent's overflow-hidden */}
                <PopoverContent
                    align="end"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-64 p-0 bg-transparent border-0 shadow-none z-[9999] outline-none"
                >
                    <div className="relative bg-slate-950/95 border border-white/10 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
                        {/* Top decorative stripe */}
                        <div className={`h-[2px] bg-gradient-to-r ${
                            hasFile
                                ? 'from-red-600 via-rose-500 to-red-600'
                                : 'from-indigo-500 via-teal-400 to-cyan-500'
                        }`} />

                        {/* Dropdown Header */}
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasFile
                                ? 'bg-red-500/20 border border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                : 'bg-slate-800 border border-slate-700 text-slate-400'
                            }`}>
                                <Shield className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">
                                    Legalisasi Dokumen
                                </p>
                                <p className={`text-[8px] font-bold ${hasFile ? 'text-red-400' : 'text-amber-400/80'}`}>
                                    {hasFile ? '● File PDF Siap' : '○ Belum Ada File'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-5 h-5 flex items-center justify-center rounded-md text-slate-500 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Action List: 4 Functions (Upload, Preview, Download, Print) */}
                        <div className="p-2 flex flex-col gap-1">
                            {/* 1. Upload File PDF */}
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    setTimeout(() => {
                                        fileInputRef.current?.click()
                                    }, 100)
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group/act hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all cursor-pointer"
                            >
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center group-hover/act:bg-indigo-500/25 text-indigo-400 transition-colors">
                                    <Upload className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-slate-200 group-hover/act:text-white transition-colors">
                                        {hasFile ? 'Ganti File PDF' : 'Upload File PDF'}
                                    </p>
                                    <p className="text-[9px] text-slate-500">Maksimal 100MB • Format PDF</p>
                                </div>
                            </button>

                            {/* 2. Preview */}
                            <button
                                onClick={handlePreview}
                                disabled={!hasFile || isPreviewing}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${hasFile
                                    ? 'hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 group/prev text-slate-200 hover:text-white cursor-pointer'
                                    : 'opacity-40 cursor-not-allowed text-slate-500'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasFile
                                    ? 'bg-cyan-500/10 text-cyan-400 group-hover/prev:bg-cyan-500/20'
                                    : 'bg-slate-800/50 text-slate-600'
                                }`}>
                                    {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold">Preview</p>
                                        {!hasFile && <span className="text-[8px] text-slate-600 font-bold uppercase">N/A</span>}
                                    </div>
                                    <p className="text-[9px] text-slate-500">Tampilkan preview 80% layar</p>
                                </div>
                            </button>

                            {/* 3. Download */}
                            <button
                                onClick={handleDownload}
                                disabled={!hasFile || isDownloading}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${hasFile
                                    ? 'hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 group/down text-slate-200 hover:text-white cursor-pointer'
                                    : 'opacity-40 cursor-not-allowed text-slate-500'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasFile
                                    ? 'bg-emerald-500/10 text-emerald-400 group-hover/down:bg-emerald-500/20'
                                    : 'bg-slate-800/50 text-slate-600'
                                }`}>
                                    {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold">Download</p>
                                        {!hasFile && <span className="text-[8px] text-slate-600 font-bold uppercase">N/A</span>}
                                    </div>
                                    <p className="text-[9px] text-slate-500">Unduh file ke perangkat</p>
                                </div>
                            </button>

                            {/* 4. Print */}
                            <button
                                onClick={handlePrint}
                                disabled={!hasFile || isPrinting}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${hasFile
                                    ? 'hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 group/prn text-slate-200 hover:text-white cursor-pointer'
                                    : 'opacity-40 cursor-not-allowed text-slate-500'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasFile
                                    ? 'bg-amber-500/10 text-amber-400 group-hover/prn:bg-amber-500/20'
                                    : 'bg-slate-800/50 text-slate-600'
                                }`}>
                                    {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold">Print</p>
                                        {!hasFile && <span className="text-[8px] text-slate-600 font-bold uppercase">N/A</span>}
                                    </div>
                                    <p className="text-[9px] text-slate-500">Cetak dokumen legalisasi</p>
                                </div>
                            </button>

                            {/* 5. Delete - only shown when file exists */}
                            {hasFile && (
                                <>
                                    <div className="mx-2 my-1 border-t border-white/5" />
                                    <button
                                        onClick={() => {
                                            setIsOpen(false)
                                            setShowDeleteConfirm(true)
                                        }}
                                        disabled={isDeleting}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-red-500/10 border border-transparent hover:border-red-500/20 group/del text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/del:bg-red-500/20 text-red-400 transition-colors">
                                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold">Hapus File</p>
                                            <p className="text-[9px] text-red-500/60">Hapus file legalisasi permanen</p>
                                        </div>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Footer status notice */}
                        <div className="px-3.5 py-2 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {hasFile ? (
                                    <CheckCircle2 className="w-3 h-3 text-red-400" />
                                ) : (
                                    <AlertCircle className="w-3 h-3 text-slate-500" />
                                )}
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                                    {hasFile ? 'File Terlegalisasi Aktif' : 'Legalisasi Belum Diupload'}
                                </span>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* ============================================================== */}
            {/* PORTALED UPLOAD STATUS & ANIMATION MODAL                       */}
            {/* ============================================================== */}
            {mounted && createPortal(
                <AnimatePresence>
                    {uploadState !== 'idle' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={uploadState !== 'uploading' ? closeUploadModal : undefined}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-md bg-slate-950 border border-white/15 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.95)] relative"
                            >
                                <div className={`h-1.5 w-full bg-gradient-to-r transition-all duration-500 ${
                                    uploadState === 'uploading'
                                        ? 'from-indigo-500 via-teal-400 to-cyan-500 animate-pulse'
                                        : uploadState === 'success'
                                            ? 'from-emerald-500 via-teal-400 to-green-500'
                                            : 'from-rose-500 via-red-500 to-amber-500'
                                }`} />

                                <div className="p-6 md:p-8 flex flex-col items-center text-center">
                                    {uploadState === 'uploading' && (
                                        <>
                                            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                                                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" style={{ animationDuration: '2s' }} />
                                                <div className="absolute inset-2 rounded-full border-2 border-cyan-500/20 border-b-cyan-400 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                                                <div className="absolute inset-4 rounded-full bg-indigo-500/10 blur-md animate-pulse" />
                                                <motion.div
                                                    animate={{ y: [-3, 3, -3] }}
                                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                                    className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.5)]"
                                                >
                                                    <CloudUpload className="w-6 h-6 animate-pulse" />
                                                </motion.div>
                                            </div>

                                            <h3 className="text-lg font-black text-white tracking-wide mb-1">
                                                Sedang Mengunggah File...
                                            </h3>
                                            <p className="text-xs text-slate-400 max-w-xs mb-4">
                                                Sistem sedang mengenkripsi dan memproses penyimpanan dokumen legalisasi ke Cloudflare R2
                                            </p>

                                            <div className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 mb-5 flex items-center gap-3 text-left">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                                    <FileCheck className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-white truncate">{uploadFileName || 'Dokumen-Legalisasi.pdf'}</p>
                                                    <p className="text-[10px] text-slate-400">{uploadFileSize} • Format PDF</p>
                                                </div>
                                                <span className="text-xs font-black text-indigo-400">{uploadProgress}%</span>
                                            </div>

                                            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative mb-2">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-cyan-400 rounded-full relative"
                                                    style={{ width: `${uploadProgress}%` }}
                                                    transition={{ ease: 'easeOut', duration: 0.3 }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                                                </motion.div>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium">Mohon tunggu beberapa detik...</p>
                                        </>
                                    )}

                                    {uploadState === 'success' && (
                                        <>
                                            <motion.div
                                                initial={{ scale: 0.5, rotate: -45 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                                                className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400/50 flex items-center justify-center text-emerald-400 mb-5 relative shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                                            >
                                                <CheckCircle2 className="w-10 h-10" />
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0.8 }}
                                                    animate={{ scale: 1.4, opacity: 0 }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                    className="absolute inset-0 rounded-full border border-emerald-400"
                                                />
                                            </motion.div>

                                            <h3 className="text-lg font-black text-emerald-300 tracking-wide mb-1">
                                                File Berhasil Diupload!
                                            </h3>
                                            <p className="text-xs text-slate-300 max-w-sm mb-4">
                                                Dokumen legalisasi resmi telah tersimpan dengan aman di server. Tombol legalisasi kini aktif dan menyala merah glowing.
                                            </p>

                                            <div className="w-full bg-emerald-950/30 border border-emerald-500/25 rounded-2xl p-3 mb-6 flex items-center gap-3 text-left">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                                    <Shield className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-white truncate">{uploadFileName}</p>
                                                    <p className="text-[10px] text-emerald-400/80">Status: Terlegalisasi Aktif (Tombol Merah Glowing)</p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={closeUploadModal}
                                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer"
                                            >
                                                Tutup & Selesai
                                            </button>
                                        </>
                                    )}

                                    {uploadState === 'error' && (
                                        <>
                                            <motion.div
                                                initial={{ scale: 0.5 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                                                className="w-20 h-20 rounded-full bg-rose-500/15 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 mb-5 relative shadow-[0_0_40px_rgba(244,63,94,0.4)]"
                                            >
                                                <AlertTriangle className="w-10 h-10" />
                                            </motion.div>

                                            <h3 className="text-lg font-black text-rose-400 tracking-wide mb-1">
                                                Gagal Mengunggah File!
                                            </h3>
                                            <p className="text-xs text-rose-200/90 max-w-sm mb-4 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-left">
                                                {uploadErrorMessage || 'Terjadi kesalahan sistem saat memproses file.'}
                                            </p>

                                            <div className="flex gap-2 w-full">
                                                <button
                                                    type="button"
                                                    onClick={closeUploadModal}
                                                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                                                >
                                                    Tutup
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        closeUploadModal()
                                                        setTimeout(() => {
                                                            fileInputRef.current?.click()
                                                        }, 200)
                                                    }}
                                                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* ============================================================== */}
            {/* PORTALED 80% SCREEN PDF PREVIEW MODAL WITH TOP-RIGHT CLOSE     */}
            {/* ============================================================== */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showPreviewModal && previewUrl && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
                            onClick={closePreview}
                        >
                            <motion.div
                                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={e => e.stopPropagation()}
                                style={{ width: '80vw', height: '80vh' }}
                                className="bg-slate-950 rounded-3xl overflow-hidden border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col relative ring-1 ring-white/10"
                            >
                                {/* Modal Header */}
                                <div className="flex items-center gap-3 px-6 py-3.5 border-b border-white/10 bg-slate-900/80 shrink-0">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-black text-white uppercase tracking-wider">Preview Dokumen Legalisasi</p>
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/30">
                                                RESMI
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">• Ukuran 80% Layar</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-xl">{sopJudul || 'Dokumen Legalisasi SOP'}</p>
                                    </div>

                                    {/* Action buttons + Close button on top right */}
                                    <div className="ml-auto flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Unduh
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrint}
                                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer"
                                        >
                                            <Printer className="w-3.5 h-3.5" /> Cetak
                                        </button>

                                        {/* PROMINENT TOP-RIGHT CLOSE BUTTON */}
                                        <button
                                            type="button"
                                            onClick={closePreview}
                                            className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)] group"
                                            title="Tutup Jendela Preview (Esc)"
                                        >
                                            <X className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
                                            <span>Tutup</span>
                                        </button>
                                    </div>
                                </div>

                                {/* PDF Viewer Body occupying 100% of the 80% container */}
                                <div className="flex-1 bg-slate-900/40 relative w-full h-full">
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-full border-0"
                                        title="Dokumen Legalisasi PDF"
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-md bg-slate-950 border border-red-500/30 rounded-3xl p-6 shadow-[0_0_60px_rgba(239,68,68,0.25)] relative overflow-hidden ring-1 ring-white/10"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                                        <Trash2 className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-white">Hapus File Legalisasi?</h3>
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                                                Konfirmasi
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                            File legalisasi PDF yang telah diupload akan dihapus secara permanen dari server. Status legalisasi pada dokumen ini akan dinonaktifkan.
                                        </p>
                                        {sopJudul && (
                                            <div className="mt-3.5 p-3 rounded-xl bg-slate-900/90 border border-white/10">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Judul SOP</p>
                                                <p className="text-xs text-slate-200 font-medium truncate mt-0.5">{sopJudul}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={handleDelete}
                                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Menghapus...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Ya, Hapus File</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    )
}
