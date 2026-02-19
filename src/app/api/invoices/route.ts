import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { markInvoiceAsPaid } from "@/lib/invoice"

// GET list invoices
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { role, id: userId, dcId } = session.user
        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status")
        const dcFilter = searchParams.get("dcFilter")

        let where: Record<string, unknown> = {}

        // Filter by role
        if (role === "STOKIS") {
            where = {
                order: { stokisId: userId }
            }
        } else if (role === "FINANCE_DC") {
            where = {
                order: { stokis: { dcId: dcId } }
            }
        } else if (role === "PUSAT" || role === "FINANCE") {
            // Pusat/Finance — only pusat-direct stokis (dcId = null)
            where = {
                order: { stokis: { dcId: null } }
            }
        } else if (role === "FINANCE_ALL") {
            // FINANCE_ALL sees all DC branches, with optional dcFilter
            if (dcFilter) {
                where = { order: { stokis: { dcId: dcFilter } } }
            } else {
                where = { order: { stokis: { dcId: { not: null } } } }
            }
        } else if (role === "MANAGER_PUSAT") {
            // MANAGER_PUSAT sees ALL invoices (DC + pusat), with optional dcFilter
            if (dcFilter) {
                where = { order: { stokis: { dcId: dcFilter } } }
            } else {
                where = {} // no filter — sees everything
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Filter by status
        if (status && status !== "ALL") {
            const statuses = status.split(",").map(s => s.trim().toUpperCase())
            if (statuses.length > 0) {
                where.status = { in: statuses }
            }
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                order: {
                    include: {
                        stokis: { select: { id: true, name: true, email: true, phone: true, dcId: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(invoices)
    } catch (error) {
        console.error("Error fetching invoices:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST - mark invoice as paid (alternative to PATCH)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!["PUSAT", "FINANCE", "FINANCE_DC", "FINANCE_ALL", "MANAGER_PUSAT"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { invoiceId, action } = await request.json()

        if (action === "mark_paid") {
            const invoice = await markInvoiceAsPaid(invoiceId)
            return NextResponse.json(invoice)
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Error updating invoice:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
