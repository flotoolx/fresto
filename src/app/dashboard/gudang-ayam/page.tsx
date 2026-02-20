"use client"

import { useState, useEffect, useMemo } from "react"
import { Package, ArrowDownCircle, ArrowUpCircle, BarChart3, Plus, Search, Calendar, X } from "lucide-react"

interface GudangTransaction {
    id: string
    type: "MASUK" | "KELUAR"
    transactionDate: string
    supplierName: string | null
    suratJalan: string | null
    ekor: number | null
    kg: string | number | null
    barangKeluar: string | null
    userName: string | null
    notes: string | null
    createdAt: string
}

interface InventorySummary {
    totalMasukEkor: number
    totalMasukKg: number
    totalKeluarEkor: number
    stokEkor: number
    stokKg: number
}

type TabType = "masuk" | "keluar" | "inventory"

export default function GudangAyamPage() {
    const [transactions, setTransactions] = useState<GudangTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>("masuk")
    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state for Masuk Ayam
    const [formData, setFormData] = useState({
        transactionDate: new Date().toISOString().split("T")[0],
        supplierName: "",
        suratJalan: "",
        ekor: "",
        kg: "",
        notes: ""
    })

    // Form state for Keluar Ayam
    const [keluarForm, setKeluarForm] = useState({
        transactionDate: new Date().toISOString().split("T")[0],
        ekor: "",
        barangKeluar: "",
        notes: ""
    })

    const fetchTransactions = async () => {
        try {
            const typeFilter = activeTab === "inventory" ? "" : `&type=${activeTab === "masuk" ? "MASUK" : "KELUAR"}`
            const res = await fetch(`/api/gudang-transactions?${typeFilter}`)
            if (res.ok) {
                const data = await res.json()
                setTransactions(data.transactions || [])
            }
        } catch (err) {
            console.error("Fetch error:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        fetchTransactions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    const inventory = useMemo<InventorySummary>(() => {
        const masuk = transactions.filter(t => t.type === "MASUK")
        const keluar = transactions.filter(t => t.type === "KELUAR")
        const totalMasukEkor = masuk.reduce((sum, t) => sum + (t.ekor || 0), 0)
        const totalMasukKg = masuk.reduce((sum, t) => sum + Number(t.kg || 0), 0)
        const totalKeluarEkor = keluar.reduce((sum, t) => sum + (t.ekor || 0), 0)
        return {
            totalMasukEkor,
            totalMasukKg,
            totalKeluarEkor,
            stokEkor: totalMasukEkor - totalKeluarEkor,
            stokKg: totalMasukKg
        }
    }, [transactions])

    const filteredTransactions = useMemo(() => {
        if (!search) return transactions
        const q = search.toLowerCase()
        return transactions.filter(t =>
            (t.supplierName && t.supplierName.toLowerCase().includes(q)) ||
            (t.suratJalan && t.suratJalan.toLowerCase().includes(q)) ||
            (t.barangKeluar && t.barangKeluar.toLowerCase().includes(q)) ||
            (t.notes && t.notes.toLowerCase().includes(q))
        )
    }, [transactions, search])

    const handleSubmitMasuk = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await fetch("/api/gudang-transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "MASUK",
                    transactionDate: formData.transactionDate,
                    supplierName: formData.supplierName,
                    suratJalan: formData.suratJalan,
                    ekor: parseInt(formData.ekor) || 0,
                    kg: parseFloat(formData.kg) || 0,
                    notes: formData.notes
                })
            })
            if (res.ok) {
                setShowForm(false)
                setFormData({ transactionDate: new Date().toISOString().split("T")[0], supplierName: "", suratJalan: "", ekor: "", kg: "", notes: "" })
                fetchTransactions()
            } else {
                const data = await res.json()
                alert(data.error || "Gagal menyimpan")
            }
        } catch {
            alert("Error menyimpan data")
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmitKeluar = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await fetch("/api/gudang-transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "KELUAR",
                    transactionDate: keluarForm.transactionDate,
                    ekor: parseInt(keluarForm.ekor) || 0,
                    barangKeluar: keluarForm.barangKeluar,
                    notes: keluarForm.notes
                })
            })
            if (res.ok) {
                setShowForm(false)
                setKeluarForm({ transactionDate: new Date().toISOString().split("T")[0], ekor: "", barangKeluar: "", notes: "" })
                fetchTransactions()
            } else {
                const data = await res.json()
                alert(data.error || "Gagal menyimpan")
            }
        } catch {
            alert("Error menyimpan data")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus transaksi ini?")) return
        try {
            const res = await fetch(`/api/gudang-transactions/${id}`, { method: "DELETE" })
            if (res.ok) fetchTransactions()
        } catch {
            alert("Error menghapus")
        }
    }

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })

    const formatNumber = (n: number) => Number.isInteger(n) ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: "masuk", label: "Masuk Ayam", icon: <ArrowDownCircle size={18} /> },
        { key: "keluar", label: "Keluar Ayam", icon: <ArrowUpCircle size={18} /> },
        { key: "inventory", label: "Inventory", icon: <BarChart3 size={18} /> },
    ]

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-red-500" size={28} />
                    Gudang Ayam
                </h1>
                <p className="text-gray-500 text-sm mt-1">Pencatatan masuk, keluar, dan inventory ayam</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setShowForm(false) }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key
                            ? "bg-white text-red-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Inventory Tab */}
            {activeTab === "inventory" && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                        <p className="text-green-100 text-xs font-medium">Total Masuk (Ekor)</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(inventory.totalMasukEkor)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                        <p className="text-blue-100 text-xs font-medium">Total Masuk (Kg)</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(inventory.totalMasukKg)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
                        <p className="text-orange-100 text-xs font-medium">Total Keluar (Ekor)</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(inventory.totalKeluarEkor)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white col-span-2 lg:col-span-1">
                        <p className="text-purple-100 text-xs font-medium">Stok Saat Ini (Ekor)</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(inventory.stokEkor)}</p>
                    </div>
                </div>
            )}

            {/* Masuk / Keluar Tabs */}
            {activeTab !== "inventory" && (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={activeTab === "masuk" ? "Cari supplier, SJ..." : "Cari barang keluar..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
                            />
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors shadow-sm"
                        >
                            {showForm ? <X size={18} /> : <Plus size={18} />}
                            {showForm ? "Tutup Form" : activeTab === "masuk" ? "Tambah Masuk" : "Tambah Keluar"}
                        </button>
                    </div>

                    {/* Form Masuk */}
                    {showForm && activeTab === "masuk" && (
                        <form onSubmit={handleSubmitMasuk} className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowDownCircle size={20} className="text-green-500" />
                                Masuk Ayam (Supplier)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Diterima</label>
                                    <input type="date" value={formData.transactionDate} onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Surat Jalan (SJ)</label>
                                    <input type="text" value={formData.suratJalan} onChange={e => setFormData({ ...formData, suratJalan: e.target.value })}
                                        placeholder="No. Surat Jalan" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Supplier</label>
                                    <input type="text" value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                                        placeholder="Nama supplier" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah (Ekor)</label>
                                    <input type="number" value={formData.ekor} onChange={e => setFormData({ ...formData, ekor: e.target.value })}
                                        placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Berat (Kg)</label>
                                    <input type="number" step="0.01" value={formData.kg} onChange={e => setFormData({ ...formData, kg: e.target.value })}
                                        placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                                    <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Catatan (opsional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="submit" disabled={submitting}
                                    className="px-6 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : "Simpan Masuk Ayam"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Form Keluar */}
                    {showForm && activeTab === "keluar" && (
                        <form onSubmit={handleSubmitKeluar} className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowUpCircle size={20} className="text-orange-500" />
                                Keluar Ayam
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                                    <input type="date" value={keluarForm.transactionDate} onChange={e => setKeluarForm({ ...keluarForm, transactionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah (Ekor)</label>
                                    <input type="number" value={keluarForm.ekor} onChange={e => setKeluarForm({ ...keluarForm, ekor: e.target.value })}
                                        placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Barang Keluar</label>
                                    <input type="text" value={keluarForm.barangKeluar} onChange={e => setKeluarForm({ ...keluarForm, barangKeluar: e.target.value })}
                                        placeholder="Jenis barang" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                                    <input type="text" value={keluarForm.notes} onChange={e => setKeluarForm({ ...keluarForm, notes: e.target.value })}
                                        placeholder="Catatan (opsional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="submit" disabled={submitting}
                                    className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : "Simpan Keluar Ayam"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">No</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                                        {activeTab === "masuk" && (
                                            <>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">SJ</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Supplier</th>
                                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Ekor</th>
                                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Kg</th>
                                            </>
                                        )}
                                        {activeTab === "keluar" && (
                                            <>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">User</th>
                                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Ekor</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Barang Keluar</th>
                                            </>
                                        )}
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Catatan</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={10} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={10} className="text-center py-12 text-gray-400">Belum ada data</td></tr>
                                    ) : (
                                        filteredTransactions.map((tx, idx) => (
                                            <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {formatDate(tx.transactionDate)}
                                                    </span>
                                                </td>
                                                {activeTab === "masuk" && (
                                                    <>
                                                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{tx.suratJalan || "-"}</td>
                                                        <td className="px-4 py-3 text-gray-700 font-medium">{tx.supplierName || "-"}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-600">{formatNumber(tx.ekor || 0)}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatNumber(Number(tx.kg || 0))}</td>
                                                    </>
                                                )}
                                                {activeTab === "keluar" && (
                                                    <>
                                                        <td className="px-4 py-3 text-gray-600">{tx.userName || "-"}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-orange-600">{formatNumber(tx.ekor || 0)}</td>
                                                        <td className="px-4 py-3 text-gray-700">{tx.barangKeluar || "-"}</td>
                                                    </>
                                                )}
                                                <td className="px-4 py-3 text-gray-500 text-xs">{tx.notes || "-"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handleDelete(tx.id)}
                                                        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors">
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Inventory Table */}
            {activeTab === "inventory" && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Ringkasan Inventory Ayam</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Keterangan</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Ekor</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Kg</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-50">
                                    <td className="px-4 py-3 text-green-700 font-medium">Total Masuk</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatNumber(inventory.totalMasukEkor)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatNumber(inventory.totalMasukKg)}</td>
                                </tr>
                                <tr className="border-b border-gray-50">
                                    <td className="px-4 py-3 text-orange-700 font-medium">Total Keluar</td>
                                    <td className="px-4 py-3 text-right font-semibold text-orange-600">{formatNumber(inventory.totalKeluarEkor)}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">-</td>
                                </tr>
                                <tr className="bg-purple-50">
                                    <td className="px-4 py-3 text-purple-700 font-bold">Stok Saat Ini</td>
                                    <td className="px-4 py-3 text-right font-bold text-purple-600 text-lg">{formatNumber(inventory.stokEkor)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-purple-600 text-lg">{formatNumber(inventory.stokKg)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
