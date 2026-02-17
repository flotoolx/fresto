import { PrismaClient, StokisOrderStatus, InvoiceStatus, Role, PaymentMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helpers
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

async function main() {
    console.log('🚀 Ensuring Pusat Stokis exist and generating orders...')

    // 1. Get Products
    const products = await prisma.product.findMany()
    if (products.length === 0) {
        console.error('❌ No products found! Please seed products first.')
        return
    }

    const hashedPassword = await bcrypt.hash('password123', 10)
    const productMap = new Map<string, string>()
    products.forEach(p => productMap.set(p.sku, p.id))
    const productsData = products

    // 2. Create/Upsert Pusat-Direct Stokis (4 Stokis without dcId)
    // Stokis 15-18
    const pusatStokisIds: string[] = []

    console.log('Use Upsert to ensure Stokis 15-18 exist...')

    for (let i = 0; i < 4; i++) {
        const suffix = String.fromCharCode(65 + i) // A, B, C, D
        const stkCode = `STK-PST-${suffix}${String(i + 1).padStart(2, '0')}`
        const email = `stokis${15 + i}@dfresto.com`

        const user = await prisma.user.upsert({
            where: { email },
            update: { dcId: null, role: 'STOKIS', uniqueCode: stkCode, name: `Stokis Pusat ${suffix}` },
            create: {
                name: `Stokis Pusat ${suffix}`,
                email,
                password: hashedPassword,
                role: 'STOKIS',
                address: `Jl. Pusat No. ${i + 20}`,
                phone: `086666666${i}`,
                province: 'Jakarta',
                dcId: null, // Direct to pusat
                uniqueCode: stkCode
            }
        })
        pusatStokisIds.push(user.id)
        console.log(`   - Ensured ${user.name} (${user.email}) exists.`)

        // Create Custom Prices for Pusat Stokis
        for (const p of products) {
            const margin = randomInt(-5000, 5000)
            await prisma.stokisPrice.upsert({
                where: { stokisId_productId: { stokisId: user.id, productId: p.id } },
                update: {},
                create: {
                    stokisId: user.id,
                    productId: p.id,
                    customPrice: Number(p.price) + margin
                }
            })
        }
    }

    // 3. Create Mitra Pusat (21-24)
    console.log('👥 Ensuring Mitra Pusat 21-24 exist...')
    for (let i = 0; i < 4; i++) {
        const email = `mitra${21 + i}@dfresto.com`
        const mtrCode = `MTR-${String(21 + i).padStart(3, '0')}`
        const assignedStokisId = pusatStokisIds[i] // Linked 1-to-1 for simplicity here

        const user = await prisma.user.upsert({
            where: { email },
            update: { uniqueCode: mtrCode, stokisId: assignedStokisId, name: `Mitra Pusat ${i + 1}` },
            create: {
                name: `Mitra Pusat ${i + 1}`,
                email,
                password: hashedPassword,
                role: 'MITRA',
                address: `Jl. Mitra Pusat No. ${i + 1}`,
                phone: `087777777${i}`,
                stokisId: assignedStokisId,
                uniqueCode: mtrCode
            }
        })

        // Link
        await prisma.mitraStokis.upsert({
            where: { mitraId_stokisId: { mitraId: user.id, stokisId: assignedStokisId } },
            update: {},
            create: { mitraId: user.id, stokisId: assignedStokisId, isPrimary: true },
        })
    }

    // 4. Generate Orders for these Stokis
    const stokisList = await prisma.user.findMany({
        where: { id: { in: pusatStokisIds } }
    })

    let orderCount = 0
    for (const stokis of stokisList) {
        // Generate between 5 to 10 random orders
        const ordersToCreate = randomInt(5, 10)
        console.log(`👉 Creating ${ordersToCreate} new orders for ${stokis.name}...`)

        for (let i = 0; i < ordersToCreate; i++) {
            // Random status
            const rand = Math.random()
            let status: StokisOrderStatus

            if (rand < 0.4) status = 'PENDING_PUSAT' // 40% Pending
            else if (rand < 0.7) status = randomItem(['PO_ISSUED', 'SHIPPED', 'RECEIVED'])
            else status = randomItem(['PROCESSING', 'CANCELLED'])

            // Random Items (1-4 types)
            const itemCount = randomInt(1, 4)
            const selectedProducts = []
            for (let k = 0; k < itemCount; k++) {
                selectedProducts.push(randomItem(products))
            }
            const uniqueProducts = [...new Set(selectedProducts)]

            // Calculate total
            let totalAmount = 0
            const orderItems = []

            for (const product of uniqueProducts) {
                const qty = randomInt(10, 50)
                const price = Number(product.price)
                totalAmount += qty * price
                orderItems.push({
                    productId: product.id,
                    quantity: qty,
                    price: price
                })
            }

            // Random Date (Last 30 days)
            const orderDate = new Date()
            orderDate.setDate(orderDate.getDate() - randomInt(0, 30))

            // Unique Order Number
            const suffix = stokis.uniqueCode?.split('-').pop() || 'XXX'
            const timestamp = Date.now().toString().slice(-6)
            const randomSuffix = randomInt(1000, 9999)
            const orderNumber = `ORD-PST-${suffix}-${timestamp}-${randomSuffix}`

            // Create Order
            const order = await prisma.stokisOrder.create({
                data: {
                    orderNumber,
                    stokisId: stokis.id,
                    status,
                    totalAmount,
                    createdAt: orderDate,
                    items: {
                        create: orderItems
                    }
                }
            })

            // Generate Invoice if needed
            if (['PO_ISSUED', 'SHIPPED', 'RECEIVED'].includes(status)) {
                const invoiceStatus = randomItem(['PAID', 'UNPAID', 'OVERDUE'])
                let paidAmount = 0
                let paidAt = null

                if (invoiceStatus === 'PAID') {
                    paidAmount = totalAmount
                    paidAt = new Date()
                } else if (invoiceStatus === 'OVERDUE') {
                    paidAmount = randomInt(0, totalAmount / 2) // Partial or 0
                }

                await prisma.invoice.create({
                    data: {
                        invoiceNumber: `INV-${orderNumber.replace('ORD-', '')}`,
                        orderId: order.id,
                        amount: totalAmount,
                        paidAmount,
                        status: invoiceStatus as InvoiceStatus,
                        dueDate: new Date(orderDate.getTime() + (7 * 24 * 60 * 60 * 1000)), // +7 days
                        paidAt,
                        createdAt: orderDate
                    }
                })
            }
            orderCount++
        }
    }

    console.log(`🎉 Successfully created ${orderCount} NEW dummy orders for Pusat Stokis!`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
