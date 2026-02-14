import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateOrderNumber, formatCurrency } from "@/lib/utils"
import { sendPushToRole } from "@/lib/push"
import { Role } from "@prisma/client"

// GET stokis orders
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { role, id: userId, dcId } = session.user

        let where: Record<string, unknown> = {}
        if (role === "STOKIS") {
            where = { stokisId: userId }
        } else if (role === "PUSAT" || role === "FINANCE_ALL") {
            // PUSAT and FINANCE_ALL can see all orders
        } else if (role === "DC") {
            // DC sees orders from Stokis in their area
            where = { stokis: { dcId: userId } }
        } else if (role === "FINANCE_DC") {
            // FINANCE_DC sees orders from Stokis in their DC area
            where = { stokis: { dcId: dcId } }
        } else if (role === "FINANCE") {
            where = { status: "PENDING_PUSAT" }
        } else if (role === "GUDANG") {
            where = { status: { in: ["PENDING_PUSAT", "PO_ISSUED", "PROCESSING", "SHIPPED"] } }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const orders = await prisma.stokisOrder.findMany({
            where,
            include: {
                stokis: { select: { id: true, name: true, email: true, address: true, role: true, dcId: true } },
                items: { include: { product: { include: { gudang: true } } } },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(orders)
    } catch (error) {
        console.error("Error fetching stokis orders:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST create stokis order (Stokis only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "STOKIS") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const stokisId = session.user.id
        const stokisName = session.user.name || "Stokis"
        const body = await request.json()
        const { items, notes } = body

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Items tidak boleh kosong" }, { status: 400 })
        }

        // Get product prices
        const productIds = items.map((item: { productId: string }) => item.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        })

        const productMap = new Map(products.map((p) => [p.id, p]))

        let totalAmount = 0
        const orderItems = items.map((item: { productId: string; quantity: number }) => {
            const product = productMap.get(item.productId)
            if (!product) throw new Error(`Product ${item.productId} not found`)
            const price = Number(product.price)
            totalAmount += price * item.quantity
            return {
                productId: item.productId,
                quantity: item.quantity,
                price: price,
            }
        })

        const order = await prisma.stokisOrder.create({
            data: {
                orderNumber: generateOrderNumber("STK"),
                stokisId,
                totalAmount,
                notes,
                items: { create: orderItems },
            },
            include: {
                items: { include: { product: true } },
            },
        })

        // Send push notification to Pusat AND Finance for approval
        try {
            await sendPushToRole("PUSAT" as Role, {
                title: "🔔 PO Baru dari Stokis",
                body: `${stokisName} membuat PO ${order.orderNumber} - ${formatCurrency(totalAmount)}`,
                url: "/dashboard/approve-po"
            })
            await sendPushToRole("FINANCE" as Role, {
                title: "🔔 PO Baru dari Stokis",
                body: `${stokisName} membuat PO ${order.orderNumber} - ${formatCurrency(totalAmount)}`,
                url: "/dashboard/approve-po"
            })
        } catch (pushError) {
            console.error("Push notification error:", pushError)
        }

        return NextResponse.json(order, { status: 201 })
    } catch (error) {
        console.error("Error creating stokis order:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
