"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ShoppingCart, Search, Clock, CheckCircle, Truck, Package } from "lucide-react"

interface Order {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    createdAt: string
    stokis: {
        name: string
    }
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING_PUSAT: { label: "Menunggu Pusat", color: "bg-yellow-100 text-yellow-700", icon: <Clock size={14} /> },
    PO_ISSUED: { label: "PO Issued", color: "bg-blue-100 text-blue-700", icon: <Package size={14} /> },
    PROCESSING: { label: "Diproses", color: "bg-purple-100 text-purple-700", icon: <Package size={14} /> },
    SHIPPED: { label: "Dikirim", color: "bg-indigo-100 text-indigo-700", icon: <Truck size={14} /> },
    RECEIVED: { label: "Diterima", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle size={14} /> },
    CANCELLED: { label: "Dibatalkan", color: "bg-red-100 text-red-700", icon: <Clock size={14} /> },
}

export default function DCOrdersPage() {
    const { data: session } = useSession()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")

    useEffect(() => {
        async function fetchOrders() {
            try {
                const url = statusFilter === "ALL"
                    ? "/api/orders/stokis"
                    : `/api/orders/stokis?status=${statusFilter}`
                const res = await fetch(url)
                if (res.ok) {
                    const data = await res.json()
                    setOrders(Array.isArray(data) ? data : [])
                }
            } catch (error) {
                console.error("Error fetching orders:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchOrders()
    }, [statusFilter])

    const filteredOrders = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.stokis?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    if (session?.user?.role !== "DC") {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500">Anda tidak memiliki akses ke halaman ini</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Monitoring Order</h1>
                <p className="text-gray-500 text-sm">Pantau order dari stokis dalam area Anda</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari order..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="ALL">Semua Status</option>
                    <option value="PENDING_PUSAT">Menunggu Pusat</option>
                    <option value="PO_ISSUED">PO Issued</option>
                    <option value="PROCESSING">Diproses</option>
                    <option value="SHIPPED">Dikirim</option>
                    <option value="RECEIVED">Diterima</option>
                </select>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                        <p className="text-gray-400 mt-2 text-sm">Memuat data...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="p-8 text-center">
                        <ShoppingCart size={40} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-400">Tidak ada order ditemukan</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {filteredOrders.map((order) => {
                            const config = statusConfig[order.status] || statusConfig.PENDING_PUSAT
                            return (
                                <li key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-medium text-gray-900">
                                                    {order.orderNumber}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${config.color}`}>
                                                    {config.icon}
                                                    {config.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {order.stokis?.name || "Unknown"} • {new Date(order.createdAt).toLocaleDateString("id-ID")}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</p>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
