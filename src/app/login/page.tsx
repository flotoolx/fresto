"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError(result.error)
            } else {
                router.push("/dashboard")
                router.refresh()
            }
        } catch {
            setError("Terjadi kesalahan")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #5B2B4E 0%, #E31E24 50%, #FFD700 100%)' }}>
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-2xl mb-4 p-2">
                        <Image
                            src="/logo_dfresto.png"
                            alt="D'Fresto Logo"
                            width={80}
                            height={80}
                            className="object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">D&apos;Fresto</h1>
                    <p className="text-white/90 mt-1">Sistem Manajemen Franchise</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                        Masuk ke Akun Anda
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@dfresto.com"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] transition-colors text-gray-900"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] transition-colors text-gray-900"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            style={{ background: 'linear-gradient(135deg, #E31E24 0%, #B91C22 100%)' }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Memproses...
                                </span>
                            ) : (
                                "Masuk"
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-white/80 text-sm mt-6">
                    © 2026 D&apos;Fresto. All rights reserved.
                </p>
            </div>
        </div>
    )
}

