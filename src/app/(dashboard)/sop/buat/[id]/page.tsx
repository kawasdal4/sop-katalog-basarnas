"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import SopBuilderForm from "@/components/sop-builder/SopBuilderForm"
import { Loader2 } from "lucide-react"

export default function EditSopPage({ params }: { params: Promise<{ id: string }> }) {
    // In Next.js 15, page params are a Promise that must be unwrapped
    const resolvedParams = use(params)
    const id = resolvedParams.id

    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            if (!id) return;
            try {
                const res = await fetch(`/api/sop-builder/${id}`)
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

        if (id) {
            fetchData()
        }
    }, [id])

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Memuat data SOP...</span>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="container mx-auto py-8">
                <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                    {error || "Terjadi kesalahan"}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen">
            <SopBuilderForm initialData={data} id={id} />
        </div>
    )
}
