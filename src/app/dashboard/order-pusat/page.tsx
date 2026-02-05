"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Check } from "lucide-react"

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

export default function StokisOrderPusatPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchProducts()
    }, [])

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

        // Visual feedback for mobile
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
            const res = await fetch("/api/orders/stokis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart.map((item) => ({
                        productId: item.product.id,
                        quantity: item.quantity,
                    })),
                    notes,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Gagal membuat order")
            }

            setSuccess(true)
            setCart([])
            setNotes("")
            setTimeout(() => {
                router.push("/dashboard")
            }, 2000)
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
                <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Order Berhasil Dibuat!</h2>
                <p className="text-gray-500">Menunggu persetujuan dari Pusat...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="text-green-600" />
                    <h1 className="text-xl font-bold text-gray-800">Order ke Pusat</h1>
                </div>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 font-medium"
                >
                    <ArrowLeft size={16} />
                    Kembali
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Product List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4">Pilih Produk</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="border rounded-lg p-4 hover:border-green-300 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-medium text-gray-800">{product.name}</h3>
                                            <p className="text-xs text-gray-500">{product.sku}</p>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                            {product.gudang.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <div>
                                            <span className="text-green-600 font-semibold">
                                                {formatCurrency(product.price)}
                                            </span>
                                            <span className="text-gray-500 text-sm">/{product.unit}</span>
                                        </div>
                                        <button
                                            onClick={() => addToCart(product)}
                                            className={`p-2 rounded-lg transition-all duration-300 ${recentlyAdded.has(product.id)
                                                    ? "bg-emerald-500 text-white scale-110"
                                                    : "bg-green-500 text-white hover:bg-green-600"
                                                }`}
                                        >
                                            {recentlyAdded.has(product.id) ? <Check size={18} /> : <Plus size={18} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                                <span className="w-8 text-center text-gray-900 font-medium">{item.quantity}</span>
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
                                    <span className="text-lg font-bold text-green-600">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || cart.length === 0}
                                    className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {submitting ? "Memproses..." : "Kirim Order ke Pusat"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
