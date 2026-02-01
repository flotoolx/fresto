"use client"

import { useState, useEffect, FormEvent } from "react"
import { Warehouse, Plus, Edit, Trash2, MapPin, X } from "lucide-react"

interface Gudang {
    id: string
    name: string
    code: string
    address: string | null
    _count?: { products: number }
}

export default function GudangPage() {
    const [gudangs, setGudangs] = useState<Gudang[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [editingGudang, setEditingGudang] = useState<Gudang | null>(null)
    const [deletingGudang, setDeletingGudang] = useState<Gudang | null>(null)
    const [error, setError] = useState("")

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
    })

    useEffect(() => {
        fetchGudangs()
    }, [])

    const fetchGudangs = async () => {
        try {
            const res = await fetch("/api/gudang")
            if (res.ok) {
                const data = await res.json()
                setGudangs(data)
            }
        } catch (err) {
            console.error("Error fetching gudang:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)

        try {
            const url = editingGudang ? `/api/gudang/${editingGudang.id}` : "/api/gudang"
            const method = editingGudang ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    code: formData.code,
                    address: formData.address || null,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal menyimpan")
            }

            await fetchGudangs()
            setShowModal(false)
            resetForm()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingGudang) return
        setSubmitting(true)

        try {
            const res = await fetch(`/api/gudang/${deletingGudang.id}`, { method: "DELETE" })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal menghapus")
            }
            await fetchGudangs()
            setShowDeleteModal(false)
            setDeletingGudang(null)
        } catch (err) {
            alert(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({ name: "", code: "", address: "" })
        setEditingGudang(null)
        setError("")
    }

    const openEditModal = (gudang: Gudang) => {
        setEditingGudang(gudang)
        setFormData({
            name: gudang.name,
            code: gudang.code,
            address: gudang.address || "",
        })
        setShowModal(true)
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
                        <Warehouse className="text-red-600" size={20} />
                        Manajemen Gudang
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola gudang penyimpanan</p>
                </div>
                <button
                    onClick={() => {
                        resetForm()
                        setShowModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                    <Plus size={18} />
                    Tambah Gudang
                </button>
            </div>

            {/* Gudang Grid */}
            {gudangs.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Warehouse className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada gudang</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gudangs.map((gudang) => (
                        <div key={gudang.id} className="bg-white rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Warehouse className="text-blue-600" size={24} />
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openEditModal(gudang)}
                                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeletingGudang(gudang)
                                            setShowDeleteModal(true)
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-800 text-lg">{gudang.name}</h3>
                            <p className="text-sm text-gray-500 mb-3">{gudang.code}</p>

                            {gudang.address && (
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{gudang.address}</span>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t">
                                <span className="text-sm text-gray-500">
                                    {gudang._count?.products || 0} produk
                                </span>
                            </div>
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
                                    {editingGudang ? "Edit Gudang" : "Tambah Gudang Baru"}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Gudang</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="Contoh: Gudang Ayam"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="Contoh: GDG-AYAM"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900 resize-none"
                                        rows={3}
                                        placeholder="Alamat lengkap gudang"
                                    />
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
                                        {submitting ? "Menyimpan..." : editingGudang ? "Simpan" : "Tambah"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deletingGudang && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Hapus Gudang?</h2>
                        <p className="text-gray-600 mb-4">
                            Apakah Anda yakin ingin menghapus <strong>{deletingGudang.name}</strong>?
                        </p>
                        {(deletingGudang._count?.products || 0) > 0 && (
                            <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                                ⚠️ Gudang ini memiliki {deletingGudang._count?.products} produk dan tidak bisa dihapus.
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={submitting || (deletingGudang._count?.products || 0) > 0}
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
