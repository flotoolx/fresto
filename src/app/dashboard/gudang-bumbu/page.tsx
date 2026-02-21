"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Package, ArrowDownCircle, ArrowUpCircle, BarChart3, Plus, Search, Calendar, X, Factory, Beaker, FlaskConical, Droplets, ClipboardList } from "lucide-react"

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
    jenisBumbu: string | null
    batchId: string | null
    createdAt: string
}

interface BatchItem {
    id: string
    productName: string
    qty: string
    unit: string
    kemasan: string
}

type SectionType = "bahan_baku" | "bumbu_jadi"
type BahanBakuTab = "pemakaian" | "masuk" | "inventory"
type BumbuJenis = "BIANG" | "TEPUNG" | "MARINASI"
type BumbuJadiOp = "masuk" | "keluar" | "inventory"

export default function GudangBumbuPage() {
    const [transactions, setTransactions] = useState<GudangTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [section, setSection] = useState<SectionType>("bahan_baku")
    const [bbTab, setBbTab] = useState<BahanBakuTab>("pemakaian")
    const [bjJenis, setBjJenis] = useState<BumbuJenis>("BIANG")
    const [bjOp, setBjOp] = useState<BumbuJadiOp>("masuk")
    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const resetDate = () => new Date().toISOString().split("T")[0]

    const generateBatchId = useCallback(() => {
        const now = new Date()
        const pad = (n: number) => n.toString().padStart(2, "0")
        return `BATCH-BMB-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
    }, [])

    const createEmptyItem = (): BatchItem => ({ id: crypto.randomUUID(), productName: "", qty: "", unit: "kg", kemasan: "" })

    const [batchForm, setBatchForm] = useState({
        transactionDate: resetDate(),
        jenisBumbu: "BIANG" as string,
        notes: "",
        items: [createEmptyItem()]
    })
    const [batchId, setBatchIdState] = useState(generateBatchId())
    const [masukSupplierForm, setMasukSupplierForm] = useState({ transactionDate: resetDate(), supplierName: "", suratJalan: "", productName: "", kemasan: "", qty: "", unit: "kg", notes: "" })
    const [masukHasilForm, setMasukHasilForm] = useState({ transactionDate: resetDate(), jenisBumbu: "", qty: "", unit: "kg", notes: "" })
    const [bjMasukForm, setBjMasukForm] = useState({ transactionDate: resetDate(), productName: "", qty: "", unit: "kg", notes: "" })
    const [bjKeluarForm, setBjKeluarForm] = useState({ transactionDate: resetDate(), productName: "", qty: "", unit: "kg", barangKeluar: "", notes: "" })

    const fetchTransactions = async () => {
        try {
            const res = await fetch(`/api/gudang-transactions?`)
            if (res.ok) {
                const data = await res.json()
                setTransactions(data.transactions || [])
            }
        } catch (err) { console.error("Fetch error:", err) }
        finally { setLoading(false) }
    }

    useEffect(() => { setLoading(true); fetchTransactions() }, [section, bbTab, bjJenis, bjOp])

    // Filter transactions based on current view
    const viewTransactions = useMemo(() => {
        if (section === "bahan_baku") {
            if (bbTab === "pemakaian") return transactions.filter(t => t.type === "PEMAKAIAN" && t.category === "BAHAN_BAKU_BUMBU")
            if (bbTab === "masuk") return transactions.filter(t => (t.type === "MASUK" || t.type === "PRODUKSI") && t.category === "BAHAN_BAKU_BUMBU")
            if (bbTab === "inventory") return transactions.filter(t => t.category === "BAHAN_BAKU_BUMBU")
        } else {
            if (bjOp === "masuk") return transactions.filter(t => t.type === "MASUK" && t.category === "BUMBU_JADI" && t.jenisBumbu === bjJenis)
            if (bjOp === "keluar") return transactions.filter(t => t.type === "KELUAR" && t.category === "BUMBU_JADI" && t.jenisBumbu === bjJenis)
            if (bjOp === "inventory") return transactions.filter(t => t.category === "BUMBU_JADI" && t.jenisBumbu === bjJenis)
        }
        return []
    }, [transactions, section, bbTab, bjJenis, bjOp])

    const filteredTransactions = useMemo(() => {
        if (!search) return viewTransactions
        const q = search.toLowerCase()
        return viewTransactions.filter(t =>
            (t.supplierName?.toLowerCase().includes(q)) || (t.productName?.toLowerCase().includes(q)) ||
            (t.barangKeluar?.toLowerCase().includes(q)) || (t.notes?.toLowerCase().includes(q))
        )
    }, [viewTransactions, search])

    const inventoryByProduct = useMemo(() => {
        const src = section === "bahan_baku"
            ? transactions.filter(t => t.category === "BAHAN_BAKU_BUMBU")
            : transactions.filter(t => t.category === "BUMBU_JADI" && t.jenisBumbu === bjJenis)
        const map: Record<string, { masuk: number; keluar: number; pemakaian: number; produksi: number; unit: string }> = {}
        src.forEach(t => {
            const name = t.productName || t.barangKeluar || "Lainnya"
            if (!map[name]) map[name] = { masuk: 0, keluar: 0, pemakaian: 0, produksi: 0, unit: t.unit || "kg" }
            if (t.type === "MASUK") map[name].masuk += Number(t.qty || 0)
            if (t.type === "KELUAR") map[name].keluar += Number(t.qty || 0)
            if (t.type === "PEMAKAIAN") map[name].pemakaian += Number(t.qty || 0)
            if (t.type === "PRODUKSI") map[name].produksi += Number(t.qty || 0)
        })
        return Object.entries(map).map(([name, d]) => ({
            name, ...d,
            stok: section === "bahan_baku"
                ? d.masuk + d.produksi - d.keluar - d.pemakaian
                : d.masuk + d.produksi - d.keluar
        }))
    }, [transactions, section, bjJenis])

    const handleSubmit = async (e: React.FormEvent, type: string, category: string, form: Record<string, string>, jenisBumbu?: string) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await fetch("/api/gudang-transactions", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type, category,
                    transactionDate: form.transactionDate,
                    supplierName: form.supplierName || undefined,
                    suratJalan: form.suratJalan || undefined,
                    productName: form.productName || undefined,
                    kemasan: form.kemasan || undefined,
                    qty: parseFloat(form.qty) || 0,
                    unit: form.unit,
                    barangKeluar: form.barangKeluar || undefined,
                    jenisBumbu: jenisBumbu || form.jenisBumbu || undefined,
                    notes: form.notes
                })
            })
            if (res.ok) { setShowForm(false); fetchTransactions() }
            else { const d = await res.json(); alert(d.error || "Gagal menyimpan") }
        } catch { alert("Error menyimpan data") }
        finally { setSubmitting(false) }
    }

    // Batch Produksi submit
    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const filledItems = batchForm.items.filter(it => it.productName.trim() && Number(it.qty) > 0)
        if (filledItems.length === 0) { alert("Minimal 1 bahan baku harus diisi"); return }
        setSubmitting(true)
        try {
            const res = await fetch("/api/gudang-transactions/batch", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transactionDate: batchForm.transactionDate,
                    jenisBumbu: batchForm.jenisBumbu,
                    notes: batchForm.notes,
                    items: filledItems.map(it => ({ productName: it.productName, qty: it.qty, unit: it.unit, kemasan: it.kemasan }))
                })
            })
            if (res.ok) {
                setShowForm(false)
                setBatchForm({ transactionDate: resetDate(), jenisBumbu: "BIANG", notes: "", items: [createEmptyItem()] })
                setBatchIdState(generateBatchId())
                fetchTransactions()
            } else { const d = await res.json(); alert(d.error || "Gagal menyimpan batch") }
        } catch { alert("Error menyimpan batch") }
        finally { setSubmitting(false) }
    }

    // Batch item management
    const addBatchItem = () => setBatchForm(f => ({ ...f, items: [...f.items, createEmptyItem()] }))
    const removeBatchItem = (id: string) => setBatchForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter(it => it.id !== id) : f.items }))
    const updateBatchItem = (id: string, field: keyof BatchItem, value: string) => setBatchForm(f => ({ ...f, items: f.items.map(it => it.id === id ? { ...it, [field]: value } : it) }))

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus transaksi ini?")) return
        try { const r = await fetch(`/api/gudang-transactions/${id}`, { method: "DELETE" }); if (r.ok) fetchTransactions() }
        catch { alert("Error menghapus") }
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
    const formatNumber = (n: number) => Number.isInteger(n) ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { maximumFractionDigits: 2 })

    const isInventoryView = (section === "bahan_baku" && bbTab === "inventory") || (section === "bumbu_jadi" && bjOp === "inventory")
    const canAddForm = !isInventoryView

    const jenisLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
        BIANG: { label: "Bumbu Biang", icon: <Beaker size={16} />, color: "purple" },
        TEPUNG: { label: "Bumbu Tepung", icon: <FlaskConical size={16} />, color: "indigo" },
        MARINASI: { label: "Bumbu Marinasi", icon: <Droplets size={16} />, color: "pink" },
    }

    // Current form submission label
    const getFormLabel = () => {
        if (section === "bahan_baku") {
            if (bbTab === "pemakaian") return "Catat Pemakaian"
            return "Tambah Masuk"
        }
        return bjOp === "masuk" ? `Tambah Masuk ${jenisLabels[bjJenis].label}` : `Tambah Keluar ${jenisLabels[bjJenis].label}`
    }

    // Sub-form state for Masuk BBB toggle (supplier vs hasil produksi)
    const [masukMode, setMasukMode] = useState<"supplier" | "hasil">("supplier")

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-emerald-600" size={28} /> Gudang Bumbu
                </h1>
                <p className="text-gray-500 text-sm mt-1">Pencatatan bahan baku bumbu & bumbu jadi</p>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-4">
                <button onClick={() => { setSection("bahan_baku"); setBbTab("pemakaian"); setShowForm(false) }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${section === "bahan_baku" ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    <Factory size={18} /> Bahan Baku Bumbu
                </button>
                <button onClick={() => { setSection("bumbu_jadi"); setBjJenis("BIANG"); setBjOp("masuk"); setShowForm(false) }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${section === "bumbu_jadi" ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    <Beaker size={18} /> Bumbu Jadi
                </button>
            </div>

            {/* Bahan Baku Sub-tabs */}
            {section === "bahan_baku" && (
                <div className="flex gap-1 bg-amber-50 p-1 rounded-xl mb-4 overflow-x-auto border border-amber-100">
                    {([
                        { key: "pemakaian" as BahanBakuTab, label: "Pemakaian BBB", icon: <ArrowUpCircle size={16} /> },
                        { key: "masuk" as BahanBakuTab, label: "Masuk BBB", icon: <ArrowDownCircle size={16} /> },
                        { key: "inventory" as BahanBakuTab, label: "Inventory BBB", icon: <BarChart3 size={16} /> },
                    ]).map(tab => (
                        <button key={tab.key} onClick={() => { setBbTab(tab.key); setShowForm(false) }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${bbTab === tab.key ? "bg-white text-amber-700 shadow-sm" : "text-amber-600/70 hover:text-amber-700"}`}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Bumbu Jadi: Jenis tabs */}
            {section === "bumbu_jadi" && (
                <>
                    <div className="flex gap-1 bg-purple-50 p-1 rounded-xl mb-2 overflow-x-auto border border-purple-100">
                        {(["BIANG", "TEPUNG", "MARINASI"] as BumbuJenis[]).map(j => (
                            <button key={j} onClick={() => { setBjJenis(j); setBjOp("masuk"); setShowForm(false) }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${bjJenis === j ? "bg-white text-purple-700 shadow-sm" : "text-purple-500/70 hover:text-purple-700"}`}>
                                {jenisLabels[j].icon}{jenisLabels[j].label}
                            </button>
                        ))}
                    </div>
                    {/* Operation sub-tabs */}
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-xl mb-4 border border-gray-100">
                        {([
                            { key: "masuk" as BumbuJadiOp, label: "Masuk", icon: <ArrowDownCircle size={15} /> },
                            { key: "keluar" as BumbuJadiOp, label: "Keluar", icon: <ArrowUpCircle size={15} /> },
                            { key: "inventory" as BumbuJadiOp, label: "Inventory", icon: <BarChart3 size={15} /> },
                        ]).map(tab => (
                            <button key={tab.key} onClick={() => { setBjOp(tab.key); setShowForm(false) }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${bjOp === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                                {tab.icon}{tab.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Inventory View */}
            {isInventoryView && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {(() => {
                            const items = inventoryByProduct
                            const totalMasuk = items.reduce((s, i) => s + i.masuk, 0)
                            const totalKeluar = items.reduce((s, i) => s + i.keluar, 0)
                            const totalPemakaian = items.reduce((s, i) => s + i.pemakaian, 0)
                            const totalStok = items.reduce((s, i) => s + i.stok, 0)
                            const cards = [
                                { label: "Total Masuk", value: totalMasuk, gradient: "from-green-500 to-green-600", sub: "green" },
                                { label: "Total Keluar", value: totalKeluar, gradient: "from-orange-500 to-orange-600", sub: "orange" },
                            ]
                            if (section === "bahan_baku") cards.push({ label: "Total Pemakaian", value: totalPemakaian, gradient: "from-red-500 to-red-600", sub: "red" })
                            cards.push({ label: "Stok Saat Ini", value: totalStok, gradient: "from-purple-500 to-purple-600", sub: "purple" })
                            return cards.map((c, i) => (
                                <div key={i} className={`bg-gradient-to-br ${c.gradient} rounded-2xl p-5 text-white`}>
                                    <p className={`text-${c.sub}-100 text-xs font-medium`}>{c.label}</p>
                                    <p className="text-2xl font-bold mt-1">{formatNumber(c.value)}</p>
                                </div>
                            ))
                        })()}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Stok per Produk {section === "bumbu_jadi" && `— ${jenisLabels[bjJenis].label}`}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">No</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama Produk</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Masuk</th>
                                        {section === "bahan_baku" && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Pemakaian</th>}
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Keluar</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Stok</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Satuan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryByProduct.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada data</td></tr>
                                    ) : inventoryByProduct.map((item, idx) => (
                                        <tr key={item.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                                            <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatNumber(item.masuk)}</td>
                                            {section === "bahan_baku" && <td className="px-4 py-3 text-right text-red-600 font-semibold">{formatNumber(item.pemakaian)}</td>}
                                            <td className="px-4 py-3 text-right text-orange-600 font-semibold">{formatNumber(item.keluar)}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${item.stok > 0 ? "text-purple-600" : "text-red-600"}`}>{formatNumber(item.stok)}</td>
                                            <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Non-inventory views: search + form + table */}
            {!isInventoryView && (
                <>
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Cari produk, supplier..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300" />
                        </div>
                        {canAddForm && (
                            <button onClick={() => setShowForm(!showForm)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm">
                                {showForm ? <X size={18} /> : <Plus size={18} />}
                                {showForm ? "Tutup Form" : getFormLabel()}
                            </button>
                        )}
                    </div>

                    {/* FORMS */}
                    {/* Batch Produksi BBB Form */}
                    {showForm && section === "bahan_baku" && bbTab === "pemakaian" && (
                        <form onSubmit={handleBatchSubmit}
                            className="bg-white border-2 border-amber-300 rounded-2xl p-6 mb-6 shadow-md">
                            {/* Header */}
                            <div className="mb-1">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <ClipboardList size={22} className="text-amber-600" /> Batch Produksi Baru
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5 font-mono">Batch No: {batchId} <span className="text-gray-400">(auto-generated)</span></p>
                            </div>

                            {/* Info Bar */}
                            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4 mt-3 mb-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-800 mb-1">Tanggal</label>
                                        <div className="relative">
                                            <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                                            <input type="date" value={batchForm.transactionDate}
                                                onChange={e => setBatchForm(f => ({ ...f, transactionDate: e.target.value }))}
                                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-300" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-800 mb-1">Jenis Bumbu Jadi</label>
                                        <div className="relative">
                                            <ClipboardList size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                                            <select value={batchForm.jenisBumbu}
                                                onChange={e => setBatchForm(f => ({ ...f, jenisBumbu: e.target.value }))}
                                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300">
                                                <option value="BIANG">Bumbu Biang</option>
                                                <option value="TEPUNG">Bumbu Tepung</option>
                                                <option value="MARINASI">Bumbu Marinasi</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-800 mb-1">Catatan</label>
                                        <input type="text" value={batchForm.notes}
                                            onChange={e => setBatchForm(f => ({ ...f, notes: e.target.value }))}
                                            placeholder="Opsional" className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-300" />
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mb-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Package size={16} className="text-amber-600" />
                                    BAHAN BAKU YANG DIPAKAI ({batchForm.items.length} ITEM)
                                </h4>
                                <div className="space-y-2">
                                    {/* Table Header */}
                                    <div className="hidden sm:grid sm:grid-cols-[40px_1fr_100px_80px_120px_36px] gap-2 px-2 pb-1">
                                        <span className="text-xs font-semibold text-gray-500"></span>
                                        <span className="text-xs font-semibold text-gray-500">Bahan Baku</span>
                                        <span className="text-xs font-semibold text-gray-500">Value</span>
                                        <span className="text-xs font-semibold text-gray-500">Satuan</span>
                                        <span className="text-xs font-semibold text-gray-500">Kemasan</span>
                                        <span></span>
                                    </div>
                                    {/* Items */}
                                    {batchForm.items.map((item, idx) => (
                                        <div key={item.id}
                                            className={`grid grid-cols-1 sm:grid-cols-[40px_1fr_100px_80px_120px_36px] gap-2 items-center px-3 py-3 rounded-xl border ${idx % 2 === 0 ? "bg-gray-50/80 border-gray-200" : "bg-white border-gray-100"
                                                }`}>
                                            <span className="text-sm font-bold text-gray-400 hidden sm:block text-center">{idx + 1}</span>
                                            <input type="text" value={item.productName}
                                                onChange={e => updateBatchItem(item.id, "productName", e.target.value)}
                                                placeholder="Bawang Merah, Cabe, dll"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-300" />
                                            <input type="number" step="0.01" value={item.qty}
                                                onChange={e => updateBatchItem(item.id, "qty", e.target.value)}
                                                placeholder="0"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-300" />
                                            <select value={item.unit}
                                                onChange={e => updateBatchItem(item.id, "unit", e.target.value)}
                                                className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-300">
                                                <option value="kg">Kg</option>
                                                <option value="liter">Liter</option>
                                                <option value="pcs">Pcs</option>
                                            </select>
                                            <input type="text" value={item.kemasan}
                                                onChange={e => updateBatchItem(item.id, "kemasan", e.target.value)}
                                                placeholder="Karung, Pack"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-300" />
                                            <button type="button" onClick={() => removeBatchItem(item.id)}
                                                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus item">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Item Button */}
                                <button type="button" onClick={addBatchItem}
                                    className="mt-3 flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors">
                                    <Plus size={16} /> Tambah Bahan Baku
                                </button>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end border-t border-gray-100 pt-4">
                                <button type="submit" disabled={submitting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 shadow-sm shadow-amber-200 transition-colors">
                                    <Package size={16} />
                                    {submitting ? "Menyimpan..." : "Simpan Batch Produksi"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Masuk BBB Form (Supplier / Hasil Produksi toggle) */}
                    {showForm && section === "bahan_baku" && bbTab === "masuk" && (
                        <div className="bg-white border border-green-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <ArrowDownCircle size={20} className="text-green-500" /> Masuk BBB
                                </h3>
                                <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button type="button" onClick={() => setMasukMode("supplier")}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${masukMode === "supplier" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                                        Dari Supplier
                                    </button>
                                    <button type="button" onClick={() => setMasukMode("hasil")}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${masukMode === "hasil" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                                        Hasil Produksi
                                    </button>
                                </div>
                            </div>
                            {masukMode === "supplier" ? (
                                <form onSubmit={e => handleSubmit(e, "MASUK", "BAHAN_BAKU_BUMBU", masukSupplierForm)}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Diterima</label>
                                            <input type="date" value={masukSupplierForm.transactionDate} onChange={e => setMasukSupplierForm({ ...masukSupplierForm, transactionDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Surat Jalan</label>
                                            <input type="text" value={masukSupplierForm.suratJalan} onChange={e => setMasukSupplierForm({ ...masukSupplierForm, suratJalan: e.target.value })}
                                                placeholder="No. SJ" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Supplier</label>
                                            <input type="text" value={masukSupplierForm.supplierName} onChange={e => setMasukSupplierForm({ ...masukSupplierForm, supplierName: e.target.value })}
                                                placeholder="Nama supplier" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Produk</label>
                                            <input type="text" value={masukSupplierForm.productName} onChange={e => setMasukSupplierForm({ ...masukSupplierForm, productName: e.target.value })}
                                                placeholder="Nama bahan baku" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Kemasan</label>
                                            <input type="text" value={masukSupplierForm.kemasan} onChange={e => setMasukSupplierForm({ ...masukSupplierForm, kemasan: e.target.value })}
                                                placeholder="Karung, Pack" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah</label>
                                                <input type="number" step="0.01" value={masukSupplierForm.qty} onChange={e => setMasukSupplierForm({ ...masukSupplierForm, qty: e.target.value })}
                                                    placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                                <select value={masukSupplierForm.unit} onChange={e => setMasukSupplierForm({ ...masukSupplierForm, unit: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                                    <option value="kg">Kg</option><option value="liter">Liter</option><option value="pcs">Pcs</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                                            {submitting ? "Menyimpan..." : "Simpan Masuk Supplier"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={e => handleSubmit(e, "PRODUKSI", "BAHAN_BAKU_BUMBU", masukHasilForm)}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                                            <input type="date" value={masukHasilForm.transactionDate} onChange={e => setMasukHasilForm({ ...masukHasilForm, transactionDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Bumbu</label>
                                            <input type="text" value={masukHasilForm.jenisBumbu} onChange={e => setMasukHasilForm({ ...masukHasilForm, jenisBumbu: e.target.value })}
                                                placeholder="Bumbu Biang, Tepung, dll" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah</label>
                                                <input type="number" step="0.01" value={masukHasilForm.qty} onChange={e => setMasukHasilForm({ ...masukHasilForm, qty: e.target.value })}
                                                    placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                                <select value={masukHasilForm.unit} onChange={e => setMasukHasilForm({ ...masukHasilForm, unit: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                                    <option value="kg">Kg</option><option value="liter">Liter</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
                                            {submitting ? "Menyimpan..." : "Simpan Hasil Produksi"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Bumbu Jadi Masuk Form */}
                    {showForm && section === "bumbu_jadi" && bjOp === "masuk" && (
                        <form onSubmit={e => handleSubmit(e, "MASUK", "BUMBU_JADI", bjMasukForm, bjJenis)}
                            className="bg-white border border-purple-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowDownCircle size={20} className="text-purple-500" /> Masuk {jenisLabels[bjJenis].label}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                                    <input type="date" value={bjMasukForm.transactionDate} onChange={e => setBjMasukForm({ ...bjMasukForm, transactionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Produk</label>
                                    <input type="text" value={bjMasukForm.productName} onChange={e => setBjMasukForm({ ...bjMasukForm, productName: e.target.value })}
                                        placeholder={`Nama ${jenisLabels[bjJenis].label.toLowerCase()}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah</label>
                                        <input type="number" step="0.01" value={bjMasukForm.qty} onChange={e => setBjMasukForm({ ...bjMasukForm, qty: e.target.value })}
                                            placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                        <select value={bjMasukForm.unit} onChange={e => setBjMasukForm({ ...bjMasukForm, unit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                            <option value="kg">Kg</option><option value="liter">Liter</option><option value="pcs">Pcs</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                                    <input type="text" value={bjMasukForm.notes} onChange={e => setBjMasukForm({ ...bjMasukForm, notes: e.target.value })}
                                        placeholder="Opsional" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : `Simpan Masuk ${jenisLabels[bjJenis].label}`}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Bumbu Jadi Keluar Form */}
                    {showForm && section === "bumbu_jadi" && bjOp === "keluar" && (
                        <form onSubmit={e => handleSubmit(e, "KELUAR", "BUMBU_JADI", bjKeluarForm, bjJenis)}
                            className="bg-white border border-orange-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowUpCircle size={20} className="text-orange-500" /> Keluar {jenisLabels[bjJenis].label}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                                    <input type="date" value={bjKeluarForm.transactionDate} onChange={e => setBjKeluarForm({ ...bjKeluarForm, transactionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Produk</label>
                                    <input type="text" value={bjKeluarForm.productName} onChange={e => setBjKeluarForm({ ...bjKeluarForm, productName: e.target.value })}
                                        placeholder={`Nama ${jenisLabels[bjJenis].label.toLowerCase()}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah</label>
                                        <input type="number" step="0.01" value={bjKeluarForm.qty} onChange={e => setBjKeluarForm({ ...bjKeluarForm, qty: e.target.value })}
                                            placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                        <select value={bjKeluarForm.unit} onChange={e => setBjKeluarForm({ ...bjKeluarForm, unit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                            <option value="kg">Kg</option><option value="liter">Liter</option><option value="pcs">Pcs</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tujuan Keluar</label>
                                    <input type="text" value={bjKeluarForm.barangKeluar} onChange={e => setBjKeluarForm({ ...bjKeluarForm, barangKeluar: e.target.value })}
                                        placeholder="Kirim ke..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : `Simpan Keluar ${jenisLabels[bjJenis].label}`}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Data Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">No</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                                        {section === "bahan_baku" && bbTab === "pemakaian" && (
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Batch</th>
                                        )}
                                        {section === "bahan_baku" && bbTab === "masuk" && (
                                            <>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tipe</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">SJ</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Supplier</th>
                                            </>
                                        )}
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Produk</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Qty</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Satuan</th>
                                        {(section === "bumbu_jadi" && bjOp === "keluar") && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tujuan</th>}
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
                                            {section === "bahan_baku" && bbTab === "pemakaian" && (
                                                <td className="px-4 py-3">
                                                    {tx.batchId ? (
                                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 font-mono">{tx.batchId}</span>
                                                    ) : <span className="text-gray-400 text-xs">-</span>}
                                                </td>
                                            )}
                                            {section === "bahan_baku" && bbTab === "masuk" && (
                                                <>
                                                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === "MASUK" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>{tx.type === "MASUK" ? "Supplier" : "Hasil Produksi"}</span></td>
                                                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{tx.suratJalan || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">{tx.supplierName || "-"}</td>
                                                </>
                                            )}
                                            <td className="px-4 py-3 text-gray-800">{tx.productName || tx.jenisBumbu || "-"}</td>
                                            <td className={`px-4 py-3 text-right font-semibold ${tx.type === "MASUK" || tx.type === "PRODUKSI" ? "text-green-600" : tx.type === "PEMAKAIAN" ? "text-red-600" : "text-orange-600"}`}>
                                                {formatNumber(Number(tx.qty || 0))}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{tx.unit || "-"}</td>
                                            {(section === "bumbu_jadi" && bjOp === "keluar") && <td className="px-4 py-3 text-gray-600">{tx.barangKeluar || "-"}</td>}
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
