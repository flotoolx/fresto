import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
    Users,
    Store,
    Warehouse,
    ShoppingCart,
    TrendingUp,
    Package,
    ArrowUpRight,
    Activity
} from "lucide-react"

async function getStats(role: string, userId: string) {
    switch (role) {
        case "PUSAT":
            const [totalMitra, totalStokis, totalGudang, pendingOrders] = await Promise.all([
                prisma.user.count({ where: { role: "MITRA", isActive: true } }),
                prisma.user.count({ where: { role: "STOKIS", isActive: true } }),
                prisma.gudang.count({ where: { isActive: true } }),
                prisma.stokisOrder.count({ where: { status: "PENDING_PUSAT" } }),
            ])
            return [
                { label: "Total Mitra", value: totalMitra, icon: Users, gradient: "from-blue-500 to-blue-600" },
                { label: "Total Stokis", value: totalStokis, icon: Store, gradient: "from-emerald-500 to-teal-600" },
                { label: "Gudang Aktif", value: totalGudang, icon: Warehouse, gradient: "from-purple-500 to-violet-600" },
                { label: "Order Pending", value: pendingOrders, icon: ShoppingCart, gradient: "from-amber-500 to-orange-600" },
            ]

        case "FINANCE":
            const financePending = await prisma.stokisOrder.count({ where: { status: "PENDING_FINANCE" } })
            const totalInvoices = await (prisma as unknown as { invoice?: { count: () => Promise<number> } }).invoice?.count() || 0
            return [
                { label: "Menunggu Approval", value: financePending, icon: ShoppingCart, gradient: "from-purple-500 to-violet-600" },
                { label: "Total Invoice", value: totalInvoices, icon: Activity, gradient: "from-blue-500 to-blue-600" },
            ]

        case "GUDANG":
            const poMasuk = await prisma.stokisOrder.count({ where: { status: "PO_ISSUED" } })
            return [
                { label: "PO Masuk", value: poMasuk, icon: Package, gradient: "from-blue-500 to-blue-600" },
            ]

        case "STOKIS":
            const [mitraCount, orderFromMitra, myInventory] = await Promise.all([
                prisma.user.count({ where: { stokisId: userId } }),
                prisma.mitraOrder.count({ where: { stokisId: userId, status: "PENDING" } }),
                prisma.inventory.count({ where: { userId } }),
            ])
            return [
                { label: "Mitra Saya", value: mitraCount, icon: Users, gradient: "from-orange-500 to-red-500" },
                { label: "Order Masuk", value: orderFromMitra, icon: ShoppingCart, gradient: "from-emerald-500 to-teal-600" },
                { label: "Item Inventory", value: myInventory, icon: Package, gradient: "from-blue-500 to-blue-600" },
            ]

        case "MITRA":
            const [pendingOrder, totalOrders] = await Promise.all([
                prisma.mitraOrder.count({ where: { mitraId: userId, status: { in: ["PENDING", "APPROVED", "PROCESSING", "SHIPPED"] } } }),
                prisma.mitraOrder.count({ where: { mitraId: userId } }),
            ])
            return [
                { label: "Order Aktif", value: pendingOrder, icon: ShoppingCart, gradient: "from-orange-500 to-red-500" },
                { label: "Total Order", value: totalOrders, icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
            ]

        default:
            return []
    }
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)
    const role = session?.user?.role || "MITRA"
    const userId = session?.user?.id || ""

    const stats = await getStats(role, userId)

    return (
        <div className="space-y-5">
            {/* Page Title */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm">Selamat datang, {session?.user?.name}</p>
            </div>

            {/* Stats Grid */}
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
