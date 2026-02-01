"use client"

import { useState, useEffect } from "react"
import { Receipt, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface Tagihan {
    stokisId: string
    stokisName: string
    stokisEmail: string
    totalTagihan: number
    orderCount: number
    lastOrderDate: string
}

export default function TagihanPage() {
    const [tagihans, setTagihans] = useState<Tagihan[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTagihan()
    }, [])

    const fetchTagihan = async () => {
        // TODO: Implement actual tagihan API
        // For now showing mock data structure
        setLoading(false)
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
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Receipt className="text-purple-600" />
                    Tagihan Stokis
                </h1>
                <p className="text-gray-500 text-sm mt-1">Monitor tagihan dan pembayaran Stokis</p>
            </div>

            {/* Summary Cards - Modern Gradient Design */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <Receipt size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Total Tagihan</span>
                    </div>
                    <p className="text-xl font-bold">Rp 0</p>
                    <p className="text-xs text-white/60 mt-1">Dari 0 Stokis</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Sudah Lunas</span>
                    </div>
                    <p className="text-xl font-bold">0</p>
                    <p className="text-xs text-white/60 mt-1">Stokis</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="opacity-80" />
                        <span className="text-xs text-white/80">Belum Lunas</span>
                    </div>
                    <p className="text-xl font-bold">0</p>
                    <p className="text-xs text-white/60 mt-1">Stokis</p>
                </div>
            </div>

            {/* Tagihan List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                    <h2 className="font-semibold text-gray-800">Daftar Tagihan</h2>
                </div>

                {tagihans.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                        <p className="text-gray-500">Tidak ada tagihan yang perlu diproses</p>
                        <p className="text-gray-400 text-sm mt-1">Semua Stokis dalam status baik</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {tagihans.map((tagihan) => (
                            <div key={tagihan.stokisId} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-800">{tagihan.stokisName}</h3>
                                    <p className="text-sm text-gray-500">{tagihan.stokisEmail}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {tagihan.orderCount} order pending
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-purple-600">
                                        {formatCurrency(tagihan.totalTagihan)}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        <Clock size={12} className="inline mr-1" />
                                        {tagihan.lastOrderDate}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
