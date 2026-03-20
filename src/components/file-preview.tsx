"use client"

/* =========================
   🔥 SIMPLE PREVIEW (Desktop Tauri)
   PDF  → iframe langsung dari R2 CDN
   Office → Office Viewer Online
   Fallback → tombol buka di browser eksternal
========================= */

import { useState, useEffect, useRef } from "react"
import { X, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const R2_PUBLIC_BASE = "https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev"

const OFFICE_EXTS = ["doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx"]
const PDF_EXTS    = ["pdf"]

interface FilePreviewProps {
  /** R2 object key, e.g. "sop/2026/03/file.xlsx" */
  fileKey: string
  /** Judul yang ditampilkan di header (optional) */
  title?: string
  onClose: () => void
}

export default function FilePreview({ fileKey, title, onClose }: FilePreviewProps) {
  const [officeError, setOfficeError] = useState(false)
  const [pdfError, setPdfError]       = useState(false)
  const [loading, setLoading]         = useState(true)
  const iframeRef                     = useRef<HTMLIFrameElement>(null)

  const ext      = fileKey.split(".").pop()?.toLowerCase() ?? ""
  const fileUrl  = `${R2_PUBLIC_BASE}/${fileKey}`
  const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`

  const isPdf    = PDF_EXTS.includes(ext)
  const isOffice = OFFICE_EXTS.includes(ext)

  // Dynamically import Tauri shell only when running inside Tauri
  const openExternal = async (url: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__
      if (isTauri) {
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const displayTitle = title ?? fileKey.split("/").pop() ?? fileKey

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 shrink-0">
        <span className="text-white text-sm font-semibold truncate max-w-[60%]" title={fileKey}>
          {displayTitle}
        </span>

        <div className="flex items-center gap-2">
          {/* Buka eksternal */}
          <Button
            size="sm"
            variant="ghost"
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-1.5"
            onClick={() => openExternal(isPdf ? fileUrl : officeUrl)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-xs">Buka di Browser</span>
          </Button>

          {/* Tutup */}
          <Button
            size="icon"
            variant="ghost"
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-8 h-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden">

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            <span className="text-sm">Memuat preview…</span>
          </div>
        )}

        {/* ── PDF ── */}
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

        {/* ── OFFICE ── */}
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

        {/* ── UNSUPPORTED FORMAT ── */}
        {!isPdf && !isOffice && (
          <Fallback
            message={`Format .${ext} tidak didukung preview langsung.`}
            onOpen={() => openExternal(fileUrl)}
          />
        )}

        {/* ── PDF ERROR ── */}
        {isPdf && pdfError && (
          <Fallback
            message="Preview PDF gagal dimuat dari storage."
            onOpen={() => openExternal(fileUrl)}
          />
        )}

        {/* ── OFFICE ERROR ── */}
        {isOffice && officeError && (
          <Fallback
            message="Preview Office gagal dimuat (mungkin file terlalu besar atau belum aktif)."
            onOpen={() => openExternal(officeUrl)}
          />
        )}
      </div>
    </div>
  )
}

/* ── Helper Fallback ── */
function Fallback({ message, onOpen }: { message: string; onOpen: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-center max-w-xs">{message}</p>
      <Button
        size="sm"
        variant="outline"
        className="text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10 gap-1.5"
        onClick={onOpen}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Buka di Browser
      </Button>
    </div>
  )
}
