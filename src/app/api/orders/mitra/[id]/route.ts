import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MitraOrderStatus } from "@prisma/client"
import { sendPushToUser, PushTemplates } from "@/lib/push"

// PATCH update mitra order status
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const { role, id: userId } = session.user
        const body = await request.json()

        // Validate permission
        const order = await prisma.mitraOrder.findUnique({
            where: { id },
            include: { mitra: { select: { id: true, name: true } } }
        })
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        // Stokis can approve/process/ship
        if (role === "STOKIS" && order.stokisId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Mitra can only mark as received
        if (role === "MITRA" && (order.mitraId !== userId || body.status !== "RECEIVED")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Handle adjust action
        if (body.action === "adjust") {
            const { adjustedItems, notes } = body as {
                action: string
                adjustedItems: { id: string; quantity: number }[]
                notes?: string
            }

            // Only Stokis can adjust, and only for PENDING orders
            if (role !== "STOKIS" || order.stokisId !== userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 })
            }

            if (order.status !== "PENDING") {
                return NextResponse.json({ error: "Hanya order PENDING yang bisa direvisi" }, { status: 400 })
            }

            // Update each item quantity
            let newTotal = 0
            for (const item of adjustedItems) {
                const orderItem = await prisma.mitraOrderItem.findUnique({
                    where: { id: item.id }
                })
                if (orderItem) {
                    await prisma.mitraOrderItem.update({
                        where: { id: item.id },
                        data: { quantity: item.quantity }
                    })
                    newTotal += item.quantity * Number(orderItem.price)
                }
            }

            // Delete items with 0 quantity
            await prisma.mitraOrderItem.deleteMany({
                where: {
                    orderId: id,
                    quantity: 0
                }
            })

            // Update order total and notes
            const updated = await prisma.mitraOrder.update({
                where: { id },
                data: {
                    totalAmount: newTotal,
                    notes: notes ? `${order.notes || ""}\n[Revisi] ${notes}`.trim() : order.notes
                },
                include: {
                    items: { include: { product: true } },
                    mitra: { select: { name: true } },
                },
            })

            return NextResponse.json(updated)
        }

        // Handle status update
        const { status } = body as { status: MitraOrderStatus }

        const updateData: Record<string, unknown> = { status }
        if (status === "APPROVED") updateData.approvedAt = new Date()
        if (status === "SHIPPED") updateData.shippedAt = new Date()
        if (status === "RECEIVED") updateData.receivedAt = new Date()

        const updated = await prisma.mitraOrder.update({
            where: { id },
            data: updateData,
            include: {
                items: { include: { product: true } },
                mitra: { select: { name: true } },
            },
        })

        // Send push notification based on status change
        try {
            if (status === "APPROVED") {
                await sendPushToUser(order.mitraId, PushTemplates.orderApproved(order.orderNumber))
            } else if (status === "SHIPPED") {
                await sendPushToUser(order.mitraId, PushTemplates.orderShipped(order.orderNumber))
            } else if (status === "RECEIVED" && order.stokisId) {
                await sendPushToUser(order.stokisId, PushTemplates.orderReceived(order.orderNumber))
            }
        } catch (pushError) {
            console.error("Push notification error:", pushError)
            // Don't fail the update if push fails
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Error updating mitra order:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
