"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import PushNotificationButton from "@/components/PushNotificationButton"
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    BarChart3,
    Warehouse,
    LogOut,
    Menu,
    X,
    Receipt,
    Store,
    HelpCircle,
    CreditCard,
    FileText,
    FileSpreadsheet
} from "lucide-react"
import { useState } from "react"

const roleMenus: Record<string, { label: string; href: string; icon: React.ReactNode }[]> = {
    PUSAT: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Users", href: "/dashboard/users", icon: <Users size={20} /> },
        { label: "Produk", href: "/dashboard/products", icon: <Package size={20} /> },
        { label: "Gudang", href: "/dashboard/gudang", icon: <Warehouse size={20} /> },
        { label: "Order Stokis", href: "/dashboard/orders-stokis", icon: <ShoppingCart size={20} /> },
        { label: "Laporan", href: "/dashboard/reports", icon: <BarChart3 size={20} /> },
    ],
    FINANCE: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Approve PO", href: "/dashboard/approve-po", icon: <ShoppingCart size={20} /> },
        { label: "Pembayaran", href: "/dashboard/pembayaran", icon: <CreditCard size={20} /> },
        { label: "Tagihan", href: "/dashboard/tagihan", icon: <FileText size={20} /> },
        { label: "Invoices", href: "/dashboard/invoices", icon: <Receipt size={20} /> },
        { label: "Laporan Harga", href: "/dashboard/laporan-harga", icon: <FileSpreadsheet size={20} /> },
        { label: "Laporan", href: "/dashboard/reports", icon: <BarChart3 size={20} /> },
    ],
    GUDANG: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Inventory", href: "/dashboard/inventory", icon: <Package size={20} /> },
        { label: "PO Masuk", href: "/dashboard/po-masuk", icon: <ShoppingCart size={20} /> },
    ],
    STOKIS: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Order ke Pusat", href: "/dashboard/order-pusat", icon: <ShoppingCart size={20} /> },
        { label: "Riwayat Order", href: "/dashboard/history-pusat", icon: <Receipt size={20} /> },
        { label: "Order Mitra", href: "/dashboard/order-mitra", icon: <Store size={20} /> },
        { label: "Inventory", href: "/dashboard/inventory", icon: <Package size={20} /> },
        { label: "Mitra Saya", href: "/dashboard/mitra", icon: <Users size={20} /> },
    ],
    MITRA: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Order Barang", href: "/dashboard/order", icon: <ShoppingCart size={20} /> },
        { label: "Riwayat Order", href: "/dashboard/history", icon: <Receipt size={20} /> },
    ],
    DC: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Kelola Stokis", href: "/dashboard/dc-stokis", icon: <Store size={20} /> },
        { label: "Monitoring Order", href: "/dashboard/dc-orders", icon: <ShoppingCart size={20} /> },
        { label: "Laporan", href: "/dashboard/reports", icon: <BarChart3 size={20} /> },
    ],
}

const roleAccentColors: Record<string, string> = {
    PUSAT: "bg-blue-500",
    FINANCE: "bg-purple-500",
    GUDANG: "bg-cyan-500",
    STOKIS: "bg-emerald-500",
    MITRA: "bg-orange-500",
    DC: "bg-indigo-500",
}

export default function Sidebar() {
    const { data: session } = useSession()
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)

    const role = session?.user?.role || "MITRA"
    const menus = roleMenus[role] || roleMenus.MITRA
    const accentColor = roleAccentColors[role] || "bg-blue-500"

    const handleLogout = () => {
        signOut({ callbackUrl: "/login" })
    }

    const SidebarContent = () => (
        <div className="h-full flex flex-col bg-white border-r border-gray-100">
            {/* Logo Header */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${accentColor} rounded-xl flex items-center justify-center shadow-lg`}>
                        <span className="text-xl">🍗</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 tracking-tight">D&apos;Fresto</h1>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 px-4 pb-4 overflow-y-auto">
                <ul className="space-y-1">
                    {menus.map((menu) => {
                        const isActive = pathname === menu.href
                        return (
                            <li key={menu.href}>
                                <Link
                                    href={menu.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? `${accentColor} text-white font-medium shadow-md`
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                >
                                    <span className={isActive ? "text-white" : "text-gray-400"}>
                                        {menu.icon}
                                    </span>
                                    <span className="text-sm">{menu.label}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-100 space-y-2">
                {/* Push Notification */}
                <PushNotificationButton className="w-full justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm rounded-xl" />

                {/* Contact Support */}
                <button className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                    <HelpCircle size={20} className="text-gray-400" />
                    <span className="text-sm">Bantuan</span>
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                    <LogOut size={20} />
                    <span className="text-sm font-medium">Keluar</span>
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* Hamburger Toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all lg:hidden"
                aria-label="Toggle Menu"
            >
                {mobileOpen ? <X size={22} className="text-gray-700" /> : <Menu size={22} className="text-gray-700" />}
            </button>

            {/* Desktop hamburger for sidebar toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="hidden lg:flex fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100"
                aria-label="Toggle Menu"
            >
                <Menu size={20} className="text-gray-600" />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 z-40 transform transition-transform duration-300 ease-out shadow-2xl lg:shadow-lg ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <SidebarContent />
            </aside>
        </>
    )
}
