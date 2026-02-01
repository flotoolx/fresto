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

interface InvoiceData {
    id: string
    invoiceNumber: string
    amount: number
    dueDate: string
    paidAt: string | null
    status: "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED"
    createdAt: string
    order: {
        orderNumber: string
        stokis: {
            name: string
            email: string
            phone: string | null
            address: string | null
        }
        items: OrderItem[]
    }
}

const BANK_DETAILS = {
    bank: "BCA",
    accountNumber: "123456789",
    accountName: "Dfresto"
}

export default function PrintInvoicePage() {
    const params = useParams()
    const router = useRouter()
    const printRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [invoice, setInvoice] = useState<InvoiceData | null>(null)
    const [error, setError] = useState("")

    const id = params.id as string

    useEffect(() => {
        fetchInvoice()
    }, [id])

    const fetchInvoice = async () => {
        try {
            const res = await fetch(`/api/invoices/${id}`)
            if (!res.ok) throw new Error("Invoice tidak ditemukan")
            const data = await res.json()
            setInvoice(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat invoice")
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPDF = async () => {
        try {
            const res = await fetch(`/api/invoices/${id}/pdf`)
            if (!res.ok) throw new Error("Gagal generate PDF")

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${invoice?.invoiceNumber || id}.pdf`
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

    const formatDateOnly = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            UNPAID: "bg-yellow-100 text-yellow-800 border-yellow-300",
            PAID: "bg-green-100 text-green-800 border-green-300",
            OVERDUE: "bg-red-100 text-red-800 border-red-300",
            CANCELLED: "bg-gray-100 text-gray-800 border-gray-300"
        }
        return styles[status as keyof typeof styles] || styles.UNPAID
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600">{error || "Invoice tidak ditemukan"}</p>
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

            {/* Invoice Document */}
            <div className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0 print:max-w-none">
                <div
                    ref={printRef}
                    className="bg-white shadow-lg print:shadow-none p-8 print:p-6"
                >
                    {/* Header */}
                    <div className="border-b-2 border-gray-800 pb-4 mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">🍗 D&apos;Fresto</h1>
                                <p className="text-gray-600">Franchise Ayam Goreng Premium</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-red-600">INVOICE</h2>
                                <p className="text-lg font-mono text-gray-700">{invoice.invoiceNumber}</p>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <p className="text-gray-700">
                                <span className="font-medium">Order #:</span> {invoice.order.orderNumber}
                            </p>
                            <p className="text-gray-700">
                                <span className="font-medium">Tanggal:</span> {formatDate(invoice.createdAt)}
                            </p>
                            <p className="text-gray-700">
                                <span className="font-medium">Jatuh Tempo:</span>{" "}
                                <span className="font-bold">{formatDateOnly(invoice.dueDate)}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`inline-block px-4 py-2 rounded-lg border-2 font-bold text-lg ${getStatusBadge(invoice.status)}`}>
                                {invoice.status}
                            </span>
                            {invoice.paidAt && (
                                <p className="text-sm text-green-600 mt-2">
                                    Dibayar: {formatDate(invoice.paidAt)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bill To / From */}
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <h3 className="font-bold text-gray-800 mb-2">TAGIHAN KEPADA:</h3>
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <p className="font-semibold text-gray-900">{invoice.order.stokis.name}</p>
                                {invoice.order.stokis.address && (
                                    <p className="text-sm text-gray-700">{invoice.order.stokis.address}</p>
                                )}
                                {invoice.order.stokis.phone && (
                                    <p className="text-sm text-gray-700">Tel: {invoice.order.stokis.phone}</p>
                                )}
                                <p className="text-sm text-gray-700">{invoice.order.stokis.email}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 mb-2">DARI:</h3>
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <p className="font-semibold text-gray-900">D&apos;Fresto Pusat</p>
                                <p className="text-sm text-gray-700">Jl. Pusat No. 1, Jakarta</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full border-collapse mb-6">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="border p-2 text-left">No</th>
                                <th className="border p-2 text-left">SKU</th>
                                <th className="border p-2 text-left">Produk</th>
                                <th className="border p-2 text-center">Qty</th>
                                <th className="border p-2 text-right">Harga</th>
                                <th className="border p-2 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-900">
                            {invoice.order.items.map((item, idx) => (
                                <tr key={item.id} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                    <td className="border border-gray-300 p-2 font-medium">{idx + 1}</td>
                                    <td className="border border-gray-300 p-2 font-mono text-sm font-medium">{item.product.sku}</td>
                                    <td className="border border-gray-300 p-2 font-medium">{item.product.name}</td>
                                    <td className="border border-gray-300 p-2 text-center font-medium">{item.quantity}</td>
                                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.price)}</td>
                                    <td className="border border-gray-300 p-2 text-right font-bold">
                                        {formatCurrency(item.price * item.quantity)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-800 text-white">
                                <td colSpan={5} className="border p-2 text-right font-bold">TOTAL:</td>
                                <td className="border p-2 text-right font-bold text-lg">
                                    {formatCurrency(invoice.amount)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Payment Info */}
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                        <h3 className="font-bold text-gray-800 mb-2">Pembayaran ke:</h3>
                        <p className="text-gray-900 font-medium">
                            Bank {BANK_DETAILS.bank} - {BANK_DETAILS.accountNumber}
                        </p>
                        <p className="text-gray-900">a.n. {BANK_DETAILS.accountName}</p>
                        <p className="text-sm text-gray-600 mt-2 italic">
                            *Mohon sertakan nomor invoice saat transfer
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                        <p>Dokumen ini dicetak dari sistem D&apos;Fresto pada {new Date().toLocaleString("id-ID")}</p>
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
