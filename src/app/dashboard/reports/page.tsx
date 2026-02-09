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
        totalDcRevenue: number
        totalRevenue: number
    }
    users: {
        totalStokis: number
        activeStokis: number
        inactiveStokis: number
        totalMitra: number
        activeMitra: number
        inactiveMitra: number
        totalDc: number
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

interface DcPerf {
    dcId: string
    dcName: string
    address: string | null
    ordersToStokis: number
    totalRevenue: number
    stokisCount: number
}

interface MitraPerf {
    mitraId: string
    mitraName: string
    address: string | null
    ordersToStokis: number
    totalRevenue: number
    stokisName: string
}

interface InvoiceAgingSummary {
    dcCount: number
    dcAmount: number
    stokisCount: number
    stokisAmount: number
    totalInvoices: number
    totalOutstanding: number
    // New fields for 3-card view
    totalPoCount: number
    totalPoAmount: number
    unpaidCount: number
    unpaidAmount: number
    paidCount: number
    paidAmount: number
}

interface AgingBucket {
    count: number
    amount: number
}

interface AgingSummary {
    belum_jatuh_tempo: AgingBucket
    "1_7_hari": AgingBucket
    "8_30_hari": AgingBucket
    "30_plus": AgingBucket
}

interface InvoiceDetail {
    id: string
    invoiceNumber: string
    orderNumber: string
    orderCreatedAt: string
    stokisName: string
    stokisPhone: string | null
    amount: number
    dueDate: string
    daysDiff: number
    agingCategory: string
    status: string
}

type TabType = "overview" | "monthly" | "products" | "stokis" | "invoice"

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview")
    const [loading, setLoading] = useState(true)
    const [year, setYear] = useState(new Date().getFullYear())
    const [period, setPeriod] = useState(30)
    const [invoiceFilter, setInvoiceFilter] = useState<"all" | "dc" | "stokis">("all")
    const [invoiceSortOrder, setInvoiceSortOrder] = useState<"asc" | "desc">("desc")
    const [perfFilter, setPerfFilter] = useState<"all" | "dc" | "stokis" | "mitra">("all")

    // Custom date range for Overview
    const [useCustomDate, setUseCustomDate] = useState(false)
    const [customDateFrom, setCustomDateFrom] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split("T")[0]
    })
    const [customDateTo, setCustomDateTo] = useState(() => new Date().toISOString().split("T")[0])

    // Report data
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [monthlySales, setMonthlySales] = useState<MonthlySales | null>(null)
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [stokisPerf, setStokisPerf] = useState<StokisPerf[]>([])
    const [dcPerf, setDcPerf] = useState<DcPerf[]>([])
    const [mitraPerf, setMitraPerf] = useState<MitraPerf[]>([])
    const [invoiceAging, setInvoiceAging] = useState<InvoiceAgingSummary | null>(null)
    const [agingSummary, setAgingSummary] = useState<AgingSummary | null>(null)
    const [invoiceDetails, setInvoiceDetails] = useState<{ dc: InvoiceDetail[]; stokis: InvoiceDetail[] }>({ dc: [], stokis: [] })

    useEffect(() => {
        fetchReport()
    }, [activeTab, year, period, useCustomDate, customDateFrom, customDateTo])

    const fetchReport = async () => {
        setLoading(true)
        try {
            let url = "/api/reports?"
            if (activeTab === "overview") {
                if (useCustomDate) {
                    url += `type=summary&dateFrom=${customDateFrom}&dateTo=${customDateTo}`
                } else {
                    url += `type=summary&period=${period}`
                }
            } else if (activeTab === "monthly") {
                url += `type=monthly-sales&year=${year}`
            } else if (activeTab === "products") {
                if (useCustomDate) {
                    url += `type=top-products&dateFrom=${customDateFrom}&dateTo=${customDateTo}`
                } else {
                    url += `type=top-products&period=${period}`
                }
            } else if (activeTab === "stokis") {
                if (useCustomDate) {
                    url += `type=stokis-performance&dateFrom=${customDateFrom}&dateTo=${customDateTo}`
                } else {
                    url += `type=stokis-performance&period=${period}`
                }
            } else if (activeTab === "invoice") {
                url += `type=invoice-aging`
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                if (activeTab === "overview") setSummary(data)
                else if (activeTab === "monthly") setMonthlySales(data)
                else if (activeTab === "products") setTopProducts(data.topProducts || [])
                else if (activeTab === "stokis") {
                    setStokisPerf(data.stokisPerformance || [])
                    setDcPerf(data.dcPerformance || [])
                    setMitraPerf(data.mitraPerformance || [])
                }
                else if (activeTab === "invoice") {
                    setInvoiceAging(data.summary)
                    setAgingSummary(data.agingSummary)
                    setInvoiceDetails(data.details || { dc: [], stokis: [] })
                }
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
            // Get invoices to export based on filter
            const invoicesToExport = invoiceFilter === "all"
                ? [...invoiceDetails.dc, ...invoiceDetails.stokis]
                : invoiceFilter === "dc"
                    ? invoiceDetails.dc
                    : invoiceDetails.stokis

            // Summary section
            autoTable(doc, {
                startY: 35,
                head: [["Kategori", "Jumlah Invoice", "Total Amount"]],
                body: [
                    ["Outstanding", invoiceAging.totalInvoices.toString(), formatCurrency(invoiceAging.totalOutstanding)],
                    ["Belum Jatuh Tempo", (agingSummary?.belum_jatuh_tempo?.count || 0).toString(), formatCurrency(agingSummary?.belum_jatuh_tempo?.amount || 0)],
                    ["1-7 Hari", (agingSummary?.["1_7_hari"]?.count || 0).toString(), formatCurrency(agingSummary?.["1_7_hari"]?.amount || 0)],
                    ["8-30 Hari", (agingSummary?.["8_30_hari"]?.count || 0).toString(), formatCurrency(agingSummary?.["8_30_hari"]?.amount || 0)],
                    ["30+ Hari", (agingSummary?.["30_plus"]?.count || 0).toString(), formatCurrency(agingSummary?.["30_plus"]?.amount || 0)],
                ],
                theme: "striped"
            })

            // Invoice details table
            const lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80
            doc.text("Daftar Invoice Umur Piutang", 14, lastY + 10)

            const getAgingLabel = (category: string) => {
                const labels: Record<string, string> = {
                    belum_jatuh_tempo: "Belum Jatuh Tempo",
                    "1_7_hari": "1-7 Hari",
                    "8_30_hari": "8-30 Hari",
                    "30_plus": "30+ Hari"
                }
                return labels[category] || category
            }

            autoTable(doc, {
                startY: lastY + 15,
                head: [["No. Invoice", "No. Order", "Stokis", "Jumlah", "Jatuh Tempo", "Kategori", "Status"]],
                body: invoicesToExport.map(inv => [
                    inv.invoiceNumber,
                    inv.orderNumber,
                    inv.stokisName,
                    formatCurrency(inv.amount),
                    new Date(inv.dueDate).toLocaleDateString("id-ID"),
                    getAgingLabel(inv.agingCategory),
                    inv.status === "OVERDUE" ? "Jatuh Tempo" : "Belum Bayar"
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] }
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
            // Get invoices to export based on filter
            const invoicesToExport = invoiceFilter === "all"
                ? [...invoiceDetails.dc, ...invoiceDetails.stokis]
                : invoiceFilter === "dc"
                    ? invoiceDetails.dc
                    : invoiceDetails.stokis

            const getAgingLabel = (category: string) => {
                const labels: Record<string, string> = {
                    belum_jatuh_tempo: "Belum Jatuh Tempo",
                    "1_7_hari": "1-7 Hari",
                    "8_30_hari": "8-30 Hari",
                    "30_plus": "30+ Hari"
                }
                return labels[category] || category
            }

            // Invoice details data
            data = invoicesToExport.map((inv, i) => ({
                "#": i + 1,
                "No. Invoice": inv.invoiceNumber,
                "No. Order": inv.orderNumber,
                "Stokis": inv.stokisName,
                "No. Telp": inv.stokisPhone || "-",
                "Jumlah": inv.amount,
                "Jatuh Tempo": new Date(inv.dueDate).toLocaleDateString("id-ID"),
                "Kategori Umur": getAgingLabel(inv.agingCategory),
                "Status": inv.status === "OVERDUE" ? "Jatuh Tempo" : "Belum Bayar"
            }))

            // Create summary data
            const summaryData = [
                { Kategori: "Total Outstanding", Jumlah: invoiceAging.totalInvoices, Amount: invoiceAging.totalOutstanding },
                { Kategori: "Belum Jatuh Tempo", Jumlah: agingSummary?.belum_jatuh_tempo?.count || 0, Amount: agingSummary?.belum_jatuh_tempo?.amount || 0 },
                { Kategori: "1-7 Hari", Jumlah: agingSummary?.["1_7_hari"]?.count || 0, Amount: agingSummary?.["1_7_hari"]?.amount || 0 },
                { Kategori: "8-30 Hari", Jumlah: agingSummary?.["8_30_hari"]?.count || 0, Amount: agingSummary?.["8_30_hari"]?.amount || 0 },
                { Kategori: "30+ Hari", Jumlah: agingSummary?.["30_plus"]?.count || 0, Amount: agingSummary?.["30_plus"]?.amount || 0 },
            ]

            // Create workbook with two sheets
            const wb = XLSX.utils.book_new()
            const wsSummary = XLSX.utils.json_to_sheet(summaryData)
            const wsDetails = XLSX.utils.json_to_sheet(data)
            XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan")
            XLSX.utils.book_append_sheet(wb, wsDetails, "Detail Invoice")
            XLSX.writeFile(wb, `${title.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`)
            return
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
            case "invoice": return "Laporan Tagihan"
            default: return "Laporan"
        }
    }

    const tabs = [
        { id: "overview", label: "Overview", icon: TrendingUp },
        // { id: "monthly", label: "Penjualan Bulanan", icon: Calendar }, // HIDDEN - Phase 7
        { id: "products", label: "Produk Terlaris", icon: Package },
        { id: "stokis", label: "Performa", icon: Users },
        { id: "invoice", label: "Tagihan", icon: Receipt }
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
                        <>
                            {/* Preset period selector */}
                            {!useCustomDate && (
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

                            {/* Custom date range - For Overview, Products, and Stokis tabs */}
                            {(activeTab === "overview" || activeTab === "products" || activeTab === "stokis") && (
                                <>
                                    <button
                                        onClick={() => setUseCustomDate(!useCustomDate)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${useCustomDate
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                    >
                                        <Calendar size={14} />
                                        Custom
                                    </button>

                                    {useCustomDate && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={customDateFrom}
                                                onChange={e => setCustomDateFrom(e.target.value)}
                                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <span className="text-gray-400">-</span>
                                            <input
                                                type="date"
                                                value={customDateTo}
                                                onChange={e => setCustomDateTo(e.target.value)}
                                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </>
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
                            {activeTab === "invoice" ? (
                                <button
                                    onClick={() => window.open(`/report/invoice-aging?filter=${invoiceFilter}&sort=${invoiceSortOrder}`, '_blank')}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl text-sm font-medium shadow-sm transition-all"
                                >
                                    <Download size={16} />
                                    PDF
                                </button>
                            ) : (
                                <button
                                    onClick={exportToPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl text-sm font-medium shadow-sm transition-all"
                                >
                                    <Download size={16} />
                                    PDF
                                </button>
                            )}
                            {activeTab === "invoice" ? (
                                <button
                                    onClick={() => window.open(`/report/invoice-aging?filter=${invoiceFilter}&sort=${invoiceSortOrder}`, '_blank')}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-sm font-medium shadow-sm transition-all"
                                >
                                    <Download size={16} />
                                    Excel
                                </button>
                            ) : (
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-sm font-medium shadow-sm transition-all"
                                >
                                    <Download size={16} />
                                    Excel
                                </button>
                            )}
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
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                                        {/* Total Revenue */}
                                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2 md:p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                <TrendingUp size={12} className="opacity-80 md:w-[16px] md:h-[16px] flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs text-white/80 truncate">Total Revenue</span>
                                            </div>
                                            <p className="text-[11px] sm:text-sm md:text-xl font-bold leading-tight">{formatCurrency(summary.summary.totalRevenue)}</p>
                                            <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">Total PO: <span className="font-bold">{summary.summary.stokisOrders + summary.summary.mitraOrders}</span></p>
                                        </div>
                                        {/* Total DC */}
                                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-2 md:p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                <Store size={12} className="opacity-80 md:w-[16px] md:h-[16px] flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs text-white/80 truncate">Total DC</span>
                                            </div>
                                            <p className="text-[11px] sm:text-sm md:text-xl font-bold leading-tight">{formatCurrency(summary.summary.totalDcRevenue)}</p>
                                            <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">Total PO DC: <span className="font-bold">{summary.summary.stokisOrders}</span></p>
                                        </div>
                                        {/* Total Stokis */}
                                        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-2 md:p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                <Store size={12} className="opacity-80 md:w-[16px] md:h-[16px] flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs text-white/80 truncate">Total Stokis</span>
                                            </div>
                                            <p className="text-[11px] sm:text-sm md:text-xl font-bold leading-tight">{formatCurrency(summary.summary.totalStokisRevenue)}</p>
                                            <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">Total PO Stokis: <span className="font-bold">{summary.summary.stokisOrders}</span></p>
                                        </div>
                                        {/* Total Mitra */}
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2 md:p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                <Users size={12} className="opacity-80 md:w-[16px] md:h-[16px] flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs text-white/80 truncate">Total Mitra</span>
                                            </div>
                                            <p className="text-[11px] sm:text-sm md:text-xl font-bold leading-tight">{formatCurrency(summary.summary.totalMitraRevenue)}</p>
                                            <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">Total PO Mitra: <span className="font-bold">{summary.summary.mitraOrders}</span></p>
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
                                    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                                        <table className="w-full text-xs min-w-[600px]">
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
                                                        <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(p.totalRevenue)}</td>
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
                            {activeTab === "stokis" && (() => {
                                // Calculate totals based on filter
                                const getTotalRevenue = () => {
                                    if (perfFilter === "dc") return dcPerf.reduce((sum, d) => sum + d.totalRevenue, 0)
                                    if (perfFilter === "stokis") return stokisPerf.reduce((sum, s) => sum + s.totalRevenue, 0)
                                    if (perfFilter === "mitra") return mitraPerf.reduce((sum, m) => sum + m.totalRevenue, 0)
                                    return stokisPerf.reduce((sum, s) => sum + s.totalRevenue, 0)
                                }
                                const getTotalPO = () => {
                                    if (perfFilter === "dc") return dcPerf.reduce((sum, d) => sum + d.ordersToStokis, 0)
                                    if (perfFilter === "stokis") return stokisPerf.reduce((sum, s) => sum + s.ordersToPusat + s.ordersFromMitra, 0)
                                    if (perfFilter === "mitra") return mitraPerf.reduce((sum, m) => sum + m.ordersToStokis, 0)
                                    return stokisPerf.reduce((sum, s) => sum + s.ordersToPusat + s.ordersFromMitra, 0)
                                }

                                return (
                                    <div className="space-y-3">
                                        {/* Header with Filter */}
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <h3 className="font-semibold text-gray-900 text-sm">Performa ({period} Hari Terakhir)</h3>
                                            <div className="flex gap-1">
                                                {(["all", "dc", "stokis", "mitra"] as const).map((f) => (
                                                    <button
                                                        key={f}
                                                        onClick={() => setPerfFilter(f)}
                                                        className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-lg transition-colors ${perfFilter === f
                                                            ? "bg-purple-600 text-white"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                            }`}
                                                    >
                                                        {f === "all" ? "Semua" : f.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Total Card */}
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-3 md:p-4 text-white relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-10 md:w-12 h-10 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                                <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                    <Receipt size={14} className="opacity-80 md:w-[16px] md:h-[16px] flex-shrink-0" />
                                                    <span className="text-[10px] md:text-xs text-white/80">Total {perfFilter === "all" ? "" : perfFilter.toUpperCase()}</span>
                                                </div>
                                                <p className="text-sm md:text-xl font-bold leading-tight">
                                                    {formatCurrency(getTotalRevenue())}
                                                </p>
                                                <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">
                                                    {getTotalPO()} PO
                                                </p>
                                            </div>
                                        </div>

                                        {/* DC Table */}
                                        {perfFilter === "dc" && (
                                            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                                                <table className="w-full text-xs min-w-[400px]">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">DC</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Order ke Stokis</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Stokis</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Revenue</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {dcPerf.map((d, i) => (
                                                            <tr key={d.dcId} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                                                                <td className="px-3 py-2">
                                                                    <p className="font-medium text-gray-900">{d.dcName}</p>
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-gray-600">{d.ordersToStokis}</td>
                                                                <td className="px-3 py-2 text-right text-gray-600">{d.stokisCount}</td>
                                                                <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(d.totalRevenue)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Stokis Table */}
                                        {(perfFilter === "all" || perfFilter === "stokis") && (
                                            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                                                <table className="w-full text-xs min-w-[600px]">
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
                                                                <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(s.totalRevenue)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Mitra Table */}
                                        {perfFilter === "mitra" && (
                                            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                                                <table className="w-full text-xs min-w-[500px]">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Mitra</th>
                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Stokis</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Orders</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Revenue</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {mitraPerf.map((m, i) => (
                                                            <tr key={m.mitraId} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                                                                <td className="px-3 py-2">
                                                                    <p className="font-medium text-gray-900">{m.mitraName}</p>
                                                                    {m.address && <p className="text-[10px] text-gray-500">{m.address}</p>}
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-600">{m.stokisName}</td>
                                                                <td className="px-3 py-2 text-right text-gray-600">{m.ordersToStokis}</td>
                                                                <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(m.totalRevenue)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Empty state */}
                                        {((perfFilter === "dc" && dcPerf.length === 0) ||
                                            (perfFilter === "stokis" && stokisPerf.length === 0) ||
                                            (perfFilter === "mitra" && mitraPerf.length === 0) ||
                                            (perfFilter === "all" && stokisPerf.length === 0)) && (
                                                <div className="text-center py-8 text-gray-400">
                                                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">Belum ada data</p>
                                                </div>
                                            )}
                                    </div>
                                )
                            })()}

                            {/* Invoice Aging */}
                            {activeTab === "invoice" && invoiceAging && (
                                <div className="space-y-4">
                                    {/* Filter and Sort Buttons */}
                                    <div className="flex gap-2 flex-wrap items-center">
                                        {["all", "dc", "stokis"].map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => setInvoiceFilter(filter as "all" | "dc" | "stokis")}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${invoiceFilter === filter
                                                    ? "bg-blue-500 text-white shadow-md"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                            >
                                                {filter === "all" ? "Semua" : filter === "dc" ? "DC" : "Stokis"}
                                            </button>
                                        ))}
                                        <div className="ml-auto flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Urutkan:</span>
                                            <button
                                                onClick={() => setInvoiceSortOrder(invoiceSortOrder === "asc" ? "desc" : "asc")}
                                                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-all"
                                            >
                                                Tanggal PO {invoiceSortOrder === "asc" ? "↑" : "↓"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Simplified 3-Card Summary: Total, Belum Dibayar, Lunas */}
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                                        {/* Total */}
                                        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-2 md:p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                <Receipt size={12} className="opacity-80 md:w-[14px] md:h-[14px] flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs text-white/80 truncate">Total</span>
                                            </div>
                                            <p className="text-[11px] sm:text-sm md:text-xl font-bold leading-tight">{formatCurrency(invoiceAging.totalPoAmount || 0)}</p>
                                            <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">Total PO: <span className="font-bold">{invoiceAging.totalPoCount || 0}</span></p>
                                        </div>

                                        {/* Belum Dibayar */}
                                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-2 md:p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                <Receipt size={12} className="opacity-80 md:w-[14px] md:h-[14px] flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs text-white/80 truncate">Belum Dibayar</span>
                                            </div>
                                            <p className="text-[11px] sm:text-sm md:text-xl font-bold leading-tight">{formatCurrency(invoiceAging.unpaidAmount || 0)}</p>
                                            <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">Total PO: <span className="font-bold">{invoiceAging.unpaidCount || 0}</span></p>
                                        </div>

                                        {/* Lunas */}
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2 md:p-4 text-white relative overflow-hidden col-span-2 lg:col-span-1">
                                            <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                                                <Receipt size={12} className="opacity-80 md:w-[14px] md:h-[14px] flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs text-white/80 truncate">Lunas</span>
                                            </div>
                                            <p className="text-[11px] sm:text-sm md:text-xl font-bold leading-tight">{formatCurrency(invoiceAging.paidAmount || 0)}</p>
                                            <p className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">Total PO: <span className="font-bold">{invoiceAging.paidCount || 0}</span></p>
                                        </div>
                                    </div>

                                    {/* Invoice Details Table */}
                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                        <div className="p-4 border-b border-gray-100">
                                            <h3 className="font-semibold text-gray-900 text-sm">Daftar Invoice Umur Piutang</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-gray-600">
                                                    <tr>
                                                        <th className="text-left px-4 py-3 font-medium">Tanggal PO</th>
                                                        <th className="text-left px-4 py-3 font-medium">No. Invoice</th>
                                                        <th className="text-left px-4 py-3 font-medium">Konsumen</th>
                                                        <th className="text-right px-4 py-3 font-medium">Jumlah</th>
                                                        <th className="text-left px-4 py-3 font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(() => {
                                                        let invoicesToShow = invoiceFilter === "all"
                                                            ? [...invoiceDetails.dc, ...invoiceDetails.stokis]
                                                            : invoiceFilter === "dc"
                                                                ? invoiceDetails.dc
                                                                : invoiceDetails.stokis

                                                        // Sort by order date
                                                        invoicesToShow = [...invoicesToShow].sort((a, b) => {
                                                            const dateA = new Date(a.orderCreatedAt || a.dueDate).getTime()
                                                            const dateB = new Date(b.orderCreatedAt || b.dueDate).getTime()
                                                            return invoiceSortOrder === "asc" ? dateA - dateB : dateB - dateA
                                                        })

                                                        if (invoicesToShow.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                                        Tidak ada invoice
                                                                    </td>
                                                                </tr>
                                                            )
                                                        }

                                                        return invoicesToShow.map((invoice) => {
                                                            const statusLabel = invoice.status === "PAID"
                                                                ? { text: "Lunas", color: "bg-emerald-100 text-emerald-700" }
                                                                : { text: "Belum Bayar", color: "bg-amber-100 text-amber-700" }

                                                            return (
                                                                <tr key={invoice.id} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-3 text-gray-600">
                                                                        {invoice.orderCreatedAt
                                                                            ? new Date(invoice.orderCreatedAt).toLocaleDateString("id-ID")
                                                                            : "-"
                                                                        }
                                                                    </td>
                                                                    <td className="px-4 py-3 font-mono text-gray-900">{invoice.invoiceNumber}</td>
                                                                    <td className="px-4 py-3 text-gray-900">{invoice.stokisName}</td>
                                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(invoice.amount)}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel.color}`}>
                                                                            {statusLabel.text}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })
                                                    })()}
                                                </tbody>
                                            </table>
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
