"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Plus, Minus, Trash2, Check, Search, Store } from "lucide-react"

interface Product {
    id: string
    name: string
    sku: string
    unit: string
    price: number
    gudang: { name: string }
}

interface CartItem {
    product: Product
    quantity: number
}

interface StokisOption {
    stokisId: string
    stokisName: string
    stokisCode: string | null
    isPrimary: boolean
}

export default function MitraOrderPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState("")
    const [stokisList, setStokisList] = useState<StokisOption[]>([])
    const [selectedStokisId, setSelectedStokisId] = useState<string>("")

    useEffect(() => {
        fetchProducts()
        fetchStokisList()
    }, [])

    const fetchStokisList = async () => {
        try {
            const res = await fetch("/api/mitra/stokis-list")
            if (res.ok) {
                const data: StokisOption[] = await res.json()
                setStokisList(data)
                // Default to primary
                const primary = data.find(s => s.isPrimary)
                if (primary) setSelectedStokisId(primary.stokisId)
                else if (data.length > 0) setSelectedStokisId(data[0].stokisId)
            }
        } catch (err) {
            console.error("Error fetching stokis list:", err)
        }
    }

    const handleStokisChange = (newStokisId: string) => {
        if (newStokisId !== selectedStokisId) {
            setSelectedStokisId(newStokisId)
            setCart([]) // Reset cart when switching Stokis
        }
    }

    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/products")
            const data = await res.json()
            setProducts(data)
        } catch (err) {
            setError("Gagal memuat produk")
        } finally {
            setLoading(false)
        }
    }

    // Filter products: exclude items already in cart, apply search, limit to 15 for best seller
    const displayedProducts = useMemo(() => {
        const cartIds = new Set(cart.map(item => item.product.id))
        const available = products.filter(p => !cartIds.has(p.id))

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            return available.filter(p =>
                p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
            )
        }

        // No search: show top 15 as "Best Seller"
        return available.slice(0, 15)
    }, [products, cart, searchQuery])

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id)
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { product, quantity: 1 }]
        })

        // Visual feedback
        setRecentlyAdded((prev) => new Set(prev).add(product.id))
        setTimeout(() => {
            setRecentlyAdded((prev) => {
                const next = new Set(prev)
                next.delete(product.id)
                return next
            })
        }, 800)
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.product.id === productId
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        )
    }

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId))
    }

    const setQuantity = (productId: string, qty: number) => {
        if (qty <= 0) {
            removeFromCart(productId)
            return
        }
        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId
                    ? { ...item, quantity: qty }
                    : item
            )
        )
    }

    const totalAmount = cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    )

    const handleSubmit = async () => {
        if (cart.length === 0) {
            setError("Keranjang masih kosong")
            return
        }

        setSubmitting(true)
        setError("")

        try {
            const orderPayload: Record<string, unknown> = {
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                })),
                notes,
            }
            // Send stokisId if multi-stokis
            if (stokisList.length > 1 && selectedStokisId) {
                orderPayload.stokisId = selectedStokisId
            }

            const res = await fetch("/api/orders/mitra", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderPayload),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal membuat order")
            }

            router.push("/dashboard")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal membuat order")
        } finally {
            setSubmitting(false)
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
                <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingCart className="text-orange-500" />
                    Buat Order Baru
                </h1>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Product List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Stokis Picker — only shown if 2+ Stokis assigned */}
                    {stokisList.length > 1 && (
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Store size={18} className="text-blue-500 flex-shrink-0" />
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Order ke Stokis:</label>
                                    <select
                                        value={selectedStokisId}
                                        onChange={(e) => handleStokisChange(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                    >
                                        {stokisList.map(s => (
                                            <option key={s.stokisId} value={s.stokisId}>
                                                {s.stokisName}{s.isPrimary ? " (Utama)" : " (Cadangan)"}
                                                {s.stokisCode ? ` — ${s.stokisCode}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        {/* Search Bar */}
                        <div className="relative mb-4">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari produk..."
                                className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                            />
                        </div>

                        {/* Section Label */}
                        <h2 className="font-semibold text-gray-800 mb-3 text-sm">
                            {searchQuery.trim() ? `Hasil Pencarian (${displayedProducts.length})` : "Best Seller"}
                        </h2>

                        {/* Compact Product List */}
                        {displayedProducts.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">
                                {searchQuery.trim() ? "Produk tidak ditemukan" : "Semua produk sudah di keranjang"}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {displayedProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between border rounded-lg px-3 py-2.5 hover:border-orange-300 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <h3 className="font-medium text-gray-800 text-sm truncate">{product.name}</h3>
                                            <span className="text-orange-600 font-semibold text-sm">
                                                {formatCurrency(product.price)}<span className="text-gray-400 font-normal text-xs">/{product.unit}</span>
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => addToCart(product)}
                                            className={`p-2 rounded-lg transition-all duration-300 flex-shrink-0 ${recentlyAdded.has(product.id)
                                                ? "bg-green-500 text-white scale-110"
                                                : "bg-orange-500 text-white hover:bg-orange-600"
                                                }`}
                                        >
                                            {recentlyAdded.has(product.id) ? <Check size={18} /> : <Plus size={18} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl p-4 shadow-sm sticky top-20">
                        <h2 className="font-semibold text-gray-800 mb-4">Keranjang</h2>

                        {cart.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div key={item.product.id} className="border-b pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm text-gray-900">{item.product.name}</span>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, -1)}
                                                    className="p-1 border rounded hover:bg-gray-100"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value)
                                                        if (!isNaN(val)) setQuantity(item.product.id, val)
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-14 text-center text-gray-900 font-medium border rounded px-1 py-0.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, 1)}
                                                    className="p-1 border rounded hover:bg-gray-100"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatCurrency(item.product.price * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-3">
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Catatan (opsional)"
                                        className="w-full px-3 py-2 border rounded-lg text-sm resize-none text-gray-900 placeholder-gray-500"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t">
                                    <span className="font-semibold text-gray-900">Total</span>
                                    <span className="text-lg font-bold text-orange-600">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || cart.length === 0}
                                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {submitting ? "Memproses..." : "Kirim Order"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
