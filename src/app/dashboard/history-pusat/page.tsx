"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Receipt, Clock, CheckCircle, Truck, Package, XCircle, ArrowLeft, FileText, Printer } from "lucide-react"
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: "Menunggu Approval", color: "bg-yellow-100 text-yellow-700", icon: <Clock size={16} /> },
    APPROVED: { label: "Disetujui", color: "bg-blue-100 text-blue-700", icon: <CheckCircle size={16} /> },
    PO_ISSUED: { label: "PO Diterbitkan", color: "bg-purple-100 text-purple-700", icon: <FileText size={16} /> },
    PROCESSING: { label: "Diproses Gudang", color: "bg-indigo-100 text-indigo-700", icon: <Package size={16} /> },
    SHIPPED: { label: "Dikirim", color: "bg-cyan-100 text-cyan-700", icon: <Truck size={16} /> },
    RECEIVED: { label: "Diterima", color: "bg-green-100 text-green-700", icon: <CheckCircle size={16} /> },
    REJECTED: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: <XCircle size={16} /> },
}

export default function StokisOrderHistoryPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<StokisOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<StokisOrder | null>(null)

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
                <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
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

            {orders.length === 0 ? (
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
                <div className="space-y-4">
                    {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.PENDING
                        return (
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
                                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${status.color}`}>
                                        {status.icon}
                                        {status.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                        {order.items.length} produk
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        {formatCurrency(Number(order.totalAmount))}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedOrder.orderNumber}</h2>
                                    <p className="text-sm text-gray-600">
                                        {formatDate(selectedOrder.createdAt)}
                                    </p>
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

                                {selectedOrder.status === "SHIPPED" && (
                                    <button
                                        onClick={() => handleReceive(selectedOrder.id)}
                                        className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
                                    >
                                        Konfirmasi Terima
                                    </button>
                                )}

                                {/* Print PO Button */}
                                <Link
                                    href={`/po/stokis/${selectedOrder.id}`}
                                    target="_blank"
                                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
                                >
                                    <Printer size={18} />
                                    Print PO
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
