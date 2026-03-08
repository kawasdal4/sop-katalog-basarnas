"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, FileSpreadsheet, FileCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import SopFlowchart from "@/components/sop-builder/SopFlowchart"

export default function FlowchartPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isGeneratingCover, setIsGeneratingCover] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/sop-builder/${id}`)
                if (!res.ok) throw new Error("SOP tidak ditemukan")
                const json = await res.json()
                setData(json.data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (id) fetchData()
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

        // Auto Download
        window.open(`/api/file?action=download&path=${encodeURIComponent(finalPdfPath)}`, '_blank')

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
