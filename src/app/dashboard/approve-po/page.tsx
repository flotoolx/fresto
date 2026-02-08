"use client"

import { useState, useEffect, useCallback } from "react"
import { Receipt, Clock, CheckCircle, ChevronRight, AlertTriangle, Printer, Edit3 } from "lucide-react"
import ExportButton from "@/components/ExportButton"
import Link from "next/link"

interface OrderItem {
    id: string
    quantity: number
    price: number
    product: { name: string; unit: string }
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

export default function ApprovePOPage() {
    const [orders, setOrders] = useState<StokisOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<StokisOrder | null>(null)
    const [updating, setUpdating] = useState(false)
    const [outstanding, setOutstanding] = useState<OutstandingData | null>(null)
    const [loadingOutstanding, setLoadingOutstanding] = useState(false)
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustedItems, setAdjustedItems] = useState<{ id: string; quantity: number }[]>([])
    const [adjustNotes, setAdjustNotes] = useState("")

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders/stokis")
            const data = await res.json()
            // Filter PENDING_PUSAT and PENDING_FINANCE orders for approval
            setOrders(data.filter((o: StokisOrder) => ["PENDING_PUSAT", "PENDING_FINANCE"].includes(o.status)))
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
        await fetchOutstanding(order.stokis.id)
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
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(date))
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
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Receipt className="text-purple-600" />
                            Approve PO
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Cek tagihan dan approve PO untuk dikirim ke Gudang</p>
                    </div>
                    <ExportButton endpoint="/api/export/orders" type="stokis" buttonText="Export" />
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada PO yang perlu diapprove</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleSelectOrder(order)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-800">{order.orderNumber}</h3>
                                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                                </div>
                                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-700">
                                    <Clock size={16} />
                                    Menunggu Approval
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">{order.stokis.name}</span>
                                    <p className="text-xs text-gray-500">{order.stokis.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-purple-600">
                                        {formatCurrency(Number(order.totalAmount))}
                                    </span>
                                    <ChevronRight size={18} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                    ))}
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
                            </div>

                            {/* Outstanding Tagihan Section */}
                            <div className="mb-4">
                                {loadingOutstanding ? (
                                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                                        <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full inline-block" />
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

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2 text-gray-900">Items</h3>
                                    {selectedOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between py-2 border-b text-gray-800">
                                            <span>{item.product.name} x {item.quantity} {item.product.unit}</span>
                                            <span className="font-medium">{formatCurrency(Number(item.price) * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between py-3 font-bold text-gray-900">
                                        <span>Total</span>
                                        <span className="text-purple-600">
                                            {formatCurrency(Number(selectedOrder.totalAmount))}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4">
                                    {/* Print PO Button - Preview like Stokis/Gudang */}
                                    <Link
                                        href={`/po/stokis/${selectedOrder.id}`}
                                        target="_blank"
                                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 flex items-center justify-center gap-2"
                                    >
                                        <Printer size={18} />
                                        Print PO Preview
                                    </Link>

                                    {/* Approve Button */}
                                    <button
                                        onClick={() => updateStatus(selectedOrder.id, "PO_ISSUED")}
                                        disabled={updating}
                                        className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
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
                                            Adjust PO (Kurangi Qty)
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
                                                            newItems[idx] = { ...newItems[idx], quantity: Math.min(item.quantity, qty + 1) }
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
                                    <span className="text-purple-600">
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
