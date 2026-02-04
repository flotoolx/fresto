"use client"

import { useState, useEffect } from "react"
import { FileSpreadsheet, ChevronDown, Search, TrendingDown, TrendingUp } from "lucide-react"
import ExportButton from "@/components/ExportButton"

interface StokisPrice {
    id: string
    stokis: {
        id: string
        name: string
        province: string | null
    }
    product: {
        id: string
        name: string
        price: number
        unit: string
    }
    customPrice: number
}

interface StokisSummary {
    stokisId: string
    stokisName: string
    province: string
    productCount: number
    totalMargin: number
}

export default function LaporanHargaPage() {
    const [prices, setPrices] = useState<StokisPrice[]>([])
    const [loading, setLoading] = useState(true)
    const [filterProvince, setFilterProvince] = useState("")
    const [filterStokis, setFilterStokis] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [provinces, setProvinces] = useState<string[]>([])
    const [stokisList, setStokisList] = useState<{ id: string; name: string }[]>([])

    useEffect(() => {
        fetchPrices()
        fetchStokisList()
    }, [])

    const fetchPrices = async () => {
        try {
            const res = await fetch("/api/stokis-prices")
            if (res.ok) {
                const data = await res.json()
                setPrices(data)

                // Extract unique provinces
                const uniqueProvinces = [...new Set(data.map((p: StokisPrice) => p.stokis.province).filter(Boolean))] as string[]
                setProvinces(uniqueProvinces.sort())
            }
        } catch (err) {
            console.error("Error fetching prices:", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchStokisList = async () => {
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    // Calculate summaries per stokis
    const stokisSummaries: StokisSummary[] = Object.values(
        prices.reduce((acc: Record<string, StokisSummary>, price) => {
            const stokisId = price.stokis.id
            if (!acc[stokisId]) {
                acc[stokisId] = {
                    stokisId,
                    stokisName: price.stokis.name,
                    province: price.stokis.province || "-",
                    productCount: 0,
                    totalMargin: 0,
                }
            }
            acc[stokisId].productCount++
            acc[stokisId].totalMargin += Number(price.customPrice) - Number(price.product.price)
            return acc
        }, {})
    )

    // Filter summaries
    const filteredSummaries = stokisSummaries.filter(s => {
        if (filterProvince && s.province !== filterProvince) return false
        if (filterStokis && s.stokisId !== filterStokis) return false
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (!s.stokisName.toLowerCase().includes(query) && !s.province.toLowerCase().includes(query)) return false
        }
        return true
    })

    // Calculate totals
    const totalProducts = filteredSummaries.reduce((sum, s) => sum + s.productCount, 0)
    const totalMargin = filteredSummaries.reduce((sum, s) => sum + s.totalMargin, 0)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FileSpreadsheet className="text-purple-600" />
                            Laporan Harga per Stokis
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">View-only: Lihat margin harga custom per stokis</p>
                    </div>
                    <ExportButton endpoint="/api/export/stokis-prices" type="summary" buttonText="Export XLS" />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <select
                            value={filterProvince}
                            onChange={(e) => setFilterProvince(e.target.value)}
                            className="appearance-none bg-gray-50 border rounded-lg px-4 py-2 pr-8 text-gray-700 text-sm"
                        >
                            <option value="">Semua Provinsi</option>
                            {provinces.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                    <div className="relative">
                        <select
                            value={filterStokis}
                            onChange={(e) => setFilterStokis(e.target.value)}
                            className="appearance-none bg-gray-50 border rounded-lg px-4 py-2 pr-8 text-gray-700 text-sm"
                        >
                            <option value="">Semua Stokis</option>
                            {stokisList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari stokis..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border rounded-lg pl-10 pr-4 py-2 text-gray-700 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-gray-500">Total Stokis</p>
                    <p className="text-xl font-bold text-gray-900">{filteredSummaries.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-gray-500">Total Produk Custom</p>
                    <p className="text-xl font-bold text-blue-600">{totalProducts}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
                    <p className="text-sm text-gray-500">Total Margin</p>
                    <p className={`text-xl font-bold flex items-center gap-1 ${totalMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {totalMargin >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {formatCurrency(totalMargin)}
                    </p>
                </div>
            </div>

            {/* Data Table */}
            {filteredSummaries.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada data harga custom</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Stokis</th>
                                    <th className="px-4 py-3 text-left">Provinsi</th>
                                    <th className="px-4 py-3 text-center">Produk Custom</th>
                                    <th className="px-4 py-3 text-right">Total Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredSummaries.map(summary => (
                                    <tr key={summary.stokisId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900">{summary.stokisName}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{summary.province}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                {summary.productCount} produk
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-medium ${summary.totalMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                {formatCurrency(summary.totalMargin)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-center font-bold text-gray-900">{totalProducts}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-bold ${totalMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            {formatCurrency(totalMargin)}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Note */}
            <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700">
                <p className="font-medium">ℹ️ Catatan:</p>
                <p>Margin negatif berarti harga jual stokis lebih rendah dari harga pusat (diskon khusus).</p>
                <p>Margin positif berarti harga jual stokis lebih tinggi dari harga pusat.</p>
            </div>
        </div>
    )
}
