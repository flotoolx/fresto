"use client"

import { useState, useEffect, FormEvent } from "react"
import { Package, Plus, Edit, Trash2, Search, X } from "lucide-react"
import ExportButton from "@/components/ExportButton"

interface Product {
    id: string
    name: string
    sku: string
    unit: string
    price: number
    gudang: { id: string; name: string }
}

interface Gudang {
    id: string
    name: string
    code: string
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [gudangs, setGudangs] = useState<Gudang[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [search, setSearch] = useState("")
    const [filterGudang, setFilterGudang] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
    const [error, setError] = useState("")

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        unit: "kg",
        price: "",
        gudangId: "",
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [prodRes, gudangRes] = await Promise.all([
                fetch("/api/products"),
                fetch("/api/gudang"),
            ])
            if (prodRes.ok) setProducts(await prodRes.json())
            if (gudangRes.ok) setGudangs(await gudangRes.json())
        } catch (err) {
            console.error("Error fetching data:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)

        try {
            const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products"
            const method = editingProduct ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    sku: formData.sku,
                    unit: formData.unit,
                    price: parseFloat(formData.price),
                    gudangId: formData.gudangId,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal menyimpan")
            }

            await fetchData()
            setShowModal(false)
            resetForm()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingProduct) return
        setSubmitting(true)

        try {
            const res = await fetch(`/api/products/${deletingProduct.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Gagal menghapus")
            await fetchData()
            setShowDeleteModal(false)
            setDeletingProduct(null)
        } catch (err) {
            alert(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({ name: "", sku: "", unit: "kg", price: "", gudangId: "" })
        setEditingProduct(null)
        setError("")
    }

    const openEditModal = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            price: product.price.toString(),
            gudangId: product.gudang.id,
        })
        setShowModal(true)
    }

    const filteredProducts = products.filter((product) => {
        const matchSearch =
            product.name.toLowerCase().includes(search.toLowerCase()) ||
            product.sku.toLowerCase().includes(search.toLowerCase())
        const matchGudang = filterGudang === "" || product.gudang.id === filterGudang
        return matchSearch && matchGudang
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="text-red-600" size={20} />
                        Manajemen Produk
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola produk dan harga</p>
                </div>
                <button
                    onClick={() => {
                        resetForm()
                        setShowModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                    <Plus size={18} />
                    Tambah Produk
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama atau SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-500 text-sm"
                    />
                </div>
                <select
                    value={filterGudang}
                    onChange={(e) => setFilterGudang(e.target.value)}
                    className="px-4 py-2.5 border rounded-lg text-gray-900 text-sm"
                >
                    <option value="">Semua Gudang</option>
                    {gudangs.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada produk ditemukan</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {filteredProducts.map((product) => (
                        <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">{product.name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{product.sku}</p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                    <button
                                        onClick={() => openEditModal(product)}
                                        className="p-1.5 text-gray-400 hover:text-blue-500"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeletingProduct(product)
                                            setShowDeleteModal(true)
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-base md:text-lg font-bold text-red-600">
                                    {formatCurrency(product.price)}
                                </span>
                                <span className="text-gray-500 text-xs md:text-sm">/{product.unit}</span>
                            </div>
                            <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {product.gudang.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="Contoh: Ayam Fillet"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="Contoh: AYM-FLT-001"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                            placeholder="55000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                            placeholder="kg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gudang</label>
                                    <select
                                        required
                                        value={formData.gudangId}
                                        onChange={(e) => setFormData({ ...formData, gudangId: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                    >
                                        <option value="">Pilih Gudang</option>
                                        {gudangs.map((g) => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50"
                                    >
                                        {submitting ? "Menyimpan..." : editingProduct ? "Simpan" : "Tambah"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deletingProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Hapus Produk?</h2>
                        <p className="text-gray-600 mb-4">
                            Apakah Anda yakin ingin menghapus <strong>{deletingProduct.name}</strong>?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={submitting}
                                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50"
                            >
                                {submitting ? "Menghapus..." : "Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
