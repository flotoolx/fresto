"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Store, Search, Plus, X, Pencil } from "lucide-react"

interface Stokis {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
    uniqueCode: string | null
    isActive: boolean
    createdAt: string
}

export default function DCStokisPage() {
    const { data: session } = useSession()
    const [stokisList, setStokisList] = useState<Stokis[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Add modal state
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [successMsg, setSuccessMsg] = useState("")
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
    })

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false)
    const [editStokis, setEditStokis] = useState<Stokis | null>(null)
    const [editFormData, setEditFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        uniqueCode: "",
    })

    const fetchStokis = async () => {
        try {
            const res = await fetch("/api/users?role=STOKIS")
            if (res.ok) {
                const data = await res.json()
                setStokisList(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Error fetching stokis:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStokis()
    }, [])

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
            const res = await fetch("/api/stokis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setShowModal(false)
                setFormData({ name: "", email: "", password: "", phone: "", address: "" })
                setSuccessMsg("Stokis baru berhasil ditambahkan")
                setTimeout(() => setSuccessMsg(""), 3000)
                fetchStokis()
            } else {
                const data = await res.json()
                setError(data.error || "Gagal menambah stokis")
            }
        } catch (err) {
            console.error("Error adding stokis:", err)
            setError("Gagal menambah stokis")
        } finally {
            setSubmitting(false)
        }
    }

    const handleEditClick = (stokis: Stokis) => {
        setEditStokis(stokis)
        setEditFormData({
            name: stokis.name,
            email: stokis.email,
            password: "",
            phone: stokis.phone || "",
            address: stokis.address || "",
            uniqueCode: stokis.uniqueCode || "",
        })
        setError("")
        setShowEditModal(true)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editStokis) return
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
            const res = await fetch(`/api/users/${editStokis.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editFormData),
            })

            if (res.ok) {
                setShowEditModal(false)
                setEditStokis(null)
                setSuccessMsg("Data stokis berhasil diperbarui")
                setTimeout(() => setSuccessMsg(""), 3000)
                fetchStokis()
            } else {
                const data = await res.json()
                setError(data.error || "Gagal mengupdate stokis")
            }
        } catch (err) {
            console.error("Error updating stokis:", err)
            setError("Gagal mengupdate stokis")
        } finally {
            setSubmitting(false)
        }
    }

    const filteredStokis = stokisList.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (session?.user?.role !== "DC") {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500">Anda tidak memiliki akses ke halaman ini</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Kelola Stokis</h1>
                    <p className="text-gray-500 text-sm">Daftar stokis dalam area coverage Anda</p>
                </div>
                <button
                    onClick={() => { setShowModal(true); setError("") }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
                >
                    <Plus size={18} />
                    Tambah Stokis
                </button>
            </div>

            {/* Success Message */}
            {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                    ✅ {successMsg}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cari stokis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <Store size={16} className="opacity-80" />
                        <span className="text-white/80 text-xs">Total Stokis</span>
                    </div>
                    <p className="text-2xl font-bold">{stokisList.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <Store size={16} className="opacity-80" />
                        <span className="text-white/80 text-xs">Stokis Aktif</span>
                    </div>
                    <p className="text-2xl font-bold">{stokisList.filter(s => s.isActive).length}</p>
                </div>
            </div>

            {/* Stokis List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                        <p className="text-gray-400 mt-2 text-sm">Memuat data...</p>
                    </div>
                ) : filteredStokis.length === 0 ? (
                    <div className="p-8 text-center">
                        <Store size={40} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-400">Tidak ada stokis ditemukan</p>
                        {stokisList.length === 0 && (
                            <button
                                onClick={() => { setShowModal(true); setError("") }}
                                className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm"
                            >
                                Tambah Stokis Pertama
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kode</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama Stokis</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. Telp</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStokis.map((stokis, index) => (
                                    <tr key={stokis.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            {stokis.uniqueCode ? (
                                                <span className="text-xs font-mono font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{stokis.uniqueCode}</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-gray-900">{stokis.name}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{stokis.email}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{stokis.phone || "-"}</td>
                                        <td className="px-4 py-3 text-center">
                                            {stokis.isActive ? (
                                                <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">Aktif</span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">Nonaktif</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleEditClick(stokis)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                                <Pencil size={12} />
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Tambah Stokis Baru</h2>
                                <button
                                    onClick={() => { setShowModal(false); setError("") }}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Stokis *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-gray-900"
                                        placeholder="Nama lengkap stokis"
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
                                        onClick={() => { setShowModal(false); setError("") }}
                                        className="flex-1 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                                    >
                                        {submitting ? "Menyimpan..." : "Tambah Stokis"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editStokis && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Edit Stokis</h2>
                                <button
                                    onClick={() => { setShowEditModal(false); setEditStokis(null); setError("") }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {editStokis.uniqueCode && (
                                <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                                    <span className="text-xs text-purple-500">Kode:</span>
                                    <span className="ml-2 text-sm font-mono font-bold text-purple-700">{editStokis.uniqueCode}</span>
                                </div>
                            )}

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleEditSubmit} className="space-y-4">
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
                                            <p className="text-[10px] text-gray-400 mt-1">Minimal 6 karakter. Kosongkan jika tidak ingin mengubah.</p>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Detail Stokis</p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Unik</label>
                                            <input
                                                type="text"
                                                value={editFormData.uniqueCode}
                                                onChange={(e) => setEditFormData({ ...editFormData, uniqueCode: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg text-gray-900 font-mono"
                                                placeholder="cth: PLB-S-001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Stokis *</label>
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
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
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
                                        onClick={() => { setShowEditModal(false); setEditStokis(null); setError("") }}
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
