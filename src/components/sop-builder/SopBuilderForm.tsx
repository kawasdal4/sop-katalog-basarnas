"use client"

import { useState } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Trash2,
    GripVertical,
    Save,
    ArrowLeft,
    Loader2,
    FileText,
    ListChecks,
    Scaling,
    ArrowUp,
    ArrowDown,
    X,
    Info,
    Layout,
    Activity,
    Settings,
    FileJson,
    Zap,
    ChevronRight,
    Search,
    Shield,
    Users,
    RefreshCw,
    FileSpreadsheet as FileSpreadsheetIcon,
    Sparkles
} from "lucide-react"
import { ShimmerTitle } from "@/components/ui/shimmer-title"
import { toast } from "sonner"
import { useRouter, useParams } from "next/navigation"
import { generateSopNumber, toRoman } from "@/lib/date-utils"

const PELAKSANA_OPTIONS = [
    "Pelapor",
    "Petugas Komunikasi",
    "Asisten Kagahar",
    "Kagahar",
    "Pengawas Siaga",
    "Kantor SAR"
]

const metadataFields = ["dasarHukum", "kualifikasiPelaksana", "peralatanPerlengkapan", "peringatan", "pencatatanPendataan", "keterkaitan", "disahkanOleh"]

const formSchema = z.object({
    nomorSop: z.string().optional(),
    judul: z.string().min(3, "Judul SOP wajib diisi"),
    unitKerja: z.string().min(2, "Unit Kerja wajib diisi"),
    tanggalEfektif: z.string().optional(),
    revisi: z.string().optional(),
    dasarHukum: z.array(z.string()).optional(),
    kualifikasiPelaksana: z.array(z.string()).optional(),
    peralatanPerlengkapan: z.array(z.string()).optional(),
    peringatan: z.array(z.string()).optional(),
    pencatatanPendataan: z.array(z.string()).optional(),
    keterkaitan: z.array(z.string()).optional(),
    disahkanOleh: z.string().optional(),
    pelaksanaLanes: z.array(z.string()).min(1, "Minimal 1 kolom pelaksana"),
    langkahLangkah: z.array(z.object({
        aktivitas: z.string().min(1, "Aktivitas wajib diisi"),
        pelaksana: z.string().min(1, "Wajib pilih pelaksana"),
        stepType: z.enum(["start", "process", "decision", "document", "input_output", "end"]),
        nextStepYes: z.coerce.number().optional(),
        nextStepNo: z.coerce.number().optional(),
        mutuBakuKelengkapan: z.string().optional(),
        mutuBakuWaktu: z.string().optional(),
        mutuBakuOutput: z.string().optional(),
        keterangan: z.string().optional()
    }))
})

type FormValues = z.infer<typeof formSchema>

