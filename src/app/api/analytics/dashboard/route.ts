import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!["PUSAT", "FINANCE"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get("start")
        const endDate = searchParams.get("end")

        // Parse dates
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default 30 days ago
        const end = endDate ? new Date(endDate) : new Date()
        end.setHours(23, 59, 59, 999) // End of day

        // Base date filter for orders
        const dateFilter = {
            createdAt: {
                gte: start,
                lte: end,
            }
        }

        // Fetch all stats in parallel
        const [
            totalMitra,
            totalStokis,
            totalDC,
            totalGudang,
            pendingOrders,
            dcInvoices,
            stokisInvoices,
            dcOutstanding,
            stokisOutstanding,
        ] = await Promise.all([
            // User counts (not filtered by date - total active)
            prisma.user.count({ where: { role: "MITRA", isActive: true } }),
            prisma.user.count({ where: { role: "STOKIS", isActive: true } }),
            prisma.user.count({ where: { role: "DC", isActive: true } }),
            prisma.gudang.count({ where: { isActive: true } }),

            // Pending orders (status filter, optionally date)
            prisma.stokisOrder.count({
                where: {
                    status: "PENDING_PUSAT",
                    ...dateFilter,
                }
            }),

            // Invoice counts by type - DC (future: when DC has invoices)
            // For now, return 0 as DC invoices are not implemented yet
            Promise.resolve(0),

            // Stokis invoices
            prisma.invoice.count({
                where: dateFilter
            }),

            // Outstanding DC (placeholder for future)
            Promise.resolve({ count: 0, amount: 0 }),

            // Outstanding Stokis
            prisma.invoice.aggregate({
                where: {
                    status: { in: ["UNPAID", "OVERDUE"] },
                },
                _count: true,
                _sum: { amount: true }
            }),
        ])

        // Calculate revenue (simplified - based on completed orders)
        const completedOrders = await prisma.stokisOrder.findMany({
            where: {
                status: "RECEIVED",
                ...dateFilter,
            },
            select: { totalAmount: true }
        })

        const stokisRevenue = completedOrders.reduce(
            (sum, order) => sum + Number(order.totalAmount),
            0
        )

        return NextResponse.json({
            totalMitra,
            totalStokis,
            totalDC,
            totalGudang,
            pendingOrders,
            revenue: {
                dc: 0, // Placeholder
                stokis: stokisRevenue,
                mitra: 0, // Calculated from mitra orders if needed
            },
            invoiceCount: {
                dc: dcInvoices,
                stokis: stokisInvoices,
                mitra: 0, // Mitra doesn't have invoices in current model
            },
            outstanding: {
                dc: dcOutstanding,
                stokis: {
                    count: stokisOutstanding._count || 0,
                    amount: Number(stokisOutstanding._sum?.amount || 0),
                }
            },
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
            }
        })
    } catch (error) {
        console.error("Error fetching dashboard analytics:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
