"use client"

/* =========================
   🔥 SIMPLE PREVIEW (Desktop Tauri)
   PDF    → iframe langsung dari R2 CDN
   Office → Office Viewer Online
   Fallback → tombol buka di browser eksternal
========================= */

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const R2_PUBLIC_BASE = "https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev"
const OFFICE_EXTS    = ["doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx"]
const PDF_EXTS       = ["pdf"]

interface FilePreviewProps {
  /** R2 object key, e.g. "sop/2026/03/file.xlsx" */
  fileKey: string
  /** Judul yang ditampilkan di header (optional) */
  title?: string
  onClose: () => void
}

export default function FilePreview({ fileKey, title, onClose }: FilePreviewProps) {
  const [officeError, setOfficeError] = useState(false)
  const [pdfError,    setPdfError]    = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [visible,     setVisible]     = useState(false)
  const iframeRef                     = useRef<HTMLIFrameElement>(null)

  const ext       = fileKey.split(".").pop()?.toLowerCase() ?? ""
  const fileUrl   = `${R2_PUBLIC_BASE}/${fileKey}`
  const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`

  const isPdf    = PDF_EXTS.includes(ext)
  const isOffice = OFFICE_EXTS.includes(ext)

  // Slide-in animation on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Animated close: slide out → wait → call onClose
  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  // Dynamically import Tauri shell only when running inside Tauri
  const openExternal = async (url: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isTauuri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__
      if (isTauuri) {
        // @ts-ignore – tauri-apps/plugin-shell may not have types installed
        const { open } = await import("@tauri-apps/plugin-shell")
        await open(url)
      } else {
        window.open(url, "_blank", "noopener,noreferrer")
      }
    } catch (err) {
      console.error("[FilePreview] openExternal error:", err)
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  // Tutup dengan Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayTitle = title ?? fileKey.split("/").pop() ?? fileKey

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-slate-950"
      style={{ transition: "opacity 260ms ease", opacity: visible ? 1 : 0 }}
    >
      {/* Backdrop – klik untuk menutup */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel utama – slide dari bawah */}
      <div
        className="relative flex flex-col w-full h-full"
        style={{
          transition: "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)",
          transform: visible ? "translateY(0)" : "translateY(32px)",
        }}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-900 border-b border-slate-700/80 shrink-0">

          {/* ← Kembali */}
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-orange-600/20 hover:text-orange-400 text-slate-300 text-sm font-medium transition-all border border-slate-700 hover:border-orange-500/40"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Kembali</span>
          </button>

          {/* Judul */}
          <span className="flex-1 text-white text-sm font-semibold truncate" title={fileKey}>
            {displayTitle}
          </span>

          {/* Buka di browser */}
          <Button
            size="sm"
            variant="ghost"
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-1.5 shrink-0"
            onClick={() => openExternal(isPdf ? fileUrl : officeUrl)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Buka di Browser</span>
          </Button>
        </div>

        {/* ── CONTENT ── */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden">

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10 bg-slate-950">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
              <span className="text-sm">Memuat preview…</span>
            </div>
          )}

          {/* PDF */}
          {isPdf && !pdfError && (
            <iframe
              ref={iframeRef}
              src={fileUrl}
              className="w-full h-full border-0"
              title={displayTitle}
              onLoad={() => setLoading(false)}
              onError={() => { setPdfError(true); setLoading(false) }}
            />
          )}

          {/* Office */}
          {isOffice && !officeError && (
            <iframe
              ref={iframeRef}
              src={officeUrl}
              className="w-full h-full border-0"
              title={displayTitle}
              onLoad={() => setLoading(false)}
              onError={() => { setOfficeError(true); setLoading(false) }}
            />
          )}

          {/* Format tidak didukung */}
          {!isPdf && !isOffice && (
            <Fallback
              message={`Format .${ext} tidak didukung preview langsung.`}
              onOpen={() => openExternal(fileUrl)}
              onClose={handleClose}
            />
          )}

          {/* PDF error */}
          {isPdf && pdfError && (
            <Fallback
              message="Preview PDF gagal dimuat dari storage."
              onOpen={() => openExternal(fileUrl)}
              onClose={handleClose}
            />
          )}

          {/* Office error */}
          {isOffice && officeError && (
            <Fallback
              message="Preview Office gagal dimuat (mungkin file terlalu besar atau belum aktif)."
              onOpen={() => openExternal(officeUrl)}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Fallback ── */
function Fallback({
  message,
  onOpen,
  onClose,
}: {
  message: string
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-center max-w-xs">{message}</p>
      <div className="flex gap-3">
        <Button
          size="sm"
          variant="outline"
          className="text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10 gap-1.5"
          onClick={onOpen}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Buka di Browser
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-slate-400 border-slate-600 hover:bg-slate-700 gap-1.5"
          onClick={onClose}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </Button>
      </div>
    </div>
  )
}
