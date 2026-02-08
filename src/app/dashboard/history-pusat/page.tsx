"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Receipt, Clock, CheckCircle, Truck, XCircle, ArrowLeft, Printer, Edit3 } from "lucide-react"
import ExportButton from "@/components/ExportButton"
import Link from "next/link"

interface OrderItem {
    id: string
    quantity: number
    price: number
    product: { name: string; unit: string; gudang: { name: string } }
}

interface StokisOrder {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    notes: string | null
    createdAt: string
    poIssuedAt: string | null
    items: OrderItem[]
}

// Simplified to 4 statuses only
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING_PUSAT: { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-700", icon: <Clock size={16} /> },
    PO_ISSUED: { label: "Approved", color: "bg-blue-100 text-blue-700", icon: <CheckCircle size={16} /> },
    PROCESSING: { label: "Approved", color: "bg-blue-100 text-blue-700", icon: <CheckCircle size={16} /> },
    SHIPPED: { label: "Dikirim", color: "bg-indigo-100 text-indigo-700", icon: <Truck size={16} /> },
    RECEIVED: { label: "Selesai", color: "bg-green-100 text-green-700", icon: <CheckCircle size={16} /> },
    CANCELLED: { label: "Selesai", color: "bg-red-100 text-red-700", icon: <XCircle size={16} /> },
}

// Map status to summary card category
const getStatusCategory = (status: string): "pending" | "approved" | "shipped" | "completed" => {
    if (status === "PENDING_PUSAT") return "pending"
    if (["PO_ISSUED", "PROCESSING"].includes(status)) return "approved"
    if (status === "SHIPPED") return "shipped"
    return "completed" // RECEIVED, CANCELLED
}

