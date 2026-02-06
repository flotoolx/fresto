"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Printer, Download, ArrowLeft, Loader2, FileSpreadsheet } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
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
        let invoices = filter === "dc"
            ? data.details.dc
            : filter === "stokis"
                ? data.details.stokis
                : [...data.details.dc, ...data.details.stokis]

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
        if (!reportRef.current) return

        setPdfLoading(true)
        try {
            // Capture the preview element with html2canvas
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // Higher quality
                useCORS: true,
                allowTaint: true,
                logging: true, // Enable for debugging
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                onclone: (clonedDoc) => {
                    // Fix any potential styling issues in cloned document
                    const clonedElement = clonedDoc.querySelector('[data-report-content]')
                    if (clonedElement) {
                        (clonedElement as HTMLElement).style.transform = 'none'
                    }
                }
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')

            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()
            const imgWidth = canvas.width
            const imgHeight = canvas.height
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
            const imgX = (pdfWidth - imgWidth * ratio) / 2
            const imgY = 0

            // Calculate if we need multiple pages
            const scaledHeight = imgHeight * ratio

            if (scaledHeight <= pdfHeight) {
                // Single page
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, scaledHeight)
            } else {
                // Multiple pages needed
                let remainingHeight = scaledHeight
                let currentY = 0
                let pageNumber = 0

                while (remainingHeight > 0) {
                    if (pageNumber > 0) {
                        pdf.addPage()
                    }

                    // For multi-page, we need to slice the image
                    const pageImgHeight = Math.min(pdfHeight, remainingHeight)
                    pdf.addImage(imgData, 'PNG', imgX, -currentY, imgWidth * ratio, scaledHeight)

                    remainingHeight -= pdfHeight
                    currentY += pdfHeight
                    pageNumber++
                }
            }

            pdf.save(`Laporan_Umur_Piutang_${new Date().toISOString().split("T")[0]}.pdf`)
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert('Gagal membuat PDF. Silakan gunakan tombol Print > Save as PDF.')
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
