"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import {
    Users,
    Store,
    Warehouse,
    ShoppingCart,
    TrendingUp,
    Package,
    ArrowUpRight,
    Activity,
    Calendar,
    Building2
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
    totalMitra: number
    totalStokis: number
    totalDC: number
    totalGudang: number
    pendingOrders: number
    invoiceCount: {
        dc: number
        stokis: number
        mitra: number
    }
    revenue?: {
        dc: number
        stokis: number
        mitra: number
    }
    outstanding?: {
        dc: { count: number; amount: number }
        stokis: { count: number; amount: number }
    }
}

interface RecentOrder {
    id: string
    orderNumber: string
    stokisName: string
    totalAmount: number
    status: string
    createdAt: string
}

interface StatCard {
    label: string
    value: number
    icon: React.ComponentType<{ size?: number; className?: string }>
    gradient: string
    href?: string
}

export default function DashboardPage() {
    const { data: session } = useSession()
    const role = session?.user?.role || "MITRA"
    const userId = session?.user?.id || ""

    // Date range state for PUSAT
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split("T")[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0])

    const [stats, setStats] = useState<StatCard[]>([])
    const [loading, setLoading] = useState(true)
    const [summaryData, setSummaryData] = useState<DashboardStats | null>(null)
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])

    useEffect(() => {
        async function fetchStats() {
            setLoading(true)
            try {
                if (role === "PUSAT") {
                    const [dashRes, ordersRes] = await Promise.all([
                        fetch(`/api/analytics/dashboard?start=${startDate}&end=${endDate}`),
                        fetch(`/api/orders/stokis?limit=5`)
                    ])

                    if (dashRes.ok) {
                        const data: DashboardStats = await dashRes.json()
                        setSummaryData(data)
                        setStats([
                            { label: "Order Pending", value: data.pendingOrders, icon: ShoppingCart, gradient: "from-rose-500 to-pink-600", href: "/dashboard/orders-stokis" },
                            { label: "Total Mitra", value: data.totalMitra, icon: Users, gradient: "from-blue-500 to-blue-600" },
                            { label: "Total Stokis", value: data.totalStokis, icon: Store, gradient: "from-emerald-500 to-teal-600" },
                            { label: "Total DC", value: data.totalDC, icon: Building2, gradient: "from-indigo-500 to-purple-600" },
                            { label: "Gudang Aktif", value: data.totalGudang, icon: Warehouse, gradient: "from-amber-500 to-orange-600" },
                        ])
                    }

                    if (ordersRes.ok) {
                        const orders = await ordersRes.json()
                        if (Array.isArray(orders)) {
                            setRecentOrders(orders.slice(0, 5).map((o: { id: string; orderNumber: string; stokis?: { name: string }; totalAmount: number; status: string; createdAt: string }) => ({
                                id: o.id,
                                orderNumber: o.orderNumber,
                                stokisName: o.stokis?.name || "-",
                                totalAmount: Number(o.totalAmount),
                                status: o.status,
                                createdAt: o.createdAt
                            })))
                        }
                    }
                } else if (role === "FINANCE") {
                    const res = await fetch(`/api/analytics/dashboard?start=${startDate}&end=${endDate}`)
                    if (res.ok) {
                        const data = await res.json()
                        setStats([
                            { label: "Menunggu Approval", value: data.pendingOrders || 0, icon: ShoppingCart, gradient: "from-purple-500 to-violet-600" },
                            { label: "Total Invoice", value: data.invoiceCount?.stokis || 0, icon: Activity, gradient: "from-blue-500 to-blue-600" },
                        ])
                    }
                } else if (role === "DC") {
                    // DC-specific stats
                    setStats([
                        { label: "Stokis Area", value: 0, icon: Store, gradient: "from-emerald-500 to-teal-600" },
                        { label: "Order Aktif", value: 0, icon: ShoppingCart, gradient: "from-blue-500 to-blue-600" },
                    ])
                } else if (role === "GUDANG") {
                    const res = await fetch("/api/orders/stokis?status=PO_ISSUED")
                    const orders = res.ok ? await res.json() : []
                    setStats([
                        { label: "PO Masuk", value: Array.isArray(orders) ? orders.length : 0, icon: Package, gradient: "from-blue-500 to-blue-600" },
                    ])
                } else if (role === "STOKIS") {
                    const [mitraRes, orderRes, invRes] = await Promise.all([
                        fetch(`/api/users?role=MITRA&stokisId=${userId}`),
                        fetch(`/api/orders/mitra?status=PENDING`),
                        fetch(`/api/inventory`),
                    ])
                    const mitras = mitraRes.ok ? await mitraRes.json() : []
                    const orders = orderRes.ok ? await orderRes.json() : []
                    const inventory = invRes.ok ? await invRes.json() : []
                    setStats([
                        { label: "Mitra Saya", value: Array.isArray(mitras) ? mitras.length : 0, icon: Users, gradient: "from-orange-500 to-red-500" },
                        { label: "Order Masuk", value: Array.isArray(orders) ? orders.length : 0, icon: ShoppingCart, gradient: "from-emerald-500 to-teal-600" },
                        { label: "Item Inventory", value: Array.isArray(inventory) ? inventory.length : 0, icon: Package, gradient: "from-blue-500 to-blue-600" },
                    ])
                } else if (role === "MITRA") {
                    const [pendingRes, totalRes] = await Promise.all([
                        fetch("/api/orders/mitra?status=PENDING,APPROVED,PROCESSING,SHIPPED"),
                        fetch("/api/orders/mitra"),
                    ])
                    const pending = pendingRes.ok ? await pendingRes.json() : []
                    const total = totalRes.ok ? await totalRes.json() : []
                    setStats([
                        { label: "Order Aktif", value: Array.isArray(pending) ? pending.length : 0, icon: ShoppingCart, gradient: "from-orange-500 to-red-500" },
                        { label: "Total Order", value: Array.isArray(total) ? total.length : 0, icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
                    ])
                }
            } catch (error) {
                console.error("Error fetching stats:", error)
            } finally {
                setLoading(false)
            }
        }

        if (session?.user) {
            fetchStats()
        }
    }, [role, userId, startDate, endDate, session])

    return (
        <div className="space-y-5">
            {/* Page Title */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm">Selamat datang, {session?.user?.name}</p>
            </div>

            {/* Date Range Picker for PUSAT */}
            {role === "PUSAT" && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <Calendar size={18} className="text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium">Periode:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-100 rounded-xl p-4 h-24 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(stats.length, 5)} gap-4`}>
                    {stats.map((stat, index) => {
                        const CardContent = (
                            <>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <stat.icon size={16} className="opacity-80" />
                                        <span className="text-white/80 text-xs font-medium">{stat.label}</span>
                                    </div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                </div>
                            </>
                        )

                        return stat.href ? (
                            <Link
                                key={index}
                                href={stat.href}
                                className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white relative overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer`}
                            >
                                {CardContent}
                            </Link>
                        ) : (
                            <div
                                key={index}
                                className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white relative overflow-hidden shadow-md hover:shadow-lg transition-all`}
                            >
                                {CardContent}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Aksi Cepat</h2>
                <div className="flex flex-wrap gap-2">
                    {role === "MITRA" && (
                        <Link
                            href="/dashboard/order"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-sm font-medium"
                        >
                            <ShoppingCart size={16} />
                            Buat Order
                            <ArrowUpRight size={14} />
                        </Link>
                    )}
                    {role === "STOKIS" && (
                        <>
                            <Link
                                href="/dashboard/order-pusat"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm text-sm font-medium"
                            >
                                <ShoppingCart size={16} />
                                Order ke Pusat
                                <ArrowUpRight size={14} />
                            </Link>
                            <Link
                                href="/dashboard/order-mitra"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                            >
                                <Store size={16} />
                                Order Mitra
                            </Link>
                        </>
                    )}
                    {role === "PUSAT" && (
                        <>
                            <Link
                                href="/dashboard/orders-stokis"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-sm font-medium"
                            >
                                <ShoppingCart size={16} />
                                Approve Order
                                <ArrowUpRight size={14} />
                            </Link>
                            <Link
                                href="/dashboard/reports"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm text-sm font-medium"
                            >
                                <TrendingUp size={16} />
                                Laporan
                                <ArrowUpRight size={14} />
                            </Link>
                        </>
                    )}
                    {role === "FINANCE" && (
                        <>
                            <Link
                                href="/dashboard/approve-po"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm text-sm font-medium"
                            >
                                <ShoppingCart size={16} />
                                Approve PO
                                <ArrowUpRight size={14} />
                            </Link>
                            <Link
                                href="/dashboard/invoices"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-sm font-medium"
                            >
                                <Activity size={16} />
                                Invoice
                                <ArrowUpRight size={14} />
                            </Link>
                        </>
                    )}
                    {role === "GUDANG" && (
                        <Link
                            href="/dashboard/po-masuk"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-sm font-medium"
                        >
                            <Package size={16} />
                            Proses PO
                            <ArrowUpRight size={14} />
                        </Link>
                    )}
                    {role === "DC" && (
                        <>
                            <Link
                                href="/dashboard/dc-stokis"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm text-sm font-medium"
                            >
                                <Store size={16} />
                                Kelola Stokis
                                <ArrowUpRight size={14} />
                            </Link>
                            <Link
                                href="/dashboard/dc-orders"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                            >
                                <ShoppingCart size={16} />
                                Monitoring Order
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Info Cards - Only for PUSAT role */}
            {role === "PUSAT" && (
                <div className="grid lg:grid-cols-2 gap-4">
                    {/* Revenue Summary */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <TrendingUp size={16} className="text-blue-600" />
                            </div>
                            <h2 className="text-sm font-semibold text-gray-900">Ringkasan Revenue</h2>
                        </div>
                        {summaryData ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Revenue Stokis</span>
                                    <span className="text-sm font-semibold text-emerald-600">
                                        Rp {(summaryData.revenue?.stokis || 0).toLocaleString("id-ID")}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Invoice Outstanding</span>
                                    <span className="text-sm font-semibold text-amber-600">
                                        {summaryData.outstanding?.stokis?.count || 0} invoice
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">Total Outstanding</span>
                                    <span className="text-sm font-semibold text-rose-600">
                                        Rp {(summaryData.outstanding?.stokis?.amount || 0).toLocaleString("id-ID")}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Activity size={24} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-gray-400 text-sm">Memuat data...</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                    <ShoppingCart size={16} className="text-emerald-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-900">Order Terbaru</h2>
                            </div>
                            <Link href="/dashboard/orders-stokis" className="text-xs text-blue-600 hover:underline">
                                Lihat Semua
                            </Link>
                        </div>
                        {recentOrders.length > 0 ? (
                            <div className="space-y-2">
                                {recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                                            <p className="text-xs text-gray-500">{order.stokisName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">
                                                Rp {order.totalAmount.toLocaleString("id-ID")}
                                            </p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === "RECEIVED" ? "bg-emerald-100 text-emerald-700" :
                                                    order.status === "PENDING_PUSAT" ? "bg-amber-100 text-amber-700" :
                                                        order.status === "PO_ISSUED" ? "bg-blue-100 text-blue-700" :
                                                            "bg-gray-100 text-gray-600"
                                                }`}>
                                                {order.status.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <ShoppingCart size={24} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-gray-400 text-sm">Belum ada order</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
