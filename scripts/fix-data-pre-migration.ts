import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('=== Fixing data before migration ===\n')

    // 1. Fix PENDING_FINANCE orders → change to PENDING_PUSAT
    const pendingFinanceOrders = await prisma.$executeRawUnsafe(
        `UPDATE "StokisOrder" SET status = 'PENDING_PUSAT' WHERE status = 'PENDING_FINANCE'`
    )
    console.log(`Fixed ${pendingFinanceOrders} orders from PENDING_FINANCE → PENDING_PUSAT`)

    // 2. Fix Stokis Jakarta Selatan dcId (the old one with null dcId)
    // DC Palembang ID: cmlgn1b07000row74wq9oufkk
    const dcPalembang = await prisma.user.findFirst({
        where: { role: 'DC', name: { contains: 'Palembang', mode: 'insensitive' } },
        select: { id: true, name: true }
    })

    if (!dcPalembang) {
        console.log('DC Palembang not found!')
        return
    }

    console.log(`\nDC Palembang: ${dcPalembang.name} (${dcPalembang.id})`)

    // Find Stokis with null dcId
    const stokisNullDc = await prisma.user.findMany({
        where: { role: 'STOKIS', dcId: null, isActive: true },
        select: { id: true, name: true, dcId: true }
    })

    console.log(`\nStokis with null dcId:`)
    stokisNullDc.forEach(s => console.log(`  - ${s.name} (${s.id})`))

    // Also find Stokis Bandung with null dcId
    const dcMakassar = await prisma.user.findFirst({
        where: { role: 'DC', name: { contains: 'Makassar', mode: 'insensitive' } },
        select: { id: true, name: true }
    })

    // Assign dcId based on name patterns
    for (const stokis of stokisNullDc) {
        let assignDcId: string | null = null
        let assignDcName = ''

        if (stokis.name.includes('Jakarta')) {
            assignDcId = dcPalembang.id
            assignDcName = dcPalembang.name
        } else if (stokis.name.includes('Bandung') && dcMakassar) {
            assignDcId = dcMakassar.id
            assignDcName = dcMakassar.name
        }

        if (assignDcId) {
            await prisma.user.update({
                where: { id: stokis.id },
                data: { dcId: assignDcId }
            })
            console.log(`  ✅ ${stokis.name} → assigned to ${assignDcName}`)
        } else {
            console.log(`  ⚠️ ${stokis.name} → no matching DC found, skipping`)
        }
    }

    // Verify
    const remainingNull = await prisma.user.count({
        where: { role: 'STOKIS', dcId: null, isActive: true }
    })
    console.log(`\nRemaining Stokis with null dcId: ${remainingNull}`)

    await prisma.$disconnect()
    console.log('\n✅ Data fix completed!')
}

main().catch(e => { console.error(e); process.exit(1) })
