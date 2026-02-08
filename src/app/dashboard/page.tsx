"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect, useMemo } from "react"
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

interface MitraOrder {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    createdAt: string
}

type PeriodFilter = "7" | "30" | "90" | "custom"

interface StatCard {
    label: string
    value: number | string
    subtitle?: string
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

    // MITRA-specific state
    const [mitraOrders, setMitraOrders] = useState<MitraOrder[]>([])
    const [mitraPeriod, setMitraPeriod] = useState<PeriodFilter>("30")
    const [mitraStartDate, setMitraStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split("T")[0]
    })
    const [mitraEndDate, setMitraEndDate] = useState(() => new Date().toISOString().split("T")[0])

    // Update MITRA date range when period changes
    useEffect(() => {
        if (role === "MITRA" && mitraPeriod !== "custom") {
            const end = new Date()
            const start = new Date()
            start.setDate(start.getDate() - parseInt(mitraPeriod))
            setMitraEndDate(end.toISOString().split("T")[0])
            setMitraStartDate(start.toISOString().split("T")[0])
        }
    }, [role, mitraPeriod])

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
                            { label: "Order Pending", value: data.pendingOrders, icon: ShoppingCart, gradient: "from-[#E31E24] to-[#B91C22]", href: "/dashboard/orders-stokis" },
                            { label: "Total Mitra", value: data.totalMitra, icon: Users, gradient: "from-[#5B2B4E] to-[#3D1C34]" },
                            { label: "Total Stokis", value: data.totalStokis, icon: Store, gradient: "from-[#E31E24] to-[#5B2B4E]" },
                            { label: "Total DC", value: data.totalDC, icon: Building2, gradient: "from-[#5B2B4E] to-[#E31E24]" },
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
                            { label: "Menunggu Approval", value: data.pendingOrders || 0, icon: ShoppingCart, gradient: "from-[#5B2B4E] to-[#3D1C34]" },
                            { label: "Total Invoice", value: data.invoiceCount?.stokis || 0, icon: Activity, gradient: "from-[#E31E24] to-[#B91C22]" },
                        ])
                    }
                } else if (role === "DC") {
                    // DC-specific stats
                    setStats([
                        { label: "Stokis Area", value: 0, icon: Store, gradient: "from-[#E31E24] to-[#5B2B4E]" },
                        { label: "Order Aktif", value: 0, icon: ShoppingCart, gradient: "from-[#5B2B4E] to-[#3D1C34]" },
                    ])
                } else if (role === "GUDANG") {
                    const res = await fetch("/api/orders/stokis?status=PO_ISSUED")
                    const orders = res.ok ? await res.json() : []
                    setStats([
                        { label: "PO Masuk", value: Array.isArray(orders) ? orders.length : 0, icon: Package, gradient: "from-[#E31E24] to-[#B91C22]" },
                    ])
                } else if (role === "STOKIS") {
                    const [mitraRes, ordersRes] = await Promise.all([
                        fetch(`/api/users?role=MITRA&stokisId=${userId}`),
                        fetch(`/api/orders/stokis/my-orders`),
                    ])
                    const mitras = mitraRes.ok ? await mitraRes.json() : []
                    const allOrders = ordersRes.ok ? await ordersRes.json() : []

                    // Calculate Order Masuk (PO_ISSUED, PROCESSING, SHIPPED)
                    const orderMasuk = Array.isArray(allOrders)
                        ? allOrders.filter((o: { status: string }) => ["PO_ISSUED", "PROCESSING", "SHIPPED"].includes(o.status))
                        : []
                    const orderMasukTotal = orderMasuk.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    // Calculate Order Selesai (RECEIVED)
                    const orderSelesai = Array.isArray(allOrders)
                        ? allOrders.filter((o: { status: string }) => o.status === "RECEIVED")
                        : []
                    const orderSelesaiTotal = orderSelesai.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`

                    setStats([
                        { label: "Mitra Saya", value: Array.isArray(mitras) ? mitras.length : 0, icon: Users, gradient: "from-[#E31E24] to-[#B91C22]", href: "/dashboard/mitra" },
                        { label: "Order Masuk", value: formatRp(orderMasukTotal), subtitle: `${orderMasuk.length} PO`, icon: ShoppingCart, gradient: "from-[#5B2B4E] to-[#3D1C34]", href: "/dashboard/history-pusat" },
                        { label: "Order Selesai", value: formatRp(orderSelesaiTotal), subtitle: `${orderSelesai.length} PO`, icon: Package, gradient: "from-[#22C55E] to-[#16A34A]", href: "/dashboard/history-pusat" },
                    ])
                } else if (role === "MITRA") {
                    const res = await fetch("/api/orders/mitra/my-orders")
                    const orders = res.ok ? await res.json() : []
                    setMitraOrders(Array.isArray(orders) ? orders : [])
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

    // MITRA filtered orders and stats
    const mitraFilteredOrders = useMemo(() => {
        if (!mitraStartDate || !mitraEndDate) return mitraOrders
        const start = new Date(mitraStartDate)
        const end = new Date(mitraEndDate)
        end.setHours(23, 59, 59, 999)
        return mitraOrders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= start && orderDate <= end
        })
    }, [mitraOrders, mitraStartDate, mitraEndDate])

    const mitraStats = useMemo(() => {
        const totalNominal = mitraFilteredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
        const totalPO = mitraFilteredOrders.length
        return { totalNominal, totalPO }
    }, [mitraFilteredOrders])

    const formatMitraCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const formatMitraDate = (date: string) => {
        return new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(new Date(date))
    }

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

            {/* MITRA Dashboard Section */}
            {role === "MITRA" && (
                <>
                    {/* Date Filter */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-gray-700">
                                <Calendar size={18} className="text-gray-500" />
                                <span className="text-sm font-medium">Periode:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: "7", label: "7 Hari" },
                                    { value: "30", label: "30 Hari" },
                                    { value: "90", label: "90 Hari" },
                                    { value: "custom", label: "Custom" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setMitraPeriod(opt.value as PeriodFilter)}
                                        className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${mitraPeriod === opt.value
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {mitraPeriod === "custom" && (
                                <div className="flex items-center gap-2 ml-2">
                                    <input
                                        type="date"
                                        value={mitraStartDate}
                                        onChange={(e) => setMitraStartDate(e.target.value)}
                                        className="px-3 py-1.5 border rounded-lg text-sm text-gray-700"
                                    />
                                    <span className="text-gray-500">-</span>
                                    <input
                                        type="date"
                                        value={mitraEndDate}
                                        onChange={(e) => setMitraEndDate(e.target.value)}
                                        className="px-3 py-1.5 border rounded-lg text-sm text-gray-700"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    {loading ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="bg-gray-100 rounded-xl p-4 h-24 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-[#E31E24] to-[#B91C22] rounded-xl p-4 text-white relative overflow-hidden shadow-md">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={16} className="opacity-80" />
                                        <span className="text-white/80 text-xs font-medium">Total Order</span>
                                    </div>
                                    <p className="text-xl font-bold">{formatMitraCurrency(mitraStats.totalNominal)}</p>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-[#5B2B4E] to-[#3D1C34] rounded-xl p-4 text-white relative overflow-hidden shadow-md">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingCart size={16} className="opacity-80" />
                                        <span className="text-white/80 text-xs font-medium">Total PO</span>
                                    </div>
                                    <p className="text-xl font-bold">{mitraStats.totalPO}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orders Table */}
                    {!loading && (
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No PO</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {mitraFilteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                    <p>Belum ada order pada periode ini</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            mitraFilteredOrders.map((order) => (
                                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-gray-700">{formatMitraDate(order.createdAt)}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right">
                                                        {formatMitraCurrency(Number(order.totalAmount))}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Quick Action */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3">Aksi Cepat</h2>
                        <Link
                            href="/dashboard/order"
                            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
                        >
                            <ShoppingCart size={16} />
                            Buat Order
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </>
            )}

            {/* Stats Grid (for non-MITRA roles) */}
            {role !== "MITRA" && loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-100 rounded-xl p-4 h-24 animate-pulse" />
                    ))}
                </div>
            ) : role !== "MITRA" && (
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
                                    {stat.subtitle && (
                                        <p className="text-xs text-white/70 mt-0.5">{stat.subtitle}</p>
                                    )}
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

            {/* Quick Actions (for non-MITRA roles) */}
            {role !== "MITRA" && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Aksi Cepat</h2>
                    <div className="flex flex-wrap gap-2">
                        {role === "STOKIS" && (
                            <>
                                <Link
                                    href="/dashboard/order-pusat"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
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
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
                                >
                                    <ShoppingCart size={16} />
                                    Approve Order
                                    <ArrowUpRight size={14} />
                                </Link>
                                <Link
                                    href="/dashboard/reports"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #5B2B4E 0%, #3D1C34 100%)' }}
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
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #5B2B4E 0%, #3D1C34 100%)' }}
                                >
                                    <ShoppingCart size={16} />
                                    Approve PO
                                    <ArrowUpRight size={14} />
                                </Link>
                                <Link
                                    href="/dashboard/invoices"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
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
                                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
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
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #5B2B4E 0%, #E31E24 100%)' }}
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
            )}

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
