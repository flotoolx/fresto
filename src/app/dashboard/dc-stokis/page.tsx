"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Store, MapPin, Phone, Mail, Search, ChevronRight } from "lucide-react"

interface Stokis {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
    isActive: boolean
}

export default function DCStokisPage() {
    const { data: session } = useSession()
    const [stokisList, setStokisList] = useState<Stokis[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        async function fetchStokis() {
            try {
                const res = await fetch("/api/users?role=STOKIS")
                if (res.ok) {
                    const data = await res.json()
                    setStokisList(Array.isArray(data) ? data : [])
                }
            } catch (error) {
                console.error("Error fetching stokis:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchStokis()
    }, [])

    const filteredStokis = stokisList.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (session?.user?.role !== "DC") {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500">Anda tidak memiliki akses ke halaman ini</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Kelola Stokis</h1>
                <p className="text-gray-500 text-sm">Daftar stokis dalam area coverage Anda</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cari stokis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <Store size={16} className="opacity-80" />
                        <span className="text-white/80 text-xs">Total Stokis</span>
                    </div>
                    <p className="text-2xl font-bold">{stokisList.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <Store size={16} className="opacity-80" />
                        <span className="text-white/80 text-xs">Stokis Aktif</span>
                    </div>
                    <p className="text-2xl font-bold">{stokisList.filter(s => s.isActive).length}</p>
                </div>
            </div>

            {/* Stokis List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                        <p className="text-gray-400 mt-2 text-sm">Memuat data...</p>
                    </div>
                ) : filteredStokis.length === 0 ? (
                    <div className="p-8 text-center">
                        <Store size={40} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-400">Tidak ada stokis ditemukan</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {filteredStokis.map((stokis) => (
                            <li key={stokis.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-gray-900">{stokis.name}</h3>
                                            {stokis.isActive ? (
                                                <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">Aktif</span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">Nonaktif</span>
                                            )}
                                        </div>
                                        <div className="mt-1 space-y-0.5">
                                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                                <Mail size={14} />
                                                {stokis.email}
                                            </p>
                                            {stokis.phone && (
                                                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                                    <Phone size={14} />
                                                    {stokis.phone}
                                                </p>
                                            )}
                                            {stokis.address && (
                                                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                                    <MapPin size={14} />
                                                    {stokis.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
