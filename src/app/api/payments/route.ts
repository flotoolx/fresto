import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaymentMethod } from "@prisma/client"

// GET - List all payments
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only FINANCE, FINANCE_DC, FINANCE_ALL, MANAGER_PUSAT, and PUSAT can view payments
        if (!["FINANCE", "FINANCE_DC", "FINANCE_ALL", "MANAGER_PUSAT", "PUSAT"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const invoiceId = searchParams.get("invoiceId")
        const stokisId = searchParams.get("stokisId")
        const dcFilter = searchParams.get("dcFilter")
        const { role, dcId } = session.user

        const where: Record<string, unknown> = {}

        if (invoiceId) {
            where.invoiceId = invoiceId
        }

        if (stokisId) {
            where.invoice = {
                order: {
                    stokisId
                }
            }
        }

        // Role-based area isolation
        if (role === "PUSAT" || role === "FINANCE") {
            // Pusat-direct stokis only (dcId = null)
            where.invoice = { ...(where.invoice as object || {}), order: { stokis: { dcId: null } } }
        } else if (role === "FINANCE_DC") {
            where.invoice = { ...(where.invoice as object || {}), order: { stokis: { dcId: dcId } } }
        } else if (role === "FINANCE_ALL") {
            if (dcFilter) {
                where.invoice = { ...(where.invoice as object || {}), order: { stokis: { dcId: dcFilter } } }
            } else {
                where.invoice = { ...(where.invoice as object || {}), order: { stokis: { dcId: { not: null } } } }
            }
        } else if (role === "MANAGER_PUSAT") {
            // MANAGER_PUSAT sees ALL payments (DC + pusat)
            if (dcFilter) {
                where.invoice = { ...(where.invoice as object || {}), order: { stokis: { dcId: dcFilter } } }
            }
            // no else — sees everything without filter
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                invoice: {
                    include: {
                        order: {
                            include: {
                                stokis: { select: { id: true, name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(payments)
    } catch (error) {
        console.error("Error fetching payments:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST - Create new payment
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // FINANCE, FINANCE_DC, FINANCE_ALL, and MANAGER_PUSAT can create payments
        if (!["FINANCE", "FINANCE_DC", "FINANCE_ALL", "MANAGER_PUSAT"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { invoiceId, amount, paymentDate, method, proofImage, notes } = body

        if (!invoiceId || !amount || !paymentDate || !method) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Verify invoice exists and is not already fully paid
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        })

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
        }

        if (invoice.status === "PAID") {
            return NextResponse.json({ error: "Invoice already fully paid" }, { status: 400 })
        }

        const remainingAmount = Number(invoice.amount) - Number(invoice.paidAmount)
        if (amount > remainingAmount) {
            return NextResponse.json({
                error: `Amount exceeds remaining balance (Rp ${remainingAmount.toLocaleString('id-ID')})`
            }, { status: 400 })
        }

        // Create payment
        const payment = await prisma.payment.create({
            data: {
                invoiceId,
                amount,
                paymentDate: new Date(paymentDate),
                method: method as PaymentMethod,
                proofImage: proofImage || null,
                notes: notes || null,
                createdBy: session.user.id
            }
        })

        // Update invoice paidAmount and status
        const newPaidAmount = Number(invoice.paidAmount) + amount
        const isFullyPaid = newPaidAmount >= Number(invoice.amount)

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                paidAmount: newPaidAmount,
                status: isFullyPaid ? "PAID" : invoice.status,
                paidAt: isFullyPaid ? new Date() : null
            }
        })

        return NextResponse.json(payment, { status: 201 })
    } catch (error) {
        console.error("Error creating payment:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
