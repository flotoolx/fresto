import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only PUSAT and FINANCE can check outstanding
        if (!["PUSAT", "FINANCE"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        // Get stokis info
        const stokis = await prisma.user.findUnique({
            where: { id, role: "STOKIS" },
            select: { id: true, name: true, email: true }
        })

        if (!stokis) {
            return NextResponse.json({ error: "Stokis not found" }, { status: 404 })
        }

        // Get all unpaid/overdue invoices for this stokis through order relation
        const invoices = await prisma.invoice.findMany({
            where: {
                order: {
                    stokisId: id
                },
                status: { in: ["UNPAID", "OVERDUE"] }
            },
            orderBy: { dueDate: "asc" }
        })

        // Calculate totals
        const now = new Date()
        let unpaidCount = 0
        let unpaidAmount = 0
        let overdueCount = 0
        let overdueAmount = 0

        const invoiceDetails = invoices.map(inv => {
            const amount = Number(inv.amount)
            const isOverdue = inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < now)

            if (isOverdue) {
                overdueCount++
                overdueAmount += amount
            } else {
                unpaidCount++
                unpaidAmount += amount
            }

            return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                amount,
                dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : null,
                status: isOverdue ? "OVERDUE" : "UNPAID",
                createdAt: inv.createdAt
            }
        })

        const totalOutstanding = unpaidAmount + overdueAmount

        return NextResponse.json({
            stokisId: stokis.id,
            stokisName: stokis.name,
            stokisEmail: stokis.email,
            totalOutstanding,
            unpaidCount,
            unpaidAmount,
            overdueCount,
            overdueAmount,
            hasOutstanding: totalOutstanding > 0,
            invoices: invoiceDetails
        })
    } catch (error) {
        console.error("Error fetching outstanding:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
