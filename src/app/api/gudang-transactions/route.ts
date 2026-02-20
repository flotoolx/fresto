import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== "GUDANG") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const gudangId = session.user.gudangId
        if (!gudangId) {
            return NextResponse.json({ error: "Gudang tidak ditemukan" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type") // MASUK, KELUAR, PEMAKAIAN, PRODUKSI
        const category = searchParams.get("category")
        const dateFrom = searchParams.get("dateFrom")
        const dateTo = searchParams.get("dateTo")

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { gudangId }
        if (type) where.type = type
        if (category) where.category = category
        if (dateFrom || dateTo) {
            where.transactionDate = {}
            if (dateFrom) where.transactionDate.gte = new Date(dateFrom)
            if (dateTo) where.transactionDate.lte = new Date(dateTo + "T23:59:59")
        }

        const transactions = await prisma.gudangTransaction.findMany({
            where,
            orderBy: { transactionDate: "desc" },
            take: 500,
        })

        return NextResponse.json({ transactions })
    } catch (error) {
        console.error("Error fetching gudang transactions:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== "GUDANG") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const gudangId = session.user.gudangId
        if (!gudangId) {
            return NextResponse.json({ error: "Gudang tidak ditemukan" }, { status: 403 })
        }

        const body = await request.json()
        const { type, transactionDate, supplierName, suratJalan, ekor, kg, productName, kemasan, qty, unit, barangKeluar, notes, category, jenisBumbu } = body

        if (!type) {
            return NextResponse.json({ error: "Tipe transaksi wajib diisi" }, { status: 400 })
        }

        const transaction = await prisma.gudangTransaction.create({
            data: {
                gudangId,
                type,
                transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                createdBy: session.user.id,
                supplierName: supplierName || null,
                suratJalan: suratJalan || null,
                ekor: ekor ? parseInt(ekor) : null,
                kg: kg ? parseFloat(kg) : null,
                productName: productName || null,
                kemasan: kemasan || null,
                qty: qty ? parseFloat(qty) : null,
                unit: unit || null,
                barangKeluar: barangKeluar || null,
                userName: session.user.name || null,
                notes: notes || null,
                category: category || null,
                jenisBumbu: jenisBumbu || null,
            },
        })

        return NextResponse.json(transaction, { status: 201 })
    } catch (error) {
        console.error("Error creating gudang transaction:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
