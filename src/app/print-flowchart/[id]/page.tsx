"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import SopFlowchart from "@/components/sop-builder/SopFlowchart"

export default function PrintFlowchartPage() {
    const params = useParams()
    const id = params.id as string
    const [sop, setSop] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // If data is pre-injected by Puppeteer
        if ((window as any).PRELOADED_SOP_DATA) {
            console.log("📦 Using preloaded SOP data from Puppeteer");
            const data = (window as any).PRELOADED_SOP_DATA;
            // Explicitly force connectorPaths to be used if available
            if (data.connectorPaths) {
                console.log("✅ connectorPaths found in preloaded data");
            }
            setSop(data);
            setLoading(false);
            return;
        }

        async function fetchSop() {
            try {
                // Use the correct API endpoint that returns the full SOP data including connectorPaths
                const res = await fetch(`/api/sop-builder/${id}`)
                const json = await res.json()
                if (json.data) {
                    setSop(json.data)
                } else {
                    console.error("No data returned from API")
                }
            } catch (e) {
                console.error("Failed to fetch SOP for print:", e)
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchSop()
    }, [id])

    if (loading || !sop) return null

    return (
        <div style={{ width: '100%', minHeight: '100vh', background: 'white' }}>
            <SopFlowchart
                sopData={sop}
                isPrintMode={true}
            />
        </div>
    )
}
