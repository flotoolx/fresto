import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET comprehensive reports
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !["PUSAT", "FINANCE"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const reportType = searchParams.get("type") || "summary"
        const period = parseInt(searchParams.get("period") || "30")
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
        const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null

        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - period)

        switch (reportType) {
            case "monthly-sales":
                return await getMonthlySalesReport(year)
            case "top-products":
                return await getTopProductsReport(dateFrom)
            case "stokis-performance":
                return await getStokisPerformanceReport(dateFrom)
            case "invoice-aging":
                return await getInvoiceAgingReport()
            case "summary":
            default:
                return await getSummaryReport(dateFrom, period)
        }
    } catch (error) {
        console.error("Error fetching reports:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// Summary Report
async function getSummaryReport(dateFrom: Date, period: number) {
    // Orders summary
    const stokisOrders = await prisma.stokisOrder.findMany({
        where: { createdAt: { gte: dateFrom } },
        include: { stokis: { select: { name: true } } }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: { createdAt: { gte: dateFrom } },
        include: { mitra: { select: { name: true } } }
    })

    // Revenue calculations
    const totalStokisRevenue = stokisOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const totalMitraRevenue = mitraOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

    // Order status breakdown
    const stokisStatusCounts = stokisOrders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    // Active users
    const activeStokis = new Set(stokisOrders.map(o => o.stokisId)).size
    const activeMitra = new Set(mitraOrders.map(o => o.mitraId)).size
    const totalStokis = await prisma.user.count({ where: { role: "STOKIS", isActive: true } })
    const totalMitra = await prisma.user.count({ where: { role: "MITRA", isActive: true } })

    return NextResponse.json({
        period,
        summary: {
            stokisOrders: stokisOrders.length,
            mitraOrders: mitraOrders.length,
            totalStokisRevenue,
            totalMitraRevenue,
            totalRevenue: totalStokisRevenue + totalMitraRevenue
        },
        users: {
            totalStokis,
            activeStokis,
            inactiveStokis: totalStokis - activeStokis,
            totalMitra,
            activeMitra,
            inactiveMitra: totalMitra - activeMitra
        },
        orderStatus: stokisStatusCounts
    })
}

// Monthly Sales Report
async function getMonthlySalesReport(year: number) {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const stokisOrders = await prisma.stokisOrder.findMany({
        where: {
            createdAt: { gte: startOfYear, lte: endOfYear }
        }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: {
            createdAt: { gte: startOfYear, lte: endOfYear }
        }
    })

    // Aggregate by month
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(year, i).toLocaleDateString("id-ID", { month: "long" }),
        stokisOrders: 0,
        stokisRevenue: 0,
        mitraOrders: 0,
        mitraRevenue: 0,
        totalOrders: 0,
        totalRevenue: 0
    }))

    for (const order of stokisOrders) {
        const monthIdx = order.createdAt.getMonth()
        monthlyData[monthIdx].stokisOrders++
        monthlyData[monthIdx].stokisRevenue += Number(order.totalAmount)
        monthlyData[monthIdx].totalOrders++
        monthlyData[monthIdx].totalRevenue += Number(order.totalAmount)
    }

    for (const order of mitraOrders) {
        const monthIdx = order.createdAt.getMonth()
        monthlyData[monthIdx].mitraOrders++
        monthlyData[monthIdx].mitraRevenue += Number(order.totalAmount)
        monthlyData[monthIdx].totalOrders++
        monthlyData[monthIdx].totalRevenue += Number(order.totalAmount)
    }

    const totals = monthlyData.reduce((acc, m) => ({
        totalOrders: acc.totalOrders + m.totalOrders,
        totalRevenue: acc.totalRevenue + m.totalRevenue,
        stokisOrders: acc.stokisOrders + m.stokisOrders,
        mitraOrders: acc.mitraOrders + m.mitraOrders
    }), { totalOrders: 0, totalRevenue: 0, stokisOrders: 0, mitraOrders: 0 })

    return NextResponse.json({
        year,
        months: monthlyData,
        totals
    })
}

// Top Products Report
async function getTopProductsReport(dateFrom: Date) {
    // Get all order items
    const stokisItems = await prisma.stokisOrderItem.findMany({
        where: { order: { createdAt: { gte: dateFrom } } },
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } }
    })

    const mitraItems = await prisma.mitraOrderItem.findMany({
        where: { order: { createdAt: { gte: dateFrom } } },
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } }
    })

    // Aggregate by product
    const productStats: Record<string, {
        productId: string
        productName: string
        sku: string
        unit: string
        totalQty: number
        totalRevenue: number
        orderCount: number
    }> = {}

    for (const item of [...stokisItems, ...mitraItems]) {
        const key = item.productId
        if (!productStats[key]) {
            productStats[key] = {
                productId: item.productId,
                productName: item.product.name,
                sku: item.product.sku,
                unit: item.product.unit,
                totalQty: 0,
                totalRevenue: 0,
                orderCount: 0
            }
        }
        productStats[key].totalQty += item.quantity
        productStats[key].totalRevenue += Number(item.price) * item.quantity
        productStats[key].orderCount++
    }

    const rankings = Object.values(productStats)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20)

    return NextResponse.json({
        topProducts: rankings,
        totalProducts: Object.keys(productStats).length
    })
}

