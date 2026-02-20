import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GudangTransaction } from "@prisma/client"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== "GUDANG") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const gudangId = session.user.gudangId
        if (!gudangId) {
            return NextResponse.json({ error: "Gudang tidak ditemukan" }, { status: 403 })
        }

        // Get all transactions for this gudang
        const transactions: GudangTransaction[] = await prisma.gudangTransaction.findMany({
            where: { gudangId },
        })

        // Calculate totals per type
        const masuk = transactions.filter(t => t.type === "MASUK")
        const keluar = transactions.filter(t => t.type === "KELUAR")
        const pemakaian = transactions.filter(t => t.type === "PEMAKAIAN")
        const produksi = transactions.filter(t => t.type === "PRODUKSI")

        const summary = {
            totalMasukEkor: masuk.reduce((s: number, t) => s + (t.ekor || 0), 0),
            totalMasukKg: masuk.reduce((s: number, t) => s + Number(t.kg || 0), 0),
            totalMasukQty: masuk.reduce((s: number, t) => s + Number(t.qty || 0), 0),
            totalKeluarEkor: keluar.reduce((s: number, t) => s + (t.ekor || 0), 0),
            totalKeluarQty: keluar.reduce((s: number, t) => s + Number(t.qty || 0), 0),
            totalPemakaianQty: pemakaian.reduce((s: number, t) => s + Number(t.qty || 0), 0),
            totalProduksiQty: produksi.reduce((s: number, t) => s + Number(t.qty || 0), 0),
            stokEkor: masuk.reduce((s: number, t) => s + (t.ekor || 0), 0) - keluar.reduce((s: number, t) => s + (t.ekor || 0), 0),
            stokKg: masuk.reduce((s: number, t) => s + Number(t.kg || 0), 0),
            stokQty: masuk.reduce((s: number, t) => s + Number(t.qty || 0), 0) - keluar.reduce((s: number, t) => s + Number(t.qty || 0), 0) - pemakaian.reduce((s: number, t) => s + Number(t.qty || 0), 0),
            transactionCount: transactions.length,
        }

        return NextResponse.json(summary)
    } catch (error) {
        console.error("Error fetching gudang inventory:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
