"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Receipt,
    CheckCircle,
    Clock,
    AlertTriangle,
    Printer,
    Search,
    ArrowLeft
} from "lucide-react"

interface Invoice {
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
        }
    }
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("ALL")
    const [search, setSearch] = useState("")
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    useEffect(() => {
        fetchInvoices()
    }, [filter])

    const fetchInvoices = async () => {
        try {
            const url = filter === "ALL"
                ? "/api/invoices"
                : `/api/invoices?status=${filter}`
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setInvoices(data)
            }
        } catch (error) {
            console.error("Error fetching invoices:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsPaid = async (invoiceId: string) => {
        if (!confirm("Tandai invoice ini sebagai PAID?")) return

        setUpdatingId(invoiceId)
        try {
            const res = await fetch(`/api/invoices/${invoiceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PAID" })
            })

            if (res.ok) {
                fetchInvoices()
            } else {
                alert("Gagal update status")
            }
        } catch (error) {
            alert("Error: " + error)
        } finally {
            setUpdatingId(null)
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
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })
    }

    const getDaysUntilDue = (dueDate: string) => {
        const now = new Date()
        const due = new Date(dueDate)
        const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return days
    }

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.order.stokis.name.toLowerCase().includes(search.toLowerCase())
    )

    const stats = {
        total: invoices.length,
        unpaid: invoices.filter(i => i.status === "UNPAID").length,
        paid: invoices.filter(i => i.status === "PAID").length,
        overdue: invoices.filter(i => i.status === "OVERDUE").length,
        totalUnpaid: invoices
            .filter(i => i.status === "UNPAID" || i.status === "OVERDUE")
            .reduce((sum, i) => sum + Number(i.amount), 0)
    }

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
            <div className="bg-white rounded-xl p-6 shadow-sm flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Receipt className="text-purple-600" />
                    Invoice Management
                </h1>
                <Link href="/dashboard" className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm">
                    <ArrowLeft size={16} /> Kembali
                </Link>
            </div>

            {/* Stats Cards - Modern Gradient Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <Receipt size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Total Invoice</span>
                    </div>
                    <p className="text-xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Belum Bayar</span>
                    </div>
                    <p className="text-xl font-bold">{stats.unpaid}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Overdue</span>
                    </div>
                    <p className="text-xl font-bold">{stats.overdue}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Outstanding</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalUnpaid)}</p>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h2 className="font-semibold text-gray-800">Daftar Invoice</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari invoice..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="UNPAID">Belum Bayar</option>
                            <option value="PAID">Sudah Bayar</option>
                            <option value="OVERDUE">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Invoice Cards Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
                {filteredInvoices.map((invoice) => {
                    const daysUntilDue = getDaysUntilDue(invoice.dueDate)
                    const isOverdue = invoice.status === "OVERDUE"
                    const isPaid = invoice.status === "PAID"
                    const isUnpaid = invoice.status === "UNPAID"

                    return (
                        <div
                            key={invoice.id}
                            className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${isPaid ? "border-l-green-500" :
                                isOverdue ? "border-l-red-500" :
                                    "border-l-yellow-500"
                                }`}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900">{invoice.invoiceNumber}</h3>
                                    <p className="text-sm text-gray-500">{invoice.order.orderNumber}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPaid ? "bg-green-100 text-green-700" :
                                    isOverdue ? "bg-red-100 text-red-700" :
                                        "bg-yellow-100 text-yellow-700"
                                    }`}>
                                    {invoice.status}
                                </span>
                            </div>

                            {/* Stokis Info */}
                            <div className="mb-3">
                                <p className="font-medium text-gray-800">{invoice.order.stokis.name}</p>
                                <p className="text-sm text-gray-500">{invoice.order.stokis.email}</p>
                            </div>

                            {/* Amount & Due Date */}
                            <div className="flex items-end justify-between mb-4">
                                <div>
                                    <p className="text-xs text-gray-500">Jatuh Tempo</p>
                                    <p className="font-medium text-gray-800">{formatDate(invoice.dueDate)}</p>
                                    {isUnpaid && daysUntilDue <= 7 && daysUntilDue > 0 && (
                                        <p className="text-xs text-red-600 font-medium">{daysUntilDue} hari lagi</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(invoice.amount)}</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-3 border-t">
                                <Link
                                    href={`/invoice/${invoice.id}`}
                                    target="_blank"
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                >
                                    <Printer size={16} /> Print
                                </Link>
                                {(isUnpaid || isOverdue) && (
                                    <button
                                        onClick={() => handleMarkAsPaid(invoice.id)}
                                        disabled={updatingId === invoice.id}
                                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm font-medium"
                                    >
                                        {updatingId === invoice.id ? "..." : "✓ Mark Paid"}
                                    </button>
                                )}
                                {isPaid && (
                                    <div className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-1">
                                        <CheckCircle size={16} /> Lunas
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Empty State */}
            {filteredInvoices.length === 0 && (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">Tidak ada invoice ditemukan</p>
                </div>
            )}
        </div>
    )
}
