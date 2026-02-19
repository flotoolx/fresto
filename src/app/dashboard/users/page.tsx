"use client"

import { useState, useEffect, FormEvent } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Users, Plus, Edit, Trash2, Search, X, Download } from "lucide-react"
import ExportButton from "@/components/ExportButton"

interface User {
    id: string
    name: string
    email: string
    role: string
    phone?: string | null
    address?: string | null
    stokis?: { name: string } | null
    createdAt: string
}

interface Stokis {
    id: string
    name: string
}

const roleLabels: Record<string, { label: string; color: string }> = {
    PUSAT: { label: "Pusat", color: "bg-red-100 text-red-700" },
    FINANCE: { label: "Finance", color: "bg-purple-100 text-purple-700" },
    GUDANG: { label: "Gudang", color: "bg-blue-100 text-blue-700" },
    STOKIS: { label: "Stokis", color: "bg-green-100 text-green-700" },
    MITRA: { label: "Mitra", color: "bg-orange-100 text-orange-700" },
}

export default function UsersPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const role = session?.user?.role || ""

    // Only PUSAT and FINANCE can access this page
    useEffect(() => {
        if (role && role !== "FINANCE" && role !== "PUSAT") {
            router.replace("/dashboard")
        }
    }, [role, router])

    const [users, setUsers] = useState<User[]>([])
    const [stokisList, setStokisList] = useState<Stokis[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [search, setSearch] = useState("")
    const [filterRole, setFilterRole] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [deletingUser, setDeletingUser] = useState<User | null>(null)
    const [error, setError] = useState("")

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "MITRA",
        phone: "",
        address: "",
        stokisId: "",
    })

    useEffect(() => {
        fetchUsers()
        fetchStokis()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users")
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            }
        } catch (err) {
            console.error("Error fetching users:", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchStokis = async () => {
        try {
            const res = await fetch("/api/stokis")
            if (res.ok) {
                const data = await res.json()
                setStokisList(data)
            }
        } catch (err) {
            console.error("Error fetching stokis:", err)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
            const method = editingUser ? "PUT" : "POST"

            const payload: Record<string, string | null> = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                phone: formData.phone || null,
                address: formData.address || null,
                stokisId: formData.role === "MITRA" ? formData.stokisId || null : null,
            }

            if (!editingUser && formData.password) {
                payload.password = formData.password
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal menyimpan")
            }

            await fetchUsers()
            setShowModal(false)
            resetForm()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingUser) return
        setSubmitting(true)

        try {
            const res = await fetch(`/api/users/${deletingUser.id}`, { method: "DELETE" })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal menghapus")
            }
            await fetchUsers()
            setShowDeleteModal(false)
            setDeletingUser(null)
        } catch (err) {
            alert(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            password: "",
            role: role === "FINANCE" ? "STOKIS" : role === "PUSAT" ? "FINANCE" : "MITRA",
            phone: "",
            address: "",
            stokisId: "",
        })
        setEditingUser(null)
        setError("")
    }

    const openEditModal = (user: User) => {
        setEditingUser(user)
        setFormData({
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            phone: user.phone || "",
            address: user.address || "",
            stokisId: "",
        })
        setShowModal(true)
    }

    const filteredUsers = users.filter((user) => {
        const matchSearch =
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase())
        const matchRole = filterRole === "" || user.role === filterRole
        return matchSearch && matchRole
    })

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
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
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-red-600" size={20} />
                        Manajemen User
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">{role === "FINANCE" ? "Kelola Stokis area Pusat" : role === "PUSAT" ? "Kelola user Finance & Gudang" : "Kelola semua user dalam sistem"}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => {
                            resetForm()
                            setShowModal(true)
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                        <Plus size={18} />
                        <span className="sm:inline">Tambah</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-500 text-sm"
                    />
                </div>
                {role !== "FINANCE" && role !== "PUSAT" && (
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-4 py-2.5 border rounded-lg text-gray-900 text-sm"
                    >
                        <option value="">Semua Role</option>
                        <option value="PUSAT">Pusat</option>
                        <option value="FINANCE">Finance</option>
                        <option value="GUDANG">Gudang</option>
                        <option value="STOKIS">Stokis</option>
                        <option value="MITRA">Mitra</option>
                    </select>
                )}
            </div>

            {/* Users - Mobile Cards / Desktop Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Nama</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Email</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Role</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Stokis</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Terdaftar</th>
                                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredUsers.map((user) => {
                                const role = roleLabels[user.role] || roleLabels.MITRA
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">{user.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${role.color}`}>
                                                {role.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{user.stokis?.name || "-"}</td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{formatDate(user.createdAt)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeletingUser(user)
                                                        setShowDeleteModal(true)
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y">
                    {filteredUsers.map((user) => {
                        const role = roleLabels[user.role] || roleLabels.MITRA
                        return (
                            <div key={user.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${role.color}`}>
                                        {role.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-xs text-gray-400">{formatDate(user.createdAt)}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="p-2 text-blue-500 bg-blue-50 rounded-lg"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeletingUser(user)
                                                setShowDeleteModal(true)
                                            }}
                                            className="p-2 text-red-500 bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">Tidak ada user ditemukan</div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingUser ? "Edit User" : "Tambah User Baru"}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="Nama lengkap"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                            placeholder="Minimal 6 karakter"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    {role === "FINANCE" ? (
                                        <input
                                            type="text"
                                            value="Stokis"
                                            disabled
                                            className="w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-gray-100 cursor-not-allowed"
                                        />
                                    ) : role === "PUSAT" ? (
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        >
                                            <option value="FINANCE">Finance</option>
                                            <option value="GUDANG">Gudang</option>
                                        </select>
                                    ) : (
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        >
                                            <option value="PUSAT">Pusat</option>
                                            <option value="FINANCE">Finance</option>
                                            <option value="GUDANG">Gudang</option>
                                            <option value="STOKIS">Stokis</option>
                                            <option value="MITRA">Mitra</option>
                                        </select>
                                    )}
                                </div>
                                {formData.role === "MITRA" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stokis</label>
                                        <select
                                            value={formData.stokisId}
                                            onChange={(e) => setFormData({ ...formData, stokisId: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        >
                                            <option value="">Pilih Stokis</option>
                                            {stokisList.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 border rounded-lg text-gray-900"
                                        placeholder="08xxxxxxxxxx"
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
                                        {submitting ? "Menyimpan..." : editingUser ? "Simpan" : "Tambah"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Hapus User?</h2>
                        <p className="text-gray-600 mb-4">
                            Apakah Anda yakin ingin menghapus <strong>{deletingUser.name}</strong>?
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
