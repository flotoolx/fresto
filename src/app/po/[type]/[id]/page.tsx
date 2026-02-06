"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Printer, Download, ArrowLeft, Loader2, FileSpreadsheet } from "lucide-react"
import { jsPDF } from "jspdf"
import * as XLSX from "xlsx"

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
        if (!po) return

        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()

            // Try to load logo
            try {
                const logoImg = new window.Image()
                logoImg.crossOrigin = "anonymous"
                logoImg.src = "/logo_dfresto.png"
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve
                    logoImg.onerror = reject
                    setTimeout(reject, 3000)
                })
                pdf.addImage(logoImg, 'PNG', 14, 10, 15, 15)
            } catch (e) {
                // Logo failed, continue
            }

            // Header
            pdf.setFontSize(18)
            pdf.setFont("helvetica", "bold")
            pdf.text("D'Fresto", 32, 17)

            pdf.setFontSize(9)
            pdf.setFont("helvetica", "normal")
            pdf.text("Franchise Ayam Goreng Premium", 32, 22)

            // PO Title
            pdf.setFontSize(14)
            pdf.setFont("helvetica", "bold")
            pdf.text("PURCHASE ORDER", pageWidth - 14, 15, { align: "right" })

            pdf.setFontSize(10)
            pdf.setFont("helvetica", "normal")
            pdf.text(`No: ${po.orderNumber}`, pageWidth - 14, 21, { align: "right" })

            // Separator
            pdf.setDrawColor(50, 50, 50)
            pdf.setLineWidth(0.5)
            pdf.line(14, 28, pageWidth - 14, 28)

            // From/To Info
            let yPos = 35

            pdf.setFontSize(10)
            pdf.setFont("helvetica", "bold")
            pdf.text("Dari:", 14, yPos)
            pdf.setFont("helvetica", "normal")
            pdf.text(po.from.name, 14, yPos + 5)
            if (po.from.address) pdf.text(po.from.address, 14, yPos + 10)
            if (po.from.phone) pdf.text(po.from.phone, 14, yPos + 15)

            pdf.setFont("helvetica", "bold")
            pdf.text("Kepada:", pageWidth / 2, yPos)
            pdf.setFont("helvetica", "normal")
            pdf.text(po.to.name, pageWidth / 2, yPos + 5)
            if (po.to.address) pdf.text(po.to.address, pageWidth / 2, yPos + 10)
            if (po.to.phone) pdf.text(po.to.phone, pageWidth / 2, yPos + 15)

            yPos = 58
            pdf.setFont("helvetica", "normal")
            pdf.text(`Tanggal PO: ${formatDate(po.createdAt)}`, 14, yPos)
            pdf.text(`Status: ${po.status}`, pageWidth / 2, yPos)

            // Items Table
            const { default: autoTable } = await import('jspdf-autotable')

            autoTable(pdf, {
                startY: yPos + 8,
                head: [["No", "SKU", "Nama Produk", "Qty", "Satuan", "Harga", "Subtotal"]],
                body: po.items.map((item, idx) => [
                    (idx + 1).toString(),
                    item.product.sku,
                    item.product.name,
                    item.quantity.toString(),
                    item.product.unit,
                    formatCurrency(item.price),
                    formatCurrency(item.price * item.quantity)
                ]),
                foot: [["", "", "", "", "", "TOTAL:", formatCurrency(po.totalAmount)]],
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
                footStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'right' },
                    6: { halign: 'right' }
                }
            })

            // Notes
            const finalY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 150
            if (po.notes) {
                pdf.setFontSize(9)
                pdf.setFont("helvetica", "bold")
                pdf.text("Catatan:", 14, finalY + 10)
                pdf.setFont("helvetica", "normal")
                pdf.text(po.notes, 14, finalY + 15)
            }

            // Footer
            pdf.setFontSize(7)
            pdf.setTextColor(128, 128, 128)
            pdf.text(
                `Dokumen ini dicetak dari sistem D'Fresto pada ${new Date().toLocaleString("id-ID")}`,
                pageWidth / 2,
                finalY + 25,
                { align: "center" }
            )

            pdf.save(`PO-${po.orderNumber}.pdf`)
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert("Gagal download PDF: " + (err instanceof Error ? err.message : "Unknown error"))
        }
    }

    const handleDownloadExcel = () => {
        if (!po) return

        const wb = XLSX.utils.book_new()
        const excelData: (string | number)[][] = []

        // Header
        excelData.push(["D'Fresto - Purchase Order"])
        excelData.push([`No: ${po.orderNumber}`])
        excelData.push([`Tanggal: ${formatDate(po.createdAt)}`])
        excelData.push([`Status: ${po.status}`])
        excelData.push([])

        // From/To
        excelData.push(["Dari:", po.from.name, "", "Kepada:", po.to.name])
        excelData.push(["", po.from.address || "", "", "", po.to.address || ""])
        excelData.push([])

        // Items
        excelData.push(["No", "SKU", "Nama Produk", "Qty", "Satuan", "Harga", "Subtotal"])
        po.items.forEach((item, idx) => {
            excelData.push([
                idx + 1,
                item.product.sku,
                item.product.name,
                item.quantity,
                item.product.unit,
                item.price,
                item.price * item.quantity
            ])
        })

        // Total
        excelData.push([])
        excelData.push(["", "", "", "", "", "TOTAL:", po.totalAmount])

        if (po.notes) {
            excelData.push([])
            excelData.push(["Catatan:", po.notes])
        }

        const ws = XLSX.utils.aoa_to_sheet(excelData)
        ws["!cols"] = [
            { wch: 5 },
            { wch: 15 },
            { wch: 30 },
            { wch: 8 },
            { wch: 10 },
            { wch: 15 },
            { wch: 18 }
        ]

        XLSX.utils.book_append_sheet(wb, ws, "Purchase Order")
        XLSX.writeFile(wb, `PO-${po.orderNumber}.xlsx`)
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
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    <Download size={18} /> PDF
                </button>
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    <FileSpreadsheet size={18} /> Excel
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
                                <div className="flex items-center gap-2">
                                    <img
                                        src="/logo_dfresto.png"
                                        alt="D'Fresto Logo"
                                        width={40}
                                        height={40}
                                        className="object-contain"
                                    />
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-800">D'Fresto</h1>
                                        <p className="text-gray-600 text-sm">Franchise Ayam Goreng Premium</p>
                                    </div>
                                </div>
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
                            <tr className="bg-gray-800">
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-left">No</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-left">SKU</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-left">Nama Produk</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-center">Qty</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-center">Satuan</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-right">Harga</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-right">Subtotal</th>
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
                            <tr className="bg-gray-800">
                                <td colSpan={6} style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-right font-bold">TOTAL:</td>
                                <td style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-right font-bold text-lg">
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
