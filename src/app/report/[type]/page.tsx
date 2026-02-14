"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Printer, Download, ArrowLeft, Loader2, FileSpreadsheet } from "lucide-react"
import { jsPDF } from "jspdf"
import * as XLSX from "xlsx"

interface InvoiceDetail {
    invoiceNumber: string
    orderNumber: string
    stokisName: string
    amount: number
    dueDate: string
    agingCategory: string
    status: string
    orderCreatedAt?: string
}

interface ReportData {
    summary: {
        totalPoCount: number
        totalPoAmount: number
        unpaidCount: number
        unpaidAmount: number
        paidCount: number
        paidAmount: number
    }
    details: {
        dc: InvoiceDetail[]
        stokis: InvoiceDetail[]
    }
}

export default function ReportPreviewPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const reportType = params.type as string

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<ReportData | null>(null)
    const [error, setError] = useState("")
    const [pdfLoading, setPdfLoading] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    const filter = searchParams.get("filter") || "all"
    const sortOrder = searchParams.get("sort") || "desc"

    useEffect(() => {
        fetchReportData()
    }, [reportType, filter])

    const fetchReportData = async () => {
        try {
            const res = await fetch(`/api/reports?type=invoice-aging`)
            if (!res.ok) throw new Error("Gagal memuat data laporan")
            const result = await res.json()
            setData(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat laporan")
        } finally {
            setLoading(false)
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
        return new Date(dateString).toLocaleDateString("id-ID")
    }

    const getInvoices = (): InvoiceDetail[] => {
        if (!data) return []
        let invoices = [...data.details.dc, ...data.details.stokis]

        // Filter by payment status
        if (filter === "unpaid") {
            invoices = invoices.filter(inv => inv.status !== "PAID")
        } else if (filter === "paid") {
            invoices = invoices.filter(inv => inv.status === "PAID")
        }

        // Sort
        invoices = [...invoices].sort((a, b) => {
            const dateA = new Date(a.orderCreatedAt || a.dueDate).getTime()
            const dateB = new Date(b.orderCreatedAt || b.dueDate).getTime()
            return sortOrder === "asc" ? dateA - dateB : dateB - dateA
        })

        return invoices
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPDF = async () => {
        if (!data) return

        setPdfLoading(true)
        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const invoices = getInvoices()

            // Try to load logo
            try {
                const logoImg = new window.Image()
                logoImg.crossOrigin = "anonymous"
                logoImg.src = "/logo_dfresto.png"
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve
                    logoImg.onerror = reject
                    setTimeout(reject, 3000) // Timeout after 3s
                })
                pdf.addImage(logoImg, 'PNG', 14, 10, 15, 15)
            } catch (e) {
                // Logo failed, continue without it
            }

            // Header
            pdf.setFontSize(20)
            pdf.setFont("helvetica", "bold")
            pdf.text("D'Fresto", 32, 18)

            pdf.setFontSize(10)
            pdf.setFont("helvetica", "normal")
            pdf.text("Franchise Ayam Goreng Premium", 32, 24)

            // Report Title (right side)
            pdf.setFontSize(14)
            pdf.setFont("helvetica", "bold")
            pdf.text("LAPORAN UMUR PIUTANG", pageWidth - 14, 15, { align: "right" })

            pdf.setFontSize(9)
            pdf.setFont("helvetica", "normal")
            pdf.text(`Generated: ${new Date().toLocaleDateString("id-ID")}`, pageWidth - 14, 21, { align: "right" })

            // Separator line
            pdf.setDrawColor(50, 50, 50)
            pdf.setLineWidth(0.5)
            pdf.line(14, 30, pageWidth - 14, 30)

            // Summary Cards as colored boxes (mimicking preview)
            const summaryY = 35
            const cardWidth = (pageWidth - 28 - 8) / 3  // 3 cards with gaps

            // Total Card (slate)
            pdf.setFillColor(71, 85, 105) // slate-600
            pdf.roundedRect(14, summaryY, cardWidth, 25, 2, 2, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(8)
            pdf.text("Total", 17, summaryY + 6)
            pdf.setFontSize(12)
            pdf.setFont("helvetica", "bold")
            pdf.text(formatCurrency(data.summary.totalPoAmount), 17, summaryY + 14)
            pdf.setFontSize(7)
            pdf.setFont("helvetica", "normal")
            pdf.text(`Total PO: ${data.summary.totalPoCount}`, 17, summaryY + 20)

            // Belum Dibayar Card (amber)
            pdf.setFillColor(245, 158, 11) // amber-500
            pdf.roundedRect(14 + cardWidth + 4, summaryY, cardWidth, 25, 2, 2, 'F')
            pdf.setFontSize(8)
            pdf.text("Belum Dibayar", 17 + cardWidth + 4, summaryY + 6)
            pdf.setFontSize(12)
            pdf.setFont("helvetica", "bold")
            pdf.text(formatCurrency(data.summary.unpaidAmount), 17 + cardWidth + 4, summaryY + 14)
            pdf.setFontSize(7)
            pdf.setFont("helvetica", "normal")
            pdf.text(`Total PO: ${data.summary.unpaidCount}`, 17 + cardWidth + 4, summaryY + 20)

            // Lunas Card (emerald)
            pdf.setFillColor(16, 185, 129) // emerald-500
            pdf.roundedRect(14 + (cardWidth + 4) * 2, summaryY, cardWidth, 25, 2, 2, 'F')
            pdf.setFontSize(8)
            pdf.text("Lunas", 17 + (cardWidth + 4) * 2, summaryY + 6)
            pdf.setFontSize(12)
            pdf.setFont("helvetica", "bold")
            pdf.text(formatCurrency(data.summary.paidAmount), 17 + (cardWidth + 4) * 2, summaryY + 14)
            pdf.setFontSize(7)
            pdf.setFont("helvetica", "normal")
            pdf.text(`Total PO: ${data.summary.paidCount}`, 17 + (cardWidth + 4) * 2, summaryY + 20)

            // Reset text color
            pdf.setTextColor(0, 0, 0)

            // Invoice Table Title
            pdf.setFontSize(11)
            pdf.setFont("helvetica", "bold")
            pdf.text("Daftar Invoice Umur Piutang", 14, summaryY + 35)

            // Invoice Table using autoTable
            const { default: autoTable } = await import('jspdf-autotable')

            autoTable(pdf, {
                startY: summaryY + 40,
                head: [["Tanggal PO", "No. Invoice", "Konsumen", "Jumlah", "Status"]],
                body: invoices.map(inv => [
                    inv.orderCreatedAt ? formatDate(inv.orderCreatedAt) : "-",
                    inv.invoiceNumber,
                    inv.stokisName,
                    formatCurrency(inv.amount),
                    inv.status === "PAID" ? "Lunas" : "Belum Bayar"
                ]),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 25 },
                    3: { halign: 'right' },
                    4: { halign: 'center' }
                }
            })

            // Footer
            const finalY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 200
            pdf.setFontSize(7)
            pdf.setTextColor(128, 128, 128)
            pdf.text(
                `Dokumen ini dicetak dari sistem D'Fresto pada ${new Date().toLocaleString("id-ID")}`,
                pageWidth / 2,
                finalY + 10,
                { align: "center" }
            )

            pdf.save(`Laporan_Umur_Piutang_${new Date().toISOString().split("T")[0]}.pdf`)
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert('Gagal membuat PDF: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setPdfLoading(false)
        }
    }

    const handleDownloadExcel = () => {
        if (!data) return

        const invoices = getInvoices()

        // Create workbook
        const wb = XLSX.utils.book_new()

        // Build data array with header and summary
        const excelData: (string | number)[][] = []

        // Header
        excelData.push(["D'Fresto - Laporan Umur Piutang"])
        excelData.push([`Franchise Ayam Goreng Premium`])
        excelData.push([`Generated: ${new Date().toLocaleDateString("id-ID")}`])
        excelData.push([]) // Empty row

        // Summary Section
        excelData.push(["RINGKASAN"])
        excelData.push(["Kategori", "Total PO", "Nominal"])
        excelData.push(["Total", data.summary.totalPoCount, formatCurrency(data.summary.totalPoAmount)])
        excelData.push(["Belum Dibayar", data.summary.unpaidCount, formatCurrency(data.summary.unpaidAmount)])
        excelData.push(["Lunas", data.summary.paidCount, formatCurrency(data.summary.paidAmount)])
        excelData.push([]) // Empty row

        // Invoice Table Header
        excelData.push(["DAFTAR INVOICE UMUR PIUTANG"])
        excelData.push(["Tanggal PO", "No. Invoice", "Konsumen", "Jumlah", "Status"])

        // Invoice Data
        invoices.forEach(inv => {
            excelData.push([
                inv.orderCreatedAt ? formatDate(inv.orderCreatedAt) : "-",
                inv.invoiceNumber,
                inv.stokisName,
                formatCurrency(inv.amount),
                inv.status === "PAID" ? "Lunas" : "Belum Bayar"
            ])
        })

        // Footer
        excelData.push([])
        excelData.push([`Dokumen ini dicetak dari sistem D'Fresto pada ${new Date().toLocaleString("id-ID")}`])

        const ws = XLSX.utils.aoa_to_sheet(excelData)

        // Set column widths
        ws["!cols"] = [
            { wch: 15 },  // Tanggal PO
            { wch: 20 },  // No. Invoice
            { wch: 25 },  // Konsumen
            { wch: 18 },  // Jumlah
            { wch: 15 }   // Status
        ]

        XLSX.utils.book_append_sheet(wb, ws, "Laporan Umur Piutang")
        XLSX.writeFile(wb, `Laporan_Umur_Piutang_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600">{error || "Laporan tidak ditemukan"}</p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                    <ArrowLeft size={18} /> Kembali
                </button>
            </div>
        )
    }

    const invoices = getInvoices()

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
                    disabled={pdfLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                    {pdfLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {pdfLoading ? 'Loading...' : 'PDF'}
                </button>
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    <FileSpreadsheet size={18} /> Excel
                </button>
            </div>

            {/* Report Document */}
            <div className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0 print:max-w-none">
                <div ref={reportRef} className="bg-white shadow-lg print:shadow-none p-8 print:p-6">
                    {/* Header */}
                    <div className="border-b-2 border-gray-800 pb-4 mb-6">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                {/* Use standard img for html2canvas compatibility */}
                                <img
                                    src="/logo_dfresto.png"
                                    alt="D'Fresto Logo"
                                    width={50}
                                    height={50}
                                    className="object-contain"
                                    crossOrigin="anonymous"
                                />
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">D'Fresto</h1>
                                    <p className="text-gray-600 text-sm">Franchise Ayam Goreng Premium</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-gray-800">LAPORAN UMUR PIUTANG</h2>
                                <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString("id-ID")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-700 text-white p-4 rounded-lg">
                            <p className="text-sm opacity-80">Total</p>
                            <p className="text-xl font-bold">{formatCurrency(data.summary.totalPoAmount)}</p>
                            <p className="text-xs opacity-60">Total PO: <span className="font-bold">{data.summary.totalPoCount}</span></p>
                        </div>
                        <div className="bg-amber-500 text-white p-4 rounded-lg">
                            <p className="text-sm opacity-80">Belum Dibayar</p>
                            <p className="text-xl font-bold">{formatCurrency(data.summary.unpaidAmount)}</p>
                            <p className="text-xs opacity-60">Total PO: <span className="font-bold">{data.summary.unpaidCount}</span></p>
                        </div>
                        <div className="bg-emerald-500 text-white p-4 rounded-lg">
                            <p className="text-sm opacity-80">Lunas</p>
                            <p className="text-xl font-bold">{formatCurrency(data.summary.paidAmount)}</p>
                            <p className="text-xs opacity-60">Total PO: <span className="font-bold">{data.summary.paidCount}</span></p>
                        </div>
                    </div>

                    {/* Invoice Table */}
                    <h3 className="font-bold text-gray-800 mb-3">Daftar Invoice Umur Piutang</h3>
                    <table className="w-full border-collapse mb-6">
                        <thead>
                            <tr className="bg-gray-800">
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-left">Tanggal PO</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-left">No. Invoice</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-left">Konsumen</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-right">Jumlah</th>
                                <th style={{ color: 'white', borderColor: 'white' }} className="border p-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-900">
                            {invoices.map((inv, idx) => (
                                <tr key={inv.invoiceNumber} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                    <td className="border border-gray-300 p-2">
                                        {inv.orderCreatedAt ? formatDate(inv.orderCreatedAt) : "-"}
                                    </td>
                                    <td className="border border-gray-300 p-2 font-mono text-sm">{inv.invoiceNumber}</td>
                                    <td className="border border-gray-300 p-2">{inv.stokisName}</td>
                                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(inv.amount)}</td>
                                    <td className="border border-gray-300 p-2 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === "PAID"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-amber-100 text-amber-800"
                                            }`}>
                                            {inv.status === "PAID" ? "Lunas" : "Belum Bayar"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                        <p>Dokumen ini dicetak dari sistem D'Fresto pada {new Date().toLocaleString("id-ID")}</p>
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
