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
import { toLocalDateString } from "@/lib/utils"

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

interface MitraOrderItem {
    id: string
    quantity: number
    price: number
    product: { name: string; unit: string }
}

interface MitraOrder {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    notes: string | null
    createdAt: string
    stokis: { name: string }
    items: MitraOrderItem[]
}

type PeriodFilter = "7" | "30" | "90" | "custom"

interface AreaStats {
    dcName: string
    dcId: string
    stokisCount: number
    mitraCount: number
    totalOrders: number
    totalRevenue: number
    pendingOrders: number
}

const mitraStatusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Buat PO", color: "bg-yellow-100 text-yellow-700" },
    APPROVED: { label: "Selesai", color: "bg-green-100 text-green-700" },
    PROCESSING: { label: "Selesai", color: "bg-green-100 text-green-700" },
    SHIPPED: { label: "Selesai", color: "bg-green-100 text-green-700" },
    RECEIVED: { label: "Selesai", color: "bg-green-100 text-green-700" },
}

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
    const [pusatPeriod, setPusatPeriod] = useState<string>("30")
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return toLocalDateString(d)
    })
    const [endDate, setEndDate] = useState(() => toLocalDateString())

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
        return toLocalDateString(d)
    })
    const [mitraEndDate, setMitraEndDate] = useState(() => toLocalDateString())
    const [selectedMitraOrder, setSelectedMitraOrder] = useState<MitraOrder | null>(null)

    // FINANCE_ALL state
    const [areaStats, setAreaStats] = useState<AreaStats[]>([])
    const [financeAllTotals, setFinanceAllTotals] = useState({ totalOrders: 0, totalRevenue: 0, totalStokis: 0, totalMitra: 0 })
    const [mitraUpdating, setMitraUpdating] = useState(false)

    // Update MITRA date range when period changes
    useEffect(() => {
        if (role === "MITRA" && mitraPeriod !== "custom") {
            const end = new Date()
            const start = new Date()
            start.setDate(start.getDate() - parseInt(mitraPeriod))
            setMitraEndDate(toLocalDateString(end))
            setMitraStartDate(toLocalDateString(start))
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
                            // Filter orders by date range
                            const from = new Date(startDate)
                            from.setHours(0, 0, 0, 0)
                            const to = new Date(endDate)
                            to.setHours(23, 59, 59, 999)
                            const filtered = orders.filter((o: { createdAt: string }) => {
                                const d = new Date(o.createdAt)
                                return d >= from && d <= to
                            })
                            setRecentOrders(filtered.slice(0, 5).map((o: { id: string; orderNumber: string; stokis?: { name: string }; totalAmount: number; status: string; createdAt: string }) => ({
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
                    // Fetch stokis orders for Finance dashboard
                    const stokisRes = await fetch(`/api/orders/stokis`)
                    const stokisOrders = stokisRes.ok ? await stokisRes.json() : []

                    const allOrders = Array.isArray(stokisOrders) ? stokisOrders : []
                    const totalAmount = allOrders.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)
                    const pending = allOrders.filter((o: { status: string }) => o.status === "PENDING_PUSAT")
                    const pendingTotal = pending.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`

                    setStats([
                        { label: "Total", value: formatRp(totalAmount), subtitle: `${allOrders.length} PO`, icon: Store, gradient: "from-[#3B82F6] to-[#1D4ED8]", href: "/dashboard/approve-po" },
                        { label: "Menunggu Approval", value: formatRp(pendingTotal), subtitle: `${pending.length} PO`, icon: ShoppingCart, gradient: "from-[#F59E0B] to-[#D97706]", href: "/dashboard/approve-po" },
                    ])
                } else if (role === "FINANCE_ALL" || role === "MANAGER_PUSAT") {
                    // FINANCE_ALL: Global view — fetch all orders + users, group by DC area
                    const [stokisRes, mitraRes, usersRes] = await Promise.all([
                        fetch(`/api/orders/stokis`),
                        fetch(`/api/orders/mitra`),
                        fetch(`/api/users?includeAll=true`)
                    ])
                    const stokisOrders = stokisRes.ok ? await stokisRes.json() : []
                    const mitraOrders = mitraRes.ok ? await mitraRes.json() : []
                    const allUsers = usersRes.ok ? await usersRes.json() : []

                    const allStokisOrders = Array.isArray(stokisOrders) ? stokisOrders : []
                    const allMitraOrders = Array.isArray(mitraOrders) ? mitraOrders : []
                    const users = Array.isArray(allUsers) ? allUsers : []

                    // Get all DC users
                    const dcUsers = users.filter((u: { role: string }) => u.role === "DC")
                    const stokisUsers = users.filter((u: { role: string }) => u.role === "STOKIS")
                    const mitraUsers = users.filter((u: { role: string }) => u.role === "MITRA")

                    // Group by DC area
                    const areas: AreaStats[] = dcUsers.map((dc: { id: string; name: string }) => {
                        // Stokis in this DC area
                        const areaStokis = stokisUsers.filter((s: { dcId: string | null }) => s.dcId === dc.id)
                        const areaStokisIds = areaStokis.map((s: { id: string }) => s.id)

                        // Mitra assigned to stokis in this area
                        const areaMitra = mitraUsers.filter((m: { stokisId: string | null }) =>
                            m.stokisId && areaStokisIds.includes(m.stokisId)
                        )

                        // Stokis orders from this area
                        const areaOrders = allStokisOrders.filter((o: { stokis?: { dcId?: string | null } }) =>
                            o.stokis?.dcId === dc.id
                        )
                        const areaRevenue = areaOrders.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)
                        const areaPending = areaOrders.filter((o: { status: string }) => o.status === "PENDING_PUSAT").length

                        return {
                            dcName: dc.name,
                            dcId: dc.id,
                            stokisCount: areaStokis.length,
                            mitraCount: areaMitra.length,
                            totalOrders: areaOrders.length,
                            totalRevenue: areaRevenue,
                            pendingOrders: areaPending,
                        }
                    })

                    // Sort by revenue descending
                    areas.sort((a, b) => b.totalRevenue - a.totalRevenue)
                    setAreaStats(areas)

                    const totalRevenue = allStokisOrders.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)
                    setFinanceAllTotals({
                        totalOrders: allStokisOrders.length,
                        totalRevenue,
                        totalStokis: stokisUsers.length,
                        totalMitra: mitraUsers.length,
                    })

                    const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`
                    setStats([
                        { label: "Total Revenue", value: formatRp(totalRevenue), subtitle: `${allStokisOrders.length} PO`, icon: TrendingUp, gradient: "from-[#5B2B4E] to-[#3D1C34]", href: "/dashboard/reports" },
                        { label: "Total Stokis", value: stokisUsers.length, subtitle: `${dcUsers.length} DC Area`, icon: Store, gradient: "from-[#E31E24] to-[#B91C22]" },
                        { label: "Total Mitra", value: mitraUsers.length, icon: Users, gradient: "from-[#3B82F6] to-[#1D4ED8]" },
                    ])
                } else if (role === "FINANCE_DC") {
                    const stokisRes = await fetch(`/api/orders/stokis`)
                    const stokisOrders = stokisRes.ok ? await stokisRes.json() : []

                    const allOrders = Array.isArray(stokisOrders) ? stokisOrders : []
                    const totalAmount = allOrders.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)
                    const pending = allOrders.filter((o: { status: string }) => o.status === "PENDING_PUSAT")
                    const pendingAmount = pending.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`

                    setStats([
                        { label: "Total", value: formatRp(totalAmount), subtitle: `${allOrders.length} PO`, icon: Package, gradient: "from-[#E31E24] to-[#B91C22]", href: "/dashboard/orders-stokis" },
                        { label: "Menunggu Approval", value: formatRp(pendingAmount), subtitle: `${pending.length} PO`, icon: ShoppingCart, gradient: "from-[#F59E0B] to-[#D97706]", href: "/dashboard/approve-po" },
                    ])
                } else if (role === "DC") {
                    // DC-specific stats: fetch real data
                    const [usersRes, ordersRes] = await Promise.all([
                        fetch("/api/users?role=STOKIS"),
                        fetch("/api/orders/stokis")
                    ])
                    const stokisUsers = usersRes.ok ? await usersRes.json() : []
                    const dcOrders = ordersRes.ok ? await ordersRes.json() : []
                    const stokisCount = Array.isArray(stokisUsers) ? stokisUsers.length : 0
                    const activeOrders = Array.isArray(dcOrders)
                        ? dcOrders.filter((o: { status: string }) => !["CANCELLED", "RECEIVED"].includes(o.status))
                        : []

                    const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`
                    const totalRevenue = Array.isArray(dcOrders)
                        ? dcOrders.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)
                        : 0
                    const pendingCount = Array.isArray(dcOrders)
                        ? dcOrders.filter((o: { status: string }) => o.status === "PENDING_PUSAT").length
                        : 0

                    setStats([
                        { label: "Stokis Area", value: stokisCount, icon: Store, gradient: "from-[#E31E24] to-[#5B2B4E]", href: "/dashboard/dc-stokis" },
                        { label: "Order Aktif", value: activeOrders.length, subtitle: `${pendingCount} pending`, icon: ShoppingCart, gradient: "from-[#5B2B4E] to-[#3D1C34]", href: "/dashboard/approve-po" },
                        { label: "Total Revenue", value: formatRp(totalRevenue), subtitle: `${Array.isArray(dcOrders) ? dcOrders.length : 0} PO`, icon: TrendingUp, gradient: "from-[#3B82F6] to-[#1D4ED8]", href: "/dashboard/reports" },
                    ])
                } else if (role === "GUDANG") {
                    const ordersRes = await fetch("/api/orders/stokis")
                    const orders = ordersRes.ok ? await ordersRes.json() : []

                    const pendingApproval = Array.isArray(orders) ? orders.filter((o: { status: string }) => o.status === "PENDING_PUSAT").length : 0
                    const poIssued = Array.isArray(orders) ? orders.filter((o: { status: string }) => o.status === "PO_ISSUED") : []
                    const processing = Array.isArray(orders) ? orders.filter((o: { status: string }) => o.status === "PROCESSING") : []

                    // Count today's shipped
                    const today = toLocalDateString()
                    const shippedToday = Array.isArray(orders) ? orders.filter((o: { status: string; shippedAt?: string }) =>
                        o.status === "SHIPPED" && o.shippedAt && o.shippedAt.startsWith(today)
                    ).length : 0

                    setStats([
                        { label: "PO Masuk", value: poIssued.length, icon: Package, gradient: "from-[#E31E24] to-[#B91C22]", href: "/dashboard/po-masuk" },
                        { label: "Sedang Diproses", value: processing.length, icon: Activity, gradient: "from-[#8B5CF6] to-[#6D28D9]", href: "/dashboard/po-masuk" },
                        { label: "Terkirim Hari Ini", value: shippedToday, icon: Package, gradient: "from-[#10B981] to-[#059669]" },
                        { label: "Menunggu Approval", value: pendingApproval, subtitle: "Belum disetujui", icon: Package, gradient: "from-[#F59E0B] to-[#D97706]", href: "/dashboard/po-masuk" },
                    ])

                    // Recent activity - last 5 orders
                    if (Array.isArray(orders)) {
                        setRecentOrders(orders.slice(0, 5).map((o: { id: string; orderNumber: string; stokis?: { name: string }; totalAmount: number; status: string; createdAt: string }) => ({
                            id: o.id,
                            orderNumber: o.orderNumber,
                            stokisName: o.stokis?.name || "-",
                            totalAmount: Number(o.totalAmount),
                            status: o.status,
                            createdAt: o.createdAt,
                        })))
                    }
                } else if (role === "STOKIS") {
                    const [ordersRes, mitraOrdersRes] = await Promise.all([
                        fetch(`/api/orders/stokis/my-orders`),
                        fetch(`/api/orders/mitra`),
                    ])
                    const stokisOrders = ordersRes.ok ? await ordersRes.json() : []
                    const mitraOrders = mitraOrdersRes.ok ? await mitraOrdersRes.json() : []

                    // --- Order ke Pusat ---
                    // Menunggu Konfirmasi (PENDING_PUSAT)
                    const pendingPusat = Array.isArray(stokisOrders)
                        ? stokisOrders.filter((o: { status: string }) => o.status === "PENDING_PUSAT")
                        : []
                    const pendingPusatTotal = pendingPusat.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    // Approved Order (PO_ISSUED, PROCESSING, SHIPPED, RECEIVED)
                    const approvedPusat = Array.isArray(stokisOrders)
                        ? stokisOrders.filter((o: { status: string }) => ["PO_ISSUED", "PROCESSING", "SHIPPED", "RECEIVED"].includes(o.status))
                        : []
                    const approvedPusatTotal = approvedPusat.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    // --- Order Mitra ---
                    // Belum Selesai (PENDING, APPROVED, PROCESSING)
                    const belumSelesai = Array.isArray(mitraOrders)
                        ? mitraOrders.filter((o: { status: string }) => ["PENDING", "APPROVED", "PROCESSING"].includes(o.status))
                        : []
                    const belumSelesaiTotal = belumSelesai.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    // Selesai (SHIPPED, RECEIVED)
                    const selesaiMitra = Array.isArray(mitraOrders)
                        ? mitraOrders.filter((o: { status: string }) => ["SHIPPED", "RECEIVED"].includes(o.status))
                        : []
                    const selesaiMitraTotal = selesaiMitra.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount), 0)

                    const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`

                    setStats([
                        { label: "Menunggu Konfirmasi", value: formatRp(pendingPusatTotal), subtitle: `${pendingPusat.length} PO`, icon: ShoppingCart, gradient: "from-[#F59E0B] to-[#D97706]", href: "/dashboard/history-pusat" },
                        { label: "Approved Order", value: formatRp(approvedPusatTotal), subtitle: `${approvedPusat.length} PO`, icon: Package, gradient: "from-[#3B82F6] to-[#1D4ED8]", href: "/dashboard/history-pusat" },
                        { label: "Belum Selesai", value: formatRp(belumSelesaiTotal), subtitle: `${belumSelesai.length} PO`, icon: Store, gradient: "from-[#EF4444] to-[#B91C1C]", href: "/dashboard/order-mitra" },
                        { label: "Selesai", value: formatRp(selesaiMitraTotal), subtitle: `${selesaiMitra.length} PO`, icon: TrendingUp, gradient: "from-[#22C55E] to-[#16A34A]", href: "/dashboard/order-mitra" },
                    ])
                } else if (role === "MITRA") {
                    const res = await fetch("/api/orders/mitra")
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
        // Filter out CANCELLED orders and apply date filter
        const activeOrders = mitraOrders.filter(order => order.status !== "CANCELLED")
        if (!mitraStartDate || !mitraEndDate) return activeOrders
        const start = new Date(mitraStartDate)
        const end = new Date(mitraEndDate)
        end.setHours(23, 59, 59, 999)
        return activeOrders.filter(order => {
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

    const fetchMitraOrders = async () => {
        const res = await fetch("/api/orders/mitra")
        const orders = res.ok ? await res.json() : []
        setMitraOrders(Array.isArray(orders) ? orders : [])
    }

    const handleMitraReceive = async (orderId: string) => {
        setMitraUpdating(true)
        try {
            const res = await fetch(`/api/orders/mitra/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "RECEIVED" }),
            })
            if (res.ok) {
                fetchMitraOrders()
                setSelectedMitraOrder(null)
            }
        } catch (err) {
            console.error("Error updating order:", err)
        } finally {
            setMitraUpdating(false)
        }
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
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Preset period selector */}
                        {pusatPeriod !== "custom" && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Periode:</label>
                                <select
                                    value={pusatPeriod}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setPusatPeriod(val)
                                        const end = new Date()
                                        const start = new Date()
                                        start.setDate(start.getDate() - parseInt(val))
                                        setStartDate(toLocalDateString(start))
                                        setEndDate(toLocalDateString(end))
                                    }}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="7">7 Hari</option>
                                    <option value="30">30 Hari</option>
                                    <option value="90">90 Hari</option>
                                    <option value="180">3 Bulan</option>
                                    <option value="365">1 Tahun</option>
                                </select>
                            </div>
                        )}

                        {/* Custom date range toggle */}
                        <button
                            onClick={() => {
                                if (pusatPeriod === "custom") {
                                    setPusatPeriod("30")
                                    const end = new Date()
                                    const start = new Date()
                                    start.setDate(start.getDate() - 30)
                                    setStartDate(toLocalDateString(start))
                                    setEndDate(toLocalDateString(end))
                                } else {
                                    setPusatPeriod("custom")
                                }
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${pusatPeriod === "custom"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            <Calendar size={14} />
                            Custom
                        </button>

                        {pusatPeriod === "custom" && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}
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
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {mitraFilteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                    <p>Belum ada order pada periode ini</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            mitraFilteredOrders.map((order) => {
                                                const status = mitraStatusConfig[order.status] || mitraStatusConfig.PENDING
                                                return (
                                                    <tr
                                                        key={order.id}
                                                        onClick={() => setSelectedMitraOrder(order)}
                                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-4 py-3 text-sm text-gray-700">{formatMitraDate(order.createdAt)}</td>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right">
                                                            {formatMitraCurrency(Number(order.totalAmount))}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Order Detail Modal */}
                    {selectedMitraOrder && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">{selectedMitraOrder.orderNumber}</h2>
                                            <p className="text-sm text-gray-500">{formatMitraDate(selectedMitraOrder.createdAt)}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedMitraOrder(null)}
                                            className="text-gray-500 hover:text-gray-700 text-xl"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${(mitraStatusConfig[selectedMitraOrder.status] || mitraStatusConfig.PENDING).color}`}>
                                            {(mitraStatusConfig[selectedMitraOrder.status] || mitraStatusConfig.PENDING).label}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-semibold mb-2 text-gray-800">Items</h3>
                                            {selectedMitraOrder.items?.map((item) => (
                                                <div key={item.id} className="flex justify-between py-2 border-b text-gray-700">
                                                    <span>
                                                        {item.product.name} x {item.quantity} {item.product.unit}
                                                    </span>
                                                    <span className="font-medium text-gray-800">{formatMitraCurrency(Number(item.price) * item.quantity)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between py-3 font-bold text-gray-900">
                                                <span>Total</span>
                                                <span className="text-emerald-600">
                                                    {formatMitraCurrency(Number(selectedMitraOrder.totalAmount))}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedMitraOrder.notes && (
                                            <div>
                                                <h3 className="font-semibold mb-1 text-gray-800">Catatan</h3>
                                                <p className="text-gray-600 text-sm">{selectedMitraOrder.notes}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2 pt-4">
                                            {selectedMitraOrder.status === "SHIPPED" && (
                                                <button
                                                    onClick={() => handleMitraReceive(selectedMitraOrder.id)}
                                                    disabled={mitraUpdating}
                                                    className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                                                >
                                                    {mitraUpdating ? "Memproses..." : "Konfirmasi Terima"}
                                                </button>
                                            )}

                                            <Link
                                                href={`/po/mitra/${selectedMitraOrder.id}`}
                                                target="_blank"
                                                className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
                                            >
                                                Print PO
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Stats Grid (for non-MITRA roles) */}
            {role !== "MITRA" && loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-100 rounded-xl p-4 h-24 animate-pulse" />
                    ))}
                </div>
            ) : (role === "FINANCE_DC" || role === "FINANCE") ? (
                <div className="grid grid-cols-2 gap-4">
                    {stats.map((stat, index) => (
                        <Link
                            key={index}
                            href={stat.href || "#"}
                            className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white relative overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer`}
                        >
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
                        </Link>
                    ))}
                </div>
            ) : role === "STOKIS" ? (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Section */}
                    <div className="flex-1">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Package size={16} className="text-gray-500" />
                            Order ke Pusat
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {stats.slice(0, 2).map((stat, index) => (
                                <Link
                                    key={index}
                                    href={stat.href || "#"}
                                    className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white relative overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer`}
                                >
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
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Divider - horizontal on mobile, vertical on desktop */}
                    <div className="border-t lg:border-t-0 lg:border-l border-gray-200 lg:self-stretch" />

                    {/* Right Section */}
                    <div className="flex-1">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Store size={16} className="text-gray-500" />
                            Order dari Mitra
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {stats.slice(2, 4).map((stat, index) => (
                                <Link
                                    key={index + 2}
                                    href={stat.href || "#"}
                                    className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white relative overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer`}
                                >
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
                                </Link>
                            ))}
                        </div>
                    </div>
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
                        {(role === "FINANCE" || role === "FINANCE_DC") && (
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
                        {(role === "FINANCE_ALL" || role === "MANAGER_PUSAT") && (
                            <>
                                <Link
                                    href="/dashboard/invoices"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #5B2B4E 0%, #3D1C34 100%)' }}
                                >
                                    <Activity size={16} />
                                    Invoices
                                    <ArrowUpRight size={14} />
                                </Link>
                                <Link
                                    href="/dashboard/reports"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
                                >
                                    <TrendingUp size={16} />
                                    Laporan
                                    <ArrowUpRight size={14} />
                                </Link>
                            </>
                        )}
                        {role === "GUDANG" && (
                            <>
                                <Link
                                    href="/dashboard/po-masuk"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm text-sm font-medium hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
                                >
                                    <Package size={16} />
                                    Proses PO
                                    <ArrowUpRight size={14} />
                                </Link>
                                <Link
                                    href="/dashboard/inventory"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                                >
                                    <Package size={16} />
                                    Inventory
                                </Link>
                            </>
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

            {/* GUDANG: PO Terbaru */}
            {role === "GUDANG" && !loading && recentOrders.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-900">📋 PO Terbaru</h2>
                        <p className="text-xs text-gray-500">5 PO terakhir di area Anda</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentOrders.map((order) => {
                            const statusConfig: Record<string, { label: string; color: string }> = {
                                PENDING_PUSAT: { label: "Belum Disetujui", color: "bg-amber-100 text-amber-700" },
                                PO_ISSUED: { label: "PO Baru", color: "bg-blue-100 text-blue-700" },
                                PROCESSING: { label: "Diproses", color: "bg-purple-100 text-purple-700" },
                                SHIPPED: { label: "Dikirim", color: "bg-green-100 text-green-700" },
                            }
                            const st = statusConfig[order.status] || { label: order.status, color: "bg-gray-100 text-gray-700" }
                            return (
                                <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                                        <p className="text-xs text-gray-500">{order.stokisName}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-gray-800">
                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(order.totalAmount)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                                            {st.label}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <Link href="/dashboard/po-masuk" className="block text-center py-3 text-sm text-purple-600 font-medium hover:bg-purple-50 transition-colors border-t border-gray-100">
                        Lihat Semua PO →
                    </Link>
                </div>
            )}

            {/* FINANCE_ALL / MANAGER_PUSAT: Area Breakdown Cards */}
            {(role === "FINANCE_ALL" || role === "MANAGER_PUSAT") && !loading && areaStats.length > 0 && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-900 mb-1">📊 Ringkasan Per Area</h2>
                        <p className="text-xs text-gray-500">Data seluruh DC Area — {financeAllTotals.totalStokis} Stokis, {financeAllTotals.totalMitra} Mitra</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {areaStats.map((area) => {
                            const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`
                            const revenueShare = financeAllTotals.totalRevenue > 0
                                ? ((area.totalRevenue / financeAllTotals.totalRevenue) * 100).toFixed(1)
                                : "0"
                            return (
                                <div key={area.dcId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Area Header */}
                                    <div className="bg-gradient-to-r from-[#5B2B4E] to-[#3D1C34] p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={16} className="text-white/80" />
                                                <span className="text-sm font-semibold text-white">{area.dcName.replace(/^Admin\s*/i, "DC ")}</span>
                                            </div>
                                            <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{revenueShare}%</span>
                                        </div>
                                    </div>
                                    {/* Area Stats */}
                                    <div className="p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">Revenue</span>
                                            <span className="text-sm font-bold text-emerald-600">{formatRp(area.totalRevenue)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">Total PO</span>
                                            <span className="text-sm font-semibold text-gray-800">{area.totalOrders}</span>
                                        </div>
                                        {area.pendingOrders > 0 && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-amber-600">Pending</span>
                                                <span className="text-sm font-semibold text-amber-600">{area.pendingOrders}</span>
                                            </div>
                                        )}
                                        <div className="border-t pt-2 mt-2 flex justify-between text-xs text-gray-500">
                                            <span>🏪 {area.stokisCount} Stokis</span>
                                            <span>👥 {area.mitraCount} Mitra</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
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
                                                {{ PENDING_PUSAT: "Menunggu Approval", RECEIVED: "Diterima", PO_ISSUED: "PO Issued", PROCESSING: "Diproses", SHIPPED: "Dikirim", CANCELLED: "Dibatalkan" }[order.status] || order.status.replace(/_/g, " ")}
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
