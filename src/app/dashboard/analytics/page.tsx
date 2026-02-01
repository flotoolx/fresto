"use client"

import { useState, useEffect } from "react"
import { BarChart3, TrendingUp, TrendingDown, Users, ShoppingCart } from "lucide-react"

interface Analytics {
    mitraRanking: {
        mitraId: string
        mitraName: string
        totalOrders: number
        totalAmount: number
    }[]
    activeMitra: number
    inactiveMitra: number
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const res = await fetch("/api/analytics")
            if (res.ok) {
                const data = await res.json()
                setAnalytics(data)
            }
        } catch (err) {
            console.error("Error fetching analytics:", err)
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    const totalMitra = (analytics?.activeMitra || 0) + (analytics?.inactiveMitra || 0)
    const totalOrders =
        analytics?.mitraRanking?.reduce((sum, m) => sum + m.totalOrders, 0) || 0
    const totalRevenue =
        analytics?.mitraRanking?.reduce((sum, m) => sum + m.totalAmount, 0) || 0

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="text-red-600" />
                    Analytics
                </h1>
                <p className="text-gray-500 text-sm mt-1">Ringkasan performa sistem</p>
            </div>

            {/* Summary Cards - Modern Gradient Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Total Mitra</span>
                    </div>
                    <p className="text-xl font-bold">{totalMitra}</p>
                    <p className="text-xs text-white/60 mt-1">
                        <span className="text-emerald-200">{analytics?.activeMitra} aktif</span>
                        <span className="mx-1">•</span>
                        <span>{analytics?.inactiveMitra} inaktif</span>
                    </p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Total Order</span>
                    </div>
                    <p className="text-xl font-bold">{totalOrders}</p>
                    <p className="text-xs text-white/60 mt-1 flex items-center">
                        <TrendingUp size={12} className="mr-1" />
                        Dari seluruh mitra
                    </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Total Revenue</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                    <p className="text-xs text-white/60 mt-1">Akumulasi semua order</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Rata-rata Order</span>
                    </div>
                    <p className="text-xl font-bold">
                        {totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : "Rp 0"}
                    </p>
                    <p className="text-xs text-white/60 mt-1">Per transaksi</p>
                </div>
            </div>

            {/* Mitra Ranking */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">🏆 Ranking Mitra</h2>
                    <p className="text-gray-500 text-sm">Berdasarkan total order</p>
                </div>

                {(!analytics?.mitraRanking || analytics.mitraRanking.length === 0) ? (
                    <div className="p-12 text-center text-gray-500">
                        Belum ada data order
                    </div>
                ) : (
                    <div className="divide-y">
                        {analytics.mitraRanking.map((mitra, index) => (
                            <div key={mitra.mitraId} className="flex items-center p-4 hover:bg-gray-50">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0
                                        ? "bg-yellow-100 text-yellow-700"
                                        : index === 1
                                            ? "bg-gray-100 text-gray-600"
                                            : index === 2
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-gray-50 text-gray-500"
                                        }`}
                                >
                                    {index + 1}
                                </div>
                                <div className="flex-1 ml-4">
                                    <h3 className="font-semibold text-gray-800">{mitra.mitraName}</h3>
                                    <p className="text-sm text-gray-500">{mitra.totalOrders} order</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-red-600">{formatCurrency(mitra.totalAmount)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
