"use client"

import { useState, useEffect } from "react"
import { Users, Plus, X, Pencil } from "lucide-react"

interface Mitra {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
    uniqueCode: string | null
    _count?: { mitraOrdersAsMitra: number }
    createdAt: string
    mitraOrdersAsMitra?: {
        totalAmount: number
        createdAt: string
        items: { quantity: number }[]
    }[]
}

export default function MitraSayaPage() {
    const [mitras, setMitras] = useState<Mitra[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editMitra, setEditMitra] = useState<Mitra | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [successMsg, setSuccessMsg] = useState("")

    // Form state for Add
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
    })

    // Form state for Edit
    const [editFormData, setEditFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        uniqueCode: "",
    })

    useEffect(() => {
        fetchMitras()
    }, [])

    const fetchMitras = async () => {
        try {
            const res = await fetch("/api/mitra")
            if (res.ok) {
                const data = await res.json()
                setMitras(data)
            }
        } catch (err) {
            console.error("Error fetching mitra:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!formData.name || !formData.email || !formData.password) {
            setError("Nama, email, dan password wajib diisi")
            return
        }

        if (formData.password.length < 6) {
            setError("Password minimal 6 karakter")
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch("/api/mitra", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setShowModal(false)
                setFormData({ name: "", email: "", password: "", phone: "", address: "" })
                fetchMitras()
            } else {
                const data = await res.json()
                setError(data.error || "Gagal menambah mitra")
            }
        } catch (err) {
            console.error("Error adding mitra:", err)
            setError("Gagal menambah mitra")
        } finally {
            setSubmitting(false)
        }
    }

    const handleEditClick = (mitra: Mitra) => {
        setEditMitra(mitra)
        setEditFormData({
            name: mitra.name,
            email: mitra.email,
            password: "",
            phone: mitra.phone || "",
            address: mitra.address || "",
            uniqueCode: mitra.uniqueCode || "",
        })
        setError("")
        setShowEditModal(true)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editMitra) return
        setError("")

        if (!editFormData.name || !editFormData.email) {
            setError("Nama dan email wajib diisi")
            return
        }

        if (editFormData.password && editFormData.password.length < 6) {
            setError("Password minimal 6 karakter")
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch(`/api/mitra/${editMitra.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editFormData),
            })

            if (res.ok) {
                setShowEditModal(false)
                setEditMitra(null)
                setSuccessMsg("Data mitra berhasil diperbarui")
                setTimeout(() => setSuccessMsg(""), 3000)
                fetchMitras()
            } else {
                const data = await res.json()
                setError(data.error || "Gagal mengupdate mitra")
            }
        } catch (err) {
            console.error("Error updating mitra:", err)
            setError("Gagal mengupdate mitra")
        } finally {
            setSubmitting(false)
        }
    }

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
        }).format(new Date(date))
    }

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
                <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-green-600" />
                        Mitra Saya
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola mitra di bawah Anda</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                    <Plus size={18} />
                    Tambah Mitra
                </button>
            </div>

            {/* Success Message */}
            {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                    ✅ {successMsg}
                </div>
            )}

            {/* Mitra Table */}
            {mitras.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada mitra terdaftar</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                        Tambah Mitra Pertama
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kode</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama Mitra</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tgl Bergabung</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Qty<span className="block text-[10px] normal-case text-gray-400 font-normal">Order Terakhir</span></th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Nominal<span className="block text-[10px] normal-case text-gray-400 font-normal">Order Terakhir</span></th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tgl Order<span className="block text-[10px] normal-case text-gray-400 font-normal">Order Terakhir</span></th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {mitras.map((mitra, index) => {
                                    const lastOrder = mitra.mitraOrdersAsMitra?.[0]
                                    const lastOrderQty = lastOrder
                                        ? lastOrder.items.reduce((sum, item) => sum + item.quantity, 0)
                                        : null
                                    return (
                                        <tr key={mitra.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                {mitra.uniqueCode ? (
                                                    <span className="text-xs font-mono font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{mitra.uniqueCode}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">{mitra.name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{formatDate(mitra.createdAt)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 text-center">
                                                {lastOrderQty !== null ? lastOrderQty : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right">
                                                {lastOrder ? formatCurrency(Number(lastOrder.totalAmount)) : <span className="text-gray-400 font-normal">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {lastOrder ? formatDate(lastOrder.createdAt) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleEditClick(mitra)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={12} />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Tambah Mitra Baru</h2>
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        setError("")
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mitra *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                        placeholder="Nama lengkap"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                        placeholder="Minimal 6 karakter"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-gray-900 resize-none"
                                        rows={2}
                                        placeholder="Alamat lengkap"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false)
                                            setError("")
                                        }}
                                        className="flex-1 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                                    >
                                        {submitting ? "Menyimpan..." : "Tambah Mitra"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editMitra && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Edit Mitra</h2>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false)
                                        setEditMitra(null)
                                        setError("")
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                {/* Kode Unik */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode Unik</label>
                                    <input
                                        type="text"
                                        value={editFormData.uniqueCode}
                                        onChange={(e) => setEditFormData({ ...editFormData, uniqueCode: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 border rounded-lg text-gray-900 font-mono"
                                        placeholder="Contoh: PLBM-0001"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Auto-generated saat tambah. Bisa diedit manual.</p>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Login Info Section */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Info Login</p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                            <input
                                                type="email"
                                                value={editFormData.email}
                                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                                            <input
                                                type="password"
                                                value={editFormData.password}
                                                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                                placeholder="Kosongkan jika tidak ingin mengubah"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Minimal 6 karakter. Kosongkan jika tidak ingin mengubah password.</p>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Detail Info Section */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Detail Mitra</p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mitra *</label>
                                            <input
                                                type="text"
                                                value={editFormData.name}
                                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                                            <input
                                                type="tel"
                                                value={editFormData.phone}
                                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                                placeholder="08xxxxxxxxxx"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat / Lokasi</label>
                                            <textarea
                                                value={editFormData.address}
                                                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg text-gray-900 resize-none"
                                                rows={2}
                                                placeholder="Alamat lengkap"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false)
                                            setEditMitra(null)
                                            setError("")
                                        }}
                                        className="flex-1 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
