"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
    Receipt,
    CheckCircle,
    Clock,
    AlertTriangle,
    Printer,
    Search,
    ArrowLeft,
    MapPin
} from "lucide-react"

interface Invoice {
    id: string
    invoiceNumber: string
    amount: number
    paidAmount: number
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
    const { data: session } = useSession()
    const role = session?.user?.role || ""
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("ALL")
    const [search, setSearch] = useState("")
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [dcFilter, setDcFilter] = useState("")
    const [dcList, setDcList] = useState<{ id: string; name: string }[]>([])

    // Fetch DC list for FINANCE_ALL / MANAGER_PUSAT filter
    useEffect(() => {
        if (role === "FINANCE_ALL" || role === "MANAGER_PUSAT") {
            fetch("/api/dc").then(r => r.json()).then(data => {
                if (Array.isArray(data)) setDcList(data)
            }).catch(() => { })
        }
    }, [role])

    useEffect(() => {
        fetchInvoices()
    }, [filter, dcFilter])

    const fetchInvoices = async () => {
        try {
            const params = new URLSearchParams()
            if (filter !== "ALL") {
                // "Belum Lunas" should include both UNPAID and OVERDUE
                const statusValue = filter === "UNPAID" ? "UNPAID,OVERDUE" : filter
                params.set("status", statusValue)
            }
            if (dcFilter) params.set("dcFilter", dcFilter)
            const url = `/api/invoices${params.toString() ? `?${params}` : ""}`
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
        if (!confirm("Tandai invoice ini sebagai Lunas?")) return

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

    // Calculate stats for 3-card layout: Total, Lunas, Belum Lunas
    const paidInvoices = invoices.filter(i => i.status === "PAID")
    const unpaidInvoices = invoices.filter(i => i.status === "UNPAID" || i.status === "OVERDUE")

    const stats = {
        // Total
        totalCount: invoices.length,
        totalAmount: invoices.reduce((sum, i) => sum + Number(i.amount), 0),
        // Lunas
        lunasCount: paidInvoices.length,
        lunasAmount: paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
        // Belum Lunas
        belumLunasCount: unpaidInvoices.length,
        belumLunasAmount: unpaidInvoices.reduce((sum, i) => sum + (Number(i.amount) - Number(i.paidAmount)), 0)
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

            {/* Stats Cards - 3 Cards: Total, Lunas, Belum Lunas */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Total */}
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 md:w-12 h-10 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                        <Receipt size={14} className="opacity-80 md:w-[16px] md:h-[16px]" />
                        <span className="text-[10px] md:text-xs text-white/80">Total</span>
                    </div>
                    <p className="text-sm md:text-xl font-bold truncate">{formatCurrency(stats.totalAmount)}</p>
                    <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">{stats.totalCount} PO</p>
                </div>

                {/* Lunas */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 md:w-12 h-10 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                        <CheckCircle size={14} className="opacity-80 md:w-[16px] md:h-[16px]" />
                        <span className="text-[10px] md:text-xs text-white/80">Lunas</span>
                    </div>
                    <p className="text-sm md:text-xl font-bold truncate">{formatCurrency(stats.lunasAmount)}</p>
                    <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">{stats.lunasCount} PO</p>
                </div>

                {/* Belum Lunas */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 md:p-4 text-white relative overflow-hidden col-span-2 lg:col-span-1">
                    <div className="absolute top-0 right-0 w-10 md:w-12 h-10 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                        <AlertTriangle size={14} className="opacity-80 md:w-[16px] md:h-[16px]" />
                        <span className="text-[10px] md:text-xs text-white/80">Belum Lunas</span>
                    </div>
                    <p className="text-sm md:text-xl font-bold truncate">{formatCurrency(stats.belumLunasAmount)}</p>
                    <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">{stats.belumLunasCount} PO</p>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h2 className="font-semibold text-gray-800">Daftar Invoice</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Cari invoice..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 pl-9 pr-4 border rounded-lg w-full sm:w-64 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                        {(role === "FINANCE_ALL" || role === "MANAGER_PUSAT") && dcList.length > 0 && (
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    value={dcFilter}
                                    onChange={(e) => setDcFilter(e.target.value)}
                                    className="h-10 pl-9 pr-4 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                >
                                    <option value="">Semua Area DC</option>
                                    {dcList.map(dc => (
                                        <option key={dc.id} value={dc.id}>{dc.name.replace(/^Admin\s*/i, "DC ")}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-10 px-4 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="PAID">Lunas</option>
                            <option value="UNPAID">Belum Lunas</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Invoice List */}
            {filteredInvoices.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">Tidak ada invoice ditemukan</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px]">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nomor PO</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Konsumen</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Nominal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredInvoices.map((invoice) => {
                                    const isPaid = invoice.status === "PAID"
                                    const daysSinceCreated = Math.floor((new Date().getTime() - new Date(invoice.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                                    const isOverdue = !isPaid && daysSinceCreated > 20
                                    const statusColor = isPaid
                                        ? "bg-green-100 text-green-700"
                                        : isOverdue
                                            ? "bg-red-100 text-red-700"
                                            : "bg-yellow-100 text-yellow-700"
                                    const statusLabel = isPaid ? "Lunas" : isOverdue ? `Jatuh Tempo` : "Belum Lunas"
                                    return (
                                        <tr key={invoice.id} className={`transition-colors ${isOverdue ? "bg-red-50 hover:bg-red-100/70" : "hover:bg-gray-50"}`}>
                                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(invoice.createdAt)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                                                <p className="text-xs text-gray-500">{invoice.order.orderNumber}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{invoice.order.stokis.name}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right whitespace-nowrap">{formatCurrency(invoice.amount)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                                    {isOverdue && <AlertTriangle size={12} />}
                                                    {statusLabel}
                                                </span>
                                                {isOverdue && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">{daysSinceCreated} hari sejak terbit</p>
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
        </div>
    )
}
