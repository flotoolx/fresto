"use client"

import { useState, useEffect, useMemo } from "react"
import { Package, ArrowDownCircle, ArrowUpCircle, BarChart3, Plus, Search, Calendar, X, Factory } from "lucide-react"

interface GudangTransaction {
    id: string
    type: "MASUK" | "KELUAR" | "PEMAKAIAN" | "PRODUKSI"
    transactionDate: string
    supplierName: string | null
    suratJalan: string | null
    productName: string | null
    kemasan: string | null
    qty: string | number | null
    unit: string | null
    barangKeluar: string | null
    userName: string | null
    notes: string | null
    category: string | null
    createdAt: string
}

type TabType = "masuk" | "keluar" | "produksi" | "inventory"

export default function GudangTepungPage() {
    const [transactions, setTransactions] = useState<GudangTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>("masuk")
    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [masukForm, setMasukForm] = useState({
        transactionDate: new Date().toISOString().split("T")[0],
        supplierName: "",
        suratJalan: "",
        productName: "",
        kemasan: "",
        qty: "",
        unit: "kg",
        category: "BAHAN_BAKU_TEPUNG",
        notes: ""
    })

    const [keluarForm, setKeluarForm] = useState({
        transactionDate: new Date().toISOString().split("T")[0],
        productName: "",
        qty: "",
        unit: "kg",
        barangKeluar: "",
        category: "TEPUNG_BUMBU",
        notes: ""
    })

    const [produksiForm, setProduksiForm] = useState({
        transactionDate: new Date().toISOString().split("T")[0],
        productName: "",
        qty: "",
        unit: "kg",
        category: "TEPUNG_BUMBU",
        notes: ""
    })

    const fetchTransactions = async () => {
        try {
            let typeFilter = ""
            if (activeTab === "masuk") typeFilter = "&type=MASUK"
            else if (activeTab === "keluar") typeFilter = "&type=KELUAR"
            else if (activeTab === "produksi") typeFilter = "&type=PRODUKSI"
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

    const inventory = useMemo(() => {
        const masuk = transactions.filter(t => t.type === "MASUK")
        const keluar = transactions.filter(t => t.type === "KELUAR")
        const produksi = transactions.filter(t => t.type === "PRODUKSI")
        return {
            totalMasukQty: masuk.reduce((s, t) => s + Number(t.qty || 0), 0),
            totalKeluarQty: keluar.reduce((s, t) => s + Number(t.qty || 0), 0),
            totalProduksiQty: produksi.reduce((s, t) => s + Number(t.qty || 0), 0),
            stokQty: masuk.reduce((s, t) => s + Number(t.qty || 0), 0) - keluar.reduce((s, t) => s + Number(t.qty || 0), 0),
        }
    }, [transactions])

    const inventoryByProduct = useMemo(() => {
        const map: Record<string, { masuk: number; keluar: number; produksi: number; unit: string; category: string }> = {}
        transactions.forEach(t => {
            const name = t.productName || t.barangKeluar || "Lainnya"
            if (!map[name]) map[name] = { masuk: 0, keluar: 0, produksi: 0, unit: t.unit || "kg", category: t.category || "-" }
            if (t.type === "MASUK") map[name].masuk += Number(t.qty || 0)
            if (t.type === "KELUAR") map[name].keluar += Number(t.qty || 0)
            if (t.type === "PRODUKSI") map[name].produksi += Number(t.qty || 0)
        })
        return Object.entries(map).map(([name, d]) => ({
            name, ...d, stok: d.masuk + d.produksi - d.keluar
        }))
    }, [transactions])

    const filteredTransactions = useMemo(() => {
        if (!search) return transactions
        const q = search.toLowerCase()
        return transactions.filter(t =>
            (t.supplierName && t.supplierName.toLowerCase().includes(q)) ||
            (t.productName && t.productName.toLowerCase().includes(q)) ||
            (t.barangKeluar && t.barangKeluar.toLowerCase().includes(q)) ||
            (t.notes && t.notes.toLowerCase().includes(q))
        )
    }, [transactions, search])

    const handleSubmit = async (e: React.FormEvent, type: string, form: Record<string, string>, resetFn: () => void) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await fetch("/api/gudang-transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    transactionDate: form.transactionDate,
                    supplierName: form.supplierName || undefined,
                    suratJalan: form.suratJalan || undefined,
                    productName: form.productName,
                    kemasan: form.kemasan || undefined,
                    qty: parseFloat(form.qty) || 0,
                    unit: form.unit,
                    barangKeluar: form.barangKeluar || undefined,
                    category: form.category,
                    notes: form.notes
                })
            })
            if (res.ok) {
                setShowForm(false)
                resetFn()
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
        } catch { alert("Error menghapus") }
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
    const formatNumber = (n: number) => Number.isInteger(n) ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { maximumFractionDigits: 2 })

    const categoryLabel: Record<string, string> = {
        BAHAN_BAKU_TEPUNG: "Bahan Baku",
        TEPUNG_BUMBU: "Tepung Bumbu",
    }

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: "masuk", label: "Bahan Masuk", icon: <ArrowDownCircle size={18} /> },
        { key: "keluar", label: "Barang Keluar", icon: <ArrowUpCircle size={18} /> },
        { key: "produksi", label: "Produksi", icon: <Factory size={18} /> },
        { key: "inventory", label: "Inventory", icon: <BarChart3 size={18} /> },
    ]

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-indigo-500" size={28} />
                    Gudang Tepung
                </h1>
                <p className="text-gray-500 text-sm mt-1">Pencatatan bahan baku, produksi tepung bumbu, dan inventory</p>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); setShowForm(false) }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}>
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* Inventory */}
            {activeTab === "inventory" && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                            <p className="text-green-100 text-xs font-medium">Total Masuk</p>
                            <p className="text-2xl font-bold mt-1">{formatNumber(inventory.totalMasukQty)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
                            <p className="text-orange-100 text-xs font-medium">Total Keluar</p>
                            <p className="text-2xl font-bold mt-1">{formatNumber(inventory.totalKeluarQty)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                            <p className="text-blue-100 text-xs font-medium">Total Produksi</p>
                            <p className="text-2xl font-bold mt-1">{formatNumber(inventory.totalProduksiQty)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                            <p className="text-purple-100 text-xs font-medium">Stok Saat Ini</p>
                            <p className="text-2xl font-bold mt-1">{formatNumber(inventory.stokQty)}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Stok per Produk</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">No</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama Produk</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kategori</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Masuk</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Produksi</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Keluar</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Stok</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Satuan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryByProduct.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada data</td></tr>
                                    ) : inventoryByProduct.map((item, idx) => (
                                        <tr key={item.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                                            <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{categoryLabel[item.category] || item.category}</span></td>
                                            <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatNumber(item.masuk)}</td>
                                            <td className="px-4 py-3 text-right text-blue-600 font-semibold">{formatNumber(item.produksi)}</td>
                                            <td className="px-4 py-3 text-right text-orange-600 font-semibold">{formatNumber(item.keluar)}</td>
                                            <td className="px-4 py-3 text-right text-purple-600 font-bold">{formatNumber(item.stok)}</td>
                                            <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Masuk / Keluar / Produksi */}
            {activeTab !== "inventory" && (
                <>
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Cari produk, supplier..."
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300" />
                        </div>
                        <button onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm">
                            {showForm ? <X size={18} /> : <Plus size={18} />}
                            {showForm ? "Tutup Form" : activeTab === "masuk" ? "Tambah Masuk" : activeTab === "produksi" ? "Catat Produksi" : "Tambah Keluar"}
                        </button>
                    </div>

                    {/* Form Masuk */}
                    {showForm && activeTab === "masuk" && (
                        <form onSubmit={e => handleSubmit(e, "MASUK", masukForm, () => setMasukForm({ ...masukForm, supplierName: "", suratJalan: "", productName: "", kemasan: "", qty: "", notes: "" }))}
                            className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowDownCircle size={20} className="text-green-500" /> Bahan Masuk (Supplier)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                                    <input type="date" value={masukForm.transactionDate} onChange={e => setMasukForm({ ...masukForm, transactionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Surat Jalan</label>
                                    <input type="text" value={masukForm.suratJalan} onChange={e => setMasukForm({ ...masukForm, suratJalan: e.target.value })}
                                        placeholder="No. SJ" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
                                    <input type="text" value={masukForm.supplierName} onChange={e => setMasukForm({ ...masukForm, supplierName: e.target.value })}
                                        placeholder="Nama supplier" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Bahan</label>
                                    <input type="text" value={masukForm.productName} onChange={e => setMasukForm({ ...masukForm, productName: e.target.value })}
                                        placeholder="Nama bahan baku" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                                    <select value={masukForm.category} onChange={e => setMasukForm({ ...masukForm, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                        <option value="BAHAN_BAKU_TEPUNG">Bahan Baku Tepung</option>
                                        <option value="TEPUNG_BUMBU">Tepung Bumbu</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah</label>
                                        <input type="number" step="0.01" value={masukForm.qty} onChange={e => setMasukForm({ ...masukForm, qty: e.target.value })}
                                            placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                        <select value={masukForm.unit} onChange={e => setMasukForm({ ...masukForm, unit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                            <option value="kg">Kg</option><option value="sak">Sak</option><option value="pcs">Pcs</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                                    <input type="text" value={masukForm.notes} onChange={e => setMasukForm({ ...masukForm, notes: e.target.value })}
                                        placeholder="Catatan (opsional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : "Simpan Bahan Masuk"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Form Keluar */}
                    {showForm && activeTab === "keluar" && (
                        <form onSubmit={e => handleSubmit(e, "KELUAR", keluarForm, () => setKeluarForm({ ...keluarForm, productName: "", qty: "", barangKeluar: "", notes: "" }))}
                            className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowUpCircle size={20} className="text-orange-500" /> Barang Keluar
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                                    <input type="date" value={keluarForm.transactionDate} onChange={e => setKeluarForm({ ...keluarForm, transactionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Produk</label>
                                    <input type="text" value={keluarForm.productName} onChange={e => setKeluarForm({ ...keluarForm, productName: e.target.value })}
                                        placeholder="Nama produk" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah</label>
                                        <input type="number" step="0.01" value={keluarForm.qty} onChange={e => setKeluarForm({ ...keluarForm, qty: e.target.value })}
                                            placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                        <select value={keluarForm.unit} onChange={e => setKeluarForm({ ...keluarForm, unit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                            <option value="kg">Kg</option><option value="sak">Sak</option><option value="pcs">Pcs</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Keterangan</label>
                                    <input type="text" value={keluarForm.barangKeluar} onChange={e => setKeluarForm({ ...keluarForm, barangKeluar: e.target.value })}
                                        placeholder="Tujuan keluar" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                                    <input type="text" value={keluarForm.notes} onChange={e => setKeluarForm({ ...keluarForm, notes: e.target.value })}
                                        placeholder="Catatan (opsional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : "Simpan Barang Keluar"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Form Produksi */}
                    {showForm && activeTab === "produksi" && (
                        <form onSubmit={e => handleSubmit(e, "PRODUKSI", produksiForm, () => setProduksiForm({ ...produksiForm, productName: "", qty: "", notes: "" }))}
                            className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Factory size={20} className="text-blue-500" /> Catat Hasil Produksi
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Produksi</label>
                                    <input type="date" value={produksiForm.transactionDate} onChange={e => setProduksiForm({ ...produksiForm, transactionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Produk Hasil</label>
                                    <input type="text" value={produksiForm.productName} onChange={e => setProduksiForm({ ...produksiForm, productName: e.target.value })}
                                        placeholder="Tepung Bumbu Original, dll" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                                    <select value={produksiForm.category} onChange={e => setProduksiForm({ ...produksiForm, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                        <option value="TEPUNG_BUMBU">Tepung Bumbu</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Hasil (Qty)</label>
                                        <input type="number" step="0.01" value={produksiForm.qty} onChange={e => setProduksiForm({ ...produksiForm, qty: e.target.value })}
                                            placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                        <select value={produksiForm.unit} onChange={e => setProduksiForm({ ...produksiForm, unit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                            <option value="kg">Kg</option><option value="sak">Sak</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                                    <input type="text" value={produksiForm.notes} onChange={e => setProduksiForm({ ...produksiForm, notes: e.target.value })}
                                        placeholder="Catatan produksi" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : "Simpan Hasil Produksi"}
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
                                            </>
                                        )}
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Produk</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kategori</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Qty</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Satuan</th>
                                        {activeTab === "keluar" && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Keterangan</th>}
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Catatan</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={12} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={12} className="text-center py-12 text-gray-400">Belum ada data</td></tr>
                                    ) : filteredTransactions.map((tx, idx) => (
                                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap"><span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" />{formatDate(tx.transactionDate)}</span></td>
                                            {activeTab === "masuk" && (
                                                <>
                                                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{tx.suratJalan || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">{tx.supplierName || "-"}</td>
                                                </>
                                            )}
                                            <td className="px-4 py-3 text-gray-800">{tx.productName || "-"}</td>
                                            <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{categoryLabel[tx.category || ""] || tx.category || "-"}</span></td>
                                            <td className={`px-4 py-3 text-right font-semibold ${activeTab === "masuk" ? "text-green-600" : activeTab === "produksi" ? "text-blue-600" : "text-orange-600"}`}>{formatNumber(Number(tx.qty || 0))}</td>
                                            <td className="px-4 py-3 text-gray-500">{tx.unit || "-"}</td>
                                            {activeTab === "keluar" && <td className="px-4 py-3 text-gray-600">{tx.barangKeluar || "-"}</td>}
                                            <td className="px-4 py-3 text-gray-500 text-xs">{tx.notes || "-"}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => handleDelete(tx.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Hapus</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
