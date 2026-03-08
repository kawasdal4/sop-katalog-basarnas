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
        nomorSop: `SOP-${Math.floor(100 + Math.random() * 900)}/DIT.SIAGA/VI/BSN/2026`,
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Command Center Header */}
            <div className="sticky top-0 z-50 mb-8">
                <div className="bg-[#0b1120] border-b border-orange-500/30 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)] overflow-hidden relative">
                    {/* Industrial Detail */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

                    <div className="flex items-center gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-2xl hover:bg-orange-500/10 hover:text-orange-500 text-white"
                            onClick={() => router.push('/?tab=buat-sop-baru')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="h-10 w-[2px] bg-slate-800 hidden md:block" />
                        <div className="flex flex-col">
                            <ShimmerTitle subtitle="Automated Flowchart Engine">
                                Buat SOP Baru
                            </ShimmerTitle>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                const exampleData = {
                                    judul: "SOP Penanganan Berita Pencarian dan Pertolongan di BCC",
                                    unitKerja: "Direktorat Kesiapsiagaan (BCC)",
                                    nomorSop: "SOP-01/DIT.SIAGA/VI/BSN/2026",
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
                                        { aktivitas: "Meneruskan berita ke Pengawas Siaga untuk tindak lanjut", pelaksana: "Petugas Komunikasi", stepType: "process" as const, mutuBakuKelengkapan: "Format Laporan", mutuBakuWaktu: "5 mnt", mutuBakuOutput: "Laporan Diteruskan", keterangan: "-" },
                                        { aktivitas: "Selesai", pelaksana: "Petugas Komunikasi", stepType: "end" as const, mutuBakuKelengkapan: "-", mutuBakuWaktu: "-", mutuBakuOutput: "-", keterangan: "-" }
                                    ]
                                };
                                reset(exampleData);
                                toast.success("Form diisi dengan data contoh!");
                            }}
                            className="btn-sar bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl px-6 py-6 h-auto font-black uppercase tracking-tighter text-sm border border-slate-700"
                        >
                            <Zap className="mr-2 h-4 w-4 text-amber-500" />
                            Isi Contoh
                        </Button>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-sar bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-8 py-6 h-auto font-black uppercase tracking-tighter text-sm shadow-[0_8px_20px_rgba(234,88,12,0.3)] border-t border-orange-400/30"
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {initialData ? 'Update SOP' : 'Deploy SOP'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Modular Sidebar Navigation */}
                <div className="lg:col-span-3 space-y-2 sticky top-32">
                    {[
                        { id: 'info', label: 'Informasi Umum', icon: Info, count: 1 },
                        { id: 'metadata', label: 'Metadata & Atribut', icon: FileJson, count: 2 },
                        { id: 'langkah', label: 'Langkah-langkah', icon: Activity, count: 3 }
                    ].map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => setActiveSection(section.id as any)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group border ${activeSection === section.id
                                ? 'bg-[#1e293b] border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                                : 'bg-[#0f172a] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-colors ${activeSection === section.id ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-800 group-hover:text-slate-300'
                                    }`}>
                                    <section.icon className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className={`text-xs font-black uppercase tracking-wider ${activeSection === section.id ? 'text-white' : ''}`}>{section.label}</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">SUB-SECTION 0{section.count}</p>
                                </div>
                            </div>
                            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${activeSection === section.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`} />
                        </button>
                    ))}

                    <div className="bg-[#0f172a] border border-slate-800 mt-8 p-4 rounded-2xl shadow-lg border-t-2 border-t-blue-500/50">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                <Shield className="h-4 w-4 text-blue-400" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-tighter text-slate-100 italic">Basarnas Cloud Sync</p>
                        </div>
                        <div className="space-y-2">
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                    animate={{ width: ['0%', '100%'] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                />
                            </div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Auto-saving local changes...</p>
                        </div>
                    </div>
                </div>

                {/* Main Form Content */}
                <div className="lg:col-span-9">
                    <AnimatePresence mode="wait">
                        {activeSection === 'info' && (
                            <motion.div
                                key="info"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <Card className="bg-[#0f172a] border-slate-800 rounded-[1.5rem] overflow-hidden shadow-2xl border-t-2 border-t-orange-500">
                                    <CardHeader className="bg-[#1e293b]/50 border-b border-slate-800 p-8 pb-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-3 bg-orange-500/10 rounded-2xl">
                                                <Info className="h-6 w-6 text-orange-500" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter">Informasi Dasar</CardTitle>
                                                <CardDescription className="text-slate-400 font-medium">Lengkapi metadata utama Standar Operasional Prosedur.</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-black uppercase tracking-widest text-orange-500">Judul SOP</Label>
                                                <Input
                                                    {...register("judul")}
                                                    placeholder="Cth: SOP Penanganan Berita Pencarian dan Pertolongan di BCC"
                                                    className={`bg-[#1e293b] rounded-xl h-14 px-6 transition-all text-lg font-bold placeholder:text-slate-500 focus:ring-orange-500/20 focus:border-orange-500 text-white ${watch("judul") ? "border-orange-500/50" : "border-slate-700"}`}
                                                />
                                                {errors.judul && <p className="text-xs text-red-400 font-bold">{errors.judul.message}</p>}
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-black uppercase tracking-widest text-orange-500">Unit Kerja</Label>
                                                <Input
                                                    {...register("unitKerja")}
                                                    placeholder="Cth: Direktorat Kesiapsiagaan"
                                                    className={`bg-[#1e293b] rounded-xl h-14 px-6 transition-all font-bold placeholder:text-slate-500 focus:ring-orange-500/20 focus:border-orange-500 text-lg text-white ${watch("unitKerja") ? "border-orange-500/50" : "border-slate-700"}`}
                                                />
                                                {errors.unitKerja && <p className="text-xs text-red-400 font-bold">{errors.unitKerja.message}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-black uppercase tracking-widest text-orange-500">Nomor SOP</Label>
                                                <AuditPreview content={watch("nomorSop")} title="AUDIT: Nomor SOP">
                                                    <div className="relative group/id">
                                                        <Input
                                                            {...register("nomorSop")}
                                                            placeholder="Cth: SOP.07/DIT.SIAGA/VI/2026"
                                                            className={`bg-[#1e293b] rounded-xl h-12 px-5 pr-12 transition-all font-mono placeholder:text-slate-500 focus:border-orange-500 text-white ${watch("nomorSop") ? "border-orange-500/50" : "border-slate-700"}`}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 h-8 w-8 rounded-lg shadow-[0_0_10px_rgba(234,88,12,0.2)] transition-all animate-in fade-in zoom-in duration-500"
                                                            onClick={() => {
                                                                const randomPart = Math.floor(100 + Math.random() * 900).toString()
                                                                setValue("nomorSop", `SOP-${randomPart}/DIT.SIAGA/VI/BSN/2026`)
                                                                toast.success("Nomor SOP baru dibuat")
                                                            }}
                                                            title="Generate Unique Number"
                                                        >
                                                            <RefreshCw className="h-4 w-4 animate-[spin_3s_linear_infinite]" />
                                                        </Button>
                                                    </div>
                                                </AuditPreview>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-black uppercase tracking-widest text-orange-500">Tanggal Efektif</Label>
                                                <Input type="date" {...register("tanggalEfektif")} className={`bg-[#1e293b] rounded-xl h-12 px-5 transition-all invert brightness-200 focus:border-orange-500 text-white ${watch("tanggalEfektif") ? "border-orange-500/50" : "border-slate-700"}`} />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-black uppercase tracking-widest text-orange-500">Revisi</Label>
                                                <Input {...register("revisi")} className="bg-[#1e293b] border-slate-700 text-white rounded-xl h-12 px-5 transition-all w-24 text-center font-black focus:border-orange-500" />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-xs font-black uppercase tracking-widest text-orange-500">Disahkan Oleh</Label>
                                            <AuditPreview content={watch("disahkanOleh")} title="AUDIT: Pengesahan">
                                                <Input {...register("disahkanOleh")} className={`bg-[#1e293b] rounded-xl h-12 px-5 transition-all font-bold placeholder:text-slate-500 focus:border-orange-500 text-lg text-white ${watch("disahkanOleh") ? "border-orange-500/50" : "border-slate-700"}`} placeholder="Cth: Direktur Kesiapsiagaan" />
                                            </AuditPreview>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {activeSection === 'metadata' && (
                            <motion.div
                                key="metadata"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex items-center justify-between mb-10 overflow-hidden relative group/metaheader">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
                                    {/* Advanced Glow */}
                                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none group-hover/metaheader:bg-orange-500/10 transition-all duration-1000" />
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-inner group-hover/metaheader:scale-105 transition-transform duration-500">
                                            <FileJson className="h-7 w-7 text-orange-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white tracking-tight uppercase group-hover/metaheader:tracking-[0.05em] transition-all duration-500">Intelligence <span className="text-orange-500">&</span> Attributes</h2>
                                            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                Operational Metadata Cluster • V4.0.0
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center gap-8 relative z-10">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Integrity Hash</p>
                                            <div className="flex items-center gap-2 justify-end mt-0.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                                <p className="text-[10px] text-emerald-400 font-black tracking-tighter">SECURE.SYNC</p>
                                            </div>
                                        </div>
                                        <div className="h-10 w-px bg-white/5" />
                                        <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                            <Settings className="h-5 w-5 text-slate-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-6">
                                        <MetadataPointList title="Dasar Hukum" name="dasarHukum" control={control} register={register} />
                                        <MetadataPointList title="Peralatan" name="peralatanPerlengkapan" control={control} register={register} />
                                    </div>
                                    <div className="space-y-6">
                                        <MetadataPointList title="Keterkaitan" name="keterkaitan" control={control} register={register} />
                                        <MetadataPointList title="Kualifikasi" name="kualifikasiPelaksana" control={control} register={register} />
                                    </div>
                                    <div className="space-y-6">
                                        <MetadataPointList title="Peringatan" name="peringatan" control={control} register={register} />
                                        <MetadataPointList title="Pencatatan" name="pencatatanPendataan" control={control} register={register} />
                                    </div>
                                </div>

                                <Card className="bg-[#0f172a] border-slate-800 rounded-[2rem] overflow-hidden border-t-2 border-t-orange-500 shadow-2xl">
                                    <CardHeader className="bg-[#1e293b]/50 p-8 pb-6 border-b border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                                                <Users className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter">Struktur Pelaksana</CardTitle>
                                                <CardDescription className="text-slate-200 font-medium">Tentukan aktor yang terlibat dalam proses bisnis ini (Lanes di Flowchart).</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-10">
                                        <div className="flex flex-wrap gap-4">
                                            <AnimatePresence mode="popLayout">
                                                {watch("pelaksanaLanes")?.map((lane, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
                                                        className="group/lane relative flex items-center gap-3 bg-slate-900/60 border border-white/5 rounded-2xl px-6 py-4 transition-all hover:bg-orange-500/10 hover:border-orange-500/40 shadow-2xl overflow-hidden active:scale-95"
                                                    >
                                                        <div className="h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse" />
                                                        <span className="text-xs font-black text-white uppercase tracking-[0.15em]">{lane}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-xl hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-all opacity-40 group-hover/lane:opacity-100"
                                                            onClick={() => {
                                                                const current = watch("pelaksanaLanes");
                                                                setValue("pelaksanaLanes", current.filter((_, i) => i !== idx));
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                        {/* Animated background glow */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover/lane:opacity-100 -translate-x-full group-hover/lane:translate-x-full transition-all duration-1000" />
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="rounded-2xl border-dashed border-2 bg-slate-950/40 border-slate-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/10 py-10 h-auto w-56 transition-all group/add shadow-xl"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 group-hover/add:bg-orange-500 group-hover/add:text-white transition-all shadow-inner">
                                                            <Plus className="h-6 w-6 group-hover/add:rotate-90 transition-transform duration-500" />
                                                        </div>
                                                        <span className="font-black uppercase tracking-[0.2em] text-[11px]">Deploy Unit</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[320px] p-6 bg-[#0f172a] border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl">
                                                    <div className="space-y-4">
                                                        <div className="space-y-3">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-200">Unit Name</Label>
                                                            <div className="flex gap-2">
                                                                <Input id="new-lane-name" placeholder="Rescuer..." className="bg-white/5 border-white/10 text-white rounded-xl h-11" />
                                                                <Button
                                                                    type="button"
                                                                    className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl"
                                                                    onClick={() => {
                                                                        const name = (document.getElementById('new-lane-name') as HTMLInputElement).value;
                                                                        if (name) {
                                                                            const current = watch("pelaksanaLanes") || [];
                                                                            setValue("pelaksanaLanes", [...current, name]);
                                                                            (document.getElementById('new-lane-name') as HTMLInputElement).value = "";
                                                                        }
                                                                    }}
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3 pt-4 border-t border-white/5">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-200">Quick Select:</Label>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {PELAKSANA_OPTIONS.filter(opt => !watch("pelaksanaLanes")?.includes(opt)).map(opt => (
                                                                    <Button
                                                                        key={opt}
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        className="text-[9px] h-7 bg-white/5 border-white/5 text-slate-100 hover:bg-white/10 hover:text-white rounded-lg transition-all"
                                                                        onClick={() => {
                                                                            const current = watch("pelaksanaLanes") || [];
                                                                            setValue("pelaksanaLanes", [...current, opt]);
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
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <Card className="bg-[#0f172a] border-slate-800 rounded-[2rem] overflow-hidden border-t-2 border-t-orange-500 shadow-2xl">
                                    <CardHeader className="bg-[#1e293b]/50 p-8 pb-6 border-b border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                                                <Activity className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter">Eksekusi Prosedur</CardTitle>
                                                <CardDescription className="text-slate-400 font-medium">Definisikan setiap urutan langkah untuk di-generate menjadi flowchart otomatis.</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="hidden lg:grid grid-cols-12 gap-2 p-6 bg-slate-900/60 backdrop-blur-3xl border-b border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center relative overflow-hidden group/header">
                                            {/* Advanced Scanning Line */}
                                            <motion.div
                                                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent pointer-events-none"
                                                animate={{ x: ['-100%', '300%'] }}
                                                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                            />
                                            <div className="col-span-1 flex items-center justify-center">
                                                <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 shadow-inner">ID</div>
                                            </div>
                                            <div className="col-span-3">Aktivitas & Logika</div>
                                            <div className="col-span-2">Pelaksana</div>
                                            <div className="col-span-2">Kelengkapan</div>
                                            <div className="col-span-1">Waktu</div>
                                            <div className="col-span-1">Output</div>
                                            <div className="col-span-2">Keterangan</div>
                                        </div>

                                        <div className="divide-y divide-white/5 bg-[#0f172a]/80 backdrop-blur-md">
                                            <AnimatePresence initial={false} mode="popLayout">
                                                {fields.map((field, index) => (
                                                    <motion.div
                                                        key={field.id}
                                                        initial={{ opacity: 0, x: -20, scale: 0.98 }}
                                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                                                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                                                        className="relative p-6 flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start group hover:bg-orange-500/[0.04] transition-all duration-300 leading-relaxed border-b border-white/5"
                                                    >
                                                        {/* Row Counter & Sort */}
                                                        <div className="col-span-1 flex flex-row lg:flex-col items-center gap-3 h-full lg:border-r border-white/10 pr-4">
                                                            <div className="relative">
                                                                <span className="font-black text-3xl text-slate-800 group-hover:text-orange-500 transition-all duration-500 group-hover:scale-110 block">
                                                                    {(index + 1).toString().padStart(2, '0')}
                                                                </span>
                                                                <div className="absolute -inset-2 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                            </div>
                                                            <div className="flex lg:flex-col gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-xl bg-white/5 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 border border-white/5 transition-all"
                                                                    disabled={index === 0}
                                                                    onClick={() => move(index, index - 1)}
                                                                >
                                                                    <ArrowUp className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-500 border border-white/5 transition-all"
                                                                    onClick={() => remove(index)}
                                                                    disabled={fields.length === 1}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-xl bg-white/5 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 border border-white/5 transition-all"
                                                                    disabled={index === fields.length - 1}
                                                                    onClick={() => move(index, index + 1)}
                                                                >
                                                                    <ArrowDown className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-3 space-y-4 w-full">
                                                            <AuditPreview content={watch(`langkahLangkah.${index}.aktivitas`)} title={`AUDIT: Langkah ${index + 1}`}>
                                                                <Textarea
                                                                    {...register(`langkahLangkah.${index}.aktivitas`)}
                                                                    placeholder="Deskripsikan langkah operasional..."
                                                                    className="bg-slate-900/60 border-slate-700/50 text-white rounded-2xl min-h-[120px] font-bold text-sm focus:border-orange-500 shadow-inner placeholder:text-slate-600 transition-all focus:ring-2 focus:ring-orange-500/10"
                                                                />
                                                            </AuditPreview>

                                                            <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-4 relative overflow-hidden group/logic">
                                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover/logic:opacity-100 transition-opacity" />
                                                                <div className="flex items-center justify-between relative z-10">
                                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Shape Logic:</Label>
                                                                    <Select
                                                                        value={watch(`langkahLangkah.${index}.stepType`)}
                                                                        onValueChange={(val: any) => setValue(`langkahLangkah.${index}.stepType`, val)}
                                                                    >
                                                                        <SelectTrigger className="h-9 text-[10px] w-[140px] bg-slate-800/80 border-slate-700 rounded-xl focus:ring-orange-500/50 text-white font-black uppercase tracking-widest">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-slate-900 text-white border-slate-800 rounded-2xl p-2 shadow-2xl">
                                                                            <SelectItem value="start" className="rounded-lg focus:bg-emerald-500/20">Mulai (Start)</SelectItem>
                                                                            <SelectItem value="process" className="rounded-lg focus:bg-indigo-500/20">Proses (Process)</SelectItem>
                                                                            <SelectItem value="decision" className="rounded-lg focus:bg-amber-500/20 text-amber-400">Keputusan (Decision)</SelectItem>
                                                                            <SelectItem value="document" className="rounded-lg focus:bg-blue-500/20">Dokumen</SelectItem>
                                                                            <SelectItem value="input_output" className="rounded-lg focus:bg-purple-500/20">Input/Output</SelectItem>
                                                                            <SelectItem value="end" className="rounded-lg focus:bg-red-500/20">Selesai (End)</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {watch(`langkahLangkah.${index}.stepType`) === 'decision' && (
                                                                    <div className="grid grid-cols-2 gap-4 pt-2 relative z-10 animate-in slide-in-from-top-2 duration-300">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">YES (Skip to ID)</Label>
                                                                            <Input type="number" {...register(`langkahLangkah.${index}.nextStepYes`)} className="h-9 bg-slate-800/50 border-emerald-500/30 text-emerald-400 text-xs rounded-xl focus:border-emerald-500 transition-all font-mono" />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">NO (Skip to ID)</Label>
                                                                            <Input type="number" {...register(`langkahLangkah.${index}.nextStepNo`)} className="h-9 bg-slate-800/50 border-rose-500/30 text-rose-400 text-xs rounded-xl focus:border-rose-500 transition-all font-mono" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2 space-y-3 w-full">
                                                            <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                <div className="w-1 h-3 bg-orange-500 rounded-full" />
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Pelaksana</Label>
                                                            </div>
                                                            <Select
                                                                value={watch(`langkahLangkah.${index}.pelaksana`)}
                                                                onValueChange={(val: any) => setValue(`langkahLangkah.${index}.pelaksana`, val, { shouldValidate: true })}
                                                            >
                                                                <SelectTrigger className={`h-12 bg-slate-900/40 border-slate-700/50 text-white rounded-2xl shadow-sm transition-all focus:ring-orange-500/20 ${errors?.langkahLangkah?.[index]?.pelaksana ? "border-red-500/50" : "focus:border-orange-500"}`}>
                                                                    <SelectValue placeholder="Pilih..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-slate-950 text-white border-white/10 rounded-2xl p-2">
                                                                    {watch("pelaksanaLanes")?.map((lane) => (
                                                                        <SelectItem key={lane} value={lane} className="rounded-lg focus:bg-orange-500/20 focus:text-white">{lane}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="col-span-2 w-full space-y-2">
                                                            <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Kelengkapan</Label>
                                                            </div>
                                                            <AuditPreview content={watch(`langkahLangkah.${index}.mutuBakuKelengkapan`)} title="AUDIT: Kelengkapan">
                                                                <Textarea {...register(`langkahLangkah.${index}.mutuBakuKelengkapan`)} placeholder="Peralatan..." className="bg-slate-900/40 border-slate-700/50 text-white rounded-2xl min-h-[90px] text-xs focus:border-indigo-500 placeholder:text-slate-600 transition-all shadow-inner" />
                                                            </AuditPreview>
                                                        </div>

                                                        <div className="col-span-1 w-full space-y-2">
                                                            <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Waktu</Label>
                                                            </div>
                                                            <AuditPreview content={watch(`langkahLangkah.${index}.mutuBakuWaktu`)} title="AUDIT: Waktu">
                                                                <Input {...register(`langkahLangkah.${index}.mutuBakuWaktu`)} placeholder="Durasi..." className="bg-slate-900/40 border-slate-700/50 text-white rounded-2xl h-12 text-xs px-4 focus:border-blue-500 placeholder:text-slate-600 transition-all" />
                                                            </AuditPreview>
                                                        </div>

                                                        <div className="col-span-1 w-full space-y-2">
                                                            <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Output</Label>
                                                            </div>
                                                            <AuditPreview content={watch(`langkahLangkah.${index}.mutuBakuOutput`)} title="AUDIT: Output">
                                                                <Input {...register(`langkahLangkah.${index}.mutuBakuOutput`)} placeholder="Hasil..." className="bg-slate-900/40 border-slate-700/50 text-white rounded-2xl h-12 text-xs px-4 focus:border-emerald-500 placeholder:text-slate-600 transition-all" />
                                                            </AuditPreview>
                                                        </div>

                                                        <div className="col-span-2 w-full space-y-2">
                                                            <div className="flex items-center gap-2 mb-2 lg:hidden">
                                                                <div className="w-1 h-3 bg-purple-500 rounded-full" />
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-100">Keterangan</Label>
                                                            </div>
                                                            <AuditPreview content={watch(`langkahLangkah.${index}.keterangan`)} title="AUDIT: Keterangan">
                                                                <Textarea {...register(`langkahLangkah.${index}.keterangan`)} placeholder="Catatan tambahan..." className="bg-slate-900/40 border-slate-700/50 text-white rounded-2xl min-h-[90px] text-xs focus:border-purple-500 placeholder:text-slate-600 transition-all shadow-inner" />
                                                            </AuditPreview>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>

                                        <div className="p-10 bg-black/60 border-t border-white/10 flex justify-center relative overflow-hidden">
                                            {/* Cosmic background glow */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="relative z-10"
                                            >
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => append({ aktivitas: "", pelaksana: "", stepType: "process", mutuBakuKelengkapan: "", mutuBakuWaktu: "", mutuBakuOutput: "", keterangan: "" })}
                                                    className="rounded-[2rem] border-dashed border-2 bg-slate-900 hover:bg-orange-500/10 border-slate-700 hover:border-orange-500 text-slate-300 hover:text-orange-500 py-8 px-16 group/addstep transition-all duration-500 shadow-2xl hover:shadow-orange-500/20"
                                                >
                                                    <div className="p-3 bg-white/5 rounded-2xl mr-4 group-hover/addstep:bg-orange-500 group-hover/addstep:text-white transition-all shadow-inner">
                                                        <Plus className="h-6 w-6 group-hover/addstep:rotate-90 transition-transform duration-500" />
                                                    </div>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="font-black uppercase tracking-[0.2em] text-sm">Add Prosedur Block</span>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Procedural Matrix v4.2</p>
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
