import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateOrdersPDF } from "@/lib/pdf"

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only allow GUDANG, PUSAT, FINANCE roles
        if (!["GUDANG", "PUSAT", "FINANCE"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")
        const status = searchParams.get("status") // Optional: PO_ISSUED, PROCESSING, SHIPPED

        // Build where clause - only PO that gudang can see
        const where: Record<string, unknown> = {
            status: {
                in: ["PO_ISSUED", "PROCESSING", "SHIPPED", "COMPLETED"]
            }
        }

        // Filter by specific status if provided
        if (status && ["PO_ISSUED", "PROCESSING", "SHIPPED", "COMPLETED"].includes(status)) {
            where.status = status
        }

        // Add date filter
        if (startDate && endDate) {
            const start = new Date(startDate)
            start.setHours(0, 0, 0, 0)

            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)

            where.createdAt = {
                gte: start,
                lte: end,
            }
        }

        // Get orders for gudang
        const orders = await prisma.stokisOrder.findMany({
            where,
            include: {
                stokis: { select: { name: true, address: true } },
                items: { 
                    include: { 
                        product: {
                            include: {
                                gudang: { select: { name: true } }
                            }
                        }
                    }
                },
            },
            orderBy: { poIssuedAt: "desc" },
        })

        // Format for PDF
        const formattedOrders = orders.map((order) => ({
            orderNumber: order.orderNumber,
            date: order.poIssuedAt 
                ? new Date(order.poIssuedAt).toLocaleDateString("id-ID")
                : new Date(order.createdAt).toLocaleDateString("id-ID"),
            customer: order.stokis?.name || "-",
            status: order.status,
            total: Number(order.totalAmount),
            items: order.items.map((item) => ({
                name: item.product.name,
                qty: item.quantity,
                price: Number(item.price),
            })),
        }))

        // Generate PDF
        const pdfBuffer = generateOrdersPDF(formattedOrders, "Laporan PO Masuk Gudang")

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="gudang-po-${Date.now()}.pdf"`,
            },
        })
    } catch (error) {
        console.error("Error generating Gudang PO PDF:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
