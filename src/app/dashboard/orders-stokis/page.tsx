"use client"

import { useState, useEffect, useCallback } from "react"
import { ShoppingCart, Clock, CheckCircle, Truck, Package, XCircle, Printer, AlertTriangle, Edit3, Calendar } from "lucide-react"
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
    stokis: { id: string; name: string; address: string | null; email: string }
    items: OrderItem[]
}

interface OutstandingData {
    stokisId: string
    stokisName: string
    totalOutstanding: number
    unpaidCount: number
    unpaidAmount: number
    overdueCount: number
    overdueAmount: number
    hasOutstanding: boolean
    invoices: {
        id: string
        invoiceNumber: string
        amount: number
        dueDate: string | null
        status: string
    }[]
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING_PUSAT: { label: "Menunggu Approval", color: "bg-yellow-100 text-yellow-700", icon: <Clock size={16} /> },
    PO_ISSUED: { label: "PO Issued", color: "bg-blue-100 text-blue-700", icon: <CheckCircle size={16} /> },
    PROCESSING: { label: "Diproses Gudang", color: "bg-purple-100 text-purple-700", icon: <Package size={16} /> },
    SHIPPED: { label: "Dikirim", color: "bg-indigo-100 text-indigo-700", icon: <Truck size={16} /> },
    RECEIVED: { label: "Diterima", color: "bg-green-100 text-green-700", icon: <CheckCircle size={16} /> },
    CANCELLED: { label: "Dibatalkan", color: "bg-red-100 text-red-700", icon: <XCircle size={16} /> },
}

type TabFilter = "all" | "pending" | "processing" | "completed"

