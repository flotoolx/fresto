"use client"

import { useState, useEffect } from "react"
import { Package, Clock, Truck, ChevronRight, Printer } from "lucide-react"
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
    stokis: { name: string; address: string | null; email: string }
    items: OrderItem[]
}

export default function GudangPOMasukPage() {
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
            // Filter PO_ISSUED and PROCESSING orders
            setOrders(data.filter((o: StokisOrder) => ["PO_ISSUED", "PROCESSING"].includes(o.status)))
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
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Package className="text-blue-600" />
                            PO Masuk
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Proses dan kirim pesanan ke Stokis</p>
                    </div>
                    <ExportButton endpoint="/api/export/gudang-po" type="gudang" buttonText="Export" />
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada PO yang perlu diproses</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => {
                        const isPOIssued = order.status === "PO_ISSUED"
                        const isProcessing = order.status === "PROCESSING"
                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all border-l-4 ${isPOIssued ? "border-l-blue-500" : "border-l-purple-500"}`}
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-sm">{order.orderNumber}</h3>
                                        <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                                    </div>
                                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isPOIssued ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-purple-100 text-purple-700 border-purple-200"
                                        }`}>
                                        {isPOIssued ? <Clock size={12} /> : <Package size={12} />}
                                        {isPOIssued ? "PO Baru" : "Diproses"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">{order.stokis.name}</span>
                                        {order.stokis.address && (
                                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{order.stokis.address}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-600 text-sm">
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
                                <p className="font-medium text-gray-900">Kirim ke: {selectedOrder.stokis.name}</p>
                                {selectedOrder.stokis.address && (
                                    <p className="text-sm text-gray-600">{selectedOrder.stokis.address}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2 text-gray-900">Items untuk Disiapkan</h3>
                                    {selectedOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between py-2 border-b text-gray-800">
                                            <div>
                                                <span className="font-medium">{item.product.name}</span>
                                                <p className="text-sm text-gray-500">
                                                    {item.quantity} {item.product.unit} • {item.product.gudang.name}
                                                </p>
                                            </div>
                                            <span className="font-medium">{formatCurrency(Number(item.price) * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between py-3 font-bold text-gray-900">
                                        <span>Total</span>
                                        <span className="text-blue-600">
                                            {formatCurrency(Number(selectedOrder.totalAmount))}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4">
                                    {/* Print PO Button - Opens print preview page like Stokis */}
                                    <Link
                                        href={`/po/stokis/${selectedOrder.id}`}
                                        target="_blank"
                                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 flex items-center justify-center gap-2"
                                    >
                                        <Printer size={18} />
                                        Print PO (Picking List)
                                    </Link>

                                    {selectedOrder.status === "PO_ISSUED" && (
                                        <button
                                            onClick={() => updateStatus(selectedOrder.id, "PROCESSING")}
                                            disabled={updating}
                                            className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
                                        >
                                            {updating ? "Memproses..." : "Mulai Proses Pesanan"}
                                        </button>
                                    )}

                                    {selectedOrder.status === "PROCESSING" && (
                                        <button
                                            onClick={() => updateStatus(selectedOrder.id, "SHIPPED")}
                                            disabled={updating}
                                            className="w-full py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Truck size={20} />
                                            {updating ? "Memproses..." : "Tandai Sudah Dikirim"}
                                        </button>
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
