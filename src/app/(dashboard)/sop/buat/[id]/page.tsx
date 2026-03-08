"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import SopBuilderForm from "@/components/sop-builder/SopBuilderForm"
import { Loader2 } from "lucide-react"

export default function EditSopPage() {
    const params = useParams()
    const id = params.id as string
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/sop-builder/${id}`)
                if (!res.ok) {
                    throw new Error("SOP tidak ditemukan")
                }
                const json = await res.json()
                setData(json.data)
            } catch (err: any) {
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
        <div className="container mx-auto py-8">
            <SopBuilderForm initialData={data} id={id} />
        </div>
    )
}