export default function SopBuilderForm({
    initialData, id
}: { initialData?: any, id?: string }) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeSection, setActiveSection] = useState<'info' | 'metadata' | 'langkah'>('info')
    const safeJsonParse = (val: any) => {
        if (typeof val !== 'string') return val;
        try {
            return JSON.parse(val);
        } catch (e) {
            return val;
        }
    }

    const defaultValues: FormValues = initialData ? {
        nomorSop: initialData.nomorSop || "",
        judul: initialData.judul || "",
        unitKerja: initialData.unitKerja || "",
        tanggalEfektif: initialData.tanggalEfektif ? new Date(initialData.tanggalEfektif).toISOString().split('T')[0] : "",
        revisi: initialData.revisi || "00",
        dasarHukum: safeJsonParse(initialData.dasarHukum) || [""],
        kualifikasiPelaksana: safeJsonParse(initialData.kualifikasiPelaksana) || [""],
        peralatanPerlengkapan: safeJsonParse(initialData.peralatanPerlengkapan) || [""],
        peringatan: safeJsonParse(initialData.peringatan) || [""],
        pencatatanPendataan: safeJsonParse(initialData.pencatatanPendataan) || [""],
        keterkaitan: safeJsonParse(initialData.keterkaitan) || [""],
        disahkanOleh: initialData.disahkanOleh || "",
        pelaksanaLanes: initialData.pelaksanaLanes ? safeJsonParse(initialData.pelaksanaLanes) : PELAKSANA_OPTIONS,
        langkahLangkah: initialData.langkahLangkah?.length > 0 ? initialData.langkahLangkah.map((l: any) => {
            const pel = safeJsonParse(l.pelaksana);
            return {
                aktivitas: l.aktivitas,
                pelaksana: Array.isArray(pel) ? pel[0] : (pel || ""),
                stepType: (l.stepType as any) || "process",
                nextStepYes: l.nextStepYes != null ? Number(l.nextStepYes) : undefined,
                nextStepNo: l.nextStepNo != null ? Number(l.nextStepNo) : undefined,
                mutuBakuKelengkapan: l.mutuBakuKelengkapan || "",
                mutuBakuWaktu: l.mutuBakuWaktu || "",
                mutuBakuOutput: l.mutuBakuOutput || "",
                keterangan: l.keterangan || ""
            }
        }) : [{
            aktivitas: "",
            pelaksana: "",
            stepType: "process" as const,
            mutuBakuKelengkapan: "",
            mutuBakuWaktu: "",
            mutuBakuOutput: "",
            keterangan: ""
        }]
    } : {
        nomorSop: generateSopNumber('SOP', Math.floor(100 + Math.random() * 899)),
        judul: "",
        unitKerja: "Basarnas",
        revisi: "00",
        pelaksanaLanes: PELAKSANA_OPTIONS,
        dasarHukum: [""],
        kualifikasiPelaksana: [""],
        peralatanPerlengkapan: [""],
        peringatan: [""],
        pencatatanPendataan: [""],
        keterkaitan: [""],
        langkahLangkah: [{
            aktivitas: "",
            pelaksana: "",
            stepType: "process",
            mutuBakuKelengkapan: "",
            mutuBakuWaktu: "",
            mutuBakuOutput: "",
            keterangan: ""
        }]
    }

    const { register, handleSubmit, control, formState: { errors }, watch, setValue, reset, getValues } = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues
    })

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "langkahLangkah"
    })

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true)
        try {
            const endpoint = id ? `/api/sop-builder/${id}` : '/api/sop-builder'
            const method = id ? 'PUT' : 'POST'

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            })

            if (!res.ok) {
                throw new Error(await res.text())
            }

            const result = await res.json()
            toast.success(id ? "SOP berhasil diperbarui" : "SOP berhasil dibuat")

            const targetId = id || result.data?.id
            if (targetId) {
                router.push(`/sop/buat/${targetId}/flowchart`)
            }
        } catch (error: any) {
            console.error(error)
            let errorMessage = "Gagal menyimpan data SOP";

            try {
                // Try to parse if error message is JSON (from res.text())
                const parsed = JSON.parse(error.message);
                if (parsed.error) errorMessage = parsed.error;
            } catch (e) {
                // If not JSON, use the raw error message if it's a string
                if (typeof error.message === 'string' && error.message.length < 100) {
                    errorMessage = error.message;
                }
            }

            toast.error(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden relative font-sans">
            {/* Immersive Cyber Layer */}
            <div className="fixed inset-0 z-0">
                {/* Primary Grid */}
                <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
                {/* Secondary Micro Grid */}
                <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
                        backgroundSize: '15px 15px'
                    }}
                />

                {/* Dynamic Vignette & Glows */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#020617_100%)]" />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none"
                />
                <motion.div
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 12, repeat: Infinity }}
                    className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"
                />

                {/* Global Tactical Scanline */}
                <motion.div
                    animate={{ y: ['0%', '100%'], opacity: [0, 0.2, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent pointer-events-none z-[1]"
                />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 max-w-[1800px] mx-auto p-4 md:p-8 lg:p-12 space-y-12">
                {/* Command Center Header - Hyper-Premium Futuristic Design */}
                <div className="sticky top-0 z-50 mb-10 px-2 lg:px-0">
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="group relative"
                    >
                        {/* Background Glassmorphism with Cyber Glow */}
                        <div className="absolute inset-x-0 -bottom-4 h-24 bg-gradient-to-t from-orange-500/10 via-orange-500/5 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                        <div className="bg-[#0b1120]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden relative border-t-orange-500/50">
                            {/* Industrial Detail Lines */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
                            <div className="absolute top-0 left-10 w-20 h-1 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]" />

                            {/* Holographic Scanning Line Animation */}
                            <motion.div
                                className="absolute inset-y-0 w-[1px] bg-gradient-to-b from-transparent via-orange-500/50 to-transparent"
                                animate={{ x: ['0%', '1000%'] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            />

                            <div className="flex items-center gap-6 relative z-10">
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-orange-500/20 text-white hover:text-orange-500 border border-white/10 group-hover:border-orange-500/30 transition-all shadow-inner"
                                        onClick={() => router.push('/?tab=buat-sop-baru')}
                                    >
                                        <ArrowLeft className="h-6 w-6" />
                                    </Button>
                                </motion.div>

                                <div className="h-12 w-[1px] bg-white/10 hidden md:block" />

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <Sparkles className="h-3 w-3 text-orange-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Katalog SOP Basarnas</span>
                                    </div>
                                    <ShimmerTitle subtitle="SOP DEPLOYMENT PHASE • V4.2.0">
                                        {initialData ? "Ubah Data SOP" : "Buat SOP Baru"}
                                    </ShimmerTitle>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 relative z-10">
                                {/* System Status Indicators */}
                                <div className="hidden xl:flex items-center gap-6 mr-6 border-r border-white/5 pr-8">
                                    <div className="text-right">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none">Status Sinkronisasi</p>
                                        <div className="flex items-center gap-1.5 justify-end mt-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            <span className="text-[11px] font-black text-emerald-400 tracking-tighter">ONLINE</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none">Keamanan Data</p>
                                        <div className="flex items-center gap-1.5 justify-end mt-1">
                                            <Shield className="h-3 w-3 text-blue-400" />
                                            <span className="text-[11px] font-black text-blue-400 tracking-tighter">TERENKRIPSI</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => {
                                        const exampleData = {
                                            judul: "SOP Penanganan Berita Pencarian dan Pertolongan di BCC",
                                            unitKerja: "Direktorat Kesiapsiagaan (BCC)",
                                            nomorSop: generateSopNumber('SOP', 1),
                                            tanggalEfektif: "2026-06-01",
                                            revisi: "01",
                                            disahkanOleh: "Direktur Kesiapsiagaan",
                                            pelaksanaLanes: ["Pelapor", "Petugas Komunikasi", "Pengawas Siaga", "Kagahar"],
                                            dasarHukum: ["Permas No. 22 Tahun 2012 tentang Organisasi dan Tata Kerja Basarnas", "Rencana Kontijensi Basarnas"],
                                            kualifikasiPelaksana: ["Mampu mengoperasikan Radio dan Satelit", "Memahami Prosedur Komunikasi Radio"],
                                            peralatanPerlengkapan: ["Radio HF/VHF/UHF", "Telepon/HP", "Format Laporan Awal"],
                                            peringatan: ["Verifikasi keakuratan koordinat", "Respon time maksimal 15 menit"],
                                            pencatatanPendataan: ["Buku Harian Komunikasi", "E-Logbook"],
                                            keterkaitan: ["SOP Pengerahan Alut dan Personil", "SOP Pelaksanaan Operasi SAR"],
                                            langkahLangkah: [
                                                { aktivitas: "Menerima berita musibah/kecelakaan melalui telepon/radio/satelit", pelaksana: "Petugas Komunikasi", stepType: "start" as const, mutuBakuKelengkapan: "Telepon/Radio", mutuBakuWaktu: "5 mnt", mutuBakuOutput: "Laporan Awal", keterangan: "-" },
                                                { aktivitas: "Melakukan verifikasi kebenaran berita kepada sumber berita", pelaksana: "Petugas Komunikasi", stepType: "process" as const, mutuBakuKelengkapan: "Logbook", mutuBakuWaktu: "10 mnt", mutuBakuOutput: "Verifikasi Valid", keterangan: "-" },
                                                { aktivitas: "Apakah berita valid?", pelaksana: "Petugas Komunikasi", stepType: "decision" as const, nextStepYes: 4, nextStepNo: 5, mutuBakuKelengkapan: "-", mutuBakuWaktu: "2 mnt", mutuBakuOutput: "Keputusan", keterangan: "-" },
                                                { aktivitas: "Menerusukan berita ke Pengawas Siaga untuk tindak lanjut", pelaksana: "Petugas Komunikasi", stepType: "process" as const, mutuBakuKelengkapan: "Format Laporan", mutuBakuWaktu: "5 mnt", mutuBakuOutput: "Laporan Diteruskan", keterangan: "-" },
                                                { aktivitas: "Selesai", pelaksana: "Petugas Komunikasi", stepType: "end" as const, mutuBakuKelengkapan: "-", mutuBakuWaktu: "-", mutuBakuOutput: "-", keterangan: "-" }
                                            ]
                                        };
                                        reset(exampleData);
                                        toast.success("Data Demo Berhasil Dimuat", {
                                            description: "Formulir SOP telah diisi dengan data otomatis.",
                                            icon: <Zap className="h-4 w-4 text-amber-500" />
                                        });
                                    }}
                                    className="h-14 bg-white/5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 rounded-[1.2rem] px-6 font-black uppercase tracking-[0.2em] text-[10px] border border-white/5 hover:border-amber-500/30 transition-all shadow-inner group/demo relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.05] to-transparent -translate-x-full group-hover/demo:translate-x-full transition-transform duration-1000" />
                                    <Zap className="mr-3 h-4 w-4 text-amber-500 group-hover:animate-pulse" />
                                    <span className="relative z-10">Muat Data Demo</span>
                                </Button>

                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="h-16 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-[1.5rem] px-10 font-black uppercase tracking-[0.3em] text-[12px] shadow-[0_20px_50px_rgba(234,88,12,0.3)] border-t border-white/20 group/submit relative overflow-hidden transition-all duration-500"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span>Menyimpan...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-white/10 rounded-xl group-hover/submit:bg-white/20 transition-colors">
                                                    <Save className="h-5 w-5 group-hover:rotate-12 transition-transform duration-500" />
                                                </div>
                                                <span>{initialData ? 'Update SOP' : 'Simpan & Buat SOP'}</span>
                                            </div>
                                        )}

                                        {/* Scanline Effect */}
                                        <motion.div
                                            className="absolute inset-0 bg-white/10 opacity-0 group-hover/submit:opacity-100"
                                            initial={false}
                                            animate={{ y: ['-100%', '100%'] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        />
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start px-2 lg:px-0 pb-20">
                    {/* Modular Sidebar Navigation - Redesigned */}
                    <div className="lg:col-span-3 space-y-4 sticky top-40">
                        <div className="flex flex-col gap-3">
                            {[
                                { id: 'info', label: 'Identitas SOP', icon: Info, count: 1, desc: 'Data Identitas Utama SOP' },
                                { id: 'metadata', label: 'Kelengkapan SOP', icon: FileJson, count: 2, desc: 'Dasar Hukum & Atribut Tambahan' },
                                { id: 'langkah', label: 'Prosedur Kerja', icon: Activity, count: 3, desc: 'Langkah-Langkah Prosedur' }
                            ].map((section) => (
                                <motion.button
                                    key={section.id}
                                    type="button"
                                    whileHover={{ x: 8 }}
                                    onClick={() => setActiveSection(section.id as any)}
                                    className={`w-full group relative overflow-hidden p-1 rounded-3xl transition-all duration-500 ${activeSection === section.id
                                        ? 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-[0_15px_40px_rgba(249,115,22,0.25)]'
                                        : 'bg-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className={`flex items-center justify-between p-5 py-6 rounded-[1.4rem] transition-all duration-500 ${activeSection === section.id
                                        ? 'bg-[#0b1120]/60 backdrop-blur-3xl'
                                        : 'bg-[#0f172a] border border-white/5'
                                        }`}>
                                        <div className="flex items-center gap-5">
                                            <div className={`p-4 rounded-2xl transition-all duration-500 relative ${activeSection === section.id
                                                ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] scale-110'
                                                : 'bg-slate-800/80 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-200'
                                                }`}>
                                                <section.icon className="h-6 w-6" />
                                                {activeSection === section.id && (
                                                    <motion.div
                                                        layoutId="active-nav-glow"
                                                        className="absolute inset-0 rounded-2xl bg-white/20 blur-md"
                                                    />
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-xs font-black uppercase tracking-[0.2em] ${activeSection === section.id ? 'text-white' : 'text-slate-400'}`}>
                                                    {section.label}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 opacity-60">
                                                    {section.desc}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`p-2 rounded-full border border-white/10 transition-all duration-500 ${activeSection === section.id ? 'bg-orange-500 text-white rotate-0' : 'bg-transparent text-slate-600 rotate-90 opacity-0 group-hover:opacity-100'}`}>
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>

                                    {/* Industrial Numbering */}
                                    <div className="absolute top-2 right-4 pointer-events-none">
                                        <span className={`text-[40px] font-black leading-none opacity-[0.03] transition-all duration-700 ${activeSection === section.id ? 'scale-150 opacity-10' : ''}`}>
                                            0{section.count}
                                        </span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        <div className="bg-[#0f172a] border border-white/5 mt-6 p-6 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <Shield className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Status Dokumen</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Tersimpan Otomatis</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                                        animate={{ width: ['0%', '100%'] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Status Penyimpanan</span>
                                    <span className="text-blue-400">Sinkronisasi Aktif</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Form Content */}
                    <div className="lg:col-span-9">
                        <AnimatePresence mode="wait">
                            {activeSection === 'info' && (
                                <motion.div
                                    key="info"
                                    initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                    className="space-y-10"
                                >
                                    <Card className="bg-[#0b1120]/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] border-t-orange-500/50 relative group/infocard">
                                        {/* Industrial Corner Accents */}
                                        <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-orange-500/20 rounded-tl-[3.5rem] pointer-events-none group-hover/infocard:border-orange-500/40 transition-colors" />
                                        <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-orange-500/20 rounded-tr-[3.5rem] pointer-events-none group-hover/infocard:border-orange-500/40 transition-colors" />
                                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-orange-500/20 rounded-bl-[3.5rem] pointer-events-none group-hover/infocard:border-orange-500/40 transition-colors" />
                                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-orange-500/20 rounded-br-[3.5rem] pointer-events-none group-hover/infocard:border-orange-500/40 transition-colors" />
                                        {/* Ambient Glow FX */}
                                        <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none group-hover/infocard:bg-orange-500/20 transition-all duration-1000" />

                                        <CardHeader className="bg-white/[0.02] border-b border-white/5 p-10 pb-8 relative overflow-hidden">
                                            <div className="flex items-center gap-5 mb-3">
                                                <div className="p-4 bg-orange-500/10 rounded-3xl border border-orange-500/20 shadow-inner group-hover/infocard:scale-105 transition-transform duration-700">
                                                    <Info className="h-8 w-8 text-orange-500" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-3xl font-black text-white uppercase tracking-tighter">Identitas <span className="text-orange-500">SOP</span></CardTitle>
                                                    <CardDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 opacity-60">Data Pokok Identitas SOP</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-10 space-y-12">
                                            <div className="grid md:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1 h-3 bg-orange-500 rounded-full" />
                                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Judul SOP</Label>
                                                    </div>
                                                    <Input
                                                        {...register("judul")}
                                                        placeholder="Deskripsikan nama SOP..."
                                                        className="bg-white/5 border-white/10 rounded-2xl h-16 px-8 transition-all text-xl font-black placeholder:text-slate-600 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 text-white shadow-inner"
                                                    />
                                                    {errors.judul && <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">{errors.judul.message}</p>}
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Unit Kerja</Label>
                                                    </div>
                                                    <Input
                                                        {...register("unitKerja")}
                                                        placeholder="Cth: Direktorat Kesiapsiagaan"
                                                        className="bg-white/5 border-white/10 rounded-2xl h-16 px-8 transition-all font-black placeholder:text-slate-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-lg text-white shadow-inner"
                                                    />
                                                    {errors.unitKerja && <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">{errors.unitKerja.message}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1 h-3 bg-slate-500 rounded-full" />
                                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Nomor SOP</Label>
                                                    </div>
                                                    <AuditPreview content={watch("nomorSop")} title="REGISTRY TRACE: Nomor SOP">
                                                        <div className="relative group/id">
                                                            <Input
                                                                {...register("nomorSop")}
                                                                placeholder="SOP-XX/XXXX/2026"
                                                                className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 pr-14 transition-all font-mono font-bold placeholder:text-slate-600 focus:border-orange-500 text-white"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 h-9 w-9 rounded-xl transition-all"
                                                                onClick={() => {
                                                                    const randomSeq = Math.floor(100 + Math.random() * 899)
                                                                    setValue("nomorSop", generateSopNumber('SOP', randomSeq))
                                                                    toast.success("New Protocol ID Generated");
                                                                }}
                                                            >
                                                                <RefreshCw className="h-4 w-4 animate-[spin_4s_linear_infinite]" />
                                                            </Button>
                                                        </div>
                                                    </AuditPreview>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Tanggal Efektif</Label>
                                                    </div>
                                                    <Input type="date" {...register("tanggalEfektif")} className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 transition-all invert brightness-200 focus:border-emerald-500 text-white font-bold" />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1 h-3 bg-amber-500 rounded-full" />
                                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Revisi Ke</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Input {...register("revisi")} className="bg-white/5 border-white/10 text-white rounded-2xl h-14 px-6 transition-all w-28 text-center font-black text-xl focus:border-amber-500" />
                                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">CURR.REV</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-1 h-3 bg-purple-500 rounded-full" />
                                                    <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Disahkan Oleh</Label>
                                                </div>
                                                <AuditPreview content={watch("disahkanOleh")} title="AUTHORIZATION: Validator">
                                                    <Input {...register("disahkanOleh")} className="bg-white/5 border-white/10 rounded-2xl h-16 px-8 transition-all font-black placeholder:text-slate-600 focus:border-purple-500 text-xl text-white shadow-inner" placeholder="Cth: Direktur Kesiapsiagaan" />
                                                </AuditPreview>
                                            </div>
                                        </CardContent>

                                        {/* Footer Accent */}
                                        <div className="h-2 w-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 opacity-30" />
                                    </Card>
                                </motion.div>
                            )}

                            {activeSection === 'metadata' && (
                                <motion.div
                                    key="metadata"
                                    initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                    className="space-y-10"
                                >
                                    <div className="bg-[#0b1120]/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between mb-2 overflow-hidden relative group/metaheader border-l-orange-500 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                                        {/* Cyber Grid Background */}
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                                        <div className="flex items-center gap-6 relative z-10">
                                            <div className="p-5 bg-orange-500/10 rounded-[2rem] border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] group-hover/metaheader:scale-110 transition-transform duration-700">
                                                <FileJson className="h-8 w-8 text-orange-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Kelengkapan <span className="text-orange-500">SOP</span></h2>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                                    Data Dasar Hukum & Kelengkapan SOP
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-6 md:mt-0 flex items-center gap-10 relative z-10">
                                            <div className="text-right">
                                                <p className="text-[11px] text-slate-600 font-black uppercase tracking-[0.2em]">Status Dokumen</p>
                                                <div className="flex items-center gap-2 justify-end mt-1">
                                                    <span className="text-xs font-black text-emerald-400 tracking-tighter">DATA LENGKAP</span>
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all cursor-pointer group/set">
                                                <Settings className="h-6 w-6 text-slate-400 group-hover/set:rotate-90 transition-transform duration-700" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        <div className="space-y-8">
                                            <MetadataPointList title="Dasar Hukum" name="dasarHukum" control={control} register={register} />
                                            <MetadataPointList title="Peralatan / Perlengkapan" name="peralatanPerlengkapan" control={control} register={register} />
                                        </div>
                                        <div className="space-y-8">
                                            <MetadataPointList title="Keterkaitan" name="keterkaitan" control={control} register={register} />
                                            <MetadataPointList title="Kualifikasi Pelaksana" name="kualifikasiPelaksana" control={control} register={register} />
                                        </div>
                                        <div className="space-y-8">
                                            <MetadataPointList title="Peringatan" name="peringatan" control={control} register={register} />
                                            <MetadataPointList title="Pencatatan dan Pendataan" name="pencatatanPendataan" control={control} register={register} />
                                        </div>
                                    </div>

                                    <Card className="bg-[#0b1120]/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden border-t-4 border-t-orange-600 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative group/lane-card">
                                        {/* Industrial Corner Accents */}
                                        <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-orange-500/20 rounded-tl-[3.5rem] pointer-events-none group-hover/lane-card:border-orange-500/40 transition-colors" />
                                        <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-orange-500/20 rounded-tr-[3.5rem] pointer-events-none group-hover/lane-card:border-orange-500/40 transition-colors" />
                                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-orange-500/20 rounded-bl-[3.5rem] pointer-events-none group-hover/lane-card:border-orange-500/40 transition-colors" />
                                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-orange-500/20 rounded-br-[3.5rem] pointer-events-none group-hover/lane-card:border-orange-500/40 transition-colors" />
                                        {/* Background dynamic gradient */}
                                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                        <CardHeader className="bg-white/[0.02] p-10 pb-8 border-b border-white/5">
                                            <div className="flex items-center gap-6">
                                                <div className="p-5 bg-orange-600 rounded-3xl shadow-[0_10px_30px_rgba(234,88,12,0.3)] group-hover/lane-card:rotate-6 transition-transform duration-700">
                                                    <Users className="h-8 w-8 text-white" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-3xl font-black text-white uppercase tracking-tighter">Daftar <span className="text-orange-500">Pelaksana</span></CardTitle>
                                                    <CardDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 opacity-60">Matriks Pelaksana Prosedur</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-10">
                                            <div className="flex flex-wrap gap-5">
                                                <AnimatePresence mode="popLayout">
                                                    {watch("pelaksanaLanes")?.map((lane, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                                                            whileHover={{ y: -5, scale: 1.05 }}
                                                            className="group/lane relative flex items-center gap-4 bg-[#0f172a]/80 border border-white/10 rounded-3xl px-8 py-5 transition-all hover:bg-orange-500/10 hover:border-orange-500/50 shadow-2xl active:scale-95 overflow-hidden"
                                                        >
                                                            <div className="h-4 w-4 rounded-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)] animate-pulse" />
                                                            <span className="text-sm font-black text-white uppercase tracking-[0.2em]">{lane}</span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-10 w-10 rounded-2xl hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-all opacity-20 group-hover/lane:opacity-100"
                                                                onClick={() => {
                                                                    const current = watch("pelaksanaLanes");
                                                                    setValue("pelaksanaLanes", current.filter((_, i) => i !== idx));
                                                                    toast.info(`Pelaksana [${lane}] berhasil dihapus`);
                                                                }}
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </Button>

                                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover/lane:opacity-100 -translate-x-full group-hover/lane:translate-x-full transition-all duration-1000" />
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button
                                                                variant="outline"
                                                                className="rounded-3xl border-dashed border-2 bg-white/[0.02] border-white/10 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/10 py-12 h-auto w-64 transition-all group/add shadow-2xl"
                                                            >
                                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mr-5 group-hover/add:bg-orange-500 group-hover/add:text-white transition-all shadow-inner border border-white/5">
                                                                    <Plus className="h-7 w-7 group-hover:rotate-90 transition-transform duration-500" />
                                                                </div>
                                                                <span className="font-black uppercase tracking-[0.3em] text-[12px]">Tambah Pelaksana</span>
                                                            </Button>
                                                        </motion.div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[360px] p-8 bg-[#0b1120] border-2 border-slate-800 shadow-[0_30px_80px_rgba(0,0,0,0.8)] rounded-[2.5rem] backdrop-blur-3xl z-[100]">
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <Plus className="h-4 w-4 text-orange-500" />
                                                                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Tambahkan Pelaksana Baru</span>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nama Pelaksana (Jabatan/Unit)</Label>
                                                                <div className="flex gap-3">
                                                                    <Input id="new-lane-name" placeholder="Cth: Petugas Komunikasi..." className="bg-white/5 border-white/10 text-white rounded-2xl h-14 px-6 font-bold" />
                                                                    <Button
                                                                        type="button"
                                                                        className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl h-14 w-14 shadow-lg shadow-orange-500/20"
                                                                        onClick={() => {
                                                                            const name = (document.getElementById('new-lane-name') as HTMLInputElement).value;
                                                                            if (name) {
                                                                                const current = watch("pelaksanaLanes") || [];
                                                                                setValue("pelaksanaLanes", [...current, name]);
                                                                                (document.getElementById('new-lane-name') as HTMLInputElement).value = "";
                                                                                toast.success(`Pelaksana [${name}] berhasil ditambahkan`);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Plus className="h-6 w-6" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4 pt-6 border-t border-white/5">
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilihan Pelaksana:</Label>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {PELAKSANA_OPTIONS.filter(opt => !watch("pelaksanaLanes")?.includes(opt)).map(opt => (
                                                                        <Button
                                                                            key={opt}
                                                                            variant="secondary"
                                                                            size="sm"
                                                                            className="text-[10px] font-black h-9 bg-white/5 border border-white/10 text-slate-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 rounded-xl transition-all"
                                                                            onClick={() => {
                                                                                const current = watch("pelaksanaLanes") || [];
                                                                                setValue("pelaksanaLanes", [...current, opt]);
                                                                                toast.success(`Pelaksana [${opt}] berhasil ditambahkan`);
                                                                            }}
                                                                        >
                                                                            {opt}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {activeSection === 'langkah' && (
                                <motion.div
                                    key="langkah"
                                    initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                    className="space-y-10"
                                >
                                    <Card className="bg-[#0b1120]/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.6)] border-t-orange-500/50 relative group/matrix">
                                        {/* Scanning Line Background FX */}
                                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none overflow-hidden">
                                            <motion.div
                                                className="w-full h-[1px] bg-orange-500 shadow-[0_0_20px_orange]"
                                                animate={{ y: ['0%', '2000%'] }}
                                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                            />
                                        </div>

                                        <CardHeader className="bg-white/[0.02] p-10 pb-8 border-b border-white/10 relative overflow-hidden">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-5 bg-orange-500/10 rounded-3xl border border-orange-500/20 shadow-inner group-hover/matrix:scale-105 transition-transform duration-700">
                                                        <Activity className="h-8 w-8 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-3xl font-black text-white uppercase tracking-tighter">Matriks <span className="text-orange-500">Prosedur</span></CardTitle>
                                                        <CardDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 opacity-60">Alur Logika & Eksekusi Prosedur</CardDescription>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aliran Aktif</span>
                                                    </div>
                                                    <div className="h-10 w-px bg-white/10" />
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Jumlah Langkah</p>
                                                        <p className="text-2xl font-black text-white tracking-tighter leading-none mt-1">{fields.length.toString().padStart(2, '0')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-0">
                                            {/* Matrix Header Labels - Hidden on Mobile */}
                                            <div className="hidden lg:grid lg:grid-cols-[repeat(16,minmax(0,1fr))] gap-4 px-10 py-5 bg-white/[0.03] border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] relative overflow-hidden">
                                                <div className="col-span-1 flex items-center justify-center border-r border-white/5">NO</div>
                                                <div className="col-span-3">Aktivitas Prosedur</div>
                                                <div className="col-span-4">Pelaksana</div>
                                                <div className="col-span-3">Mutu Baku (Kelengkapan)</div>
                                                <div className="col-span-1">Mutu Baku (Waktu)</div>
                                                <div className="col-span-2">Mutu Baku (Output)</div>
                                                <div className="col-span-2">Keterangan</div>
                                            </div>

                                            <div className="divide-y divide-white/[0.05]">
                                                <AnimatePresence initial={false} mode="popLayout">
                                                    {fields.map((field, index) => (
                                                        <motion.div
                                                            key={field.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                                                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                                            exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                                                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                                            className="relative p-10 flex flex-col lg:grid lg:grid-cols-[repeat(16,minmax(0,1fr))] gap-4 items-stretch group/row hover:bg-white/[0.02] transition-colors duration-500"
                                                        >
                                                            {/* Row Selection Glow */}
                                                            <div className="absolute inset-y-0 left-0 w-1 bg-orange-500 opacity-0 group-hover/row:opacity-100 transition-opacity" />

                                                            {/* Micro industrial corners for rows */}
                                                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/10 rounded-tl-xl pointer-events-none group-hover/row:border-orange-500/30 transition-colors" />
                                                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10 rounded-tr-xl pointer-events-none group-hover/row:border-orange-500/30 transition-colors" />
                                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/10 rounded-bl-xl pointer-events-none group-hover/row:border-orange-500/30 transition-colors" />
                                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/10 rounded-br-xl pointer-events-none group-hover/row:border-orange-500/30 transition-colors" />
                                                            {/* Industrial Rank & Control */}
                                                            <div className="col-span-1 flex flex-row lg:flex-col items-center justify-center gap-6 h-full lg:border-r border-white/5 pr-4 relative">
                                                                <div className="relative group/counter">
                                                                    <span className="font-black text-5xl text-slate-800/40 group-hover/row:text-orange-500/80 transition-all duration-700 tracking-tighter italic block">
                                                                        {(index + 1).toString().padStart(2, '0')}
                                                                    </span>
                                                                    <div className="absolute -inset-4 bg-orange-500/10 blur-2xl rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none" />
                                                                </div>
                                                                <div className="flex lg:flex-col gap-3">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-orange-500/20 text-slate-500 hover:text-orange-500 border border-white/5 transition-all active:scale-95"
                                                                        disabled={index === 0}
                                                                        onClick={() => move(index, index - 1)}
                                                                    >
                                                                        <ArrowUp className="h-5 w-5" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 border border-white/5 transition-all active:scale-95"
                                                                        onClick={() => {
                                                                            remove(index);
                                                                            toast.error(`Langkah ${(index + 1).toString().padStart(2, '0')} berhasil dihapus`);
                                                                        }}
                                                                        disabled={fields.length === 1}
                                                                    >
                                                                        <Trash2 className="h-5 w-5" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-orange-500/20 text-slate-500 hover:text-orange-500 border border-white/5 transition-all active:scale-95"
                                                                        disabled={index === fields.length - 1}
                                                                        onClick={() => move(index, index + 1)}
                                                                    >
                                                                        <ArrowDown className="h-5 w-5" />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Activity Core */}
                                                            <div className="col-span-3 space-y-6 w-full min-w-0">
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                        <div className="w-1 h-3 bg-orange-500 rounded-full" />
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Aktivitas Prosedur</Label>
                                                                    </div>
                                                                    <AuditPreview content={watch(`langkahLangkah.${index}.aktivitas`)} title={`AUDIT: Block ${index + 1} Protocol`}>
                                                                        <Textarea
                                                                            {...register(`langkahLangkah.${index}.aktivitas`)}
                                                                            placeholder="Jelaskan langkah-langkah prosedur..."
                                                                            className="bg-white/5 border-white/10 text-white rounded-[1.5rem] min-h-[140px] font-black text-base focus:border-orange-500/50 shadow-inner placeholder:text-slate-700 transition-all focus:ring-8 focus:ring-orange-500/5 p-6 leading-relaxed"
                                                                        />
                                                                    </AuditPreview>
                                                                </div>

                                                                <div className="p-6 bg-[#0f172a]/60 backdrop-blur-3xl rounded-[2rem] border border-white/10 space-y-5 relative overflow-hidden group/logic shadow-2xl">
                                                                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover/logic:opacity-60 transition-opacity">
                                                                        <Zap className="h-4 w-4 text-orange-500" />
                                                                    </div>
                                                                    <div className="flex items-center justify-between relative z-10">
                                                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">Simbol Flowchart</Label>
                                                                        <Select
                                                                            value={watch(`langkahLangkah.${index}.stepType`)}
                                                                            onValueChange={(val: any) => setValue(`langkahLangkah.${index}.stepType`, val)}
                                                                        >
                                                                            <SelectTrigger className="h-10 text-[10px] w-[150px] bg-white/5 border-white/10 rounded-xl focus:ring-orange-500/30 text-white font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="bg-[#0b1120] text-white border-2 border-slate-800 rounded-2xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[100]">
                                                                                <SelectItem value="start" className="rounded-xl focus:bg-emerald-500/20 text-[11px] font-black uppercase py-2">Mulai (Start)</SelectItem>
                                                                                <SelectItem value="process" className="rounded-xl focus:bg-indigo-500/20 text-[11px] font-black uppercase py-2">Proses (Process)</SelectItem>
                                                                                <SelectItem value="decision" className="rounded-xl focus:bg-amber-500/20 text-orange-400 text-[11px] font-black uppercase py-2">Keputusan (Decision)</SelectItem>
                                                                                <SelectItem value="document" className="rounded-xl focus:bg-blue-500/20 text-[11px] font-black uppercase py-2">Dokumen</SelectItem>
                                                                                <SelectItem value="input_output" className="rounded-xl focus:bg-purple-500/20 text-[11px] font-black uppercase py-2">Input/Output</SelectItem>
                                                                                <SelectItem value="end" className="rounded-xl focus:bg-red-500/20 text-[11px] font-black uppercase py-2">Selesai (End)</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>

                                                                    {watch(`langkahLangkah.${index}.stepType`) === 'decision' && (
                                                                        <div className="grid grid-cols-2 gap-5 pt-3 relative z-10 animate-in slide-in-from-top-4 duration-500 ease-out">
                                                                            <div className="space-y-3">
                                                                                <Label className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">IF YES (GOTO ID)</Label>
                                                                                <Input type="number" {...register(`langkahLangkah.${index}.nextStepYes`)} className="h-11 bg-emerald-500/5 border-emerald-500/20 text-emerald-400 font-mono text-lg rounded-2xl focus:border-emerald-500 transition-all text-center" />
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                <Label className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em]">IF NO (GOTO ID)</Label>
                                                                                <Input type="number" {...register(`langkahLangkah.${index}.nextStepNo`)} className="h-11 bg-rose-500/5 border-rose-500/20 text-rose-400 font-mono text-lg rounded-2xl focus:border-rose-500 transition-all text-center" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Secondary Grids */}
                                                            <div className="col-span-4 space-y-4 w-full min-w-0">
                                                                <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Pelaksana</Label>
                                                                </div>
                                                                <div className="relative group/sel">
                                                                    <Select
                                                                        value={watch(`langkahLangkah.${index}.pelaksana`)}
                                                                        onValueChange={(val: any) => setValue(`langkahLangkah.${index}.pelaksana`, val, { shouldValidate: true })}
                                                                    >
                                                                        <SelectTrigger className={`min-h-[4rem] h-auto bg-white/5 border-white/10 text-white rounded-2xl shadow-inner transition-all hover:bg-white/10 hover:border-white/20 px-4 py-3 font-bold text-left whitespace-normal ${errors?.langkahLangkah?.[index]?.pelaksana ? "border-red-500/50" : "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}>
                                                                            <SelectValue placeholder="Pilih Pelaksana..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-[#0b1120] text-white border-2 border-slate-800 rounded-[1.5rem] p-3 shadow-2xl z-[100]">
                                                                            {watch("pelaksanaLanes")?.map((lane) => (
                                                                                <SelectItem key={lane} value={lane} className="rounded-xl focus:bg-blue-500/20 focus:text-white py-3 font-bold text-sm">{lane}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <div className="absolute top-1/2 -right-2 w-1.5 h-6 bg-blue-500/40 rounded-full -translate-y-1/2 scale-0 group-hover/sel:scale-100 transition-transform" />
                                                                </div>
                                                                {errors?.langkahLangkah?.[index]?.pelaksana && <p className="text-[9px] text-red-400 font-black uppercase tracking-widest pl-2">Assignee Required</p>}
                                                            </div>

                                                            <div className="col-span-3 w-full space-y-4 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Kelengkapan</Label>
                                                                </div>
                                                                <AuditPreview content={watch(`langkahLangkah.${index}.mutuBakuKelengkapan`)} title="CRYPTO: Resource Matrix">
                                                                    <Textarea {...register(`langkahLangkah.${index}.mutuBakuKelengkapan`)} placeholder="Cth: ATK, Komputer..." className="bg-white/5 border-white/10 text-white rounded-2xl min-h-[120px] text-sm font-bold focus:border-indigo-500/50 placeholder:text-slate-700 transition-all shadow-inner p-5" />
                                                                </AuditPreview>
                                                            </div>

                                                            <div className="col-span-1 w-full space-y-4 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                    <div className="w-1 h-3 bg-cyan-500 rounded-full" />
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Waktu</Label>
                                                                </div>
                                                                <AuditPreview content={watch(`langkahLangkah.${index}.mutuBakuWaktu`)} title="CRYPTO: Time Complexity">
                                                                    <Input {...register(`langkahLangkah.${index}.mutuBakuWaktu`)} placeholder="5 mnt" className="bg-white/5 border-white/10 text-white rounded-2xl h-14 text-sm font-black px-1 focus:border-cyan-500/50 placeholder:text-slate-700 transition-all text-center" />
                                                                </AuditPreview>
                                                            </div>

                                                            <div className="col-span-2 w-full space-y-4 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                    <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Output</Label>
                                                                </div>
                                                                <AuditPreview content={watch(`langkahLangkah.${index}.mutuBakuOutput`)} title="CRYPTO: Yield Output">
                                                                    <Input {...register(`langkahLangkah.${index}.mutuBakuOutput`)} placeholder="Hasil" className="bg-white/5 border-white/10 text-white rounded-2xl h-14 text-sm font-black px-2 focus:border-emerald-500/50 placeholder:text-slate-700 transition-all text-center" />
                                                                </AuditPreview>
                                                            </div>

                                                            <div className="col-span-2 w-full space-y-4 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                    <div className="w-1 h-3 bg-purple-500 rounded-full" />
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Keterangan</Label>
                                                                </div>
                                                                <AuditPreview content={watch(`langkahLangkah.${index}.keterangan`)} title="CRYPTO: Field Obs">
                                                                    <Textarea {...register(`langkahLangkah.${index}.keterangan`)} placeholder="Keterangan tambahan..." className="bg-white/5 border-white/10 text-white rounded-2xl min-h-[120px] text-sm font-bold focus:border-purple-500/50 placeholder:text-slate-700 transition-all shadow-inner p-5" />
                                                                </AuditPreview>
                                                            </div>

                                                            {/* Scanning Row FX */}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.02] via-transparent to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none" />
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>

                                            <div className="p-20 bg-black/60 border-t border-white/5 flex justify-center relative overflow-hidden group/addfooter">
                                                {/* Tactical pulses */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-orange-600/5 blur-[120px] rounded-full pointer-events-none transition-all duration-1000 group-hover/addfooter:bg-orange-600/10" />

                                                <motion.div
                                                    whileHover={{ scale: 1.05, y: -5 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="relative z-10"
                                                >
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            append({ aktivitas: "", pelaksana: "", stepType: "process", mutuBakuKelengkapan: "", mutuBakuWaktu: "", mutuBakuOutput: "", keterangan: "" });
                                                            toast.success("New Operational Block Synchronized");
                                                        }}
                                                        className="rounded-[2.5rem] border-dashed border-4 bg-[#0f172a] hover:bg-orange-600/10 border-white/10 hover:border-orange-500 text-slate-400 hover:text-white py-12 px-24 group/addstep transition-all duration-700 shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:shadow-orange-500/20"
                                                    >
                                                        <div className="p-5 bg-white/5 rounded-3xl mr-8 group-hover/addstep:bg-orange-600 group-hover/addstep:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/5">
                                                            <Plus className="h-10 w-10 group-hover/addstep:rotate-90 transition-transform duration-700" />
                                                        </div>
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className="font-black uppercase tracking-[0.4em] text-xl">TAMBAH BARIS PROSEDUR</span>
                                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] group-hover:text-orange-500/60 transition-colors">Tambah langkah baru</p>
                                                        </div>
                                                    </Button>
                                                </motion.div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </form>
        </div>
    )
}

function AuditPreview({ content, children, title = "AUDIT REVIEW" }: { content: string | undefined, children: React.ReactNode, title?: string }) {
    // Return early if no content to avoid extra wrappers, but keep it stable
    const hasContent = content && typeof content === 'string' && content.trim() !== "";
    const displayContent = content || "";

    return (
        <div className="w-full relative group/audit-container">
            {children}
            {hasContent && (
                <HoverCard openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div className="absolute top-2 right-2 opacity-0 group-hover/audit-container:opacity-100 transition-opacity cursor-help z-10">
                            <div className="bg-orange-500/20 border border-orange-500/50 rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                <Search className="h-2.5 w-2.5 text-orange-400" />
                                <span className="text-[7px] font-black text-orange-400 uppercase tracking-widest">Audit</span>
                            </div>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                        side="top"
                        align="start"
                        className="w-[450px] bg-[#0b1120] border-2 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-2xl p-0 overflow-hidden z-[100] animate-in zoom-in-95 duration-200"
                    >
                        <div className="bg-[#1e293b] border-b border-slate-800 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1 w-8 bg-orange-500/20 rounded-full" />
                                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Mission Critical</span>
                            </div>
                        </div>
                        <div className="p-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                            <p className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap selection:bg-orange-500/30">
                                {displayContent}
                            </p>
                        </div>
                        <div className="bg-[#1e293b]/50 border-t border-slate-800 p-3 px-6 flex justify-between items-center">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Character Count: {displayContent.length}</span>
                            <span className="text-[8px] font-bold text-slate-400 border border-slate-700 rounded px-2 py-0.5">V3.0 AUDIT ENGINE</span>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            )}
        </div>
    );
}

function MetadataPointList({ title, name, control, register }: {
    title: string,
    name: string,
    control: any,
    register: any
}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: name as any
    });

    return (
        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800/50 rounded-[2rem] overflow-hidden group/meta shadow-2xl transition-all hover:shadow-orange-500/10 border-t border-white/5 relative">
            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-500/10 to-transparent pointer-events-none" />
            <div className="p-7 pb-3 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.4)]" />
                    <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-200 group-hover/meta:text-orange-400 transition-colors">{title}</Label>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => append("")}
                    className="h-9 w-9 p-0 rounded-2xl bg-white/5 hover:bg-orange-500 hover:text-white text-slate-400 transition-all shadow-sm border border-white/5"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>
            <CardContent className="p-7 pt-3 space-y-4">
                <AnimatePresence initial={false} mode="popLayout">
                    {fields.map((field, index) => (
                        <MetadataItem
                            key={field.id}
                            field={field}
                            index={index}
                            name={name}
                            title={title}
                            control={control}
                            register={register}
                            remove={remove}
                        />
                    ))}
                </AnimatePresence>
                {fields.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-10 border-2 border-dashed border-white/5 rounded-[1.5rem] text-center bg-black/20"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                <FileJson className="w-4 h-4 text-slate-600" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">No Data Stream</p>
                        </div>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}

function MetadataItem({ field, index, name, title, control, register, remove }: any) {
    const value = useWatch({ control, name: `${name}.${index}` });

    return (
        <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex gap-3 group/item relative"
        >
            <div className="flex-1 relative group/input">
                <div className="absolute inset-0 bg-orange-500/5 blur-xl rounded-full opacity-0 group-hover/input:opacity-100 transition-opacity" />
                <AuditPreview
                    content={value}
                    title={`AUDIT: ${title} Entry`}
                >
                    <Input
                        {...register(`${name}.${index}`)}
                        placeholder={`Masukkan ${title.toLowerCase()}...`}
                        className="bg-slate-950/60 border-slate-800/80 text-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 text-[13px] h-12 rounded-2xl pl-5 pr-12 hover:border-slate-700 transition-all font-bold placeholder:text-slate-700 shadow-inner relative z-10"
                    />
                </AuditPreview>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover/item:opacity-60 transition-opacity z-20">
                    <ChevronRight className="h-4 w-4 text-orange-500" />
                </div>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-2xl bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-500 border border-white/5 hover:border-red-500/30 transition-all flex-shrink-0"
                onClick={() => remove(index)}
            >
                <X className="h-5 w-5" />
            </Button>
        </motion.div>
    );
}