export default function PusatOrdersStokisPage() {
    const [orders, setOrders] = useState<StokisOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<StokisOrder | null>(null)
    const [updating, setUpdating] = useState(false)
    const [activeTab, setActiveTab] = useState<TabFilter>("all")

    // Period filter state
    const [period, setPeriod] = useState(30)
    const [useCustomDate, setUseCustomDate] = useState(false)
    const [customDateFrom, setCustomDateFrom] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split("T")[0]
    })
    const [customDateTo, setCustomDateTo] = useState(() => new Date().toISOString().split("T")[0])

    // Outstanding check
    const [outstanding, setOutstanding] = useState<OutstandingData | null>(null)
    const [loadingOutstanding, setLoadingOutstanding] = useState(false)

    // Adjust PO
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustedItems, setAdjustedItems] = useState<{ id: string; quantity: number }[]>([])
    const [adjustNotes, setAdjustNotes] = useState("")

    useEffect(() => {
        fetchOrders()
    }, [period, useCustomDate, customDateFrom, customDateTo])

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders/stokis")
            const data = await res.json()
            // Apply date filtering client-side
            let filtered = Array.isArray(data) ? data : []
            if (useCustomDate) {
                const from = new Date(customDateFrom)
                from.setHours(0, 0, 0, 0)
                const to = new Date(customDateTo)
                to.setHours(23, 59, 59, 999)
                filtered = filtered.filter(o => {
                    const d = new Date(o.createdAt)
                    return d >= from && d <= to
                })
            } else {
                const cutoff = new Date()
                cutoff.setDate(cutoff.getDate() - period)
                cutoff.setHours(0, 0, 0, 0)
                filtered = filtered.filter(o => new Date(o.createdAt) >= cutoff)
            }
            setOrders(filtered)
        } catch (err) {
            console.error("Error fetching orders:", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchOutstanding = useCallback(async (stokisId: string) => {
        setLoadingOutstanding(true)
        try {
            const res = await fetch(`/api/stokis/${stokisId}/outstanding`)
            if (res.ok) {
                const data = await res.json()
                setOutstanding(data)
            }
        } catch (err) {
            console.error("Error fetching outstanding:", err)
        } finally {
            setLoadingOutstanding(false)
        }
    }, [])

    const handleSelectOrder = async (order: StokisOrder) => {
        setSelectedOrder(order)
        setOutstanding(null)
        if (order.status === "PENDING_PUSAT") {
            await fetchOutstanding(order.stokis.id)
        }
    }

    const updateStatus = async (orderId: string, status: string) => {
        setUpdating(true)
        try {
            const res = await fetch(`/api/orders/stokis/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            })
            if (res.ok) {
                fetchOrders()
                setSelectedOrder(null)
                setOutstanding(null)
            }
        } catch (err) {
            console.error("Error updating order:", err)
        } finally {
            setUpdating(false)
        }
    }

    const handleAdjustPO = () => {
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
                setOutstanding(null)
                setShowAdjustModal(false)
            }
        } catch (err) {
            console.error("Error adjusting order:", err)
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
        const d = new Date(date)
        const day = d.getDate()
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]
        const month = months[d.getMonth()]
        const year = d.getFullYear()
        const hours = d.getHours().toString().padStart(2, "0")
        const minutes = d.getMinutes().toString().padStart(2, "0")
        return `${day} ${month} ${year}, ${hours}.${minutes}`
    }

    // Filter orders based on active tab
    const filteredOrders = orders.filter(order => {
        switch (activeTab) {
            case "pending":
                return order.status === "PENDING_PUSAT"
            case "processing":
                return ["PO_ISSUED", "PROCESSING", "SHIPPED"].includes(order.status)
            case "completed":
                return ["RECEIVED", "CANCELLED"].includes(order.status)
            default:
                return true
        }
    })

    const tabCounts = {
        all: orders.length,
        pending: orders.filter(o => o.status === "PENDING_PUSAT").length,
        processing: orders.filter(o => ["PO_ISSUED", "PROCESSING", "SHIPPED"].includes(o.status)).length,
        completed: orders.filter(o => ["RECEIVED", "CANCELLED"].includes(o.status)).length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ShoppingCart className="text-red-600" />
                            Order Stokis
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Kelola dan approve PO dari Stokis</p>
                    </div>
                    <ExportButton endpoint="/api/export/orders" type="stokis" buttonText="Export" />
                </div>
            </div>

            {/* Period Filter */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Preset period selector */}
                    {!useCustomDate && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Periode:</label>
                            <select
                                value={period}
                                onChange={(e) => { setPeriod(parseInt(e.target.value)); setUseCustomDate(false) }}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value={7}>7 Hari</option>
                                <option value={30}>30 Hari</option>
                                <option value={90}>90 Hari</option>
                                <option value={180}>3 Bulan</option>
                                <option value={365}>1 Tahun</option>
                            </select>
                        </div>
                    )}

                    {/* Custom date range toggle */}
                    <button
                        onClick={() => {
                            if (useCustomDate) {
                                setUseCustomDate(false)
                                setPeriod(30)
                            } else {
                                setUseCustomDate(true)
                            }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${useCustomDate
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        <Calendar size={14} />
                        Custom
                    </button>

                    {useCustomDate && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { key: "all", label: "Semua" },
                    { key: "pending", label: "Pending" },
                    { key: "processing", label: "Diproses" },
                    { key: "completed", label: "Selesai" },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as TabFilter)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.key
                            ? "bg-red-500 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        {tab.label} ({tabCounts[tab.key as TabFilter]})
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada order</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Tanggal/Waktu</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">No Invoice</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Stokis</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Nominal</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map((order) => {
                                    const status = statusConfig[order.status] || statusConfig.PENDING_PUSAT
                                    return (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => handleSelectOrder(order)}
                                        >
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{order.orderNumber}</td>
                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.stokis.name}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-red-600 whitespace-nowrap">{formatCurrency(Number(order.totalAmount))}</td>
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
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                        Menampilkan {filteredOrders.length} dari {orders.length} order
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
                                    <p className="text-sm text-gray-500">{formatDate(selectedOrder.createdAt)}</p>
                                </div>
                                <button
                                    onClick={() => { setSelectedOrder(null); setOutstanding(null) }}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-900">{selectedOrder.stokis.name}</p>
                                <p className="text-sm text-gray-600">{selectedOrder.stokis.email}</p>
                                {selectedOrder.stokis.address && (
                                    <p className="text-sm text-gray-600">{selectedOrder.stokis.address}</p>
                                )}
                            </div>

                            {/* Outstanding Check - Only for PENDING_PUSAT */}
                            {selectedOrder.status === "PENDING_PUSAT" && (
                                <div className="mb-4">
                                    {loadingOutstanding ? (
                                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                                            <div className="animate-spin h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full inline-block" />
                                            <p className="text-gray-500 text-sm mt-2">Mengecek tagihan...</p>
                                        </div>
                                    ) : outstanding?.hasOutstanding ? (
                                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                            <div className="flex items-start gap-2 mb-3">
                                                <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                                                <div>
                                                    <p className="text-red-700 font-medium">⚠️ Stokis memiliki tagihan tertunggak</p>
                                                    <p className="text-red-600 text-sm">Total: {formatCurrency(outstanding.totalOutstanding)}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                {outstanding.unpaidCount > 0 && (
                                                    <p className="text-red-600">
                                                        • Unpaid ({outstanding.unpaidCount} invoice): {formatCurrency(outstanding.unpaidAmount)}
                                                    </p>
                                                )}
                                                {outstanding.overdueCount > 0 && (
                                                    <p className="text-red-700 font-medium">
                                                        • Overdue ({outstanding.overdueCount} invoice): {formatCurrency(outstanding.overdueAmount)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                            <p className="text-green-700 font-medium">✓ Tidak ada tagihan tertunggak</p>
                                            <p className="text-green-600 text-sm">Stokis dapat melanjutkan order</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2 text-gray-900">Items</h3>
                                    {selectedOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between py-2 border-b text-gray-800">
                                            <div>
                                                <span>{item.product.name} x {item.quantity} {item.product.unit}</span>
                                                <p className="text-xs text-gray-500">{item.product.gudang.name}</p>
                                            </div>
                                            <span className="font-medium">{formatCurrency(Number(item.price) * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between py-3 font-bold text-gray-900">
                                        <span>Total</span>
                                        <span className="text-red-600">
                                            {formatCurrency(Number(selectedOrder.totalAmount))}
                                        </span>
                                    </div>
                                </div>

                                {selectedOrder.notes && (
                                    <div>
                                        <h3 className="font-semibold mb-1 text-gray-900">Catatan</h3>
                                        <p className="text-gray-600 text-sm whitespace-pre-line">{selectedOrder.notes}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-4">
                                    {/* Print PO Preview - Always available for pending */}
                                    {selectedOrder.status === "PENDING_PUSAT" && (
                                        <Link
                                            href={`/po/stokis/${selectedOrder.id}`}
                                            target="_blank"
                                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 flex items-center justify-center gap-2"
                                        >
                                            <Printer size={18} />
                                            Print PO Preview
                                        </Link>
                                    )}

                                    {selectedOrder.status === "PENDING_PUSAT" && (
                                        <>
                                            {/* Approve Button */}
                                            <button
                                                onClick={() => updateStatus(selectedOrder.id, "PO_ISSUED")}
                                                disabled={updating}
                                                className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {updating ? "Memproses..." : "Approve & Issue PO → Gudang"}
                                            </button>

                                            {/* Adjust PO Button - show when has outstanding */}
                                            {outstanding?.hasOutstanding && (
                                                <button
                                                    onClick={handleAdjustPO}
                                                    className="w-full py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 flex items-center justify-center gap-2"
                                                >
                                                    <Edit3 size={18} />
                                                    Adjust PO
                                                </button>
                                            )}

                                            {/* Reject Button */}
                                            <button
                                                onClick={() => updateStatus(selectedOrder.id, "CANCELLED")}
                                                disabled={updating}
                                                className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50"
                                            >
                                                Tolak PO
                                            </button>
                                        </>
                                    )}

                                    {/* Print PO Button - show for PO_ISSUED and later statuses */}
                                    {["PO_ISSUED", "PROCESSING", "SHIPPED", "RECEIVED"].includes(selectedOrder.status) && (
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
                                    <h2 className="text-lg font-bold text-gray-900">Adjust PO - {selectedOrder.orderNumber}</h2>
                                    <p className="text-sm text-gray-500">Kurangi quantity atau hapus item</p>
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
                                    <h3 className="font-semibold mb-2 text-gray-900">Adjust Items</h3>
                                    {selectedOrder.items.map((item, idx) => {
                                        const adjusted = adjustedItems.find(a => a.id === item.id)
                                        const qty = adjusted?.quantity ?? item.quantity
                                        return (
                                            <div key={item.id} className="flex justify-between items-center py-3 border-b">
                                                <div className="flex-1">
                                                    <span className="text-gray-800">{item.product.name}</span>
                                                    <p className="text-xs text-gray-500">@{formatCurrency(Number(item.price))}/{item.product.unit}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const newItems = [...adjustedItems]
                                                            newItems[idx] = { ...newItems[idx], quantity: Math.max(0, qty - 1) }
                                                            setAdjustedItems(newItems)
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-12 text-center font-medium text-gray-900">{qty}</span>
                                                    <button
                                                        onClick={() => {
                                                            const newItems = [...adjustedItems]
                                                            newItems[idx] = { ...newItems[idx], quantity: qty + 1 }
                                                            setAdjustedItems(newItems)
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="flex justify-between py-3 font-bold text-gray-900 border-t">
                                    <span>Total Baru</span>
                                    <span className="text-red-600">
                                        {formatCurrency(
                                            adjustedItems.reduce((sum, adj) => {
                                                const item = selectedOrder.items.find(i => i.id === adj.id)
                                                return sum + (Number(item?.price || 0) * adj.quantity)
                                            }, 0)
                                        )}
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Adjustment</label>
                                    <textarea
                                        value={adjustNotes}
                                        onChange={(e) => setAdjustNotes(e.target.value)}
                                        placeholder="Contoh: Dikurangi karena ada tunggakan pembayaran"
                                        className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <button
                                        onClick={submitAdjustment}
                                        disabled={updating || adjustedItems.every((a, i) => a.quantity === selectedOrder.items[i].quantity)}
                                        className="w-full py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50"
                                    >
                                        {updating ? "Menyimpan..." : "Simpan & Approve PO"}
                                    </button>
                                    <button
                                        onClick={() => setShowAdjustModal(false)}
                                        className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200"
                                    >
                                        Batal
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
