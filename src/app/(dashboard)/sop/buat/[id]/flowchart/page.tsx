"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, FileSpreadsheet, FileCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import SopFlowchart from "@/components/sop-builder/SopFlowchart"

export default function FlowchartPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()

    // In Next.js 15, page params are a Promise that must be unwrapped
    const resolvedParams = use(params)
    const id = resolvedParams.id

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isGeneratingCover, setIsGeneratingCover] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        async function fetchData() {
            if (!id) return;
            try {
                const res = await fetch(`/api/sop-builder/${id}`, {
                    credentials: 'include'
                })
                if (!res.ok) {
                    let errorMessage = "SOP tidak ditemukan";
                    try {
                        const errData = await res.json();
                        errorMessage = errData.error || errData.message || `Error ${res.status}: ${res.statusText}`;
                    } catch {
                        errorMessage = `Error ${res.status}: ${res.statusText}`;
                    }
                    throw new Error(errorMessage);
                }
                const json = await res.json()
                setData(json.data)
            } catch (err: any) {
                console.error("Fetch Data Error:", err);
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    const handleGenerateCover = async () => {
        setIsGeneratingCover(true)
        try {
            const res = await fetch(`/api/sop-builder/${id}/generate-cover`, {
                method: 'POST'
            })

            const resData = await res.json()
            if (!res.ok) throw new Error(resData.error || resData.details || "Gagal generate cover")

            toast.success("Cover berhasil digenerate dan tersimpan!")
            setData({ ...data, generatedCoverPath: resData.data.coverPath })
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Gagal meng-generate cover")
        } finally {
            setIsGeneratingCover(false)
        }
    }

    const handleExportFinal = async (finalPdfPath: string | null) => {
        if (!finalPdfPath) return;

        setData({ ...data, combinedPdfPath: finalPdfPath, status: 'FINAL' })
    }

    const handleDataUpdate = (newData: any) => {
        if (newData) setData(newData)
    }

    if (loading) return (
        <div className="flex justify-center items-center h-[calc(100vh-100px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )

    if (error || !data) return (
        <div className="p-8 text-destructive">{error || "SOP Tidak ditemukan"}</div>
    )

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-[#020617]">
            {/* Main Flowchart Node Viewport */}
            <div className="flex-1 w-full h-full relative overflow-hidden">
                <SopFlowchart
                    sopData={data}
                    onExportFinal={handleExportFinal}
                    isExporting={isExporting}
                    onGenerateCover={handleGenerateCover}
                    isGeneratingCover={isGeneratingCover}
                    onBack={() => router.push(`/sop/buat/${id}`)}
                    onDataUpdate={handleDataUpdate}
                />
            </div>
        </div>
    )
}
