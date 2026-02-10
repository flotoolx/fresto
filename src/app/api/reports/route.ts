import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET comprehensive reports
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !["PUSAT", "FINANCE", "DC", "FINANCE_DC", "FINANCE_ALL"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const reportType = searchParams.get("type") || "summary"
        const period = parseInt(searchParams.get("period") || "30")
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
        const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null

        // Support custom date range
        const customDateFrom = searchParams.get("dateFrom")
        const customDateTo = searchParams.get("dateTo")

        let dateFrom: Date
        let dateTo: Date | undefined

        if (customDateFrom && customDateTo) {
            dateFrom = new Date(customDateFrom)
            dateTo = new Date(customDateTo)
            dateTo.setHours(23, 59, 59, 999) // End of day
        } else {
            dateFrom = new Date()
            dateFrom.setDate(dateFrom.getDate() - period)
        }

        switch (reportType) {
            case "monthly-sales":
                return await getMonthlySalesReport(year)
            case "top-products":
                return await getTopProductsReport(dateFrom, dateTo)
            case "stokis-performance":
                return await getStokisPerformanceReport(dateFrom, dateTo)
            case "invoice-aging":
                return await getInvoiceAgingReport()
            case "summary":
            default:
                return await getSummaryReport(dateFrom, dateTo, period)
        }
    } catch (error) {
        console.error("Error fetching reports:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// Summary Report
async function getSummaryReport(dateFrom: Date, dateTo: Date | undefined, period: number) {
    // Build date filter
    const dateFilter = dateTo
        ? { gte: dateFrom, lte: dateTo }
        : { gte: dateFrom }

    // Orders summary
    const stokisOrders = await prisma.stokisOrder.findMany({
        where: { createdAt: dateFilter },
        include: { stokis: { select: { name: true } } }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: { createdAt: dateFilter },
        include: { mitra: { select: { name: true } } }
    })

    // Revenue calculations
    const totalStokisRevenue = stokisOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const totalMitraRevenue = mitraOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

    // DC Revenue is from Stokis orders (DC sells to Stokis)
    const totalDcRevenue = totalStokisRevenue

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
    const totalDc = await prisma.user.count({ where: { role: "DC", isActive: true } })

    return NextResponse.json({
        period,
        summary: {
            stokisOrders: stokisOrders.length,
            mitraOrders: mitraOrders.length,
            totalStokisRevenue,
            totalMitraRevenue,
            totalDcRevenue,
            totalRevenue: totalStokisRevenue + totalMitraRevenue
        },
        users: {
            totalStokis,
            activeStokis,
            inactiveStokis: totalStokis - activeStokis,
            totalMitra,
            activeMitra,
            inactiveMitra: totalMitra - activeMitra,
            totalDc
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
async function getTopProductsReport(dateFrom: Date, dateTo?: Date) {
    const dateFilter = dateTo
        ? { gte: dateFrom, lte: dateTo }
        : { gte: dateFrom }

    // Get all order items
    const stokisItems = await prisma.stokisOrderItem.findMany({
        where: { order: { createdAt: dateFilter } },
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } }
    })

    const mitraItems = await prisma.mitraOrderItem.findMany({
        where: { order: { createdAt: dateFilter } },
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

// Stokis Performance Report - Now includes DC and Mitra data
async function getStokisPerformanceReport(dateFrom: Date, dateTo?: Date) {
    const dateFilter = dateTo
        ? { gte: dateFrom, lte: dateTo }
        : { gte: dateFrom }

    const stokisOrders = await prisma.stokisOrder.findMany({
        where: { createdAt: dateFilter },
        include: {
            stokis: { select: { id: true, name: true, address: true, phone: true } }
        }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: { createdAt: dateFilter },
        include: {
            stokis: { select: { id: true, name: true } },
            mitra: { select: { id: true, name: true, address: true, phone: true } }
        }
    })

    // Aggregate by stokis (existing logic)
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

    // Calculate totals for stokis
    const stokisRankings = Object.values(stokisStats).map(s => ({
        ...s,
        totalRevenue: s.revenueToPusat + s.revenueFromMitra,
        mitraCount: s.mitraList.size,
        mitraList: undefined
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // DC Performance: Revenue from Stokis orders (DC/Pusat sells to Stokis)
    // Since we don't have separate DC entities, we show aggregate DC stats
    const dcPerformance = [{
        dcId: "pusat",
        dcName: "PUSAT / DC",
        address: null,
        ordersToStokis: stokisOrders.length,
        totalRevenue: stokisOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
        stokisCount: new Set(stokisOrders.map(o => o.stokisId)).size
    }]

    // Mitra Performance: Aggregate orders by Mitra
    const mitraStats: Record<string, {
        mitraId: string
        mitraName: string
        address: string | null
        ordersToStokis: number
        totalRevenue: number
        stokisName: string
    }> = {}

    for (const order of mitraOrders) {
        const key = order.mitraId
        if (!mitraStats[key]) {
            mitraStats[key] = {
                mitraId: order.mitraId,
                mitraName: order.mitra.name,
                address: order.mitra.address,
                ordersToStokis: 0,
                totalRevenue: 0,
                stokisName: order.stokis.name
            }
        }
        mitraStats[key].ordersToStokis++
        mitraStats[key].totalRevenue += Number(order.totalAmount)
    }

    const mitraRankings = Object.values(mitraStats).sort((a, b) => b.totalRevenue - a.totalRevenue)

    return NextResponse.json({
        stokisPerformance: stokisRankings,
        dcPerformance: dcPerformance,
        mitraPerformance: mitraRankings,
        totalStokis: stokisRankings.length,
        totalDc: dcPerformance.length,
        totalMitra: mitraRankings.length
    })
}

// Invoice Aging Report - Categorized by DC/Stokis with aging buckets
async function getInvoiceAgingReport() {
    // Fetch ALL invoices (including paid) for complete reporting
    const allInvoices = await prisma.invoice.findMany({
        include: {
            order: {
                include: {
                    stokis: { select: { id: true, name: true, email: true, phone: true, role: true } }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    const now = new Date()

    // Separate paid vs unpaid
    const paidInvoices = allInvoices.filter(inv => inv.status === "PAID")
    const unpaidInvoices = allInvoices.filter(inv => inv.status !== "PAID")

    // Calculate aging for unpaid invoices
    const invoicesWithAging = unpaidInvoices.map(inv => {
        const dueDate = new Date(inv.dueDate)
        const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        let agingCategory: string
        if (daysDiff < 0) {
            agingCategory = "belum_jatuh_tempo"
        } else if (daysDiff <= 7) {
            agingCategory = "1_7_hari"
        } else if (daysDiff <= 30) {
            agingCategory = "8_30_hari"
        } else {
            agingCategory = "30_plus"
        }

        return {
            ...inv,
            daysDiff,
            agingCategory
        }
    })

    // Categorize by type (DC vs Stokis) - for now all are Stokis
    const dcInvoices = invoicesWithAging.filter(inv => false) // DC invoices not implemented yet
    const stokisInvoices = invoicesWithAging

    // Calculate aging buckets
    const agingBuckets = {
        belum_jatuh_tempo: { count: 0, amount: 0, invoices: [] as typeof invoicesWithAging },
        "1_7_hari": { count: 0, amount: 0, invoices: [] as typeof invoicesWithAging },
        "8_30_hari": { count: 0, amount: 0, invoices: [] as typeof invoicesWithAging },
        "30_plus": { count: 0, amount: 0, invoices: [] as typeof invoicesWithAging }
    }

    for (const inv of invoicesWithAging) {
        const bucket = agingBuckets[inv.agingCategory as keyof typeof agingBuckets]
        if (bucket) {
            bucket.count++
            bucket.amount += Number(inv.amount)
            bucket.invoices.push(inv)
        }
    }

    // Summary for 3 cards: Total, Belum Dibayar, Lunas
    const summary = {
        // Legacy fields for backward compatibility
        dcCount: dcInvoices.length,
        dcAmount: dcInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
        stokisCount: stokisInvoices.length,
        stokisAmount: stokisInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
        totalInvoices: unpaidInvoices.length,
        totalOutstanding: unpaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0),

        // New fields for simplified 3-card view
        totalPoCount: allInvoices.length,
        totalPoAmount: allInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
        unpaidCount: unpaidInvoices.length,
        unpaidAmount: unpaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
        paidCount: paidInvoices.length,
        paidAmount: paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0)
    }

    const agingSummary = {
        belum_jatuh_tempo: { count: agingBuckets.belum_jatuh_tempo.count, amount: agingBuckets.belum_jatuh_tempo.amount },
        "1_7_hari": { count: agingBuckets["1_7_hari"].count, amount: agingBuckets["1_7_hari"].amount },
        "8_30_hari": { count: agingBuckets["8_30_hari"].count, amount: agingBuckets["8_30_hari"].amount },
        "30_plus": { count: agingBuckets["30_plus"].count, amount: agingBuckets["30_plus"].amount }
    }

    // Format paid invoices with 'lunas' category
    const paidInvoicesWithStatus = paidInvoices.map(inv => ({
        ...inv,
        daysDiff: 0,
        agingCategory: "lunas"
    }))

    // Combine all invoices for table display
    const allStokisInvoices = [...stokisInvoices, ...paidInvoicesWithStatus]

    return NextResponse.json({
        summary,
        agingSummary,
        details: {
            dc: dcInvoices.map(formatInvoiceWithAging),
            stokis: allStokisInvoices.map(formatInvoiceWithAging)
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

function formatInvoiceWithAging(inv: {
    id: string
    invoiceNumber: string
    amount: unknown
    dueDate: Date
    status: string
    daysDiff: number
    agingCategory: string
    order: {
        orderNumber: string
        createdAt: Date
        stokis: { name: string; email: string; phone: string | null }
    }
}) {
    return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderNumber: inv.order.orderNumber,
        orderCreatedAt: inv.order.createdAt,
        stokisName: inv.order.stokis.name,
        stokisPhone: inv.order.stokis.phone,
        amount: Number(inv.amount),
        dueDate: inv.dueDate,
        daysDiff: inv.daysDiff,
        agingCategory: inv.agingCategory,
        status: inv.status
    }
}

