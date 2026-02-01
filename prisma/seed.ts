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

    for (const product of products) {
        await prisma.product.upsert({
            where: { sku: product.sku },
            update: {},
            create: product,
        })
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
    console.log('')
    console.log('📋 Test Accounts:')
    console.log('   Pusat:   admin@dfresto.com / password123')
    console.log('   Finance: finance@dfresto.com / password123')
    console.log('   Gudang:  gudang.ayam@dfresto.com / password123')
    console.log('   Stokis:  stokis.jakarta@dfresto.com / password123')
    console.log('   Mitra:   mitra1@dfresto.com / password123')
    console.log('')
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
