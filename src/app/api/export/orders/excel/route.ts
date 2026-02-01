import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateOrdersExcel } from "@/lib/excel"

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type") || "mitra"
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")

        // Build where clause
        const where: Record<string, unknown> = {}

        // Add date filter with proper end of day time
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

        // Get orders - filter by logged-in user
        let orders
        if (type === "stokis") {
            // For Stokis orders, filter by the logged-in stokis
            if (session.user.role === "STOKIS") {
                where.stokisId = session.user.id
            }
            orders = await prisma.stokisOrder.findMany({
                where,
                include: {
                    stokis: { select: { name: true } },
                    items: { include: { product: true } },
                },
                orderBy: { createdAt: "desc" },
            })
        } else {
            // For Mitra orders, filter by the logged-in mitra
            if (session.user.role === "MITRA") {
                where.mitraId = session.user.id
            }
            orders = await prisma.mitraOrder.findMany({
                where,
                include: {
                    mitra: { select: { name: true } },
                    items: { include: { product: true } },
                },
                orderBy: { createdAt: "desc" },
            })
        }

        // Format for Excel
        const formattedOrders = orders.map((order) => ({
            orderNumber: order.orderNumber,
            date: new Date(order.createdAt).toLocaleDateString("id-ID"),
            customer: "mitra" in order ? order.mitra?.name || "-" : (order as { stokis?: { name: string } }).stokis?.name || "-",
            status: order.status,
            total: Number(order.totalAmount),
            items: order.items.map((item) => ({
                name: item.product.name,
                qty: item.quantity,
                price: Number(item.price),
            })),
        }))

        // Generate Excel
        const sheetName = type === "stokis" ? "Order Stokis" : "Order Mitra"
        const excelBuffer = generateOrdersExcel(formattedOrders, sheetName)

        return new NextResponse(excelBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="orders-${type}-${Date.now()}.xlsx"`,
            },
        })
    } catch (error) {
        console.error("Error generating Excel:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
