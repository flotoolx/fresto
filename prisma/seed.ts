import { PrismaClient, Role, StokisOrderStatus, InvoiceStatus, PaymentMethod, MitraOrderStatus } from '@prisma/client'
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

    // 4. Create DC (7 DCs)
    console.log('🏭 Creating 7 DCs and Finance DC...')
    const dcLocations = ['Palembang', 'Makassar', 'Medan', 'Bengkulu', 'Pekanbaru', 'Jatim', 'Jateng']
    const dcCodes = ['PLB', 'MKS', 'MDN', 'BKL', 'PKB', 'JTM', 'JTG']
    const dcIds: string[] = []

    // Migrate old email formats (dc.* → admin.*, finance.* → manager.*)
    for (const loc of dcLocations) {
        const slug = loc.toLowerCase().replace(/\s+/g, '')
        await prisma.user.updateMany({ where: { email: `dc.${slug}@dfresto.com` }, data: { email: `admin.${slug}@dfresto.com` } })
        await prisma.user.updateMany({ where: { email: `finance.${slug}@dfresto.com` }, data: { email: `manager.${slug}@dfresto.com` } })
    }

    for (let i = 0; i < dcLocations.length; i++) {
        const location = dcLocations[i]
        const citySlug = location.toLowerCase().replace(/\s+/g, '')
        const email = `admin.${citySlug}@dfresto.com`
        const dcCode = `DC-${dcCodes[i]}-${String(i + 1).padStart(3, '0')}`

        // Create DC User
        const dc = await prisma.user.upsert({
            where: { email },
            update: { role: Role.DC, name: `Admin ${location}`, uniqueCode: dcCode },
            create: {
                name: `Admin ${location}`,
                email,
                password: hashedPassword,
                role: Role.DC,
                address: `Jl. Raya ${location} No. ${i + 1}`,
                phone: `083333333${i}`,
                uniqueCode: dcCode
            }
        })
        dcIds.push(dc.id)

        // Create Manager DC User
        const financeEmail = `manager.${citySlug}@dfresto.com`
        await prisma.user.upsert({
            where: { email: financeEmail },
            update: { role: Role.FINANCE_DC, dcId: dc.id, name: `Manager ${location}` },
            create: {
                name: `Manager ${location}`,
                email: financeEmail,
                password: hashedPassword,
                role: Role.FINANCE_DC,
                phone: `083333333${i}`,
                dcId: dc.id // Link to DC
            }
        })
    }

    // Create Finance All Area
    await prisma.user.upsert({
        where: { email: 'finance.all@dfresto.com' },
        update: { role: Role.FINANCE_ALL },
        create: {
            name: 'Finance All Area',
            email: 'finance.all@dfresto.com',
            password: hashedPassword,
            role: Role.FINANCE_ALL,
            phone: '0822222223'
        }
    })

    // 5. Create Stokis (14 Stokis - 2 per DC)
    console.log('🏪 Creating 14 Stokis (2 per DC)...')
    const stokisIds: string[] = []

    for (let i = 0; i < 14; i++) {
        const dcIndex = i % 7 // Distribute evenly among 7 DCs
        const dcId = dcIds[dcIndex]
        const location = dcLocations[dcIndex]
        const suffix = i < 7 ? 'A' : 'B'
        const stkCode = `STK-${dcCodes[dcIndex]}-${suffix}${String(dcIndex + 1).padStart(2, '0')}`

        const email = `stokis${i + 1}@dfresto.com`
        const user = await prisma.user.upsert({
            where: { email },
            update: { dcId: dcId, role: Role.STOKIS, uniqueCode: stkCode, name: `Stokis ${location} ${suffix}` },
            create: {
                name: `Stokis ${location} ${suffix}`,
                email,
                password: hashedPassword,
                role: Role.STOKIS,
                address: `Jl. Stokis ${location} No. ${i + 10}`,
                phone: `084444444${i}`,
                province: location,
                dcId: dcId,
                uniqueCode: stkCode
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

    // 6. Create Mitra (20 Mitra) — evenly distributed across 14 Stokis (round-robin)
    console.log('👥 Creating 20 Mitra (round-robin across 14 Stokis)...')
    const mitraIds: string[] = []
    const mitraToStokisMap: { mitraId: string; stokisId: string }[] = []

    for (let i = 0; i < 20; i++) {
        const email = `mitra${i + 1}@dfresto.com`
        const mtrCode = `MTR-${String(i + 1).padStart(3, '0')}`
        const assignedStokisId = stokisIds[i % stokisIds.length] // Round-robin: 0,1,...,13,0,1,...,5
        const user = await prisma.user.upsert({
            where: { email },
            update: { uniqueCode: mtrCode, stokisId: assignedStokisId, name: `Mitra ${i + 1}` },
            create: {
                name: `Mitra ${i + 1}`,
                email,
                password: hashedPassword,
                role: Role.MITRA,
                address: `Jl. Mitra No. ${i + 1}`,
                phone: `085555555${i}`,
                stokisId: assignedStokisId,
                uniqueCode: mtrCode
            }
        })
        mitraIds.push(user.id)
        mitraToStokisMap.push({ mitraId: user.id, stokisId: assignedStokisId })
    }

    // 6b. Create MitraStokis junction entries (primary)
    console.log('🔗 Creating MitraStokis junction entries...')
    for (const { mitraId, stokisId } of mitraToStokisMap) {
        await prisma.mitraStokis.upsert({
            where: { mitraId_stokisId: { mitraId, stokisId } },
            update: {},
            create: { mitraId, stokisId, isPrimary: true },
        })
    }

    // 6c. Create MitraOrder dummy data
    console.log('🛒 Creating MitraOrder dummy data...')
    // Clean old dummy mitra orders
    await prisma.mitraOrderItem.deleteMany({ where: { order: { orderNumber: { startsWith: 'MTR-DUMMY-' } } } })
    await prisma.mitraOrder.deleteMany({ where: { orderNumber: { startsWith: 'MTR-DUMMY-' } } })

    const mitraOrderStatuses = Object.values(MitraOrderStatus)
    let mitraOrderIdx = 0

    for (const { mitraId, stokisId } of mitraToStokisMap) {
        // 2 orders per mitra
        const ordersToCreate = 2
        for (let j = 0; j < ordersToCreate; j++) {
            const status = mitraOrderStatuses[mitraOrderIdx % mitraOrderStatuses.length]
            const sku1 = randomItem(Array.from(productMap.keys()))
            const sku2 = randomItem(Array.from(productMap.keys()))
            const price1 = productsData.find(p => p.sku === sku1)!.price
            const price2 = productsData.find(p => p.sku === sku2)!.price
            const qty1 = randomInt(5, 30)
            const qty2 = randomInt(5, 30)
            const total = (qty1 * Number(price1)) + (qty2 * Number(price2))

            const orderDate = new Date()
            orderDate.setDate(orderDate.getDate() - randomInt(0, 30))

            await prisma.mitraOrder.create({
                data: {
                    orderNumber: `MTR-DUMMY-${String(1000 + mitraOrderIdx).padStart(4, '0')}`,
                    mitraId,
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
            mitraOrderIdx++
        }
    }

    // 7. Generate Stokis Orders & Invoices
    console.log('📝 Generating Stokis Orders & Invoices...')

    // Clean up old dummy data first to avoid unique constraint errors
    await prisma.payment.deleteMany({ where: { notes: 'Dummy payment' } })
    await prisma.invoice.deleteMany({ where: { invoiceNumber: { startsWith: 'INV-DUMMY-' } } })
    await prisma.stokisOrderItem.deleteMany({ where: { order: { orderNumber: { startsWith: 'ORD-DUMMY-' } } } })
    await prisma.stokisOrder.deleteMany({ where: { orderNumber: { startsWith: 'ORD-DUMMY-' } } })

    const orderStatuses = Object.values(StokisOrderStatus)

    // Generate 3 orders per Stokis (= 42 orders total, 6 per DC area)
    let orderIdx = 0
    for (const stokisId of stokisIds) {
        // Determine useful statuses for testing: PENDING, PO_ISSUED, SHIPPED
        const statusesForStokis: StokisOrderStatus[] = [
            'PENDING_PUSAT' as StokisOrderStatus,
            randomItem(['PO_ISSUED', 'SHIPPED', 'RECEIVED'] as StokisOrderStatus[]),
            randomItem(orderStatuses) as StokisOrderStatus,
        ]

        for (let j = 0; j < 3; j++) {
            const status = statusesForStokis[j]
            const sku1 = randomItem(Array.from(productMap.keys()))
            const sku2 = randomItem(Array.from(productMap.keys()))

            const price1 = productsData.find(p => p.sku === sku1)!.price
            const price2 = productsData.find(p => p.sku === sku2)!.price
            const qty1 = randomInt(10, 100)
            const qty2 = randomInt(10, 100)

            const total = (qty1 * Number(price1)) + (qty2 * Number(price2))
            const orderDate = new Date()
            orderDate.setDate(orderDate.getDate() - randomInt(0, 30))

            const order = await prisma.stokisOrder.create({
                data: {
                    orderNumber: `ORD-DUMMY-${1000 + orderIdx}`,
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
                        invoiceNumber: `INV-DUMMY-${1000 + orderIdx}`,
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

            orderIdx++
        } // end for j (orders per stokis)
    } // end for stokisId

    console.log('✅ Dummy Data Generation Completed!')
    console.log('   - 7 DCs (Palembang, Makassar, Medan, Bengkulu, Pekanbaru, Jatim, Jateng)')
    console.log('   - 7 Finance DC (1 per area)')
    console.log('   - 1 Finance All Area')
    console.log('   - 14 Stokis (2 per DC: stokis1@dfresto.com ... stokis14@dfresto.com)')
    console.log('   - 20 Mitra (mitra1@dfresto.com ... mitra20@dfresto.com)')
    console.log('   - 42 Orders (3 per Stokis, 6 per DC area)')
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

