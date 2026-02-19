import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET single invoice detail
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        stokis: { select: { name: true, email: true, phone: true, address: true } },
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        })

        if (!invoice) {
            return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 })
        }

        // Check access
        const { role, id: userId } = session.user
        if (role === "STOKIS" && invoice.order.stokisId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        if (role === "MITRA" || role === "GUDANG") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json(invoice)
    } catch (error) {
        console.error("Error fetching invoice:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// PATCH update invoice status
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!["PUSAT", "FINANCE", "FINANCE_DC", "FINANCE_ALL", "MANAGER_PUSAT"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const { status } = await request.json()

        const updateData: Record<string, unknown> = { status }

        if (status === "PAID") {
            updateData.paidAt = new Date()
        }

        const invoice = await prisma.invoice.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json(invoice)
    } catch (error) {
        console.error("Error updating invoice:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
