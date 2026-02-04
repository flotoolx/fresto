import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get payment details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!["FINANCE", "PUSAT"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                invoice: {
                    include: {
                        order: {
                            include: {
                                stokis: { select: { id: true, name: true, email: true } }
                            }
                        }
                    }
                }
            }
        })

        if (!payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 })
        }

        return NextResponse.json(payment)
    } catch (error) {
        console.error("Error fetching payment:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE - Cancel/delete payment
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only FINANCE can delete payments
        if (session.user.role !== "FINANCE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        const payment = await prisma.payment.findUnique({
            where: { id },
            include: { invoice: true }
        })

        if (!payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 })
        }

        // Delete payment
        await prisma.payment.delete({ where: { id } })

        // Update invoice paidAmount and status
        const newPaidAmount = Number(payment.invoice.paidAmount) - Number(payment.amount)
        const wasFullyPaid = payment.invoice.status === "PAID"

        // Determine new status
        let newStatus = payment.invoice.status
        if (wasFullyPaid) {
            // Check if overdue
            const now = new Date()
            newStatus = new Date(payment.invoice.dueDate) < now ? "OVERDUE" : "UNPAID"
        }

        await prisma.invoice.update({
            where: { id: payment.invoiceId },
            data: {
                paidAmount: Math.max(0, newPaidAmount),
                status: newStatus,
                paidAt: null
            }
        })

        return NextResponse.json({ message: "Payment deleted successfully" })
    } catch (error) {
        console.error("Error deleting payment:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
