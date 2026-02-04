"use client"

import { useState, useEffect } from "react"
import { ShoppingCart, Clock, CheckCircle, Truck, Package, XCircle, ChevronRight, Printer } from "lucide-react"
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
    stokis: { name: string; address: string | null; email: string }
    items: OrderItem[]
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING_PUSAT: { label: "Menunggu Pusat", color: "bg-yellow-100 text-yellow-700", icon: <Clock size={16} /> },
    PENDING_FINANCE: { label: "Menunggu Finance", color: "bg-orange-100 text-orange-700", icon: <Clock size={16} /> },
    PO_ISSUED: { label: "PO Issued", color: "bg-blue-100 text-blue-700", icon: <CheckCircle size={16} /> },
    PROCESSING: { label: "Diproses Gudang", color: "bg-purple-100 text-purple-700", icon: <Package size={16} /> },
    SHIPPED: { label: "Dikirim", color: "bg-indigo-100 text-indigo-700", icon: <Truck size={16} /> },
    RECEIVED: { label: "Diterima", color: "bg-green-100 text-green-700", icon: <CheckCircle size={16} /> },
    CANCELLED: { label: "Dibatalkan", color: "bg-red-100 text-red-700", icon: <XCircle size={16} /> },
}

export default function PusatOrdersStokisPage() {
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
            setOrders(data)
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
                            Order dari Stokis
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Approve order dari Stokis untuk diteruskan ke Finance</p>
                    </div>
                    <ExportButton endpoint="/api/export/orders" type="stokis" buttonText="Export" />
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada order dari Stokis</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.PENDING_PUSAT
                        const isPending = order.status === "PENDING_PUSAT"
                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all border-l-4 ${isPending ? "border-l-amber-500" : "border-l-blue-500"}`}
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-sm">{order.orderNumber}</h3>
                                        <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                                    </div>
                                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color.replace('bg-', 'border-').replace('100', '200')} ${status.color}`}>
                                        {status.icon}
                                        {status.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">{order.stokis.name}</span>
                                        <p className="text-xs text-gray-500">{order.stokis.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-red-600 text-sm">
                                            {formatCurrency(Number(order.totalAmount))}
                                        </span>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
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
                                {selectedOrder.stokis.address && (
                                    <p className="text-sm text-gray-600">{selectedOrder.stokis.address}</p>
                                )}
                            </div>

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
                                        <p className="text-gray-600 text-sm">{selectedOrder.notes}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-4">
                                    {selectedOrder.status === "PENDING_PUSAT" && (
                                        <>
                                            <button
                                                onClick={() => updateStatus(selectedOrder.id, "PENDING_FINANCE")}
                                                disabled={updating}
                                                className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {updating ? "Memproses..." : "Approve → Kirim ke Finance"}
                                            </button>
                                            <button
                                                onClick={() => updateStatus(selectedOrder.id, "CANCELLED")}
                                                disabled={updating}
                                                className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50"
                                            >
                                                Tolak Order
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
        </div>
    )
}
