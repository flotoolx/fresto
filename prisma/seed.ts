import { PrismaClient, Role, StokisOrderStatus, InvoiceStatus, PaymentMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helpers
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

async function main() {
    console.log('🌱 Seeding database...')

    // 1. Create Gudang
    console.log('📦 Creating Gudang...')
    const gudangAyam = await prisma.gudang.upsert({
        where: { code: 'GDG-AYAM' },
        update: {},
        create: { name: 'Gudang Ayam', code: 'GDG-AYAM', address: 'Jakarta Pusat' },
    })
    const gudangTepung = await prisma.gudang.upsert({
        where: { code: 'GDG-TEPUNG' },
        update: {},
        create: { name: 'Gudang Tepung', code: 'GDG-TEPUNG', address: 'Jakarta Barat' },
    })
    const gudangKering = await prisma.gudang.upsert({
        where: { code: 'GDG-KERING' },
        update: {},
        create: { name: 'Gudang Kering', code: 'GDG-KERING', address: 'Jakarta Timur' },
    })

    // 2. Create Products
    console.log('🍗 Creating Products...')
    const productsData = [
        { name: 'Ayam Potong Segar', sku: 'AYM-001', unit: 'ekor', price: 35000, gudangId: gudangAyam.id },
        { name: 'Ayam Fillet', sku: 'AYM-002', unit: 'kg', price: 55000, gudangId: gudangAyam.id },
        { name: 'Sayap Ayam', sku: 'AYM-003', unit: 'kg', price: 45000, gudangId: gudangAyam.id },
        { name: 'Tepung Bumbu Original', sku: 'TPG-001', unit: 'kg', price: 25000, gudangId: gudangTepung.id },
        { name: 'Tepung Bumbu Spicy', sku: 'TPG-002', unit: 'kg', price: 28000, gudangId: gudangTepung.id },
        { name: 'Tepung Bumbu Crispy', sku: 'TPG-003', unit: 'kg', price: 30000, gudangId: gudangTepung.id },
        { name: 'Minyak Goreng', sku: 'KRG-001', unit: 'liter', price: 18000, gudangId: gudangKering.id },
        { name: 'Saus Sambal', sku: 'KRG-002', unit: 'botol', price: 15000, gudangId: gudangKering.id },
        { name: 'Kemasan Box', sku: 'KRG-003', unit: 'pcs', price: 2000, gudangId: gudangKering.id },
        { name: 'Kantong Plastik', sku: 'KRG-004', unit: 'pack', price: 10000, gudangId: gudangKering.id },
    ]

    const productMap = new Map<string, string>()
    for (const p of productsData) {
        const product = await prisma.product.upsert({
            where: { sku: p.sku },
            update: {},
            create: p,
        })
        productMap.set(p.sku, product.id)
    }

    // 3. Create Core Users
    console.log('bust Creating Core Users...')
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Admin & Finance
    await prisma.user.upsert({
        where: { email: 'admin@dfresto.com' },
        update: {},
        create: { name: 'Admin Pusat', email: 'admin@dfresto.com', password: hashedPassword, role: Role.PUSAT, phone: '0811111111' }
    })
    await prisma.user.upsert({
        where: { email: 'finance@dfresto.com' },
        update: {},
        create: { name: 'Tim Finance', email: 'finance@dfresto.com', password: hashedPassword, role: Role.FINANCE, phone: '0822222222' }
    })

    // Gudang Staff
    await prisma.user.upsert({
        where: { email: 'gudang.ayam@dfresto.com' },
        update: {},
        create: { name: 'Staff Gudang Ayam', email: 'gudang.ayam@dfresto.com', password: hashedPassword, role: Role.GUDANG, gudangId: gudangAyam.id }
    })

    // 4. Create DC (5 DCs)
    console.log('🏭 Creating 5 DCs...')
    const dcLocations = ['Jakarta', 'Bandung', 'Surabaya', 'Semarang', 'Medan']
    for (let i = 0; i < 5; i++) {
        const email = `dc${i + 1}@dfresto.com`
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: `DC ${dcLocations[i]}`,
                email,
                password: hashedPassword,
                role: Role.DC,
                address: `Jl. Raya ${dcLocations[i]} No. ${i + 1}`,
                phone: `083333333${i}`
            }
        })
    }

    // 5. Create Stokis (10 Stokis)
    console.log('🏪 Creating 10 Stokis...')
    const stokisIds: string[] = []
    const stokisCities = ['Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara', 'Bogor', 'Depok', 'Tangerang', 'Bekasi', 'Bandung Kota', 'Cimahi']

    for (let i = 0; i < 10; i++) {
        const email = `stokis${i + 1}@dfresto.com`
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: `Stokis ${stokisCities[i]}`,
                email,
                password: hashedPassword,
                role: Role.STOKIS,
                address: `Jl. Stokis ${stokisCities[i]} No. ${i + 10}`,
                phone: `084444444${i}`,
                province: i < 8 ? 'Jawa Barat' : 'Banten' // Dummy province
            }
        })
        stokisIds.push(user.id)

        // Create Custom Prices for this Stokis (Random)
        const productsList = Array.from(productMap.keys())
        for (const sku of productsList) {
            const basePrice = productsData.find(p => p.sku === sku)?.price || 0
            // Random margin -5000 to +5000
            const margin = randomInt(-5000, 5000)
            await prisma.stokisPrice.upsert({
                where: { stokisId_productId: { stokisId: user.id, productId: productMap.get(sku)! } },
                update: {},
                create: {
                    stokisId: user.id,
                    productId: productMap.get(sku)!,
                    customPrice: Number(basePrice) + margin
                }
            })
        }
    }

    // 6. Create Mitra (20 Mitra)
    console.log('👥 Creating 20 Mitra...')
    const mitraIds: string[] = []
    for (let i = 0; i < 20; i++) {
        const email = `mitra${i + 1}@dfresto.com`
        const assignedStokisId = randomItem(stokisIds)
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: `Mitra ${i + 1}`,
                email,
                password: hashedPassword,
                role: Role.MITRA,
                address: `Jl. Mitra No. ${i + 1}`,
                phone: `085555555${i}`,
                stokisId: assignedStokisId
            }
        })
        mitraIds.push(user.id)
    }

    // 7. Generate Stokis Orders & Invoices
    console.log('📝 Generating Stokis Orders & Invoices...')
    const orderStatuses = Object.values(StokisOrderStatus)

    // Generate ~30 Random Orders
    for (let i = 0; i < 30; i++) {
        const stokisId = randomItem(stokisIds)
        const status = randomItem(orderStatuses) as StokisOrderStatus
        const sku1 = randomItem(Array.from(productMap.keys()))
        const sku2 = randomItem(Array.from(productMap.keys()))

        const price1 = productsData.find(p => p.sku === sku1)!.price
        const price2 = productsData.find(p => p.sku === sku2)!.price
        const qty1 = randomInt(10, 100)
        const qty2 = randomInt(10, 100)

        const total = (qty1 * Number(price1)) + (qty2 * Number(price2))
        const orderDate = new Date()
        orderDate.setDate(orderDate.getDate() - randomInt(0, 30)) // Past 30 days

        const order = await prisma.stokisOrder.create({
            data: {
                orderNumber: `ORD-DUMMY-${1000 + i}`,
                stokisId,
                status,
                totalAmount: total,
                createdAt: orderDate,
                items: {
                    create: [
                        { productId: productMap.get(sku1)!, quantity: qty1, price: price1 },
                        { productId: productMap.get(sku2)!, quantity: qty2, price: price2 },
                    ]
                }
            }
        })

        // Generate Invoice if order is processed/received
        if (['PO_ISSUED', 'SHIPPED', 'RECEIVED'].includes(status)) {
            const invoiceStatus = randomItem(['PAID', 'UNPAID', 'OVERDUE', 'UNPAID']) // More UNPAID chance
            let paidAmount = 0
            let paidAt = null

            if (invoiceStatus === 'PAID') {
                paidAmount = total
                paidAt = new Date()
            } else if (invoiceStatus === 'OVERDUE') {
                paidAmount = randomInt(0, total / 2) // Partial or 0
            }

            const invoice = await prisma.invoice.create({
                data: {
                    invoiceNumber: `INV-DUMMY-${1000 + i}`,
                    orderId: order.id,
                    amount: total,
                    paidAmount,
                    status: invoiceStatus as InvoiceStatus,
                    dueDate: new Date(orderDate.getTime() + (7 * 24 * 60 * 60 * 1000)), // +7 days
                    paidAt,
                    createdAt: orderDate
                }
            })

            // Create Payment record if Paid or Partial
            if (paidAmount > 0) {
                await prisma.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        amount: paidAmount,
                        paymentDate: new Date(),
                        method: PaymentMethod.TRANSFER_BCA,
                        createdBy: 'system-seed',
                        notes: 'Dummy payment'
                    }
                })
            }
        }
    }

    console.log('✅ Dummy Data Generation Completed!')
    console.log('   - 5 DCs')
    console.log('   - 10 Stokis (stokis1@dfresto.com ... stokis10@dfresto.com)')
    console.log('   - 20 Mitra (mitra1@dfresto.com ... mitra20@dfresto.com)')
    console.log('   - ~30 Random Orders & Invoices')
    console.log('   - Password all users: password123')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
