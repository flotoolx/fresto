"use client"

import { useState, useEffect } from "react"
import {
    BarChart3,
    TrendingUp,
    Package,
    Users,
    Receipt,
    Download,
    Calendar,
    RefreshCw,
    ShoppingCart,
    Store
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

interface SummaryData {
    period: number
    summary: {
        stokisOrders: number
        mitraOrders: number
        totalStokisRevenue: number
        totalMitraRevenue: number
        totalRevenue: number
    }
    users: {
        totalStokis: number
        activeStokis: number
        inactiveStokis: number
        totalMitra: number
        activeMitra: number
        inactiveMitra: number
    }
    orderStatus: Record<string, number>
}

interface MonthlySales {
    year: number
    months: {
        month: number
        monthName: string
        stokisOrders: number
        stokisRevenue: number
        mitraOrders: number
        mitraRevenue: number
        totalOrders: number
        totalRevenue: number
    }[]
    totals: {
        totalOrders: number
        totalRevenue: number
        stokisOrders: number
        mitraOrders: number
    }
}

interface TopProduct {
    productId: string
    productName: string
    sku: string
    unit: string
    totalQty: number
    totalRevenue: number
    orderCount: number
}

interface StokisPerf {
    stokisId: string
    stokisName: string
    address: string | null
    ordersToPusat: number
    ordersFromMitra: number
    revenueToPusat: number
    revenueFromMitra: number
    totalRevenue: number
    mitraCount: number
}

interface InvoiceAgingSummary {
    currentCount: number
    currentAmount: number
    overdue1_7Count: number
    overdue1_7Amount: number
    overdue8_30Count: number
    overdue8_30Amount: number
    overdue30plusCount: number
    overdue30plusAmount: number
    totalOutstanding: number
}

type TabType = "overview" | "monthly" | "products" | "stokis" | "invoice"

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview")
    const [loading, setLoading] = useState(true)
    const [year, setYear] = useState(new Date().getFullYear())
    const [period, setPeriod] = useState(30)

    // Report data
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [monthlySales, setMonthlySales] = useState<MonthlySales | null>(null)
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [stokisPerf, setStokisPerf] = useState<StokisPerf[]>([])
    const [invoiceAging, setInvoiceAging] = useState<InvoiceAgingSummary | null>(null)

    useEffect(() => {
        fetchReport()
    }, [activeTab, year, period])

    const fetchReport = async () => {
        setLoading(true)
        try {
            let url = "/api/reports?"
            if (activeTab === "overview") {
                url += `type=summary&period=${period}`
            } else if (activeTab === "monthly") {
                url += `type=monthly-sales&year=${year}`
            } else if (activeTab === "products") {
                url += `type=top-products&period=${period}`
            } else if (activeTab === "stokis") {
                url += `type=stokis-performance&period=${period}`
            } else if (activeTab === "invoice") {
                url += `type=invoice-aging`
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                if (activeTab === "overview") setSummary(data)
                else if (activeTab === "monthly") setMonthlySales(data)
                else if (activeTab === "products") setTopProducts(data.topProducts || [])
                else if (activeTab === "stokis") setStokisPerf(data.stokisPerformance || [])
                else if (activeTab === "invoice") setInvoiceAging(data.summary)
            }
        } catch (error) {
            console.error("Error fetching report:", error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF()
        const title = getReportTitle()

        doc.setFontSize(16)
        doc.text(title, 14, 20)
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleDateString("id-ID")}`, 14, 28)

        if (activeTab === "monthly" && monthlySales) {
            autoTable(doc, {
                startY: 35,
                head: [["Bulan", "Order Stokis", "Order Mitra", "Total Order", "Pendapatan"]],
                body: monthlySales.months.map(m => [
                    m.monthName,
                    m.stokisOrders.toString(),
                    m.mitraOrders.toString(),
                    m.totalOrders.toString(),
                    formatCurrency(m.totalRevenue)
                ]),
                foot: [[
                    "TOTAL",
                    monthlySales.totals.stokisOrders.toString(),
                    monthlySales.totals.mitraOrders.toString(),
                    monthlySales.totals.totalOrders.toString(),
                    formatCurrency(monthlySales.totals.totalRevenue)
                ]]
            })
        } else if (activeTab === "products" && topProducts.length > 0) {
            autoTable(doc, {
                startY: 35,
                head: [["#", "Produk", "SKU", "Qty Terjual", "Revenue"]],
                body: topProducts.map((p, i) => [
                    (i + 1).toString(),
                    p.productName,
                    p.sku,
                    `${p.totalQty} ${p.unit}`,
                    formatCurrency(p.totalRevenue)
                ])
            })
        } else if (activeTab === "stokis" && stokisPerf.length > 0) {
            autoTable(doc, {
                startY: 35,
                head: [["#", "Stokis", "Order ke Pusat", "Order dari Mitra", "Mitra", "Revenue"]],
                body: stokisPerf.map((s, i) => [
                    (i + 1).toString(),
                    s.stokisName,
                    s.ordersToPusat.toString(),
                    s.ordersFromMitra.toString(),
                    s.mitraCount.toString(),
                    formatCurrency(s.totalRevenue)
                ])
            })
        } else if (activeTab === "invoice" && invoiceAging) {
            autoTable(doc, {
                startY: 35,
                head: [["Kategori", "Jumlah Invoice", "Total Amount"]],
                body: [
                    ["Belum Jatuh Tempo", invoiceAging.currentCount.toString(), formatCurrency(invoiceAging.currentAmount)],
                    ["1-7 Hari Overdue", invoiceAging.overdue1_7Count.toString(), formatCurrency(invoiceAging.overdue1_7Amount)],
                    ["8-30 Hari Overdue", invoiceAging.overdue8_30Count.toString(), formatCurrency(invoiceAging.overdue8_30Amount)],
                    ["30+ Hari Overdue", invoiceAging.overdue30plusCount.toString(), formatCurrency(invoiceAging.overdue30plusAmount)],
                ],
                foot: [["TOTAL OUTSTANDING", "-", formatCurrency(invoiceAging.totalOutstanding)]]
            })
        }

        doc.save(`${title.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`)
    }

    // Export to Excel
    const exportToExcel = () => {
        const title = getReportTitle()
        let data: Record<string, unknown>[] = []

        if (activeTab === "monthly" && monthlySales) {
            data = monthlySales.months.map(m => ({
                Bulan: m.monthName,
                "Order Stokis": m.stokisOrders,
                "Order Mitra": m.mitraOrders,
                "Total Order": m.totalOrders,
                Pendapatan: m.totalRevenue
            }))
        } else if (activeTab === "products") {
            data = topProducts.map((p, i) => ({
                "#": i + 1,
                Produk: p.productName,
                SKU: p.sku,
                "Qty Terjual": p.totalQty,
                Unit: p.unit,
                Revenue: p.totalRevenue
            }))
        } else if (activeTab === "stokis") {
            data = stokisPerf.map((s, i) => ({
                "#": i + 1,
                Stokis: s.stokisName,
                Alamat: s.address || "-",
                "Order ke Pusat": s.ordersToPusat,
                "Order dari Mitra": s.ordersFromMitra,
                "Jumlah Mitra": s.mitraCount,
                "Total Revenue": s.totalRevenue
            }))
        } else if (activeTab === "invoice" && invoiceAging) {
            data = [
                { Kategori: "Belum Jatuh Tempo", Jumlah: invoiceAging.currentCount, Amount: invoiceAging.currentAmount },
                { Kategori: "1-7 Hari Overdue", Jumlah: invoiceAging.overdue1_7Count, Amount: invoiceAging.overdue1_7Amount },
                { Kategori: "8-30 Hari Overdue", Jumlah: invoiceAging.overdue8_30Count, Amount: invoiceAging.overdue8_30Amount },
                { Kategori: "30+ Hari Overdue", Jumlah: invoiceAging.overdue30plusCount, Amount: invoiceAging.overdue30plusAmount },
            ]
        }

        if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Report")
            XLSX.writeFile(wb, `${title.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`)
        }
    }

    const getReportTitle = () => {
        switch (activeTab) {
            case "overview": return "Overview Laporan"
            case "monthly": return `Penjualan Bulanan ${year}`
            case "products": return `Produk Terlaris ${period} Hari`
            case "stokis": return `Performa Stokis ${period} Hari`
            case "invoice": return "Laporan Umur Piutang"
            default: return "Laporan"
        }
    }

    const tabs = [
        { id: "overview", label: "Overview", icon: TrendingUp },
        { id: "monthly", label: "Penjualan Bulanan", icon: Calendar },
        { id: "products", label: "Produk Terlaris", icon: Package },
        { id: "stokis", label: "Performa Stokis", icon: Users },
        { id: "invoice", label: "Umur Piutang", icon: Receipt }
    ]

    return (
        <div className="space-y-4">
            {/* Page Title */}
            <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="text-blue-500" size={22} />
                    Laporan & Analisis
                </h1>
                <p className="text-gray-500 text-sm">Laporan lengkap performa bisnis</p>
            </div>

            {/* Tabs Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                                    ? "border-blue-500 text-blue-600 bg-blue-50/50"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center gap-4 flex-wrap">
                    {activeTab === "monthly" && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Tahun:</label>
                            <select
                                value={year}
                                onChange={e => setYear(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {(activeTab === "overview" || activeTab === "products" || activeTab === "stokis") && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Periode:</label>
                            <select
                                value={period}
                                onChange={e => setPeriod(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value={7}>7 Hari</option>
                                <option value={30}>30 Hari</option>
                                <option value={90}>90 Hari</option>
                                <option value={365}>1 Tahun</option>
                            </select>
                        </div>
                    )}
                    <button
                        onClick={fetchReport}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    {activeTab !== "overview" && (
                        <div className="flex gap-2 ml-auto">
                            <button
                                onClick={exportToPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl text-sm font-medium shadow-sm transition-all"
                            >
                                <Download size={16} />
                                PDF
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-sm font-medium shadow-sm transition-all"
                            >
                                <Download size={16} />
                                Excel
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <>
                            {/* Overview */}
                            {activeTab === "overview" && summary && (
                                <div className="space-y-4">
                                    {/* Stats Grid - Compact */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Total Revenue</span>
                                            </div>
                                            <p className="text-xl font-bold">{formatCurrency(summary.summary.totalRevenue)}</p>
                                            <p className="text-xs text-white/60 mt-1">{period} hari terakhir</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShoppingCart size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Total Order</span>
                                            </div>
                                            <p className="text-xl font-bold">{summary.summary.stokisOrders + summary.summary.mitraOrders}</p>
                                            <p className="text-xs text-white/60 mt-1">Stokis: {summary.summary.stokisOrders} | Mitra: {summary.summary.mitraOrders}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Total Mitra</span>
                                            </div>
                                            <p className="text-xl font-bold">{summary.users.totalMitra}</p>
                                            <p className="text-xs text-white/60 mt-1">{summary.users.activeMitra} aktif</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <Store size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Total Stokis</span>
                                            </div>
                                            <p className="text-xl font-bold">{summary.users.totalStokis}</p>
                                            <p className="text-xs text-white/60 mt-1">{summary.users.activeStokis} aktif</p>
                                        </div>
                                    </div>


                                    {/* Order Status Pipeline - Compact */}
                                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900 text-sm">Pipeline Order Stokis</h3>
                                            <span className="text-xs text-gray-500">{period} hari</span>
                                        </div>
                                        {Object.keys(summary.orderStatus).length > 0 ? (
                                            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                                                {Object.entries(summary.orderStatus).map(([status, count], idx) => {
                                                    const colors = [
                                                        "from-amber-500 to-yellow-500",
                                                        "from-blue-500 to-cyan-500",
                                                        "from-purple-500 to-violet-500",
                                                        "from-emerald-500 to-teal-500",
                                                        "from-rose-500 to-pink-500",
                                                        "from-indigo-500 to-blue-500"
                                                    ]
                                                    const colorClass = colors[idx % colors.length]
                                                    return (
                                                        <div key={status} className="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition cursor-pointer">
                                                            <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-sm`}>
                                                                {count}
                                                            </div>
                                                            <div className="text-[10px] font-medium text-gray-600 uppercase">
                                                                {status.replace(/_/g, " ")}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <ShoppingCart size={24} className="mx-auto mb-2 text-gray-300" />
                                                <p className="text-gray-400 text-sm">Belum ada data order</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Monthly Sales */}
                            {activeTab === "monthly" && monthlySales && (
                                <div className="space-y-4">
                                    {/* Stats Grid - Compact */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Total Pendapatan</span>
                                            </div>
                                            <p className="text-xl font-bold">{formatCurrency(monthlySales.totals.totalRevenue)}</p>
                                            <p className="text-xs text-white/60 mt-1">Tahun {year}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShoppingCart size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Total Order</span>
                                            </div>
                                            <p className="text-xl font-bold">{monthlySales.totals.totalOrders}</p>
                                            <p className="text-xs text-white/60 mt-1">Stokis: {monthlySales.totals.stokisOrders} | Mitra: {monthlySales.totals.mitraOrders}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <Package size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Order Stokis</span>
                                            </div>
                                            <p className="text-xl font-bold">{monthlySales.totals.stokisOrders}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <Store size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Order Mitra</span>
                                            </div>
                                            <p className="text-xl font-bold">{monthlySales.totals.mitraOrders}</p>
                                        </div>
                                    </div>

                                    {/* Simple Bar Chart */}
                                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Grafik Pendapatan {year}</h3>
                                        <div className="flex items-end gap-1 h-32">
                                            {monthlySales.months.map((m, i) => {
                                                const maxRevenue = Math.max(...monthlySales.months.map(x => x.totalRevenue))
                                                const height = maxRevenue > 0 ? (m.totalRevenue / maxRevenue) * 100 : 0
                                                return (
                                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                                        <div
                                                            className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all group-hover:from-emerald-600 group-hover:to-emerald-500 cursor-pointer"
                                                            style={{ height: `${Math.max(height, 4)}%` }}
                                                            title={`${m.monthName}: ${formatCurrency(m.totalRevenue)}`}
                                                        />
                                                        <span className="text-[10px] text-gray-400">{m.monthName.slice(0, 3)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Bulan</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Stokis</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Mitra</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Pendapatan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {monthlySales.months.map((m, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-3 py-2 font-medium text-gray-900">{m.monthName}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{m.stokisOrders}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{m.mitraOrders}</td>
                                                        <td className="px-3 py-2 text-right font-medium text-gray-900">{m.totalOrders}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(m.totalRevenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-100">
                                                <tr className="font-bold text-xs">
                                                    <td className="px-3 py-2 text-gray-900">TOTAL</td>
                                                    <td className="px-3 py-2 text-right text-gray-900">{monthlySales.totals.stokisOrders}</td>
                                                    <td className="px-3 py-2 text-right text-gray-900">{monthlySales.totals.mitraOrders}</td>
                                                    <td className="px-3 py-2 text-right text-gray-900">{monthlySales.totals.totalOrders}</td>
                                                    <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(monthlySales.totals.totalRevenue)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Top Products */}
                            {activeTab === "products" && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-900 text-sm">20 Produk Terlaris ({period} Hari Terakhir)</h3>
                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Produk</th>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">SKU</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Qty</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Order</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {topProducts.map((p, i) => (
                                                    <tr key={p.productId} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                                                        <td className="px-3 py-2 font-medium text-gray-900">{p.productName}</td>
                                                        <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{p.sku}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{p.totalQty} {p.unit}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{p.orderCount}x</td>
                                                        <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(p.totalRevenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {topProducts.length === 0 && (
                                        <div className="text-center py-8 text-gray-400">
                                            <Package size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Belum ada data produk</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stokis Performance */}
                            {activeTab === "stokis" && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-900 text-sm">Performa Stokis ({period} Hari Terakhir)</h3>
                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Stokis</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Order ke Pusat</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Order dari Mitra</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Mitra</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {stokisPerf.map((s, i) => (
                                                    <tr key={s.stokisId} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                                                        <td className="px-3 py-2">
                                                            <p className="font-medium text-gray-900">{s.stokisName}</p>
                                                            {s.address && <p className="text-[10px] text-gray-500">{s.address}</p>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{s.ordersToPusat}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{s.ordersFromMitra}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{s.mitraCount}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(s.totalRevenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {stokisPerf.length === 0 && (
                                        <div className="text-center py-8 text-gray-400">
                                            <Users size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Belum ada data stokis</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Invoice Aging */}
                            {activeTab === "invoice" && invoiceAging && (
                                <div className="space-y-4">
                                    {/* Stats Grid - Compact */}
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-2 mb-2">
                                                <Receipt size={16} className="opacity-80" />
                                                <span className="text-xs text-white/80">Outstanding</span>
                                            </div>
                                            <p className="text-xl font-bold">{formatCurrency(invoiceAging.totalOutstanding)}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <p className="text-xs text-white/80 mb-1">Belum Jatuh Tempo</p>
                                            <p className="text-xl font-bold">{invoiceAging.currentCount}</p>
                                            <p className="text-xs text-white/60 mt-1">{formatCurrency(invoiceAging.currentAmount)}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <p className="text-xs text-white/80 mb-1">1-7 Hari</p>
                                            <p className="text-xl font-bold">{invoiceAging.overdue1_7Count}</p>
                                            <p className="text-xs text-white/60 mt-1">{formatCurrency(invoiceAging.overdue1_7Amount)}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <p className="text-xs text-white/80 mb-1">8-30 Hari</p>
                                            <p className="text-xl font-bold">{invoiceAging.overdue8_30Count}</p>
                                            <p className="text-xs text-white/60 mt-1">{formatCurrency(invoiceAging.overdue8_30Amount)}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <p className="text-xs text-white/80 mb-1">30+ Hari</p>
                                            <p className="text-xl font-bold">{invoiceAging.overdue30plusCount}</p>
                                            <p className="text-xs text-white/60 mt-1">{formatCurrency(invoiceAging.overdue30plusAmount)}</p>
                                        </div>
                                    </div>

                                    {/* Visual Bar */}
                                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Distribusi Umur Piutang</h3>
                                        <div className="flex h-6 rounded-lg overflow-hidden">
                                            {invoiceAging.totalOutstanding > 0 ? (
                                                <>
                                                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${(invoiceAging.currentAmount / invoiceAging.totalOutstanding) * 100}%` }} title={`Belum Jatuh Tempo: ${formatCurrency(invoiceAging.currentAmount)}`} />
                                                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500" style={{ width: `${(invoiceAging.overdue1_7Amount / invoiceAging.totalOutstanding) * 100}%` }} title={`1-7 Hari: ${formatCurrency(invoiceAging.overdue1_7Amount)}`} />
                                                    <div className="bg-gradient-to-r from-orange-400 to-orange-500" style={{ width: `${(invoiceAging.overdue8_30Amount / invoiceAging.totalOutstanding) * 100}%` }} title={`8-30 Hari: ${formatCurrency(invoiceAging.overdue8_30Amount)}`} />
                                                    <div className="bg-gradient-to-r from-red-400 to-red-500" style={{ width: `${(invoiceAging.overdue30plusAmount / invoiceAging.totalOutstanding) * 100}%` }} title={`30+ Hari: ${formatCurrency(invoiceAging.overdue30plusAmount)}`} />
                                                </>
                                            ) : (
                                                <div className="w-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs">Tidak ada piutang</div>
                                            )}
                                        </div>
                                        <div className="flex gap-4 mt-3 text-xs flex-wrap">
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded" /> Belum Jatuh Tempo</span>
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded" /> 1-7 Hari</span>
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gradient-to-r from-orange-400 to-orange-500 rounded" /> 8-30 Hari</span>
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-500 rounded" /> 30+ Hari</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
