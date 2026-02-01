"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileText, X, Calendar } from "lucide-react"

interface ExportButtonProps {
    endpoint: string
    type?: string
    buttonText?: string
    className?: string
}

export default function ExportButton({
    endpoint,
    type = "mitra",
    buttonText = "Export",
    className = "",
}: ExportButtonProps) {
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const handleExport = async (format: "pdf" | "excel") => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ type })
            if (startDate) params.append("startDate", startDate)
            if (endDate) params.append("endDate", endDate)

            const response = await fetch(`${endpoint}/${format}?${params}`)
            if (!response.ok) throw new Error("Export failed")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `export-${type}-${Date.now()}.${format === "pdf" ? "pdf" : "xlsx"}`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            setShowModal(false)
        } catch (error) {
            console.error("Export error:", error)
            alert("Gagal export. Silakan coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ${className}`}
            >
                <Download size={18} />
                {buttonText}
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Export Data</h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Calendar size={14} className="inline mr-1" />
                                        Tanggal Mulai (opsional)
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Calendar size={14} className="inline mr-1" />
                                        Tanggal Akhir (opsional)
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="text-sm text-gray-500 mb-4">Pilih format export:</div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleExport("pdf")}
                                    disabled={loading}
                                    className="flex flex-col items-center gap-2 p-4 border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                                >
                                    <FileText size={32} className="text-red-500" />
                                    <span className="font-medium text-gray-800">PDF</span>
                                </button>
                                <button
                                    onClick={() => handleExport("excel")}
                                    disabled={loading}
                                    className="flex flex-col items-center gap-2 p-4 border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50"
                                >
                                    <FileSpreadsheet size={32} className="text-green-500" />
                                    <span className="font-medium text-gray-800">Excel</span>
                                </button>
                            </div>

                            {loading && (
                                <div className="mt-4 text-center text-gray-500">
                                    <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-red-500 rounded-full inline-block mr-2" />
                                    Generating...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