// Stokis Performance Report
async function getStokisPerformanceReport(dateFrom: Date) {
    const stokisOrders = await prisma.stokisOrder.findMany({
        where: { createdAt: { gte: dateFrom } },
        include: {
            stokis: { select: { id: true, name: true, address: true, phone: true } }
        }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: { createdAt: { gte: dateFrom } },
        include: {
            stokis: { select: { id: true, name: true } }
        }
    })

    // Aggregate by stokis
    const stokisStats: Record<string, {
        stokisId: string
        stokisName: string
        address: string | null
        phone: string | null
        ordersToPusat: number
        ordersFromMitra: number
        revenueToPusat: number
        revenueFromMitra: number
        totalRevenue: number
        mitraCount: number
        mitraList: Set<string>
    }> = {}

    // Count orders to pusat
    for (const order of stokisOrders) {
        const key = order.stokisId
        if (!stokisStats[key]) {
            stokisStats[key] = {
                stokisId: order.stokisId,
                stokisName: order.stokis.name,
                address: order.stokis.address,
                phone: order.stokis.phone,
                ordersToPusat: 0,
                ordersFromMitra: 0,
                revenueToPusat: 0,
                revenueFromMitra: 0,
                totalRevenue: 0,
                mitraCount: 0,
                mitraList: new Set()
            }
        }
        stokisStats[key].ordersToPusat++
        stokisStats[key].revenueToPusat += Number(order.totalAmount)
    }

    // Count orders from mitra
    for (const order of mitraOrders) {
        const key = order.stokisId
        if (!stokisStats[key]) {
            stokisStats[key] = {
                stokisId: order.stokisId,
                stokisName: order.stokis.name,
                address: null,
                phone: null,
                ordersToPusat: 0,
                ordersFromMitra: 0,
                revenueToPusat: 0,
                revenueFromMitra: 0,
                totalRevenue: 0,
                mitraCount: 0,
                mitraList: new Set()
            }
        }
        stokisStats[key].ordersFromMitra++
        stokisStats[key].revenueFromMitra += Number(order.totalAmount)
        stokisStats[key].mitraList.add(order.mitraId)
    }

    // Calculate totals
    const rankings = Object.values(stokisStats).map(s => ({
        ...s,
        totalRevenue: s.revenueToPusat + s.revenueFromMitra,
        mitraCount: s.mitraList.size,
        mitraList: undefined
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)

    return NextResponse.json({
        stokisPerformance: rankings,
        totalStokis: rankings.length
    })
}

// Invoice Aging Report - Categorized by DC/Stokis
async function getInvoiceAgingReport() {
    const invoices = await prisma.invoice.findMany({
        where: { status: { in: ["UNPAID", "OVERDUE"] } },
        include: {
            order: {
                include: {
                    stokis: { select: { id: true, name: true, email: true, phone: true, role: true } }
                }
            }
        },
        orderBy: { dueDate: "asc" }
    })

    // Categorize by type (DC vs Stokis)
    // For now, all invoices are from Stokis since DC invoice system is not implemented yet
    // In the future, DC invoices can be identified by order type or a separate field
    const dcInvoices = invoices.filter(inv => {
        // Placeholder: DC invoices would be identified differently
        // For now, return empty array as DC invoice system is not implemented
        return false
    })

    const stokisInvoices = invoices.filter(inv => {
        // All current invoices are from Stokis orders
        return true
    })

    const summary = {
        dcCount: dcInvoices.length,
        dcAmount: dcInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
        stokisCount: stokisInvoices.length,
        stokisAmount: stokisInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
        totalInvoices: invoices.length,
        totalOutstanding: invoices.reduce((sum, i) => sum + Number(i.amount), 0)
    }

    return NextResponse.json({
        summary,
        details: {
            dc: dcInvoices.map(formatInvoice),
            stokis: stokisInvoices.map(formatInvoice)
        }
    })
}

function formatInvoice(inv: {
    id: string
    invoiceNumber: string
    amount: unknown
    dueDate: Date
    status: string
    order: {
        orderNumber: string
        stokis: { name: string; email: string; phone: string | null }
    }
}) {
    const now = new Date()
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderNumber: inv.order.orderNumber,
        stokisName: inv.order.stokis.name,
        stokisPhone: inv.order.stokis.phone,
        amount: Number(inv.amount),
        dueDate: inv.dueDate,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        status: inv.status
    }
}
