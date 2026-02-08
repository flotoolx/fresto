"use client"

import { useState, useEffect, useMemo } from "react"
import { Store, Clock, CheckCircle, Truck, Package, XCircle, ChevronRight, Calendar, TrendingUp, Users, Edit3 } from "lucide-react"

interface OrderItem {
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
    mitra: { id: string; name: string; address: string | null }
    items: OrderItem[]
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700", icon: <Clock size={16} /> },
    APPROVED: { label: "Disetujui", color: "bg-blue-100 text-blue-700", icon: <CheckCircle size={16} /> },
    PROCESSING: { label: "Diproses", color: "bg-purple-100 text-purple-700", icon: <Package size={16} /> },
    SHIPPED: { label: "Dikirim", color: "bg-indigo-100 text-indigo-700", icon: <Truck size={16} /> },
    RECEIVED: { label: "Diterima", color: "bg-green-100 text-green-700", icon: <CheckCircle size={16} /> },
    CANCELLED: { label: "Dibatalkan", color: "bg-red-100 text-red-700", icon: <XCircle size={16} /> },
}

type PeriodFilter = "7" | "30" | "90" | "custom"

export default function StokisOrderMitraPage() {
    const [orders, setOrders] = useState<MitraOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<MitraOrder | null>(null)
    const [updating, setUpdating] = useState(false)

    // Adjust PO modal state
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustedItems, setAdjustedItems] = useState<{ id: string; quantity: number }[]>([])
    const [adjustNotes, setAdjustNotes] = useState("")

    // Date filter state
    const [period, setPeriod] = useState<PeriodFilter>("30")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        fetchOrders()
    }, [])

    // Initialize date range based on period
    useEffect(() => {
        if (period !== "custom") {
            const end = new Date()
            const start = new Date()
            start.setDate(start.getDate() - parseInt(period))
            setEndDate(end.toISOString().split("T")[0])
            setStartDate(start.toISOString().split("T")[0])
        }
    }, [period])

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders/mitra")
            const data = await res.json()
            setOrders(data)
        } catch (err) {
            console.error("Error fetching orders:", err)
        } finally {
            setLoading(false)
        }
    }

    // Filtered orders based on date range
    const filteredOrders = useMemo(() => {
        if (!startDate || !endDate) return orders
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        return orders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= start && orderDate <= end
        })
    }, [orders, startDate, endDate])

    // Summary stats
    const summaryStats = useMemo(() => {
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
        const uniqueMitra = new Set(filteredOrders.map(o => o.mitra.id)).size
        const totalOrders = filteredOrders.length

        // Belum Selesai: PENDING, APPROVED, PROCESSING (not yet SHIPPED/RECEIVED)
        const belumSelesaiOrders = filteredOrders.filter(o => ["PENDING", "APPROVED", "PROCESSING"].includes(o.status))
        const belumSelesaiNominal = belumSelesaiOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
        const belumSelesaiCount = belumSelesaiOrders.length

        return { totalRevenue, uniqueMitra, totalOrders, belumSelesaiNominal, belumSelesaiCount }
    }, [filteredOrders])

    const updateStatus = async (orderId: string, status: string) => {
        setUpdating(true)
        try {
            const res = await fetch(`/api/orders/mitra/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            })
            if (res.ok) {
                fetchOrders()
                setSelectedOrder(null)
            }
        } catch (err) {
            console.error("Error updating order:", err)
        } finally {
            setUpdating(false)
        }
    }

    // Adjust PO handlers
    const openAdjustModal = () => {
        if (!selectedOrder) return
        setAdjustedItems(selectedOrder.items.map(item => ({ id: item.id, quantity: item.quantity })))
        setAdjustNotes("")
        setShowAdjustModal(true)
    }

    const submitAdjustment = async () => {
        if (!selectedOrder) return
        setUpdating(true)
        try {
            const res = await fetch(`/api/orders/mitra/${selectedOrder.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "adjust",
                    adjustedItems: adjustedItems.filter(item => item.quantity > 0),
                    notes: adjustNotes
                }),
            })
            if (res.ok) {
                fetchOrders()
                setSelectedOrder(null)
                setShowAdjustModal(false)
            } else {
                const err = await res.json()
                alert(err.error || "Gagal menyimpan perubahan")
            }
        } catch (err) {
            console.error("Error adjusting order:", err)
            alert("Terjadi kesalahan")
        } finally {
            setUpdating(false)
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
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(new Date(date))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
                <h1 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Store className="text-green-600" />
                    Order dari Mitra
                </h1>
                <p className="text-gray-500 text-sm mt-1">Kelola order dari mitra Anda</p>
            </div>

            {/* Date Filter */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
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
                                onClick={() => setPeriod(opt.value as PeriodFilter)}
                                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${period === opt.value
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {period === "custom" && (
                        <div className="flex items-center gap-2 ml-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 border rounded-lg text-sm text-gray-700"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 border rounded-lg text-sm text-gray-700"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-[#E31E24] to-[#B91C22] rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={18} className="opacity-80" />
                        <span className="text-white/80 text-xs font-medium">Total Revenue</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
                    <p className="text-xs text-white/70 mt-0.5">{summaryStats.totalOrders} PO</p>
                </div>
                <div className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={18} className="opacity-80" />
                        <span className="text-white/80 text-xs font-medium">Belum Selesai</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(summaryStats.belumSelesaiNominal)}</p>
                    <p className="text-xs text-white/70 mt-0.5">{summaryStats.belumSelesaiCount} PO</p>
                </div>
                <div className="bg-gradient-to-br from-[#5B2B4E] to-[#3D1C34] rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={18} className="opacity-80" />
                        <span className="text-white/80 text-xs font-medium">Mitra Order</span>
                    </div>
                    <p className="text-xl font-bold">{summaryStats.uniqueMitra}</p>
                    <p className="text-xs text-white/70 mt-0.5">Total Mitra</p>
                </div>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada order dari mitra pada periode ini</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No Invoice</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mitra</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Nominal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map((order) => {
                                    const status = statusConfig[order.status] || statusConfig.PENDING
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-700">{formatDate(order.createdAt)}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                                                <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.mitra.name}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right">
                                                {formatCurrency(Number(order.totalAmount))}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedOrder.orderNumber}</h2>
                                    <p className="text-sm text-gray-500">{formatDate(selectedOrder.createdAt)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-900">{selectedOrder.mitra.name}</p>
                                {selectedOrder.mitra.address && (
                                    <p className="text-sm text-gray-600">{selectedOrder.mitra.address}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2 text-gray-900">Items</h3>
                                    {selectedOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between py-2 border-b text-gray-800">
                                            <span>
                                                {item.product.name} x {item.quantity} {item.product.unit}
                                            </span>
                                            <span className="font-medium">{formatCurrency(Number(item.price) * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between py-3 font-bold text-gray-900">
                                        <span>Total</span>
                                        <span className="text-green-600">
                                            {formatCurrency(Number(selectedOrder.totalAmount))}
                                        </span>
                                    </div>
                                </div>

                                {selectedOrder.notes && (
                                    <div>
                                        <h3 className="font-semibold mb-1 text-gray-900">Catatan</h3>
                                        <p className="text-gray-600 text-sm">{selectedOrder.notes}</p>
                                    </div>
                                )}

                                {/* Action Buttons based on status */}
                                <div className="space-y-2 pt-4">
                                    {selectedOrder.status === "PENDING" && (
                                        <>
                                            <button
                                                onClick={() => updateStatus(selectedOrder.id, "RECEIVED")}
                                                disabled={updating}
                                                className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                                            >
                                                {updating ? "Memproses..." : "Selesai"}
                                            </button>
                                            <button
                                                onClick={openAdjustModal}
                                                disabled={updating}
                                                className="w-full py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Edit3 size={18} />
                                                Revisi PO / Adjust
                                            </button>
                                            <button
                                                onClick={() => updateStatus(selectedOrder.id, "CANCELLED")}
                                                disabled={updating}
                                                className="w-full py-3 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50"
                                            >
                                                Tolak Order
                                            </button>
                                        </>
                                    )}

                                    {selectedOrder.status === "APPROVED" && (
                                        <>
                                            <button
                                                onClick={() => updateStatus(selectedOrder.id, "RECEIVED")}
                                                disabled={updating}
                                                className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                                            >
                                                {updating ? "Memproses..." : "Selesai"}
                                            </button>
                                            <button
                                                onClick={openAdjustModal}
                                                disabled={updating}
                                                className="w-full py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Edit3 size={18} />
                                                Revisi PO / Adjust
                                            </button>
                                        </>
                                    )}

                                    {selectedOrder.status === "PROCESSING" && (
                                        <button
                                            onClick={() => updateStatus(selectedOrder.id, "RECEIVED")}
                                            disabled={updating}
                                            className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                                        >
                                            {updating ? "Memproses..." : "Selesai"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjust PO Modal */}
            {showAdjustModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Adjust PO</h2>
                                    <p className="text-sm text-gray-500">{selectedOrder.orderNumber}</p>
                                </div>
                                <button
                                    onClick={() => setShowAdjustModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2 text-gray-900">Edit Items</h3>
                                    {selectedOrder.items.map((item, idx) => {
                                        const adjusted = adjustedItems.find(a => a.id === item.id)
                                        const qty = adjusted?.quantity ?? item.quantity
                                        return (
                                            <div key={item.id} className="flex justify-between items-center py-3 border-b">
                                                <div className="flex-1">
                                                    <span className="text-gray-800 font-medium">{item.product.name}</span>
                                                    <p className="text-xs text-gray-500">@{formatCurrency(Number(item.price))}/{item.product.unit}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const newItems = [...adjustedItems]
                                                            newItems[idx] = { ...newItems[idx], quantity: Math.max(0, qty - 1) }
                                                            setAdjustedItems(newItems)
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-10 text-center font-medium text-gray-900">{qty}</span>
                                                    <button
                                                        onClick={() => {
                                                            const newItems = [...adjustedItems]
                                                            newItems[idx] = { ...newItems[idx], quantity: qty + 1 }
                                                            setAdjustedItems(newItems)
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Revisi</label>
                                    <textarea
                                        value={adjustNotes}
                                        onChange={(e) => setAdjustNotes(e.target.value)}
                                        placeholder="Contoh: Stok tepung habis, dikurangi 5kg"
                                        className="w-full px-3 py-2 border rounded-lg text-sm resize-none text-gray-900 placeholder-gray-400"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setShowAdjustModal(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={submitAdjustment}
                                        disabled={updating}
                                        className="flex-1 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                                    >
                                        {updating ? "Menyimpan..." : "Simpan Perubahan"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
