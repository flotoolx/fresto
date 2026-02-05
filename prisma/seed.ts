import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create Gudang
    const gudangAyam = await prisma.gudang.upsert({
        where: { code: 'GDG-AYAM' },
        update: {},
        create: {
            name: 'Gudang Ayam',
            code: 'GDG-AYAM',
            address: 'Jakarta Pusat',
        },
    })

    const gudangTepung = await prisma.gudang.upsert({
        where: { code: 'GDG-TEPUNG' },
        update: {},
        create: {
            name: 'Gudang Tepung',
            code: 'GDG-TEPUNG',
            address: 'Jakarta Barat',
        },
    })

    const gudangKering = await prisma.gudang.upsert({
        where: { code: 'GDG-KERING' },
        update: {},
        create: {
            name: 'Gudang Kering',
            code: 'GDG-KERING',
            address: 'Jakarta Timur',
        },
    })

    console.log('✅ Gudang created')

    // Create Products (10 products)
    const products = [
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

    // Map SKU to ID for later use
    const productMap = new Map<string, string>()

    for (const product of products) {
        const p = await prisma.product.upsert({
            where: { sku: product.sku },
            update: {},
            create: product,
        })
        productMap.set(product.sku, p.id)
    }
    console.log('✅ Products created')

    // Create Users
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Pusat Admin
    const pusat = await prisma.user.upsert({
        where: { email: 'admin@dfresto.com' },
        update: {},
        create: {
            name: 'Admin Pusat',
            email: 'admin@dfresto.com',
            password: hashedPassword,
            phone: '081234567890',
            role: Role.PUSAT,
        },
    })

    // Finance
    await prisma.user.upsert({
        where: { email: 'finance@dfresto.com' },
        update: {},
        create: {
            name: 'Tim Finance',
            email: 'finance@dfresto.com',
            password: hashedPassword,
            phone: '081234567891',
            role: Role.FINANCE,
        },
    })

    // Gudang Users
    await prisma.user.upsert({
        where: { email: 'gudang.ayam@dfresto.com' },
        update: {},
        create: {
            name: 'Staff Gudang Ayam',
            email: 'gudang.ayam@dfresto.com',
            password: hashedPassword,
            role: Role.GUDANG,
            gudangId: gudangAyam.id,
        },
    })

    // Stokis
    const stokis1 = await prisma.user.upsert({
        where: { email: 'stokis.jakarta@dfresto.com' },
        update: {},
        create: {
            name: 'Stokis Jakarta Selatan',
            email: 'stokis.jakarta@dfresto.com',
            password: hashedPassword,
            phone: '081234567893',
            role: Role.STOKIS,
            address: 'Jakarta Selatan',
        },
    })

    const stokis2 = await prisma.user.upsert({
        where: { email: 'stokis.bandung@dfresto.com' },
        update: {},
        create: {
            name: 'Stokis Bandung',
            email: 'stokis.bandung@dfresto.com',
            password: hashedPassword,
            phone: '081234567894',
            role: Role.STOKIS,
            address: 'Bandung',
        },
    })

    // Mitra (assigned to Stokis)
    await prisma.user.upsert({
        where: { email: 'mitra1@dfresto.com' },
        update: {},
        create: {
            name: 'Mitra Kebayoran',
            email: 'mitra1@dfresto.com',
            password: hashedPassword,
            phone: '081234567895',
            role: Role.MITRA,
            address: 'Kebayoran Baru',
            stokisId: stokis1.id,
        },
    })

    await prisma.user.upsert({
        where: { email: 'mitra2@dfresto.com' },
        update: {},
        create: {
            name: 'Mitra Kemang',
            email: 'mitra2@dfresto.com',
            password: hashedPassword,
            phone: '081234567896',
            role: Role.MITRA,
            address: 'Kemang',
            stokisId: stokis1.id,
        },
    })

    await prisma.user.upsert({
        where: { email: 'mitra3@dfresto.com' },
        update: {},
        create: {
            name: 'Mitra Dago',
            email: 'mitra3@dfresto.com',
            password: hashedPassword,
            phone: '081234567897',
            role: Role.MITRA,
            address: 'Dago, Bandung',
            stokisId: stokis2.id,
        },
    })

    console.log('✅ Users created')

    // --- PHASE 5 DUMMY DATA ---
    console.log('🌱 Seeding Phase 5 Dummy Data...')

    // 1. Create Stokis Prices (Laporan Harga)
    await prisma.stokisPrice.createMany({
        data: [
            { stokisId: stokis1.id, productId: productMap.get(products[0].sku)!, customPrice: 38000 }, // Margin +3000
            { stokisId: stokis1.id, productId: productMap.get(products[1].sku)!, customPrice: 50000 }, // Margin -5000 (Diskon)
            { stokisId: stokis1.id, productId: productMap.get(products[2].sku)!, customPrice: 48000 }, // Margin +3000
        ],
        skipDuplicates: true,
    })
    console.log('✅ Stokis Prices created')

    // 2. Create Orders with various statuses

    // Order 1: PENDING_PUSAT (Can initiate Adjust PO by Stokis)
    await prisma.stokisOrder.create({
        data: {
            orderNumber: 'ORD-HJ-001', // History Jakarta 001
            stokisId: stokis1.id,
            status: 'PENDING_PUSAT',
            totalAmount: 35000 * 10 + 55000 * 5,
            items: {
                create: [
                    { productId: productMap.get(products[0].sku)!, quantity: 10, price: 35000 },
                    { productId: productMap.get(products[1].sku)!, quantity: 5, price: 55000 },
                ]
            }
        }
    })

    // Order 2: PENDING_FINANCE (Can initiate Adjust PO by Finance)
    await prisma.stokisOrder.create({
        data: {
            orderNumber: 'ORD-HJ-002',
            stokisId: stokis1.id,
            status: 'PENDING_FINANCE',
            totalAmount: 45000 * 20,
            items: {
                create: [
                    { productId: productMap.get(products[2].sku)!, quantity: 20, price: 45000 },
                ]
            }
        }
    })

    // Order 3: PO_ISSUED (For Print PO & Gudang Process)
    await prisma.stokisOrder.create({
        data: {
            orderNumber: 'ORD-HJ-003',
            stokisId: stokis1.id,
            status: 'PO_ISSUED',
            totalAmount: 25000 * 50,
            poIssuedAt: new Date(),
            items: {
                create: [
                    { productId: productMap.get(products[3].sku)!, quantity: 50, price: 25000 },
                ]
            }
        }
    })

    // Order 4: SHIPPED (For Confirm Receive)
    await prisma.stokisOrder.create({
        data: {
            orderNumber: 'ORD-HJ-004',
            stokisId: stokis1.id,
            status: 'SHIPPED',
            totalAmount: 18000 * 100,
            poIssuedAt: new Date(Date.now() - 86400000), // yesterday
            items: {
                create: [
                    { productId: productMap.get(products[6].sku)!, quantity: 100, price: 18000 },
                ]
            }
        }
    })

    // Order 5: RECEIVED & UNPAID (For Payment Input)
    const orderUnpaid = await prisma.stokisOrder.create({
        data: {
            orderNumber: 'ORD-HJ-005',
            stokisId: stokis1.id,
            status: 'RECEIVED',
            totalAmount: 1000000,
            poIssuedAt: new Date(Date.now() - 172800000), // 2 days ago
            items: {
                create: [
                    { productId: productMap.get(products[0].sku)!, quantity: 20, price: 35000 },
                    { productId: productMap.get(products[3].sku)!, quantity: 12, price: 25000 },
                ]
            }
        }
    })

    // Invoice for Order 5 (UNPAID)
    await prisma.invoice.create({
        data: {
            invoiceNumber: 'INV-HJ-005',
            orderId: orderUnpaid.id,
            amount: 1000000,
            paidAmount: 0,
            status: 'UNPAID',
            dueDate: new Date(Date.now() + 86400000 * 7), // Due in 7 days
        }
    })

    // Order 6: RECEIVED & OVERDUE
    const orderOverdue = await prisma.stokisOrder.create({
        data: {
            orderNumber: 'ORD-HJ-006',
            stokisId: stokis1.id,
            status: 'RECEIVED',
            totalAmount: 500000,
            poIssuedAt: new Date(Date.now() - 86400000 * 30), // 30 days ago
            items: {
                create: [
                    { productId: productMap.get(products[1].sku)!, quantity: 10, price: 50000 },
                ]
            }
        }
    })

    // Invoice for Order 6 (OVERDUE)
    await prisma.invoice.create({
        data: {
            invoiceNumber: 'INV-HJ-006',
            orderId: orderOverdue.id,
            amount: 500000,
            paidAmount: 200000, // Partial payment
            status: 'OVERDUE',
            dueDate: new Date(Date.now() - 86400000 * 1), // Due yesterday
        }
    })

    console.log('✅ Phase 5 Orders & Invoices created')
    console.log('🎉 Seeding completed!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
