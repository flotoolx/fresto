"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CreditCard, Search, ChevronDown, AlertTriangle, CheckCircle, X, Upload } from "lucide-react"

interface Invoice {
    id: string
    invoiceNumber: string
    amount: number
    paidAmount: number
    dueDate: string
    status: string
    order: {
        orderNumber: string
        stokis: { id: string; name: string }
    }
}

interface Stokis {
    id: string
    name: string
}

interface PaymentForm {
    invoiceId: string
    amount: number
    paymentDate: string
    method: string
    proofImage: string
    notes: string
}

const paymentMethods = [
    { value: "TRANSFER_BCA", label: "Transfer BCA" },
    { value: "TRANSFER_MANDIRI", label: "Transfer Mandiri" },
    { value: "TRANSFER_BRI", label: "Transfer BRI" },
    { value: "CASH", label: "Cash" },
    { value: "OTHER", label: "Lainnya" },
]

export default function PembayaranPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const role = session?.user?.role || ""
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [stokisList, setStokisList] = useState<Stokis[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Filters
    const [filterStokis, setFilterStokis] = useState("")
    const [filterStatus, setFilterStatus] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    // Payment form
    const [paymentForm, setPaymentForm] = useState<PaymentForm>({
        invoiceId: "",
        amount: 0,
        paymentDate: new Date().toISOString().split("T")[0],
        method: "TRANSFER_BCA",
        proofImage: "",
        notes: ""
    })

    // Redirect FINANCE_ALL — view only, no payment access
    useEffect(() => {
        if (role === "FINANCE_ALL") {
            router.replace("/dashboard")
        }
        // Default filter FINANCE_DC to "Belum Bayar"
        if (role === "FINANCE_DC" && filterStatus === "") {
            setFilterStatus("UNPAID")
        }
    }, [role, router])

    useEffect(() => {
        if (role && role !== "FINANCE_ALL") {
            fetchInvoices()
            fetchStokisList()
        }
    }, [role])

    const fetchInvoices = async () => {
        try {
            // Fetch all invoices to calculate Lunas and Belum Lunas
            const res = await fetch("/api/invoices")
            const data = await res.json()
            setInvoices(data)
        } catch (err) {
            console.error("Error fetching invoices:", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchStokisList = async () => {
        try {
            const res = await fetch("/api/stokis")
            const data = await res.json()
            setStokisList(data)
        } catch (err) {
            console.error("Error fetching stokis:", err)
        }
    }

    const openPaymentModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice)
        const remaining = Number(invoice.amount) - Number(invoice.paidAmount)
        setPaymentForm({
            invoiceId: invoice.id,
            amount: remaining,
            paymentDate: new Date().toISOString().split("T")[0],
            method: "TRANSFER_BCA",
            proofImage: "",
            notes: ""
        })
        setShowPaymentModal(true)
    }

    const handleSubmitPayment = async () => {
        if (!selectedInvoice || paymentForm.amount <= 0) return

        setSubmitting(true)
        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentForm)
            })

            if (res.ok) {
                fetchInvoices()
                setShowPaymentModal(false)
                setSelectedInvoice(null)
            } else {
                const err = await res.json()
                alert(err.error || "Gagal menyimpan pembayaran")
            }
        } catch (err) {
            console.error("Error submitting payment:", err)
            alert("Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
        }).format(new Date(date))
    }

    // Filter invoices
    const filteredInvoices = invoices.filter(inv => {
        if (filterStokis && inv.order.stokis.id !== filterStokis) return false
        if (filterStatus) {
            if (filterStatus === "PAID" && inv.status !== "PAID") return false
            if (filterStatus === "UNPAID" && inv.status === "PAID") return false
            if (filterStatus === "OVERDUE" && inv.status !== "OVERDUE") return false
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (!inv.invoiceNumber.toLowerCase().includes(query) &&
                !inv.order.stokis.name.toLowerCase().includes(query)) {
                return false
            }
        }
        return true
    })
        // Sort: unpaid/overdue first, then paid
        .sort((a, b) => {
            const aIsPaid = a.status === "PAID" ? 1 : 0
            const bIsPaid = b.status === "PAID" ? 1 : 0
            return aIsPaid - bIsPaid
        })

    // Calculate summary
    const paidInvoices = filteredInvoices.filter(inv => inv.status === "PAID")
    const unpaidInvoices = filteredInvoices.filter(inv => inv.status === "UNPAID" || inv.status === "OVERDUE")

    const totalLunas = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
    const poLunas = paidInvoices.length

    const totalBelumLunas = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.paidAmount)), 0)
    const poBelumLunas = unpaidInvoices.length

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <CreditCard className="text-purple-600" />
                            Input Pembayaran
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Kelola pembayaran invoice dari Stokis</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none bg-gray-50 border rounded-lg px-4 py-2 pr-8 text-gray-700 text-sm"
                        >
                            <option value="">Semua Status</option>
                            <option value="UNPAID">Belum Bayar</option>
                            <option value="OVERDUE">Jatuh Tempo</option>
                            <option value="PAID">Lunas</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari invoice..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border rounded-lg pl-10 pr-4 py-2 text-gray-700 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* Lunas Card */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 md:w-12 h-10 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                        <CheckCircle size={14} className="opacity-80 md:w-[16px] md:h-[16px]" />
                        <span className="text-[11px] md:text-xs text-white/80">Lunas</span>
                    </div>
                    <p className="text-base md:text-xl font-bold truncate">{formatCurrency(totalLunas)}</p>
                    <p className="text-[10px] md:text-xs text-white/60 mt-0.5 md:mt-1">{poLunas} PO</p>
                </div>

                {/* Belum Lunas Card */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 md:w-12 h-10 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                        <AlertTriangle size={14} className="opacity-80 md:w-[16px] md:h-[16px]" />
                        <span className="text-[11px] md:text-xs text-white/80">Belum Lunas</span>
                    </div>
                    <p className="text-base md:text-xl font-bold truncate">{formatCurrency(totalBelumLunas)}</p>
                    <p className="text-[10px] md:text-xs text-white/60 mt-0.5 md:mt-1">{poBelumLunas} PO</p>
                </div>
            </div>

            {/* Invoice List */}
            {filteredInvoices.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada tagihan yang perlu dibayar</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Invoice</th>
                                    <th className="px-4 py-3 text-left">Stokis</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right">Sisa</th>
                                    <th className="px-4 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredInvoices.map(inv => {
                                    const remaining = Number(inv.amount) - Number(inv.paidAmount)
                                    const isPaid = inv.status === "PAID" || remaining <= 0
                                    const isOverdue = inv.status === "OVERDUE"
                                    return (
                                        <tr key={inv.id} className={isPaid ? "bg-gray-50/80" : isOverdue ? "bg-red-50" : ""}>
                                            <td className="px-4 py-3">
                                                <span className={`font-medium ${isPaid ? "text-gray-400" : "text-gray-900"}`}>{inv.invoiceNumber}</span>
                                                <p className={`text-xs ${isPaid ? "text-gray-300" : "text-gray-500"}`}>{inv.order.orderNumber}</p>
                                            </td>
                                            <td className={`px-4 py-3 ${isPaid ? "text-gray-400" : "text-gray-700"}`}>{inv.order.stokis.name}</td>
                                            <td className={`px-4 py-3 text-right ${isPaid ? "text-gray-400" : "text-gray-700"}`}>
                                                {formatCurrency(Number(inv.amount))}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${isPaid ? "text-gray-400" : "text-gray-900"}`}>
                                                {formatCurrency(remaining)}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {isPaid ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                                        <CheckCircle size={12} />
                                                        Lunas
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => openPaymentModal(inv)}
                                                        className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600"
                                                    >
                                                        Bayar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Input Pembayaran</h2>
                                    <p className="text-sm text-gray-500">{selectedInvoice.invoiceNumber}</p>
                                </div>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Invoice Summary */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="font-medium text-gray-900">{selectedInvoice.order.stokis.name}</p>
                                <div className="mt-2 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Invoice</span>
                                        <span className="text-gray-900">{formatCurrency(Number(selectedInvoice.amount))}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Sudah Dibayar</span>
                                        <span className="text-green-600">{formatCurrency(Number(selectedInvoice.paidAmount))}</span>
                                    </div>
                                    <div className="flex justify-between font-medium border-t pt-1">
                                        <span className="text-gray-700">Sisa Tagihan</span>
                                        <span className="text-purple-600">
                                            {formatCurrency(Number(selectedInvoice.amount) - Number(selectedInvoice.paidAmount))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Jumlah Bayar
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={paymentForm.amount ? paymentForm.amount.toLocaleString("id-ID") : ""}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, "")
                                                setPaymentForm(prev => ({ ...prev, amount: Number(raw) || 0 }))
                                            }}
                                            className="w-full border rounded-lg pl-10 pr-4 py-2 text-gray-900"
                                            placeholder="0"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setPaymentForm(prev => ({
                                            ...prev,
                                            amount: Number(selectedInvoice.amount) - Number(selectedInvoice.paidAmount)
                                        }))}
                                        className="text-sm text-purple-600 mt-1 hover:underline"
                                    >
                                        Bayar Lunas
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tanggal Pembayaran
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentForm.paymentDate}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                                        className="w-full border rounded-lg px-4 py-2 text-gray-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Metode Pembayaran
                                    </label>
                                    <select
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                                        className="w-full border rounded-lg px-4 py-2 text-gray-900"
                                    >
                                        {paymentMethods.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Bukti Transfer (opsional)
                                    </label>
                                    <div className="border-2 border-dashed rounded-lg p-4 text-center text-gray-500">
                                        <Upload className="mx-auto mb-2" size={24} />
                                        <p className="text-sm">Fitur upload akan tersedia</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Catatan (opsional)
                                    </label>
                                    <textarea
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Catatan tambahan..."
                                        className="w-full border rounded-lg px-4 py-2 text-gray-900"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmitPayment}
                                    disabled={submitting || paymentForm.amount <= 0}
                                    className="flex-1 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50"
                                >
                                    {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
