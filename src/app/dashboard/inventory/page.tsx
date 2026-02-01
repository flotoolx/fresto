"use client"

import { useState, useEffect } from "react"
import { Package, AlertTriangle, Plus, Minus, X, Search } from "lucide-react"
import ExportButton from "@/components/ExportButton"

interface InventoryItem {
    id: string
    quantity: number
    minStock: number
    product: {
        id: string
        name: string
        sku: string
        unit: string
        gudang: { name: string }
    }
}

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add")
    const [adjustAmount, setAdjustAmount] = useState("")
    const [adjustReason, setAdjustReason] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchInventory()
    }, [])

    const fetchInventory = async () => {
        try {
            const res = await fetch("/api/inventory")
            if (res.ok) {
                const data = await res.json()
                setInventory(data)
            }
        } catch (err) {
            console.error("Error fetching inventory:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleAdjust = async () => {
        if (!selectedItem || !adjustAmount) return
        setSubmitting(true)

        try {
            const adjustment = adjustmentType === "add" ? parseInt(adjustAmount) : -parseInt(adjustAmount)
            const res = await fetch(`/api/inventory/${selectedItem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adjustment, reason: adjustReason }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal menyesuaikan stok")
            }

            await fetchInventory()
            closeAdjustModal()
        } catch (err) {
            alert(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const openAdjustModal = (item: InventoryItem, type: "add" | "subtract") => {
        setSelectedItem(item)
        setAdjustmentType(type)
        setAdjustAmount("")
        setAdjustReason("")
        setShowAdjustModal(true)
    }

    const closeAdjustModal = () => {
        setShowAdjustModal(false)
        setSelectedItem(null)
        setAdjustAmount("")
        setAdjustReason("")
    }

    const filteredInventory = inventory.filter(
        (item) =>
            item.product.name.toLowerCase().includes(search.toLowerCase()) ||
            item.product.sku.toLowerCase().includes(search.toLowerCase())
    )

    const lowStockItems = inventory.filter((item) => item.quantity <= item.minStock)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="text-blue-600" size={20} />
                        Inventory
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Monitor dan kelola stok barang</p>
                </div>
                <ExportButton endpoint="/api/export/inventory" type="inventory" buttonText="Export" />
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari produk..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-500 text-sm"
                    />
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-700 font-semibold mb-2">
                        <AlertTriangle size={20} />
                        Stok Menipis ({lowStockItems.length} produk)
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockItems.map((item) => (
                            <span
                                key={item.id}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                            >
                                {item.product.name}: {item.quantity} {item.product.unit}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Inventory Grid */}
            {filteredInventory.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data inventory</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {filteredInventory.map((item) => {
                        const isLow = item.quantity <= item.minStock
                        return (
                            <div
                                key={item.id}
                                className={`bg-white rounded-xl p-4 shadow-sm border-2 ${isLow ? "border-yellow-400" : "border-transparent"}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">{item.product.name}</h3>
                                        <p className="text-xs text-gray-500 truncate">{item.product.sku}</p>
                                    </div>
                                    {isLow && (
                                        <span className="p-1 bg-yellow-100 rounded ml-2">
                                            <AlertTriangle size={12} className="text-yellow-600" />
                                        </span>
                                    )}
                                </div>

                                <div className="text-center py-3">
                                    <span className={`text-2xl md:text-3xl font-bold ${isLow ? "text-yellow-600" : "text-blue-600"}`}>
                                        {item.quantity}
                                    </span>
                                    <span className="text-gray-500 text-sm md:text-lg ml-1">{item.product.unit}</span>
                                </div>

                                <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                                    <span>Min: {item.minStock}</span>
                                    <span className="bg-gray-100 px-2 py-0.5 rounded truncate max-w-[80px]">{item.product.gudang.name}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openAdjustModal(item, "subtract")}
                                        className="flex-1 py-2 border rounded-lg flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 transition-colors text-sm"
                                    >
                                        <Minus size={14} />
                                        <span className="hidden sm:inline">Kurangi</span>
                                    </button>
                                    <button
                                        onClick={() => openAdjustModal(item, "add")}
                                        className="flex-1 py-2 border rounded-lg flex items-center justify-center gap-1 text-green-600 hover:bg-green-50 transition-colors text-sm"
                                    >
                                        <Plus size={14} />
                                        <span className="hidden sm:inline">Tambah</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Adjustment Modal */}
            {showAdjustModal && selectedItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {adjustmentType === "add" ? "Tambah" : "Kurangi"} Stok
                                </h2>
                                <button onClick={closeAdjustModal} className="text-gray-500 hover:text-gray-700">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-800">{selectedItem.product.name}</p>
                                <p className="text-sm text-gray-500">Stok saat ini: {selectedItem.quantity} {selectedItem.product.unit}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="Masukkan jumlah"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan (opsional)</label>
                                    <input
                                        type="text"
                                        value={adjustReason}
                                        onChange={(e) => setAdjustReason(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="Contoh: Barang rusak"
                                    />
                                </div>
                            </div>

                            {adjustAmount && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                    Stok setelah penyesuaian:{" "}
                                    <strong>
                                        {adjustmentType === "add"
                                            ? selectedItem.quantity + parseInt(adjustAmount || "0")
                                            : selectedItem.quantity - parseInt(adjustAmount || "0")}{" "}
                                        {selectedItem.product.unit}
                                    </strong>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={closeAdjustModal}
                                    className="flex-1 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAdjust}
                                    disabled={submitting || !adjustAmount}
                                    className={`flex-1 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 ${adjustmentType === "add"
                                            ? "bg-green-500 hover:bg-green-600"
                                            : "bg-red-500 hover:bg-red-600"
                                        }`}
                                >
                                    {submitting ? "Memproses..." : adjustmentType === "add" ? "Tambah" : "Kurangi"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
