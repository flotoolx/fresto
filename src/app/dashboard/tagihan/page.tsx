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

            {/* Summary Cards */}
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Total Tagihan</span>
                        <Receipt className="text-purple-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">Rp 0</div>
                    <div className="text-sm mt-1 text-gray-500">Dari 0 Stokis</div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Sudah Lunas</span>
                        <CheckCircle className="text-green-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-sm mt-1 text-gray-500">Stokis</div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Belum Lunas</span>
                        <AlertCircle className="text-red-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-red-600">0</div>
                    <div className="text-sm mt-1 text-gray-500">Stokis</div>
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
