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
}

interface StatCard {
    label: string
    value: number
    icon: React.ComponentType<{ size?: number; className?: string }>
    gradient: string
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

    useEffect(() => {
        async function fetchStats() {
            setLoading(true)
            try {
                if (role === "PUSAT") {
                    const res = await fetch(`/api/analytics/dashboard?start=${startDate}&end=${endDate}`)
                    if (res.ok) {
                        const data: DashboardStats = await res.json()
                        setStats([
                            { label: "Total Mitra", value: data.totalMitra, icon: Users, gradient: "from-blue-500 to-blue-600" },
                            { label: "Total Stokis", value: data.totalStokis, icon: Store, gradient: "from-emerald-500 to-teal-600" },
                            { label: "Total DC", value: data.totalDC, icon: Building2, gradient: "from-indigo-500 to-purple-600" },
                            { label: "Gudang Aktif", value: data.totalGudang, icon: Warehouse, gradient: "from-amber-500 to-orange-600" },
                        ])
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
                <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(stats.length, 4)} gap-4`}>
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white relative overflow-hidden shadow-md hover:shadow-lg transition-all`}
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <stat.icon size={16} className="opacity-80" />
                                    <span className="text-white/80 text-xs font-medium">{stat.label}</span>
                                </div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                            </div>
                        </div>
                    ))}
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

            {/* Info Cards */}
            <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                            <Activity size={16} className="text-gray-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">Ringkasan</h2>
                    </div>
                    <div className="text-center py-6">
                        <Activity size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-400 text-sm">Lihat laporan di menu Laporan</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                            <TrendingUp size={16} className="text-emerald-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">Aktivitas Terbaru</h2>
                    </div>
                    <div className="text-center py-6">
                        <TrendingUp size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-400 text-sm">Belum ada aktivitas</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
