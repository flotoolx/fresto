"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Printer, Download, ArrowLeft, Loader2 } from "lucide-react"

interface OrderItem {
    id: string
    quantity: number
    price: number
    product: {
        name: string
        sku: string
        unit: string
    }
}

interface POData {
    type: "mitra" | "stokis"
    orderNumber: string
    status: string
    createdAt: string
    totalAmount: number
    notes?: string
    from: {
        name: string
        address?: string
        phone?: string
    }
    to: {
        name: string
        address?: string
        phone?: string
    }
    items: OrderItem[]
    approvedAt?: string
    poIssuedAt?: string
}

export default function PrintPOPage() {
    const params = useParams()
    const router = useRouter()
    const printRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [po, setPO] = useState<POData | null>(null)
    const [error, setError] = useState("")

    const type = params.type as string // "mitra" or "stokis"
    const id = params.id as string

    useEffect(() => {
        fetchPO()
    }, [type, id])

    const fetchPO = async () => {
        try {
            const res = await fetch(`/api/po/${type}/${id}`)
            if (!res.ok) throw new Error("PO tidak ditemukan")
            const data = await res.json()
            setPO(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat PO")
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPDF = async () => {
        try {
            const res = await fetch(`/api/po/${type}/${id}/pdf`)
            if (!res.ok) throw new Error("Gagal generate PDF")

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `PO-${po?.orderNumber || id}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            alert("Gagal download PDF: " + (err instanceof Error ? err.message : "Unknown error"))
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const dateStr = date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        const timeStr = date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).replace(".", ":")
        return `${dateStr}, ${timeStr}`
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        )
    }

    if (error || !po) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600">{error || "PO tidak ditemukan"}</p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                    <ArrowLeft size={18} /> Kembali
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Action Buttons - Hidden when printing */}
            <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                    <ArrowLeft size={18} /> Kembali
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Printer size={18} /> Print
                </button>
                <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    <Download size={18} /> Download PDF
                </button>
            </div>

            {/* PO Document */}
            <div className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0 print:max-w-none">
                <div
                    ref={printRef}
                    className="bg-white shadow-lg print:shadow-none p-8 print:p-6"
                >
                    {/* Header */}
                    <div className="border-b-2 border-gray-800 pb-4 mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">🍗 D'Fresto</h1>
                                <p className="text-gray-600">Franchise Ayam Goreng Premium</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-gray-800">PURCHASE ORDER</h2>
                                <p className="text-lg font-mono text-gray-700">{po.orderNumber}</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <h3 className="font-bold text-gray-800 mb-2">DARI:</h3>
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <p className="font-semibold text-gray-900">{po.from.name}</p>
                                {po.from.address && <p className="text-sm text-gray-700">{po.from.address}</p>}
                                {po.from.phone && <p className="text-sm text-gray-700">Tel: {po.from.phone}</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 mb-2">KEPADA:</h3>
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <p className="font-semibold text-gray-900">{po.to.name}</p>
                                {po.to.address && <p className="text-sm text-gray-700">{po.to.address}</p>}
                                {po.to.phone && <p className="text-sm text-gray-700">Tel: {po.to.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Date & Status */}
                    <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                        <div>
                            <span className="text-gray-700 font-medium">Tanggal Order:</span>
                            <p className="font-bold text-gray-900">{formatDate(po.createdAt)}</p>
                        </div>
                        <div>
                            <span className="text-gray-700 font-medium">Status:</span>
                            <p className="font-semibold">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${po.status === "RECEIVED" ? "bg-green-100 text-green-800" :
                                    po.status === "SHIPPED" ? "bg-blue-100 text-blue-800" :
                                        po.status === "PROCESSING" || po.status === "PO_ISSUED" ? "bg-yellow-100 text-yellow-800" :
                                            "bg-gray-100 text-gray-800"
                                    }`}>
                                    {po.status.replace(/_/g, " ")}
                                </span>
                            </p>
                        </div>
                        {po.poIssuedAt && (
                            <div>
                                <span className="text-gray-700 font-medium">PO Diterbitkan:</span>
                                <p className="font-bold text-gray-900">{formatDate(po.poIssuedAt)}</p>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <table className="w-full border-collapse mb-6">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="border p-2 text-left">No</th>
                                <th className="border p-2 text-left">SKU</th>
                                <th className="border p-2 text-left">Nama Produk</th>
                                <th className="border p-2 text-center">Qty</th>
                                <th className="border p-2 text-center">Satuan</th>
                                <th className="border p-2 text-right">Harga</th>
                                <th className="border p-2 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-900">
                            {po.items.map((item, idx) => (
                                <tr key={item.id} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                    <td className="border border-gray-300 p-2 font-medium">{idx + 1}</td>
                                    <td className="border border-gray-300 p-2 font-mono text-sm font-medium">{item.product.sku}</td>
                                    <td className="border border-gray-300 p-2 font-medium">{item.product.name}</td>
                                    <td className="border border-gray-300 p-2 text-center font-medium">{item.quantity}</td>
                                    <td className="border border-gray-300 p-2 text-center">{item.product.unit}</td>
                                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.price)}</td>
                                    <td className="border border-gray-300 p-2 text-right font-bold">
                                        {formatCurrency(item.price * item.quantity)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-800 text-white">
                                <td colSpan={6} className="border p-2 text-right font-bold">TOTAL:</td>
                                <td className="border p-2 text-right font-bold text-lg">
                                    {formatCurrency(po.totalAmount)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Notes */}
                    {po.notes && (
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-700 mb-1">Catatan:</h3>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded">{po.notes}</p>
                        </div>
                    )}

                    {/* Signature Section */}
                    <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t border-gray-300">
                        <div className="text-center">
                            <p className="text-sm text-gray-800 font-medium mb-16">Dibuat oleh:</p>
                            <div className="border-t-2 border-gray-800 pt-2">
                                <p className="font-bold text-gray-900">{po.from.name}</p>
                                <p className="text-sm text-gray-700">{po.type === "mitra" ? "Mitra" : "Stokis"}</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-800 font-medium mb-16">Disetujui oleh:</p>
                            <div className="border-t-2 border-gray-800 pt-2">
                                <p className="font-bold text-gray-900">_________________</p>
                                <p className="text-sm text-gray-700">{po.type === "mitra" ? "Stokis" : "Pusat"}</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-800 font-medium mb-16">Diterima oleh:</p>
                            <div className="border-t-2 border-gray-800 pt-2">
                                <p className="font-bold text-gray-900">_________________</p>
                                <p className="text-sm text-gray-700">Gudang</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                        <p>Dokumen ini dicetak dari sistem D'Fresto pada {new Date().toLocaleString("id-ID")}</p>
                        <p>Halaman 1 dari 1</p>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                }
            `}</style>
        </div>
    )
}
