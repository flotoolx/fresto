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
}

type SectionType = "bahan_baku" | "bumbu_jadi"
type BahanBakuTab = "pemakaian" | "masuk" | "inventory"
type BumbuJenis = "BIANG" | "TEPUNG" | "MARINASI"
type BumbuJadiOp = "masuk" | "keluar" | "inventory"

const BAHAN_BAKU_PER_JENIS: Record<string, { name: string; unit: string }[]> = {
    BIANG: [
        { name: "Bawang Merah", unit: "kg" },
        { name: "Bawang Putih", unit: "kg" },
        { name: "Cabe Rawit", unit: "kg" },
        { name: "Cabe Merah Besar", unit: "kg" },
        { name: "Masako", unit: "kg" },
        { name: "Lada", unit: "kg" },
        { name: "Garam", unit: "kg" },
        { name: "Gula Merah", unit: "kg" },
        { name: "Kunyit Segar", unit: "kg" },
        { name: "Jahe Segar", unit: "kg" },
    ],
    TEPUNG: [
        { name: "Tepung Tapioka", unit: "kg" },
        { name: "Tepung Terigu", unit: "kg" },
        { name: "Royco", unit: "kg" },
        { name: "Bawang Putih Bubuk", unit: "kg" },
        { name: "Merica Bubuk", unit: "kg" },
        { name: "Garam", unit: "kg" },
        { name: "Ketumbar Bubuk", unit: "kg" },
    ],
    MARINASI: [
        { name: "Bawang Putih", unit: "kg" },
        { name: "Kecap Manis", unit: "liter" },
        { name: "Jahe Segar", unit: "kg" },
        { name: "Kunyit Segar", unit: "kg" },
        { name: "Ketumbar", unit: "kg" },
        { name: "Garam", unit: "kg" },
        { name: "Asam Jawa", unit: "kg" },
        { name: "Santan", unit: "liter" },
    ],
}

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
        return `BB-${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}-${pad(now.getHours())}${pad(now.getMinutes())}`
    }, [])

    const createItemsFromJenis = (jenis: string): BatchItem[] =>
        (BAHAN_BAKU_PER_JENIS[jenis] || []).map(b => ({ id: crypto.randomUUID(), productName: b.name, qty: "", unit: b.unit }))

    const [batchForm, setBatchForm] = useState({
        transactionDate: resetDate(),
        jenisBumbu: "BIANG" as string,
        notes: "",
        items: createItemsFromJenis("BIANG")
    })
    const [batchId, setBatchIdState] = useState(generateBatchId())

    // When jenis bumbu changes, auto-populate items
    const handleJenisChange = (newJenis: string) => {
        setBatchForm(f => ({ ...f, jenisBumbu: newJenis, items: createItemsFromJenis(newJenis) }))
    }
    const [masukSupplierForm, setMasukSupplierForm] = useState({ transactionDate: resetDate(), supplierName: "", suratJalan: "", productName: "", kemasan: "", qty: "", unit: "kg", notes: "" })
    const [masukHasilForm, setMasukHasilForm] = useState({ transactionDate: resetDate(), jenisBumbu: "", qty: "", unit: "kg", notes: "" })
    const [bjMasukForm, setBjMasukForm] = useState({ transactionDate: resetDate(), productName: "", qty: "", unit: "kg", notes: "", batchId: "" })
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

    // Detect pending batches: batches from PEMAKAIAN BBB that don't yet have a MASUK in BUMBU_JADI
    const pendingBatches = useMemo(() => {
        const pemakaianBatches = new Map<string, { batchId: string; jenisBumbu: string; date: string; itemCount: number }>()
        transactions.forEach(t => {
            if (t.type === "PEMAKAIAN" && t.category === "BAHAN_BAKU_BUMBU" && t.batchId && t.jenisBumbu) {
                const existing = pemakaianBatches.get(t.batchId)
                if (existing) {
                    existing.itemCount++
                } else {
                    pemakaianBatches.set(t.batchId, { batchId: t.batchId, jenisBumbu: t.jenisBumbu, date: t.transactionDate, itemCount: 1 })
                }
            }
        })
        const masukBatchIds = new Set(
            transactions.filter(t => t.type === "MASUK" && t.category === "BUMBU_JADI" && t.batchId).map(t => t.batchId)
        )
        return Array.from(pemakaianBatches.values()).filter(b => !masukBatchIds.has(b.batchId))
    }, [transactions])

    // Filter pending batches for current jenis bumbu
    const currentPendingBatches = useMemo(() => {
        if (section !== "bumbu_jadi" || bjOp !== "masuk") return []
        return pendingBatches.filter(b => b.jenisBumbu === bjJenis)
    }, [pendingBatches, section, bjOp, bjJenis])

    // Pre-fill BJ Masuk form from a pending batch
    const handleBatchPrefill = (batch: { batchId: string; jenisBumbu: string; date: string }) => {
        setBjMasukForm({
            transactionDate: batch.date.split("T")[0],
            productName: jenisLabels[batch.jenisBumbu]?.label || batch.jenisBumbu,
            qty: "",
            unit: "kg",
            notes: `Dari batch ${batch.batchId}`,
            batchId: batch.batchId,
        })
        setShowForm(true)
    }

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
                    notes: form.notes,
                    batchId: form.batchId || undefined,
                })
            })
            if (res.ok) { setShowForm(false); setBjMasukForm({ transactionDate: resetDate(), productName: "", qty: "", unit: "kg", notes: "", batchId: "" }); fetchTransactions() }
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
                    items: filledItems.map(it => ({ productName: it.productName, qty: it.qty, unit: it.unit }))
                })
            })
            if (res.ok) {
                setShowForm(false)
                setBatchForm({ transactionDate: resetDate(), jenisBumbu: "BIANG", notes: "", items: createItemsFromJenis("BIANG") })
                setBatchIdState(generateBatchId())
                fetchTransactions()
            } else { const d = await res.json(); alert(d.error || "Gagal menyimpan batch") }
        } catch { alert("Error menyimpan batch") }
        finally { setSubmitting(false) }
    }

    // Batch item management
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
                    <Package className="text-red-700" size={28} /> Gudang Bumbu
                </h1>
                <p className="text-gray-500 text-sm mt-1">Pencatatan bahan baku bumbu & bumbu jadi</p>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-4">
                <button onClick={() => { setSection("bahan_baku"); setBbTab("pemakaian"); setShowForm(false) }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${section === "bahan_baku" ? "bg-red-700 text-white shadow-lg shadow-red-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    <Factory size={18} /> Bahan Baku Bumbu
                </button>
                <button onClick={() => { setSection("bumbu_jadi"); setBjJenis("BIANG"); setBjOp("masuk"); setShowForm(false) }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${section === "bumbu_jadi" ? "bg-red-800 text-white shadow-lg shadow-red-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    <Beaker size={18} /> Bumbu Jadi
                </button>
            </div>

            {/* Bahan Baku Sub-tabs */}
            {section === "bahan_baku" && (
                <div className="flex gap-1 bg-red-50 p-1 rounded-xl mb-4 overflow-x-auto border border-red-100">
                    {([
                        { key: "pemakaian" as BahanBakuTab, label: "Pemakaian BBB", icon: <ArrowUpCircle size={16} /> },
                        { key: "masuk" as BahanBakuTab, label: "Masuk BBB", icon: <ArrowDownCircle size={16} /> },
                        { key: "inventory" as BahanBakuTab, label: "Inventory BBB", icon: <BarChart3 size={16} /> },
                    ]).map(tab => (
                        <button key={tab.key} onClick={() => { setBbTab(tab.key); setShowForm(false) }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${bbTab === tab.key ? "bg-white text-red-700 shadow-sm" : "text-red-600/70 hover:text-red-700"}`}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Bumbu Jadi: Jenis tabs */}
            {section === "bumbu_jadi" && (
                <>
                    <div className="flex gap-1 bg-red-50 p-1 rounded-xl mb-2 overflow-x-auto border border-red-100">
                        {(["BIANG", "TEPUNG", "MARINASI"] as BumbuJenis[]).map(j => (
                            <button key={j} onClick={() => { setBjJenis(j); setBjOp("masuk"); setShowForm(false) }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${bjJenis === j ? "bg-white text-red-700 shadow-sm" : "text-red-500/70 hover:text-red-700"}`}>
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
                            if (section === "bahan_baku") cards.push({ label: "Total Pemakaian", value: totalPemakaian, gradient: "from-red-700 to-red-800", sub: "red" })
                            cards.push({ label: "Stok Saat Ini", value: totalStok, gradient: "from-red-600 to-red-700", sub: "red" })
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
                                            <td className={`px-4 py-3 text-right font-bold ${item.stok > 0 ? "text-red-700" : "text-red-500"}`}>{formatNumber(item.stok)}</td>
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
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300" />
                        </div>
                        {canAddForm && (
                            <button onClick={() => setShowForm(!showForm)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-700 text-white rounded-xl text-sm font-medium hover:bg-red-800 transition-colors shadow-sm">
                                {showForm ? <X size={18} /> : <Plus size={18} />}
                                {showForm ? "Tutup Form" : getFormLabel()}
                            </button>
                        )}
                    </div>

                    {/* FORMS */}
                    {/* Batch Produksi BBB Form */}
                    {showForm && section === "bahan_baku" && bbTab === "pemakaian" && (
                        <form onSubmit={handleBatchSubmit}
                            className="bg-white border border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
                            {/* Jenis Bumbu Selector */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                                <label className="text-sm font-semibold text-red-800 whitespace-nowrap">Jenis Bumbu</label>
                                <select value={batchForm.jenisBumbu}
                                    onChange={e => handleJenisChange(e.target.value)}
                                    className="px-4 py-2.5 bg-white border border-red-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-red-400 focus:border-red-400 appearance-none min-w-[200px]">
                                    <option value="BIANG">Bumbu Biang</option>
                                    <option value="TEPUNG">Bumbu Tepung</option>
                                    <option value="MARINASI">Bumbu Marinasi</option>
                                </select>
                                <div className="sm:ml-auto flex items-center gap-4 text-xs text-gray-400">
                                    <input type="date" value={batchForm.transactionDate}
                                        onChange={e => setBatchForm(f => ({ ...f, transactionDate: e.target.value }))}
                                        className="px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-300" required />
                                </div>
                            </div>

                            {/* Auto / Manual Indicator */}
                            <div className="grid grid-cols-4 gap-px bg-red-100 rounded-t-lg text-center text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                                <span className="bg-red-50 py-2">Auto</span>
                                <span className="bg-red-50 py-2">Auto</span>
                                <span className="bg-red-50 py-2">Auto</span>
                                <span className="bg-yellow-50 py-2 text-yellow-600">Manual</span>
                            </div>

                            {/* Table */}
                            <div className="border border-red-200 rounded-b-lg overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-4 gap-px bg-red-700 text-white text-xs font-semibold uppercase tracking-wider">
                                    <span className="bg-red-800 px-4 py-3">No Batch</span>
                                    <span className="bg-red-800 px-4 py-3">Tanggal</span>
                                    <span className="bg-red-800 px-4 py-3">Nama Produk</span>
                                    <span className="bg-red-800 px-4 py-3">Qty ({batchForm.items[0]?.unit || "kg"})</span>
                                </div>
                                {/* Table Rows */}
                                {batchForm.items.map((item) => (
                                    <div key={item.id} className="grid grid-cols-4 gap-px bg-red-50 border-t border-red-50">
                                        <span className="bg-white px-4 py-3 text-sm font-mono text-red-400">{batchId}</span>
                                        <span className="bg-white px-4 py-3 text-sm text-gray-500">
                                            {new Date(batchForm.transactionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                        </span>
                                        <span className="bg-white px-4 py-3 text-sm font-medium text-gray-800">{item.productName}</span>
                                        <div className="bg-white px-2 py-1.5 flex items-center">
                                            <input type="number" step="0.01" value={item.qty}
                                                onChange={e => updateBatchItem(item.id, "qty", e.target.value)}
                                                placeholder="0"
                                                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm text-center font-medium focus:ring-2 focus:ring-red-400 focus:border-red-400 placeholder:text-red-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Notes + Submit */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-5">
                                <div className="flex-1">
                                    <input type="text" value={batchForm.notes}
                                        onChange={e => setBatchForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Catatan (opsional)"
                                        className="w-full px-4 py-2.5 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-300 focus:border-red-300 placeholder:text-gray-400" />
                                </div>
                                <button type="submit" disabled={submitting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-red-700 text-white rounded-lg text-sm font-semibold hover:bg-red-800 disabled:opacity-50 shadow-sm transition-colors">
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

                    {/* Pending Batches from Pemakaian BBB */}
                    {section === "bumbu_jadi" && bjOp === "masuk" && currentPendingBatches.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
                            <h4 className="text-sm font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                                <ClipboardList size={16} /> Batch Produksi Belum Dicatat Masuk
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {currentPendingBatches.map(batch => (
                                    <button key={batch.batchId} type="button"
                                        onClick={() => handleBatchPrefill(batch)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-yellow-300 rounded-xl text-sm font-medium text-yellow-800 hover:bg-yellow-100 hover:border-yellow-400 transition-all shadow-sm">
                                        <Package size={14} className="text-yellow-600" />
                                        <span className="font-mono text-xs">{batch.batchId}</span>
                                        <span className="text-yellow-500">•</span>
                                        <span className="text-xs text-yellow-600">{formatDate(batch.date)}</span>
                                        <span className="text-yellow-500">•</span>
                                        <span className="text-xs text-yellow-600">{batch.itemCount} bahan</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bumbu Jadi Masuk Form */}
                    {showForm && section === "bumbu_jadi" && bjOp === "masuk" && (
                        <form onSubmit={e => handleSubmit(e, "MASUK", "BUMBU_JADI", bjMasukForm, bjJenis)}
                            className="bg-white border border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowDownCircle size={20} className="text-red-600" /> Masuk {jenisLabels[bjJenis].label}
                                {bjMasukForm.batchId && (
                                    <span className="ml-2 px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono text-yellow-700">
                                        {bjMasukForm.batchId}
                                    </span>
                                )}
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
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-red-700 text-white rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-50">
                                    {submitting ? "Menyimpan..." : `Simpan Masuk ${jenisLabels[bjJenis].label}`}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Bumbu Jadi Keluar Form */}
                    {showForm && section === "bumbu_jadi" && bjOp === "keluar" && (
                        <form onSubmit={e => handleSubmit(e, "KELUAR", "BUMBU_JADI", bjKeluarForm, bjJenis)}
                            className="bg-white border border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowUpCircle size={20} className="text-red-600" /> Keluar {jenisLabels[bjJenis].label}
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
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-red-700 text-white rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-50">
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
                                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 font-mono">{tx.batchId}</span>
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
