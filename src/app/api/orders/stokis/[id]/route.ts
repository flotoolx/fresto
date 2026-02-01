import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StokisOrderStatus, Role } from "@prisma/client"
import { sendPushToUser, sendPushToRole, PushTemplates } from "@/lib/push"
import { generateInvoice } from "@/lib/invoice"

// PATCH update stokis order status
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
        const { status } = body as { status: StokisOrderStatus }

        const order = await prisma.stokisOrder.findUnique({
            where: { id },
            include: { stokis: { select: { id: true, name: true } } }
        })
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        // Permission check
        const allowedTransitions: Record<string, { roles: string[]; from: string[] }> = {
            PENDING_FINANCE: { roles: ["PUSAT"], from: ["PENDING_PUSAT"] },
            PO_ISSUED: { roles: ["FINANCE"], from: ["PENDING_FINANCE"] },
            PROCESSING: { roles: ["GUDANG"], from: ["PO_ISSUED"] },
            SHIPPED: { roles: ["GUDANG"], from: ["PROCESSING"] },
            RECEIVED: { roles: ["STOKIS"], from: ["SHIPPED"] },
            CANCELLED: { roles: ["PUSAT", "STOKIS"], from: ["PENDING_PUSAT", "PENDING_FINANCE"] },
        }

        const transition = allowedTransitions[status]
        if (!transition) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 })
        }

        if (!transition.roles.includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        if (!transition.from.includes(order.status)) {
            return NextResponse.json({ error: `Cannot change from ${order.status} to ${status}` }, { status: 400 })
        }

        // Stokis can only update their own orders
        if (role === "STOKIS" && order.stokisId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const updateData: Record<string, unknown> = { status }
        if (status === "PENDING_FINANCE") updateData.pusatApproveAt = new Date()
        if (status === "PO_ISSUED") {
            updateData.financeApproveAt = new Date()
            updateData.poIssuedAt = new Date()
        }
        if (status === "SHIPPED") updateData.shippedAt = new Date()
        if (status === "RECEIVED") updateData.receivedAt = new Date()

        const updated = await prisma.stokisOrder.update({
            where: { id },
            data: updateData,
            include: {
                items: { include: { product: true } },
                stokis: { select: { name: true } },
            },
        })

        // Send push notifications based on status change
        try {
            if (status === "PENDING_FINANCE") {
                // Notify Finance that PO needs approval
                await sendPushToRole("FINANCE" as Role,
                    PushTemplates.poNeedsApproval(order.orderNumber, order.stokis.name)
                )
            } else if (status === "PO_ISSUED") {
                // Generate Invoice automatically
                try {
                    await generateInvoice(order.id)
                    console.log(`Invoice generated for order ${order.orderNumber}`)
                } catch (invoiceError) {
                    console.error("Invoice generation error:", invoiceError)
                }

                // Notify Gudang that PO is ready
                await sendPushToRole("GUDANG" as Role,
                    PushTemplates.poApproved(order.orderNumber)
                )
                // Also notify Stokis
                await sendPushToUser(order.stokisId, {
                    title: "✅ PO Disetujui Finance",
                    body: `PO ${order.orderNumber} sedang diproses Gudang`,
                    url: "/dashboard/history-pusat"
                })
            } else if (status === "SHIPPED") {
                // Notify Stokis order is shipped
                await sendPushToUser(order.stokisId,
                    PushTemplates.orderShipped(order.orderNumber)
                )
            } else if (status === "CANCELLED") {
                // Notify Stokis order is cancelled
                await sendPushToUser(order.stokisId, {
                    title: "❌ Order Dibatalkan",
                    body: `PO ${order.orderNumber} telah dibatalkan`,
                    url: "/dashboard/history-pusat"
                })
            }
        } catch (pushError) {
            console.error("Push notification error:", pushError)
            // Don't fail the update if push fails
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Error updating stokis order:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
