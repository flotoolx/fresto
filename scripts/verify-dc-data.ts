import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Find DC Palembang user
    const dcPalembang = await prisma.user.findFirst({
        where: { role: 'DC', name: { contains: 'Palembang', mode: 'insensitive' } },
        select: { id: true, name: true, email: true, isActive: true }
    })

    if (!dcPalembang) {
        // List all DC users to find the right one
        const allDCs = await prisma.user.findMany({
            where: { role: 'DC' },
            select: { id: true, name: true, email: true, isActive: true }
        })
        console.log('DC Palembang not found. All DCs:', JSON.stringify(allDCs, null, 2))
        return
    }

    console.log('=== DC PALEMBANG USER ===')
    console.log(JSON.stringify(dcPalembang, null, 2))
    const dcId = dcPalembang.id

    // 2. Stokis Area - Stokis yang dcId-nya = DC Palembang
    const stokisInArea = await prisma.user.findMany({
        where: { role: 'STOKIS', isActive: true, dcId: dcId },
        select: { id: true, name: true, email: true }
    })
    console.log('\n=== STOKIS AREA (dcId = DC Palembang) ===')
    console.log('Count:', stokisInArea.length)
    stokisInArea.forEach(s => console.log(`  - ${s.name} (${s.email})`))

    const stokisIds = stokisInArea.map(s => s.id)

    // 3. All StokisOrders for DC Palembang area
    const allOrders = await prisma.stokisOrder.findMany({
        where: { stokis: { dcId: dcId } },
        include: {
            stokis: { select: { name: true } },
            items: { include: { product: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
    })
    console.log('\n=== ALL STOKIS ORDERS IN DC PALEMBANG AREA ===')
    console.log('Total:', allOrders.length)
    allOrders.forEach(o => {
        console.log(`  ${o.orderNumber} | ${o.status.padEnd(16)} | Rp ${Number(o.totalAmount).toLocaleString('id-ID')} | ${o.stokis.name} | ${o.createdAt.toISOString()}`)
    })

    // 4. Status breakdown
    const statusCounts: Record<string, number> = {}
    allOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })
    console.log('\n=== STATUS BREAKDOWN ===')
    Object.entries(statusCounts).forEach(([status, count]) => console.log(`  ${status}: ${count}`))

    // 5. Active orders (not RECEIVED, not CANCELLED)
    const activeOrders = allOrders.filter(o => !['RECEIVED', 'CANCELLED'].includes(o.status))
    console.log('\n=== ORDER AKTIF (not RECEIVED/CANCELLED) ===')
    console.log('Count:', activeOrders.length)
    activeOrders.forEach(o => {
        console.log(`  ${o.orderNumber} | ${o.status} | Rp ${Number(o.totalAmount).toLocaleString('id-ID')}`)
    })

    // 6. Pending orders
    const pendingPusat = allOrders.filter(o => o.status === 'PENDING_PUSAT')
    console.log('\n=== PENDING PUSAT ===')
    console.log('Count:', pendingPusat.length)

    // 7. Total Revenue (sum of ALL orders for DC area)
    const totalRevenue = allOrders.reduce((s, o) => s + Number(o.totalAmount), 0)
    console.log('\n=== TOTAL REVENUE (All Stokis Orders in DC area) ===')
    console.log('Total:', `Rp ${totalRevenue.toLocaleString('id-ID')}`)
    console.log('Total PO count:', allOrders.length)

    // 8. Approve PO - orders waiting for approval (PENDING_PUSAT only)
    const approvePO = allOrders.filter(o => o.status === 'PENDING_PUSAT')
    console.log('\n=== APPROVE PO PAGE (PENDING_PUSAT) ===')
    console.log('Count:', approvePO.length)
    approvePO.forEach(o => {
        console.log(`  ${o.orderNumber} | ${o.status} | Rp ${Number(o.totalAmount).toLocaleString('id-ID')} | ${o.stokis.name}`)
    })

    // 9. DC Orders page (all stokis orders in DC area)
    console.log('\n=== DC ORDERS PAGE ===')
    console.log('Total Orders:', allOrders.length)
    console.log('Total Amount:', `Rp ${totalRevenue.toLocaleString('id-ID')}`)

    // 10. Reports - with date filter (default 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const stokisOrdersInPeriod = allOrders.filter(o => o.createdAt >= thirtyDaysAgo)
    const stokisRevInPeriod = stokisOrdersInPeriod.reduce((s, o) => s + Number(o.totalAmount), 0)

    // Mitra orders (for reports, DC filter: stokis.dcId = dcId for mitra orders)
    const mitraOrders = await prisma.mitraOrder.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        include: {
            mitra: { select: { name: true } },
            stokis: { select: { name: true, dcId: true } }
        },
        orderBy: { createdAt: 'desc' }
    })

    console.log('\n=== ALL MITRA ORDERS (30 days, ALL - not filtered by DC) ===')
    console.log('Total:', mitraOrders.length)
    const mitraRevenue = mitraOrders.reduce((s, o) => s + Number(o.totalAmount), 0)
    console.log('Total Amount:', `Rp ${mitraRevenue.toLocaleString('id-ID')}`)
    mitraOrders.forEach(o => {
        console.log(`  ${o.orderNumber} | ${o.status.padEnd(12)} | Rp ${Number(o.totalAmount).toLocaleString('id-ID')} | Mitra: ${o.mitra.name} | Stokis: ${o.stokis.name} | dcId: ${o.stokis.dcId}`)
    })

    // 11. Reports Overview - what the DC sees
    // DC filter: stokisFilter = { stokis: { dcId: userId } }
    // For reports, the getSummaryReport uses stokisFilter for stokisOrders
    // But mitraOrders are NOT filtered by DC area in the reports API!
    console.log('\n=== REPORTS OVERVIEW (DC Palembang perspective, 30 days) ===')
    console.log('--- Stokis Orders (filtered by DC area) ---')
    console.log('Stokis Orders count:', stokisOrdersInPeriod.length)
    console.log('Stokis Revenue:', `Rp ${stokisRevInPeriod.toLocaleString('id-ID')}`)
    console.log('--- Mitra Orders (NOT filtered by DC in API!) ---')
    console.log('Mitra Orders count:', mitraOrders.length)
    console.log('Mitra Revenue:', `Rp ${mitraRevenue.toLocaleString('id-ID')}`)
    console.log('--- Totals ---')
    console.log('Total Revenue:', `Rp ${(stokisRevInPeriod + mitraRevenue).toLocaleString('id-ID')}`)
    console.log('Total PO:', stokisOrdersInPeriod.length + mitraOrders.length)
    console.log('DC Revenue (= Stokis Revenue):', `Rp ${stokisRevInPeriod.toLocaleString('id-ID')}`)
    console.log('DC PO count:', stokisOrdersInPeriod.length)

    // 12. Check if reports page shows "Total Stokis" and "Total Mitra" separately
    console.log('\n=== REPORTS: CARDS BREAKDOWN ===')
    console.log('Total Revenue:', `Rp ${(stokisRevInPeriod + mitraRevenue).toLocaleString('id-ID')}`, `(${stokisOrdersInPeriod.length + mitraOrders.length} PO)`)
    console.log('Total DC:', `Rp ${stokisRevInPeriod.toLocaleString('id-ID')}`, `(${stokisOrdersInPeriod.length} DC PO)`)
    console.log('Total Stokis:', `Rp ${stokisRevInPeriod.toLocaleString('id-ID')}`, `(${stokisOrdersInPeriod.length} PO Stokis)`)
    console.log('Total Mitra:', `Rp ${mitraRevenue.toLocaleString('id-ID')}`, `(${mitraOrders.length} PO Mitra)`)

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
