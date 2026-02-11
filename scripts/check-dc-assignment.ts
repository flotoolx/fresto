import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    // Check Stokis Jakarta Selatan DC assignment
    const stokis = await prisma.user.findMany({
        where: { role: 'STOKIS', isActive: true },
        select: { id: true, name: true, dcId: true }
    })
    console.log('=== ALL STOKIS ===')
    stokis.forEach(s => console.log(`  ${s.name} | dcId: ${s.dcId}`))

    // Check Mitra Orders with stokis dcId
    const mitraOrders = await prisma.mitraOrder.findMany({
        include: {
            stokis: { select: { id: true, name: true, dcId: true } },
            mitra: { select: { id: true, name: true, stokisId: true } }
        }
    })
    console.log('\n=== MITRA ORDERS WITH STOKIS DCID ===')
    mitraOrders.forEach(o => {
        console.log(`  ${o.orderNumber} | StokisId: ${o.stokisId} | Stokis: ${o.stokis.name} | dcId: ${o.stokis.dcId}`)
    })

    // Check DC users
    const dcs = await prisma.user.findMany({
        where: { role: 'DC' },
        select: { id: true, name: true }
    })
    console.log('\n=== ALL DCs ===')
    dcs.forEach(d => console.log(`  ${d.name} | id: ${d.id}`))

    await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
