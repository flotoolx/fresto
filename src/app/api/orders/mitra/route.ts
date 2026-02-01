import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateOrderNumber, formatCurrency } from "@/lib/utils"
import { sendPushToUser, PushTemplates } from "@/lib/push"

// GET mitra orders - for Mitra (own orders) or Stokis (orders from their mitra)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { role, id: userId } = session.user

        let where = {}
        if (role === "MITRA") {
            where = { mitraId: userId }
        } else if (role === "STOKIS") {
            where = { stokisId: userId }
        } else if (role === "PUSAT") {
            // Can see all orders
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const orders = await prisma.mitraOrder.findMany({
            where,
            include: {
                mitra: { select: { id: true, name: true, email: true, address: true } },
                stokis: { select: { id: true, name: true } },
                items: { include: { product: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(orders)
    } catch (error) {
        console.error("Error fetching mitra orders:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST create mitra order (Mitra only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "MITRA") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const mitraId = session.user.id
        const mitraName = session.user.name || "Mitra"

        // Get mitra's assigned stokis
        const mitra = await prisma.user.findUnique({
            where: { id: mitraId },
            select: { stokisId: true },
        })

        if (!mitra?.stokisId) {
            return NextResponse.json(
                { error: "Anda belum memiliki Stokis yang ditunjuk" },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { items, notes } = body // items: [{ productId, quantity }]

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Items tidak boleh kosong" }, { status: 400 })
        }

        // Get product prices
        const productIds = items.map((item: { productId: string }) => item.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        })

        const productMap = new Map(products.map((p) => [p.id, p]))

        // Calculate total and prepare items
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

        // Create order
        const order = await prisma.mitraOrder.create({
            data: {
                orderNumber: generateOrderNumber("MTR"),
                mitraId,
                stokisId: mitra.stokisId,
                totalAmount,
                notes,
                items: { create: orderItems },
            },
            include: {
                items: { include: { product: true } },
                stokis: { select: { name: true } },
            },
        })

        // Send push notification to Stokis
        try {
            await sendPushToUser(
                mitra.stokisId,
                PushTemplates.newOrder(order.orderNumber, mitraName, formatCurrency(totalAmount))
            )
        } catch (pushError) {
            console.error("Push notification error:", pushError)
            // Don't fail the order if push fails
        }

        return NextResponse.json(order, { status: 201 })
    } catch (error) {
        console.error("Error creating mitra order:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