export default function StokisOrderHistoryPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<StokisOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<StokisOrder | null>(null)
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustedItems, setAdjustedItems] = useState<{ id: string; quantity: number }[]>([])
    const [adjustNotes, setAdjustNotes] = useState("")
    const [updating, setUpdating] = useState(false)
    const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "shipped" | "completed">("all")

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders/stokis/my-orders")
            const data = await res.json()
            setOrders(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Error fetching orders:", err)
        } finally {
            setLoading(false)
        }
    }

    // Calculate summary stats with nominal and count
    const summaryStats = useMemo(() => {
        const stats = {
            pending: { count: 0, nominal: 0 },
            approved: { count: 0, nominal: 0 },
            shipped: { count: 0, nominal: 0 },
            completed: { count: 0, nominal: 0 }
        }
        orders.forEach(order => {
            const category = getStatusCategory(order.status)
            stats[category].count++
            stats[category].nominal += Number(order.totalAmount)
        })
        return stats
    }, [orders])

    // Filter orders based on active filter
    const filteredOrders = useMemo(() => {
        if (activeFilter === "all") return orders
        return orders.filter(order => getStatusCategory(order.status) === activeFilter)
    }, [orders, activeFilter])

    const handleReceive = async (orderId: string) => {
        try {
            const res = await fetch(`/api/orders/stokis/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "RECEIVED" }),
            })
            if (res.ok) {
                fetchOrders()
                setSelectedOrder(null)
            }
        } catch (err) {
            console.error("Error updating order:", err)
        }
    }

    const handleCancel = async (orderId: string) => {
        if (!confirm("Apakah Anda yakin ingin membatalkan order ini?")) return
        try {
            const res = await fetch(`/api/orders/stokis/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CANCELLED" }),
            })
            if (res.ok) {
                fetchOrders()
                setSelectedOrder(null)
            }
        } catch (err) {
            console.error("Error cancelling order:", err)
        }
    }

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
            const res = await fetch(`/api/orders/stokis/${selectedOrder.id}`, {
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

    const canAdjust = (status: string) => status === "PENDING_PUSAT"
    const canCancel = (status: string) => status === "PENDING_PUSAT"
    const hasPO = (status: string) => ["PO_ISSUED", "PROCESSING", "SHIPPED", "RECEIVED"].includes(status)

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
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Receipt className="text-green-600" size={20} />
                    <h1 className="text-lg md:text-xl font-bold text-gray-800">Riwayat Order ke Pusat</h1>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <ExportButton endpoint="/api/export/orders" type="stokis" buttonText="Export" />
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-green-600 font-medium transition-colors border rounded-lg"
                    >
                        <ArrowLeft size={16} />
                        Kembali
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { key: "approved", label: "Approved", data: summaryStats.approved, gradient: "from-[#3B82F6] to-[#1D4ED8]", icon: <CheckCircle size={16} /> },
                    { key: "pending", label: "Menunggu Konfirmasi", data: summaryStats.pending, gradient: "from-[#F59E0B] to-[#D97706]", icon: <Clock size={16} /> },
                    { key: "shipped", label: "Dikirim", data: summaryStats.shipped, gradient: "from-[#6366F1] to-[#4338CA]", icon: <Truck size={16} /> },
                    { key: "completed", label: "Selesai", data: summaryStats.completed, gradient: "from-[#22C55E] to-[#16A34A]", icon: <CheckCircle size={16} /> },
                ].map((card) => (
                    <button
                        key={card.key}
                        onClick={() => setActiveFilter(activeFilter === card.key ? "all" : card.key as typeof activeFilter)}
                        className={`bg-gradient-to-br ${card.gradient} rounded-xl p-4 text-white relative overflow-hidden shadow-md hover:shadow-lg transition-all text-left ${activeFilter === card.key ? "ring-4 ring-offset-2 ring-gray-300 scale-105" : "hover:scale-105"}`}
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                {card.icon}
                                <span className="text-white/80 text-xs font-medium">{card.label}</span>
                            </div>
                            <p className="text-xl font-bold">{formatCurrency(card.data.nominal)}</p>
                            <p className="text-xs text-white/70 mt-0.5">{card.data.count} PO</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada order ke Pusat</p>
                    <button
                        onClick={() => router.push("/dashboard/order-pusat")}
                        className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                    >
                        Buat Order Baru
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No Invoice</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Nominal</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map((order) => {
                                    const status = statusConfig[order.status] || statusConfig.PENDING_PUSAT
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-700">{formatDate(order.createdAt)}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right">
                                                {formatCurrency(Number(order.totalAmount))}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.icon}
                                                    {status.label}
                                                </span>
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
            {selectedOrder && !showAdjustModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedOrder.orderNumber}</h2>
                                    <p className="text-sm text-gray-600">{formatDate(selectedOrder.createdAt)}</p>
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm mt-2 ${statusConfig[selectedOrder.status]?.color || "bg-gray-100 text-gray-700"}`}>
                                        {statusConfig[selectedOrder.status]?.icon}
                                        {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2 text-gray-800">Items</h3>
                                    {selectedOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between py-2 border-b text-gray-700">
                                            <div>
                                                <span className="font-medium text-gray-800">{item.product.name}</span>
                                                <p className="text-sm text-gray-500">
                                                    {item.quantity} {item.product.unit} • {item.product.gudang.name}
                                                </p>
                                            </div>
                                            <span className="font-medium text-gray-800">{formatCurrency(Number(item.price) * item.quantity)}</span>
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
                                        <h3 className="font-semibold mb-1 text-gray-800">Catatan</h3>
                                        <p className="text-gray-600 text-sm">{selectedOrder.notes}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-2">
                                    {/* Confirm Receive */}
                                    {selectedOrder.status === "SHIPPED" && (
                                        <button
                                            onClick={() => handleReceive(selectedOrder.id)}
                                            className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
                                        >
                                            Konfirmasi Terima
                                        </button>
                                    )}

                                    {/* Adjust PO Button - for PENDING statuses */}
                                    {canAdjust(selectedOrder.status) && (
                                        <button
                                            onClick={openAdjustModal}
                                            className="w-full py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 flex items-center justify-center gap-2"
                                        >
                                            <Edit3 size={18} />
                                            Adjust PO
                                        </button>
                                    )}

                                    {/* Cancel Button - for PENDING statuses */}
                                    {canCancel(selectedOrder.status) && (
                                        <button
                                            onClick={() => handleCancel(selectedOrder.id)}
                                            className="w-full py-3 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200"
                                        >
                                            Batalkan Order
                                        </button>
                                    )}

                                    {/* Print PO Button - for PO_ISSUED+ */}
                                    {hasPO(selectedOrder.status) && (
                                        <Link
                                            href={`/po/stokis/${selectedOrder.id}`}
                                            target="_blank"
                                            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
                                        >
                                            <Printer size={18} />
                                            Print PO
                                        </Link>
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
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs mt-2 ${statusConfig[selectedOrder.status]?.color || "bg-gray-100 text-gray-700"}`}>
                                        {statusConfig[selectedOrder.status]?.label}
                                    </span>
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

                                {/* Total Comparison */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Total (sebelum)</span>
                                        <span>{formatCurrency(Number(selectedOrder.totalAmount))}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-gray-900">
                                        <span>Total (baru)</span>
                                        <span className="text-green-600">
                                            {formatCurrency(
                                                adjustedItems.reduce((sum, adj) => {
                                                    const item = selectedOrder.items.find(i => i.id === adj.id)
                                                    return sum + (Number(item?.price || 0) * adj.quantity)
                                                }, 0)
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Perubahan</label>
                                    <textarea
                                        value={adjustNotes}
                                        onChange={(e) => setAdjustNotes(e.target.value)}
                                        placeholder="Contoh: Kurangi qty karena stok masih cukup"
                                        className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowAdjustModal(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={submitAdjustment}
                                        disabled={updating || adjustedItems.every((a, i) => a.quantity === selectedOrder.items[i].quantity)}
                                        className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50"
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
