import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Loader2, Workflow, Clock, FileText, Layers, Download, CheckCircle, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { ShimmerTitle } from "@/components/ui/shimmer-title"
import { toast } from "sonner"

// --- Premium UI Components ---

const CosmicGrid = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)]" />
        <div
            className="absolute inset-0"
            style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
                backgroundSize: '40px 40px'
            }}
        />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
)

export default function SopBuilderList() {
    const [sops, setSops] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState<any>(null)
    const router = useRouter()

    const fetchSops = async (targetPage = page) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/sop-builder?page=${targetPage}&limit=10`, {
                credentials: 'include'
            })
            const json = await res.json()
            if (res.ok) {
                setSops(json.data)
                setPagination(json.pagination)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSops(page)
    }, [page])

    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus draf SOP ini?")) return

        try {
            const res = await fetch(`/api/sop-builder/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            if (res.ok) {
                toast.success("Draf SOP berhasil dihapus")
                fetchSops()
            } else {
                toast.error("Gagal menghapus SOP")
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem")
        }
    }

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin w-10 h-10 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Initializing Data Stream...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-[600px] p-1">
            <CosmicGrid />

            {/* Header Section */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <ShimmerTitle
                        size="lg"
                        subtitle="Kelola, bangun, dan ekspor instrumen SOP terintegrasi dengan standar operasional premium"
                    >
                        Management Hub SOP Terintegrasi
                    </ShimmerTitle>
                </motion.div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                >
                    <Button
                        onClick={() => router.push('/sop/buat-baru')}
                        className="group h-14 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-[0_15px_30px_rgba(79,70,229,0.3)] transition-all duration-300 relative overflow-hidden active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <Plus className="mr-3 h-5 w-5" />
                        <span className="font-black uppercase tracking-[0.2em] text-[11px]">Inisiasi SOP Baru</span>
                    </Button>
                </motion.div>
            </div>

            {/* Tactical Data Hub */}
            <div className="relative z-10">
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    {/* Header Columns */}
                    <div className="grid grid-cols-[1fr_120px_120px_180px_160px_140px] gap-4 px-8 py-5 border-b border-white/5 bg-white/[0.02]">
                        {['PROSEDUR JUDUL', 'STATUS', 'STEPS', 'ASSET MATRIX', 'TELEMETRY', 'AKSI'].map((h, i) => (
                            <div key={h} className={`text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ${i === 5 ? 'text-right' : ''}`}>
                                {h}
                            </div>
                        ))}
                    </div>

                    <div className="divide-y divide-white/[0.03]">
                        <AnimatePresence mode="popLayout">
                            {sops.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-20 text-center"
                                >
                                    <div className="inline-flex p-4 rounded-full bg-slate-950/50 border border-white/5 mb-4">
                                        <AlertTriangle className="w-8 h-8 text-slate-700" />
                                    </div>
                                    <p className="text-slate-500 font-bold tracking-tight uppercase text-xs">Zero Data Entries Found in Database</p>
                                </motion.div>
                            ) : (
                                sops.map((sop, idx) => (
                                    <motion.div
                                        key={sop.id}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="grid grid-cols-[1fr_120px_120px_180px_160px_140px] gap-4 px-8 py-6 items-center group hover:bg-white/[0.03] transition-all relative overflow-hidden"
                                    >
                                        {/* Scanning Animation on row hover */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 group-hover:h-3/4 bg-indigo-500/60 rounded-full transition-all duration-500" />

                                        {/* Title Pod (Includes Code & Author) */}
                                        <div className="flex flex-col gap-0.5 pr-4">
                                            {/* Code Label - Top */}
                                            <span className="font-mono text-[8px] font-black text-yellow-500/80 uppercase tracking-widest">
                                                {sop.nomorSop || `DRAFT-${idx + 1}`}
                                            </span>

                                            {/* Title */}
                                            <span className="text-sm font-black text-slate-200 group-hover:text-white transition-colors leading-tight">
                                                {sop.judul}
                                            </span>

                                            {/* Author Info */}
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                    dibuat oleh: <span className="text-indigo-400/70">{sop.user?.name || 'Administrator'}</span>
                                                </span>
                                                <div className="w-1 h-1 rounded-full bg-slate-800" />
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                    {sop.pelaksana || 'Lintas Unit'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status HUD */}
                                        <div>
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${sop.status === 'FINAL' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-amber-500/20 bg-amber-500/5 text-amber-400'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${sop.status === 'FINAL' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{sop.status}</span>
                                            </div>
                                        </div>

                                        {/* Steps Count */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-center font-black text-indigo-400 text-xs">
                                                {sop._count?.langkahLangkah || 0}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Steps</span>
                                        </div>

                                        {/* Asset Matrix */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {sop.generatedCoverPath ? (
                                                <div className="p-1 px-2 rounded-lg bg-indigo-500/10 border border-indigo-500/10 text-[8px] font-black text-indigo-400 uppercase flex items-center gap-1">
                                                    <FileText className="w-2.5 h-2.5" /> Cover
                                                </div>
                                            ) : null}
                                            {sop.combinedPdfPath ? (
                                                <div className="p-1 px-2 rounded-lg bg-blue-500/10 border border-blue-500/10 text-[8px] font-black text-blue-400 uppercase flex items-center gap-1">
                                                    <Download className="w-2.5 h-2.5" /> PDF Full
                                                </div>
                                            ) : (
                                                <div className="p-1 px-2 rounded-lg border border-white/5 text-[8px] font-black text-slate-600 uppercase">None</div>
                                            )}
                                        </div>

                                        {/* Telemetry (Time) */}
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock className="w-3 h-3 opacity-50" />
                                                <span className="text-[10px] font-bold">
                                                    {format(new Date(sop.updatedAt), 'dd/MM/yy', { locale: localeId })}
                                                </span>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.1em] mt-0.5">
                                                {format(new Date(sop.updatedAt), 'HH:mm', { locale: localeId })} Local
                                            </span>
                                        </div>

                                        {/* Tactical Aksi */}
                                        <div className="flex justify-end gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => router.push(`/sop/buat/${sop.id}`)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/50 hover:bg-slate-800 transition-all active:scale-90"
                                                title="Edit Blueprint"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => router.push(`/sop/buat/${sop.id}/flowchart`)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-slate-800 transition-all active:scale-90"
                                                title="Process Flow"
                                            >
                                                <Workflow className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sop.id)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-slate-800 transition-all active:scale-90"
                                                title="Purge Entry"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer HUD & Pagination */}
                    <div className="bg-white/[0.02] px-8 py-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                Showing <span className="text-white">{sops.length}</span> of <span className="text-white">{pagination?.total || 0}</span> Entries
                            </span>
                            <div className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Vector Cluster: SOP_BUILDER_V2</span>
                        </div>

                        {/* Pagination Controls */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-slate-900 text-[10px] font-black uppercase text-slate-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    Prev
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${p === page ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    disabled={page === pagination.totalPages}
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-slate-900 text-[10px] font-black uppercase text-slate-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">System Operational</span>
                        </div>
                    </div>
                </div >
            </div >
        </div >
    )
}
