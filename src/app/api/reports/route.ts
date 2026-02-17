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

        // Build area filter for DC and FINANCE_DC
        const userRole = session.user.role
        const userId = session.user.id
        const dcId = session.user.dcId
        let stokisFilter: Record<string, unknown> = {}

        if (userRole === "DC") {
            stokisFilter = { stokis: { dcId: userId } }
        } else if (userRole === "FINANCE_DC" && dcId) {
            stokisFilter = { stokis: { dcId: dcId } }
        }

        switch (reportType) {
            case "monthly-sales":
                return await getMonthlySalesReport(year, stokisFilter)
            case "top-products":
                return await getTopProductsReport(dateFrom, dateTo, stokisFilter)
            case "stokis-performance":
                return await getStokisPerformanceReport(dateFrom, dateTo, stokisFilter)
            case "invoice-aging":
                return await getInvoiceAgingReport(stokisFilter, dateFrom, dateTo)
            case "summary":
            default:
                return await getSummaryReport(dateFrom, dateTo, period, stokisFilter)
        }
    } catch (error) {
        console.error("Error fetching reports:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// Summary Report
async function getSummaryReport(dateFrom: Date, dateTo: Date | undefined, period: number, stokisFilter: Record<string, unknown> = {}) {
    // Build date filter
    const dateFilter = dateTo
        ? { gte: dateFrom, lte: dateTo }
        : { gte: dateFrom }

    // Build area-aware filters
    const hasAreaFilter = Object.keys(stokisFilter).length > 0
    const userAreaFilter = hasAreaFilter
        ? { dcId: (stokisFilter.stokis as { dcId: string })?.dcId }
        : {}
    // Mitra area filter: filter mitra orders by stokis DC area
    const mitraAreaFilter = hasAreaFilter
        ? { stokis: { dcId: (stokisFilter.stokis as { dcId: string })?.dcId } }
        : {}

    // Orders summary
    const stokisOrders = await prisma.stokisOrder.findMany({
        where: { createdAt: dateFilter, ...stokisFilter },
        include: { stokis: { select: { name: true } } }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: { createdAt: dateFilter, ...mitraAreaFilter },
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
    const totalStokis = await prisma.user.count({ where: { role: "STOKIS", isActive: true, ...userAreaFilter } })
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
async function getMonthlySalesReport(year: number, stokisFilter: Record<string, unknown> = {}) {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    // Build mitra area filter from stokisFilter
    const hasAreaFilter = Object.keys(stokisFilter).length > 0
    const mitraAreaFilter = hasAreaFilter
        ? { stokis: { dcId: (stokisFilter.stokis as { dcId: string })?.dcId } }
        : {}

    const stokisOrders = await prisma.stokisOrder.findMany({
        where: {
            createdAt: { gte: startOfYear, lte: endOfYear },
            ...stokisFilter
        }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: {
            createdAt: { gte: startOfYear, lte: endOfYear },
            ...mitraAreaFilter
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
async function getTopProductsReport(dateFrom: Date, dateTo?: Date, stokisFilter: Record<string, unknown> = {}) {
    const dateFilter = dateTo
        ? { gte: dateFrom, lte: dateTo }
        : { gte: dateFrom }

    // Build mitra area filter from stokisFilter
    const hasAreaFilter = Object.keys(stokisFilter).length > 0
    const mitraAreaFilter = hasAreaFilter
        ? { stokis: { dcId: (stokisFilter.stokis as { dcId: string })?.dcId } }
        : {}

    // Get all order items
    const stokisItems = await prisma.stokisOrderItem.findMany({
        where: { order: { createdAt: dateFilter, ...stokisFilter } },
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } }
    })

    const mitraItems = await prisma.mitraOrderItem.findMany({
        where: { order: { createdAt: dateFilter, ...mitraAreaFilter } },
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

// Stokis Performance Report - Now includes DC and Mitra data with product breakdown
async function getStokisPerformanceReport(dateFrom: Date, dateTo?: Date, stokisFilter: Record<string, unknown> = {}) {
    const dateFilter = dateTo
        ? { gte: dateFrom, lte: dateTo }
        : { gte: dateFrom }

    // Build mitra area filter from stokisFilter
    const hasAreaFilter = Object.keys(stokisFilter).length > 0
    const mitraAreaFilter = hasAreaFilter
        ? { stokis: { dcId: (stokisFilter.stokis as { dcId: string })?.dcId } }
        : {}

    const stokisOrders = await prisma.stokisOrder.findMany({
        where: { createdAt: dateFilter, ...stokisFilter },
        include: {
            stokis: { select: { id: true, name: true, address: true, phone: true, uniqueCode: true } },
            items: { include: { product: { select: { name: true, sku: true, unit: true } } } }
        }
    })

    const mitraOrders = await prisma.mitraOrder.findMany({
        where: { createdAt: dateFilter, ...mitraAreaFilter },
        include: {
            stokis: { select: { id: true, name: true, uniqueCode: true } },
            mitra: { select: { id: true, name: true, address: true, phone: true, uniqueCode: true } },
            items: { include: { product: { select: { name: true, sku: true, unit: true } } } }
        }
    })

    // Helper: aggregate product stats
    type ProductStat = { productName: string; sku: string; unit: string; totalQty: number; totalRevenue: number }
    const aggregateProducts = (items: { quantity: number; price: unknown; product: { name: string; sku: string; unit: string } }[]) => {
        const map: Record<string, ProductStat> = {}
        for (const item of items) {
            const key = item.product.sku
            if (!map[key]) {
                map[key] = { productName: item.product.name, sku: key, unit: item.product.unit, totalQty: 0, totalRevenue: 0 }
            }
            map[key].totalQty += item.quantity
            map[key].totalRevenue += item.quantity * Number(item.price)
        }
        return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue)
    }

    // Aggregate by stokis
    const stokisStats: Record<string, {
        stokisId: string
        stokisName: string
        uniqueCode: string | null
        address: string | null
        phone: string | null
        ordersToPusat: number
        ordersFromMitra: number
        revenueToPusat: number
        revenueFromMitra: number
        totalRevenue: number
        mitraCount: number
        mitraList: Set<string>
        allItems: { quantity: number; price: unknown; product: { name: string; sku: string; unit: string } }[]
    }> = {}

    // Count orders to pusat
    for (const order of stokisOrders) {
        const key = order.stokisId
        if (!stokisStats[key]) {
            stokisStats[key] = {
                stokisId: order.stokisId,
                stokisName: order.stokis.name,
                uniqueCode: order.stokis.uniqueCode,
                address: order.stokis.address,
                phone: order.stokis.phone,
                ordersToPusat: 0,
                ordersFromMitra: 0,
                revenueToPusat: 0,
                revenueFromMitra: 0,
                totalRevenue: 0,
                mitraCount: 0,
                mitraList: new Set(),
                allItems: []
            }
        }
        stokisStats[key].ordersToPusat++
        stokisStats[key].revenueToPusat += Number(order.totalAmount)
        stokisStats[key].allItems.push(...order.items)
    }

    // Count orders from mitra
    for (const order of mitraOrders) {
        const key = order.stokisId
        if (!stokisStats[key]) {
            stokisStats[key] = {
                stokisId: order.stokisId,
                stokisName: order.stokis.name,
                uniqueCode: order.stokis.uniqueCode,
                address: null,
                phone: null,
                ordersToPusat: 0,
                ordersFromMitra: 0,
                revenueToPusat: 0,
                revenueFromMitra: 0,
                totalRevenue: 0,
                mitraCount: 0,
                mitraList: new Set(),
                allItems: []
            }
        }
        stokisStats[key].ordersFromMitra++
        stokisStats[key].revenueFromMitra += Number(order.totalAmount)
        stokisStats[key].mitraList.add(order.mitraId)
    }

    // Calculate totals for stokis with products
    const stokisRankings = Object.values(stokisStats).map(s => ({
        stokisId: s.stokisId,
        stokisName: s.stokisName,
        uniqueCode: s.uniqueCode,
        address: s.address,
        phone: s.phone,
        ordersToPusat: s.ordersToPusat,
        ordersFromMitra: s.ordersFromMitra,
        revenueToPusat: s.revenueToPusat,
        revenueFromMitra: s.revenueFromMitra,
        totalRevenue: s.revenueToPusat + s.revenueFromMitra,
        mitraCount: s.mitraList.size,
        products: aggregateProducts(s.allItems)
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // DC Performance with products
    // Fetch DCs that have stokis
    const dcUsers = hasAreaFilter ? [] : await prisma.user.findMany({
        where: { role: "DC", isActive: true },
        select: { id: true, name: true, uniqueCode: true, phone: true, address: true }
    })

    // Build DC performance from actual DC users
    const allDcItems: { quantity: number; price: unknown; product: { name: string; sku: string; unit: string } }[] = []
    for (const order of stokisOrders) {
        allDcItems.push(...order.items)
    }

    let dcPerformance
    if (hasAreaFilter) {
        // For DC/FINANCE_DC, show single aggregate
        dcPerformance = [{
            dcId: "area",
            dcName: "DC Area",
            uniqueCode: null as string | null,
            phone: null as string | null,
            address: null as string | null,
            ordersToStokis: stokisOrders.length,
            totalRevenue: stokisOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
            stokisCount: new Set(stokisOrders.map(o => o.stokisId)).size,
            mitraCount: new Set(mitraOrders.map(o => o.mitraId)).size,
            products: aggregateProducts(allDcItems)
        }]
    } else {
        // For PUSAT/FINANCE, show per-DC breakdown
        const dcStokisMap: Record<string, string[]> = {}
        const dcStokisList = await prisma.user.findMany({
            where: { role: "STOKIS", dcId: { not: null } },
            select: { id: true, dcId: true }
        })
        for (const s of dcStokisList) {
            if (s.dcId) {
                if (!dcStokisMap[s.dcId]) dcStokisMap[s.dcId] = []
                dcStokisMap[s.dcId].push(s.id)
            }
        }

        dcPerformance = dcUsers.map(dc => {
            const dcStokisIds = new Set(dcStokisMap[dc.id] || [])
            const dcOrders = stokisOrders.filter(o => dcStokisIds.has(o.stokisId))
            const dcMitraOrders = mitraOrders.filter(o => dcStokisIds.has(o.stokisId))
            const dcItems: typeof allDcItems = []
            for (const o of dcOrders) dcItems.push(...o.items)

            return {
                dcId: dc.id,
                dcName: dc.name,
                uniqueCode: dc.uniqueCode,
                phone: dc.phone,
                address: dc.address,
                ordersToStokis: dcOrders.length,
                totalRevenue: dcOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
                stokisCount: dcStokisIds.size,
                mitraCount: new Set(dcMitraOrders.map(o => o.mitraId)).size,
                products: aggregateProducts(dcItems)
            }
        }).filter(d => d.ordersToStokis > 0 || d.stokisCount > 0)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)

        // Add unassigned stokis orders (stokis without DC)
        const assignedStokisIds = new Set(dcStokisList.map(s => s.id))
        const unassignedOrders = stokisOrders.filter(o => !assignedStokisIds.has(o.stokisId))
        if (unassignedOrders.length > 0) {
            const uItems: typeof allDcItems = []
            for (const o of unassignedOrders) uItems.push(...o.items)
            dcPerformance.push({
                dcId: "unassigned",
                dcName: "Tanpa DC",
                uniqueCode: null,
                phone: null,
                address: null,
                ordersToStokis: unassignedOrders.length,
                totalRevenue: unassignedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
                stokisCount: new Set(unassignedOrders.map(o => o.stokisId)).size,
                mitraCount: 0,
                products: aggregateProducts(uItems)
            })
        }
    }

    // Mitra Performance with products
    const mitraStats: Record<string, {
        mitraId: string
        mitraName: string
        uniqueCode: string | null
        address: string | null
        phone: string | null
        ordersToStokis: number
        totalRevenue: number
        stokisName: string
        stokisCode: string | null
        allItems: { quantity: number; price: unknown; product: { name: string; sku: string; unit: string } }[]
    }> = {}

    for (const order of mitraOrders) {
        const key = order.mitraId
        if (!mitraStats[key]) {
            mitraStats[key] = {
                mitraId: order.mitraId,
                mitraName: order.mitra.name,
                uniqueCode: order.mitra.uniqueCode,
                address: order.mitra.address,
                phone: order.mitra.phone,
                ordersToStokis: 0,
                totalRevenue: 0,
                stokisName: order.stokis.name,
                stokisCode: order.stokis.uniqueCode,
                allItems: []
            }
        }
        mitraStats[key].ordersToStokis++
        mitraStats[key].totalRevenue += Number(order.totalAmount)
        mitraStats[key].allItems.push(...order.items)
    }

    const mitraRankings = Object.values(mitraStats).map(m => ({
        mitraId: m.mitraId,
        mitraName: m.mitraName,
        uniqueCode: m.uniqueCode,
        address: m.address,
        phone: m.phone,
        ordersToStokis: m.ordersToStokis,
        totalRevenue: m.totalRevenue,
        stokisName: m.stokisName,
        stokisCode: m.stokisCode,
        products: aggregateProducts(m.allItems)
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // Summary aggregates
    const totalStokisRevenue = stokisOrders.reduce((s, o) => s + Number(o.totalAmount), 0)
    const totalMitraRevenue = mitraOrders.reduce((s, o) => s + Number(o.totalAmount), 0)
    const totalRevenue = totalStokisRevenue + totalMitraRevenue
    const totalOrders = stokisOrders.length + mitraOrders.length

    return NextResponse.json({
        stokisPerformance: stokisRankings,
        dcPerformance: dcPerformance,
        mitraPerformance: mitraRankings,
        totalStokis: stokisRankings.length,
        totalDc: dcPerformance.length,
        totalMitra: mitraRankings.length,
        summary: {
            totalRevenue,
            totalOrders,
            totalStokisRevenue,
            totalMitraRevenue,
            avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
            stokisRevenueShare: totalRevenue > 0 ? Math.round((totalStokisRevenue / totalRevenue) * 100) : 0,
            mitraRevenueShare: totalRevenue > 0 ? Math.round((totalMitraRevenue / totalRevenue) * 100) : 0,
            activeStokis: new Set(stokisOrders.map(o => o.stokisId)).size,
            activeMitra: new Set(mitraOrders.map(o => o.mitraId)).size
        }
    })
}

// Invoice Aging Report - Categorized by DC/Stokis with aging buckets
async function getInvoiceAgingReport(stokisFilter: Record<string, unknown> = {}, dateFrom?: Date, dateTo?: Date) {
    // Build date filter for order.createdAt
    const orderDateFilter: Record<string, unknown> = {}
    if (dateFrom || dateTo) {
        const createdAtFilter: Record<string, Date> = {}
        if (dateFrom) createdAtFilter.gte = dateFrom
        if (dateTo) createdAtFilter.lte = dateTo
        orderDateFilter.createdAt = createdAtFilter
    }

    // Fetch ALL invoices (including paid) for complete reporting
    const allInvoices = await prisma.invoice.findMany({
        where: {
            order: { ...stokisFilter, ...orderDateFilter }
        },
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

