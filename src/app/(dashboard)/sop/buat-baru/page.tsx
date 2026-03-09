import SopBuilderForm from "@/components/sop-builder/SopBuilderForm"

export const metadata = {
    title: "Buat SOP Baru | E-Katalog SOP Basarnas",
    description: "Buat SOP Baru menggunakan generator otomatis",
}

export default function BuatSopPage() {
    return (
        <div className="w-full min-h-screen">
            <SopBuilderForm />
        </div>
    )
}
