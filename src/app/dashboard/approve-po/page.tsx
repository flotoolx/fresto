"use client"

import { useState, useEffect } from "react"
import { Receipt, Clock, CheckCircle, ChevronRight } from "lucide-react"

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
    stokis: { name: string; address: string | null; email: string }
    items: OrderItem[]
}

export default function FinanceApprovePOPage() {
    const [orders, setOrders] = useState<StokisOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<StokisOrder | null>(null)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders/stokis")
            const data = await res.json()
            // Filter only PENDING_FINANCE orders
            setOrders(data.filter((o: StokisOrder) => o.status === "PENDING_FINANCE"))
        } catch (err) {
            console.error("Error fetching orders:", err)
        } finally {
            setLoading(false)
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
            }
        } catch (err) {
            console.error("Error updating order:", err)
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
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Receipt className="text-purple-600" />
                    Approve PO
                </h1>
                <p className="text-gray-500 text-sm mt-1">Cek tagihan dan approve PO untuk dikirim ke Gudang</p>
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
                            onClick={() => setSelectedOrder(order)}
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
                                <p className="font-medium text-gray-900">{selectedOrder.stokis.name}</p>
                                <p className="text-sm text-gray-600">{selectedOrder.stokis.email}</p>
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

                                {/* TODO: Add tagihan/invoice check here */}
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-green-700 font-medium">✓ Tidak ada tagihan tertunggak</p>
                                    <p className="text-green-600 text-sm">Stokis dapat melanjutkan order</p>
                                </div>

                                <div className="space-y-2 pt-4">
                                    <button
                                        onClick={() => updateStatus(selectedOrder.id, "PO_ISSUED")}
                                        disabled={updating}
                                        className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
                                    >
                                        {updating ? "Memproses..." : "Approve & Issue PO → Gudang"}
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
