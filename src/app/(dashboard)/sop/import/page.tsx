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
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                             <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0 rounded-full hover:bg-slate-200">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium">Kembali ke Dashboard</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            Import SOP dari Excel
                        </h1>
                        <p className="text-slate-500 max-w-2xl">
                            Ubah dokumen Excel SOP manual Anda menjadi Flowchart interaktif secara otomatis.
                        </p>
                    </div>
                    <Button variant="outline" onClick={downloadTemplate} className="gap-2 bg-white hover:bg-slate-50 border-slate-200 shadow-sm">
                        <Download className="h-4 w-4 text-emerald-600" />
                        Download Template Excel
                    </Button>
                </div>

                {/* Progress Steps */}
                <div className="relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 rounded-full z-0" />
                    <div className="relative z-10 flex justify-between max-w-3xl mx-auto">
                        {[
                            { step: 1, label: "Upload Excel", icon: Upload },
                            { step: 2, label: "Analisis Data", icon: FileSpreadsheet },
                            { step: 3, label: "Review & Judul", icon: CheckCircle2 },
                            { step: 4, label: "Selesai", icon: Save }
                        ].map((s) => (
                            <div key={s.step} className="flex flex-col items-center gap-2 bg-slate-50/50 px-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                    currentStep >= s.step 
                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                                        : "bg-white border-slate-300 text-slate-400"
                                )}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                                <span className={cn(
                                    "text-xs font-semibold transition-colors duration-300",
                                    currentStep >= s.step ? "text-blue-700" : "text-slate-400"
                                )}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {!importedData ? (
                        <motion.div 
                            key="upload-area"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-2xl mx-auto"
                        >
                            <Card className="border-2 border-dashed border-slate-300 shadow-xl shadow-slate-200/50 overflow-hidden">
                                <div 
                                    {...getRootProps()} 
                                    className={cn(
                                        "p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:bg-slate-50/80",
                                        isDragActive && "bg-blue-50/50 border-blue-400 scale-[1.02]",
                                        isParsing && "pointer-events-none opacity-50"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    
                                    {isParsing ? (
                                        <div className="flex flex-col items-center gap-4 py-8">
                                            <div className="relative">
                                                <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                                                <FileSpreadsheet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-semibold text-slate-900">Menganalisis Excel...</h3>
                                                <p className="text-slate-500">Sedang membaca struktur langkah dan pelaksana</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                                <FileUp className="h-10 w-10 text-blue-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                                {isDragActive ? "Lepaskan file disini" : "Drag & Drop file Excel"}
                                            </h3>
                                            <p className="text-slate-500 max-w-sm mb-8">
                                                atau klik area ini untuk memilih file dari komputer Anda. Pastikan menggunakan format template yang sesuai.
                                            </p>
                                            <Button size="lg" className="rounded-full px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                                                Pilih File .xlsx
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
                                <Card className="border-0 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
                                    <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b pb-6">
                                        <CardTitle className="flex items-center gap-2 text-xl">
                                            <Settings className="h-5 w-5 text-blue-600" />
                                            Konfigurasi SOP
                                        </CardTitle>
                                        <CardDescription>
                                            Lengkapi metadata sebelum menyimpan
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="title" className="text-slate-700 font-semibold">Judul SOP</Label>
                                                <Input
                                                    id="title"
                                                    placeholder="Contoh: Penanganan Kecelakaan Kapal"
                                                    value={sopTitle}
                                                    onChange={(e) => setSopTitle(e.target.value)}
                                                    className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="unit" className="text-slate-700 font-semibold">Unit Kerja</Label>
                                                <Input
                                                    id="unit"
                                                    value={unitKerja}
                                                    onChange={(e) => setUnitKerja(e.target.value)}
                                                    className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-200"
                                                />
                                            </div>
                                            
                                            <div className="bg-blue-50 rounded-lg p-4 flex gap-3 items-start border border-blue-100">
                                                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                                <div className="text-sm text-blue-800">
                                                    <p className="font-semibold mb-1">Info Import:</p>
                                                    <ul className="list-disc list-inside space-y-1 opacity-90">
                                                        <li>Total Langkah: {importedData.length}</li>
                                                        <li>File: {file?.name}</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <Button 
                                                onClick={handleSave} 
                                                disabled={isSaving || !sopTitle} 
                                                size="lg"
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 h-12 text-base"
                                            >
                                                {isSaving ? (
                                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Menyimpan...</>
                                                ) : (
                                                    <><Save className="mr-2 h-5 w-5" /> Simpan & Generate Flowchart</>
                                                )}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                onClick={resetImport}
                                                className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Batal & Upload Ulang
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Preview Panel */}
                            <div className="lg:col-span-2">
                                <Card className="h-full border-0 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200 flex flex-col">
                                    <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b pb-6 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-xl">
                                                <PlayCircle className="h-5 w-5 text-blue-600" />
                                                Preview Hasil Import
                                            </CardTitle>
                                            <CardDescription>
                                                Visualisasi flowchart dari data Excel yang diupload
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Valid
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1 bg-slate-50/50 min-h-[600px] relative">
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
