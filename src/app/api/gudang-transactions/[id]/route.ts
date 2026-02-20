import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== "GUDANG") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Verify the transaction belongs to user's gudang
        const transaction = await prisma.gudangTransaction.findUnique({
            where: { id },
        })

        if (!transaction) {
            return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
        }

        if (transaction.gudangId !== session.user.gudangId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        await prisma.gudangTransaction.delete({ where: { id } })

        return NextResponse.json({ message: "Transaksi dihapus" })
    } catch (error) {
        console.error("Error deleting transaction:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
