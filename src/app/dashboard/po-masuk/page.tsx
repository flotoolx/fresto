"use client"

import { useState, useEffect, useMemo } from "react"
import { Package, Clock, Truck, ChevronRight, Printer, Search, CheckCircle, AlertCircle, Calendar } from "lucide-react"
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
    shippedAt: string | null
    stokis: { name: string; address: string | null; email: string }
    items: OrderItem[]
}

type TabType = "aktif" | "riwayat"

export default function GudangPOMasukPage() {
    const [orders, setOrders] = useState<StokisOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<StokisOrder | null>(null)
    const [updating, setUpdating] = useState(false)

    // Tab, filter, search
    const [activeTab, setActiveTab] = useState<TabType>("aktif")
    const [filterStatus, setFilterStatus] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [period, setPeriod] = useState(30)
    const [useCustomDate, setUseCustomDate] = useState(false)
    const [customDateFrom, setCustomDateFrom] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split("T")[0]
    })
    const [customDateTo, setCustomDateTo] = useState(() => new Date().toISOString().split("T")[0])

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders/stokis")
            const data = await res.json()
            setOrders(Array.isArray(data) ? data : [])
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

    // Separate active vs history
    const activeOrders = useMemo(() =>
        orders.filter(o => ["PENDING_PUSAT", "PO_ISSUED", "PROCESSING"].includes(o.status)),
        [orders]
    )
    const historyOrders = useMemo(() =>
        orders.filter(o => o.status === "SHIPPED"),
        [orders]
    )

    // Apply tab-specific list
    const baseList = activeTab === "aktif" ? activeOrders : historyOrders

    // Apply filters + search + date
    const filteredOrders = useMemo(() => {
        let result = baseList
        if (filterStatus) {
            result = result.filter(o => o.status === filterStatus)
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(o =>
                o.orderNumber.toLowerCase().includes(q) ||
                o.stokis.name.toLowerCase().includes(q)
            )
        }
        // Date filtering
        if (useCustomDate) {
            const from = new Date(customDateFrom)
            from.setHours(0, 0, 0, 0)
            const to = new Date(customDateTo)
            to.setHours(23, 59, 59, 999)
            result = result.filter(o => {
                const d = new Date(o.createdAt)
                return d >= from && d <= to
            })
        } else {
            const from = new Date()
            from.setDate(from.getDate() - period)
            from.setHours(0, 0, 0, 0)
            result = result.filter(o => new Date(o.createdAt) >= from)
        }
        return result
    }, [baseList, filterStatus, searchQuery, period, useCustomDate, customDateFrom, customDateTo])

    // Summary stats
    const pendingCount = activeOrders.filter(o => o.status === "PENDING_PUSAT").length
    const poIssuedCount = activeOrders.filter(o => o.status === "PO_ISSUED").length
    const processingCount = activeOrders.filter(o => o.status === "PROCESSING").length

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
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

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 h-10 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 mb-1">
                        <AlertCircle size={14} className="opacity-80" />
                        <span className="text-[10px] md:text-xs text-white/80">Belum Approve</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold">{pendingCount}</p>
                    <p className="text-[9px] md:text-xs text-white/60 mt-0.5">Menunggu pusat</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 h-10 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 mb-1">
                        <Clock size={14} className="opacity-80" />
                        <span className="text-[10px] md:text-xs text-white/80">Sudah Approve</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold">{poIssuedCount}</p>
                    <p className="text-[9px] md:text-xs text-white/60 mt-0.5">Siap diproses</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 h-10 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-1 mb-1">
                        <Package size={14} className="opacity-80" />
                        <span className="text-[10px] md:text-xs text-white/80">Sedang Diproses</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold">{processingCount}</p>
                    <p className="text-[9px] md:text-xs text-white/60 mt-0.5">Siap dikirim</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => { setActiveTab("aktif"); setFilterStatus("") }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "aktif"
                            ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        PO Aktif ({activeOrders.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab("riwayat"); setFilterStatus("") }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "riwayat"
                            ? "text-green-600 border-b-2 border-green-600 bg-green-50/50"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Riwayat Dikirim ({historyOrders.length})
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="p-3 flex flex-wrap gap-2 border-b border-gray-50">
                    {activeTab === "aktif" && (
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none bg-gray-50 border rounded-lg px-3 py-2 text-gray-700 text-sm"
                        >
                            <option value="">Semua Status</option>
                            <option value="PENDING_PUSAT">Belum Approve</option>
                            <option value="PO_ISSUED">Sudah Approve</option>
                            <option value="PROCESSING">Sedang Diproses</option>
                        </select>
                    )}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari nomor PO atau stokis..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border rounded-lg pl-9 pr-4 py-2 text-gray-700 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {!useCustomDate && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Periode:</label>
                                <select
                                    value={period}
                                    onChange={e => setPeriod(parseInt(e.target.value))}
                                    className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value={7}>7 Hari</option>
                                    <option value={30}>30 Hari</option>
                                    <option value={90}>90 Hari</option>
                                    <option value={365}>1 Tahun</option>
                                </select>
                            </div>
                        )}
                        <button
                            onClick={() => setUseCustomDate(!useCustomDate)}
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
                                    onChange={e => setCustomDateFrom(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={customDateTo}
                                    onChange={e => setCustomDateTo(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Order List */}
            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    {activeTab === "aktif" ? (
                        <>
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Tidak ada PO yang perlu diproses</p>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Belum ada PO yang dikirim</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama Stokis</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map((order) => {
                                    const isPending = order.status === "PENDING_PUSAT"
                                    const isPOIssued = order.status === "PO_ISSUED"
                                    const isProcessing = order.status === "PROCESSING"
                                    const isShipped = order.status === "SHIPPED"
                                    const statusLabel = isPending ? "Belum Approve" : isPOIssued ? "Sudah Approve" : isProcessing ? "Sedang Diproses" : "Dikirim"
                                    const statusColor = isPending ? "bg-amber-100 text-amber-700" :
                                        isPOIssued ? "bg-blue-100 text-blue-700" :
                                            isProcessing ? "bg-purple-100 text-purple-700" :
                                                "bg-green-100 text-green-700"
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-700">{formatDate(order.createdAt)}</p>
                                                <p className="text-xs text-gray-400">{order.orderNumber}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900">{order.stokis.name}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                                    {isPending ? <AlertCircle size={12} /> : isPOIssued ? <Clock size={12} /> : isProcessing ? <Package size={12} /> : <CheckCircle size={12} />}
                                                    {statusLabel}
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

                            {selectedOrder.status === "PENDING_PUSAT" && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Belum Approve</p>
                                        <p className="text-xs text-amber-600">PO ini masih menunggu persetujuan dari Pusat/Finance</p>
                                    </div>
                                </div>
                            )}

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
                                    {/* Print PO Button */}
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

                                    {selectedOrder.status === "SHIPPED" && (
                                        <div className="w-full py-3 bg-green-50 text-green-700 rounded-lg font-semibold flex items-center justify-center gap-2 border border-green-200">
                                            <CheckCircle size={18} />
                                            Sudah Dikirim
                                            {selectedOrder.shippedAt && (
                                                <span className="font-normal text-sm ml-1">
                                                    — {formatDate(selectedOrder.shippedAt)}
                                                </span>
                                            )}
                                        </div>
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
