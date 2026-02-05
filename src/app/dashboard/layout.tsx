import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Sidebar from "@/components/dashboard/Sidebar"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />

            {/* Top Header Bar - with left margin for fixed sidebar on desktop */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-30 flex items-center justify-between px-6 lg:pl-80 lg:pr-8">
                <div className="flex items-center gap-4 ml-14 lg:ml-0">
                    <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
                        D&apos;Fresto Dashboard
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-700">{session.user?.name}</p>
                            <p className="text-xs text-gray-500">{session.user?.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {session.user?.name?.[0] || "U"}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - with left margin for fixed sidebar on desktop */}
            <main className="pt-20 px-4 lg:pl-80 lg:pr-8 pb-8 min-h-screen">
                <div className="max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}
