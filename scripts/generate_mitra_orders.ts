import { PrismaClient, MitraOrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

async function main() {
    console.log('🚀 Generating Mitra Orders for Pusat Stokis/Mitra...')

    const products = await prisma.product.findMany()
    if (products.length === 0) {
        console.error('❌ No products found!')
        return
    }

    // Get Mitra Pusat (linked to Stokis Pusat)
    const pusatMitra = await prisma.user.findMany({
        where: {
            role: 'MITRA',
            stokis: { dcId: null }
        },
        include: { stokis: { select: { id: true, name: true } } }
    })

    if (pusatMitra.length === 0) {
        console.error('❌ No Pusat Mitra found!')
        return
    }

    console.log(`✅ Found ${pusatMitra.length} Pusat Mitra users.`)

    const statuses = Object.values(MitraOrderStatus)
    let orderCount = 0

    for (const mitra of pusatMitra) {
        const ordersToCreate = randomInt(3, 8)
        console.log(`👉 Creating ${ordersToCreate} mitra orders for ${mitra.name} → ${mitra.stokis?.name}...`)

        for (let i = 0; i < ordersToCreate; i++) {
            const status = randomItem(statuses)
            const itemCount = randomInt(1, 3)
            const selectedProducts = [...new Set(Array.from({ length: itemCount }, () => randomItem(products)))]

            let totalAmount = 0
            const orderItems = selectedProducts.map(product => {
                const qty = randomInt(5, 30)
                const price = Number(product.price)
                totalAmount += qty * price
                return { productId: product.id, quantity: qty, price }
            })

            const orderDate = new Date()
            orderDate.setDate(orderDate.getDate() - randomInt(0, 30))

            const randomSuffix = randomInt(1000, 9999)
            const timestamp = Date.now().toString().slice(-6)

            await prisma.mitraOrder.create({
                data: {
                    orderNumber: `MTR-PST-${timestamp}-${randomSuffix}`,
                    mitraId: mitra.id,
                    stokisId: mitra.stokisId!,
                    status,
                    totalAmount,
                    createdAt: orderDate,
                    items: { create: orderItems }
                }
            })
            orderCount++
        }
    }

    console.log(`🎉 Successfully created ${orderCount} mitra orders for Pusat area!`)
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
