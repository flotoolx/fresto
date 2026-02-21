import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
        const { transactionDate, jenisBumbu, notes, items } = body

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Minimal 1 bahan baku harus diisi" }, { status: 400 })
        }

        if (!jenisBumbu) {
            return NextResponse.json({ error: "Jenis bumbu jadi harus dipilih" }, { status: 400 })
        }

        // Validate each item
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (!item.productName || !item.qty || Number(item.qty) <= 0) {
                return NextResponse.json({ error: `Bahan baku #${i + 1}: nama dan jumlah wajib diisi` }, { status: 400 })
            }
        }

        // Auto-generate batchId: BATCH-BMB-YYYYMMDD-HHmm
        const now = new Date()
        const pad = (n: number) => n.toString().padStart(2, "0")
        const batchId = `BATCH-BMB-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`

        const txDate = transactionDate ? new Date(transactionDate) : now

        // Create all transactions in a single prisma transaction
        const transactions = await prisma.$transaction(
            items.map((item: { productName: string; qty: string | number; unit?: string; kemasan?: string }) =>
                prisma.gudangTransaction.create({
                    data: {
                        gudangId,
                        type: "PEMAKAIAN",
                        category: "BAHAN_BAKU_BUMBU",
                        transactionDate: txDate,
                        createdBy: session.user.id,
                        productName: item.productName,
                        qty: parseFloat(String(item.qty)),
                        unit: item.unit || "kg",
                        kemasan: item.kemasan || null,
                        jenisBumbu: jenisBumbu,
                        notes: notes || null,
                        batchId,
                        userName: session.user.name || null,
                    },
                })
            )
        )

        return NextResponse.json({ batchId, items: transactions }, { status: 201 })
    } catch (error) {
        console.error("Error creating batch transaction:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
