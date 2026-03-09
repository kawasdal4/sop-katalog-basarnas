"use client"

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, Loader2, Save, Trash2, ArrowLeft, CheckCircle2, FileUp, AlertCircle, PlayCircle, Settings, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import SopFlowchart from '@/components/sop-builder/SopFlowchart';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function ImportSopPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [importedData, setImportedData] = useState<any[] | null>(null);
    const [detectedLanes, setDetectedLanes] = useState<string[] | null>(null);
    const [sopTitle, setSopTitle] = useState('');
    const [unitKerja, setUnitKerja] = useState('Direktorat Kesiapsiagaan');
    const [currentStep, setCurrentStep] = useState(1);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            const selectedFile = acceptedFiles[0];
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error("File terlalu besar (maks 10MB)");
                return;
            }
            setFile(selectedFile);
            // Auto parse on drop
            handleParse(selectedFile);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        maxFiles: 1
    });

    const handleParse = async (fileToParse: File) => {
        setIsParsing(true);
        setCurrentStep(2);
        const formData = new FormData();
        formData.append('file', fileToParse);

        try {
            const res = await fetch('/api/sop-builder/import', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (result.success) {
                setImportedData(result.data.langkahLangkah);
                setDetectedLanes(result.data.lanes);
                setCurrentStep(3);
                toast.success("Excel berhasil dibaca! Silakan periksa preview di bawah.");
            } else {
                toast.error(result.error || "Gagal membaca file");
                setCurrentStep(1);
                setFile(null);
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem saat membaca file");
            setCurrentStep(1);
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleSave = async () => {
        if (!importedData || !sopTitle) {
            toast.error("Mohon isi judul SOP dan pastikan data sudah diimport");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/sop-builder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    judul: sopTitle,
                    nomorSop: `IMP-${Date.now().toString().slice(-6)}`,
                    tanggalPembuatan: new Date().toISOString(),
                    langkahLangkah: importedData,
                    unitKerja: unitKerja, // Added unit kerja
                    pelaksanaLanes: detectedLanes // Pass detected lanes to create SOP (renamed from lanes)
                })
            });

            const result = await res.json();
            if (res.ok) {
                setCurrentStep(4);
                toast.success("SOP Berhasil diimport dan disimpan!");
                // Gunakan result.data.id jika struktur responsenya { success: true, data: { id: ... } }
                const newSopId = result.data?.id || result.id;

                if (newSopId) {
                    setTimeout(() => {
                        router.push(`/sop/buat/${newSopId}/flowchart`);
                    }, 1000);
                } else {
                    console.error("No ID returned from create API", result);
                    toast.error("SOP tersimpan tapi gagal redirect (ID hilang)");
                }
            } else {
                toast.error(result.error || "Gagal menyimpan SOP");
            }
        } catch (err) {
            toast.error("Kesalahan koneksi saat menyimpan");
        } finally {
            setIsSaving(false);
        }
    };

    const downloadTemplate = () => {
        window.open('/api/sop-builder/import/template', '_blank');
    };

    const resetImport = () => {
        setFile(null);
        setImportedData(null);
        setDetectedLanes(null);
        setCurrentStep(1);
        setSopTitle('');
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden relative font-sans">
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
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"
                />

                {/* Global Tactical Scanline */}
                <motion.div
                    animate={{ y: ['0%', '100%'], opacity: [0, 0.2, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none z-[1]"
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-12">

                {/* Command Center Header */}
                <div className="group relative z-20">
                    <div className="absolute inset-x-0 -bottom-4 h-24 bg-gradient-to-t from-blue-500/10 via-blue-500/5 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                    <div className="bg-[#0b1120]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden relative border-t-blue-500/50">
                        {/* Industrial Detail Lines */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                        <div className="absolute top-0 left-10 w-20 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />

                        {/* Holographic Scanning Line Animation */}
                        <motion.div
                            className="absolute inset-y-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"
                            animate={{ x: ['0%', '1000%'] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        />

                        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.back()}
                                    className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-blue-500/20 text-white hover:text-blue-500 border border-white/10 group-hover:border-blue-500/30 transition-all shadow-inner shrink-0"
                                >
                                    <ArrowLeft className="h-6 w-6" />
                                </Button>
                            </motion.div>

                            <div className="h-12 w-[1px] bg-white/10 hidden md:block" />

                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Katalog SOP Basarnas</span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                                    Import SOP Excel
                                    <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-500/30">
                                        V3.0 Beta
                                    </span>
                                </h1>
                                <p className="text-slate-400 mt-1 max-w-xl text-sm leading-relaxed">
                                    Transformasi dokumen Excel SOP manual Anda menjadi Flowchart Taktis interaktif secara otomatis melalui modul kompilasi Quantum.
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 shrink-0">
                            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                    onClick={downloadTemplate}
                                    className="h-14 bg-gradient-to-r from-emerald-600/20 to-emerald-900/40 hover:from-emerald-600/40 hover:to-emerald-800/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-2xl px-6 font-bold tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all group/dl"
                                >
                                    <Download className="h-5 w-5 mr-3 group-hover/dl:-translate-y-1 transition-transform" />
                                    Download Template
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="relative mb-8">
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-800/50 -translate-y-1/2 z-0" />
                    <div className="absolute top-1/2 left-0 h-[2px] bg-blue-500/50 -translate-y-1/2 z-0 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${((currentStep - 1) / 3) * 100}%` }} />
                    <div className="relative z-10 flex justify-between max-w-3xl mx-auto">
                        {[
                            { step: 1, label: "Upload Excel", icon: Upload },
                            { step: 2, label: "Analisis Data", icon: FileSpreadsheet },
                            { step: 3, label: "Konfigurasi", icon: Settings },
                            { step: 4, label: "Selesai", icon: CheckCircle2 }
                        ].map((s) => (
                            <div key={s.step} className="flex flex-col items-center gap-3 bg-[#0b1120] px-4 rounded-full">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 relative group",
                                    currentStep >= s.step
                                        ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                                        : "bg-slate-900/50 border-slate-700 text-slate-500"
                                )}>
                                    <s.icon className={cn("h-5 w-5", currentStep >= s.step && "animate-pulse")} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest transition-colors duration-300",
                                    currentStep >= s.step ? "text-blue-400" : "text-slate-500"
                                )}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {!importedData ? (
                        <motion.div
                            key="upload-area"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-2xl mx-auto"
                        >
                            <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800/50 rounded-[2rem] overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 relative">
                                <div className="absolute inset-0 bg-blue-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                <div
                                    {...getRootProps()}
                                    className={cn(
                                        "p-12 pb-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-500 relative z-10 border-2 border-dashed border-transparent hover:border-blue-500/20 m-4 rounded-[1.5rem]",
                                        isDragActive && "bg-blue-500/10 border-blue-400 scale-[1.02]",
                                        isParsing && "pointer-events-none opacity-50"
                                    )}
                                >
                                    <input {...getInputProps()} />

                                    {isParsing ? (
                                        <div className="flex flex-col items-center gap-6 py-10">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                                                <div className="w-20 h-20 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)] relative z-10" />
                                                <Settings className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-blue-400 animate-pulse z-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                                                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                                                    Quantum Data Parsing
                                                </h3>
                                                <p className="text-slate-400 text-sm">Mengekstrak struktur logika matriks SOP...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-white/5 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-blue-500/10 transition-all duration-500">
                                                <FileUp className="h-12 w-12 text-slate-400 group-hover:text-blue-400 transition-colors duration-500" />
                                            </div>
                                            <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                                                {isDragActive ? "Inisialisasi Transfer Data" : "Drag & Drop File SOP"}
                                            </h3>
                                            <p className="text-slate-400 max-w-sm mb-10 text-sm">
                                                Gunakan format template standar `*.xlsx` untuk importasi data struktur SOP secara otomatis.
                                            </p>
                                            <Button
                                                size="lg"
                                                className="h-14 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] rounded-2xl px-8 font-bold tracking-wide transition-all border border-blue-400/20"
                                            >
                                                Jelajahi Direktori
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview-area"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            {/* Configuration Panel */}
                            <div className="lg:col-span-1 space-y-6">
                                <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800/50 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 relative overflow-hidden group/config">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none" />
                                    <CardHeader className="border-b border-white/5 pb-6">
                                        <CardTitle className="flex items-center gap-3 text-xl text-white">
                                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                                <Settings className="h-5 w-5 text-blue-400 group-hover/config:rotate-90 transition-transform duration-700" />
                                            </div>
                                            Konfigurasi SOP
                                        </CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Lengkapi metadata sebelum menyimpan
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-6 relative z-10">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="title" className="text-slate-300 font-bold text-[11px] uppercase tracking-widest">Judul SOP</Label>
                                                <Input
                                                    id="title"
                                                    placeholder="Contoh: Penanganan Kecelakaan Kapal"
                                                    value={sopTitle}
                                                    onChange={(e) => setSopTitle(e.target.value)}
                                                    className="bg-slate-950/60 border-slate-800/80 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 h-12 rounded-2xl px-5 hover:border-slate-700 transition-all placeholder:text-slate-700 shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="unit" className="text-slate-300 font-bold text-[11px] uppercase tracking-widest">Unit Kerja</Label>
                                                <Input
                                                    id="unit"
                                                    value={unitKerja}
                                                    onChange={(e) => setUnitKerja(e.target.value)}
                                                    className="bg-slate-950/60 border-slate-800/80 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 h-12 rounded-2xl px-5 hover:border-slate-700 transition-all placeholder:text-slate-700 shadow-inner"
                                                />
                                            </div>

                                            <div className="bg-blue-900/10 rounded-2xl p-5 flex gap-4 items-start border border-blue-500/20 shadow-inner relative overflow-hidden group/info">
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity" />
                                                <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                                                <div className="text-sm text-slate-300 relative z-10">
                                                    <p className="font-bold text-blue-400 mb-2 text-[11px] uppercase tracking-widest">Diagnostic Info</p>
                                                    <ul className="space-y-1.5 opacity-90 text-xs">
                                                        <li className="flex justify-between border-b border-white/5 pb-1">
                                                            <span className="text-slate-500">Total Langkah:</span>
                                                            <span className="font-bold text-white">{importedData.length}</span>
                                                        </li>
                                                        <li className="flex justify-between pt-1">
                                                            <span className="text-slate-500">File Source:</span>
                                                            <span className="font-bold text-white truncate max-w-[120px]">{file?.name}</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <Button
                                                onClick={handleSave}
                                                disabled={isSaving || !sopTitle}
                                                size="lg"
                                                className="w-full h-14 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white rounded-[1.2rem] px-8 font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.5)] border border-blue-400/20 transition-all"
                                            >
                                                {isSaving ? (
                                                    <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Merekam Data...</>
                                                ) : (
                                                    <><Save className="mr-3 h-5 w-5" /> Simpan & Buat Flowchart</>
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={resetImport}
                                                className="w-full h-12 bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-[1.2rem] font-bold text-[11px] uppercase tracking-[0.1em] border border-red-500/20 transition-all"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Batalkan Transfer
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Preview Panel */}
                            <div className="lg:col-span-2">
                                <Card className="h-full bg-slate-900/40 backdrop-blur-xl border-slate-800/50 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 relative overflow-hidden flex flex-col group/preview">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] pointer-events-none" />
                                    <CardHeader className="border-b border-white/5 pb-6 flex flex-row items-center justify-between z-10">
                                        <div>
                                            <CardTitle className="flex items-center gap-3 text-xl text-white">
                                                <div className="p-2 bg-emerald-500/20 rounded-xl">
                                                    <PlayCircle className="h-5 w-5 text-emerald-400 group-hover/preview:scale-110 transition-transform duration-500" />
                                                </div>
                                                Visualisasi Flowchart
                                            </CardTitle>
                                            <CardDescription className="text-slate-400 mt-1">
                                                Pratinjau otomatis dari struktur data Excel yang di-upload
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                                Data Valid
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1 bg-[#090e1a]/80 min-h-[600px] relative z-0">
                                        {/* Micro-grid overlay for the preview area */}
                                        <div
                                            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen"
                                            style={{
                                                backgroundImage: `linear-gradient(to right, #64748b 1px, transparent 1px), linear-gradient(to bottom, #64748b 1px, transparent 1px)`,
                                                backgroundSize: '20px 20px'
                                            }}
                                        />
                                        <div className="absolute inset-0 overflow-hidden">
                                            <SopFlowchart sopData={{
                                                langkahLangkah: importedData,
                                                unitKerja: unitKerja, // Pass unit kerja to flowchart preview
                                                pelaksana: detectedLanes // Pass custom lanes to flowchart preview
                                            }} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
