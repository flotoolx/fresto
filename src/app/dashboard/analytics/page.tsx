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

            {/* Summary Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Total Mitra</span>
                        <Users className="text-blue-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{totalMitra}</div>
                    <div className="text-sm mt-1">
                        <span className="text-green-600">{analytics?.activeMitra} aktif</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{analytics?.inactiveMitra} inaktif</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Total Order</span>
                        <ShoppingCart className="text-orange-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{totalOrders}</div>
                    <div className="flex items-center text-sm mt-1 text-green-600">
                        <TrendingUp size={14} className="mr-1" />
                        Dari seluruh mitra
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Total Revenue</span>
                        <TrendingUp className="text-green-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</div>
                    <div className="text-sm mt-1 text-gray-500">Akumulasi semua order</div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Rata-rata Order</span>
                        <BarChart3 className="text-purple-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : "Rp 0"}
                    </div>
                    <div className="text-sm mt-1 text-gray-500">Per transaksi</div>
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
