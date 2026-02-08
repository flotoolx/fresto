import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StokisOrderStatus, Role } from "@prisma/client"
import { sendPushToUser, sendPushToRole, PushTemplates } from "@/lib/push"
import { generateInvoice } from "@/lib/invoice"

interface AdjustedItem {
    id: string
    quantity: number
}

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

        // Handle adjust action
        if (body.action === "adjust") {
            // FINANCE, PUSAT, and STOKIS can adjust
            if (!["FINANCE", "PUSAT", "STOKIS"].includes(role)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 })
            }

            const { adjustedItems, notes } = body as {
                adjustedItems: AdjustedItem[]
                notes?: string
            }

            const order = await prisma.stokisOrder.findUnique({
                where: { id },
                include: {
                    items: true,
                    stokis: { select: { id: true, name: true } }
                }
            })

            if (!order) {
                return NextResponse.json({ error: "Order not found" }, { status: 404 })
            }

            // Stokis can only adjust their own orders in PENDING states
            if (role === "STOKIS") {
                if (order.stokisId !== userId) {
                    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
                }
                if (!["PENDING_PUSAT", "PENDING_FINANCE"].includes(order.status)) {
                    return NextResponse.json({ error: "Cannot adjust order in this status" }, { status: 400 })
                }
            }

            // Finance/PUSAT can adjust PENDING_PUSAT or PENDING_FINANCE orders
            if (["FINANCE", "PUSAT"].includes(role) && !["PENDING_PUSAT", "PENDING_FINANCE"].includes(order.status)) {
                return NextResponse.json({ error: "Cannot adjust order in this status" }, { status: 400 })
            }

            // Update items and recalculate total
            let newTotal = 0
            for (const adj of adjustedItems) {
                const item = order.items.find(i => i.id === adj.id)
                if (item && adj.quantity >= 0) {
                    if (adj.quantity === 0) {
                        // Delete item if quantity is 0
                        await prisma.stokisOrderItem.delete({ where: { id: adj.id } })
                    } else if (adj.quantity !== item.quantity) {
                        // Update quantity if changed
                        await prisma.stokisOrderItem.update({
                            where: { id: adj.id },
                            data: { quantity: adj.quantity }
                        })
                        newTotal += Number(item.price) * adj.quantity
                    } else {
                        newTotal += Number(item.price) * item.quantity
                    }
                }
            }

            // Update order with new total and notes
            const updateData: Record<string, unknown> = {
                totalAmount: newTotal,
            }

            // Append adjustment notes
            if (notes) {
                const existingNotes = order.notes || ""
                updateData.notes = existingNotes
                    ? `${existingNotes}\n[ADJUSTED] ${notes}`
                    : `[ADJUSTED] ${notes}`
            }

            // If Finance or PUSAT adjusts, also approve the PO
            if (["FINANCE", "PUSAT"].includes(role)) {
                updateData.status = "PO_ISSUED" as StokisOrderStatus
                updateData.financeApproveAt = new Date()
                updateData.poIssuedAt = new Date()

                // Generate Invoice
                try {
                    await generateInvoice(order.id)
                } catch (invoiceError) {
                    console.error("Invoice generation error:", invoiceError)
                }

                // Notify
                await sendPushToRole("GUDANG" as Role, PushTemplates.poApproved(order.orderNumber))
                await sendPushToUser(order.stokisId, {
                    title: "✅ PO Disetujui (Adjusted)",
                    body: `PO ${order.orderNumber} telah disesuaikan dan disetujui`,
                    url: "/dashboard/history-pusat"
                })
            }

            const updated = await prisma.stokisOrder.update({
                where: { id },
                data: updateData,
                include: {
                    items: { include: { product: true } },
                    stokis: { select: { name: true } },
                },
            })

            return NextResponse.json(updated)
        }

        // Handle status change
        const { status } = body as { status: StokisOrderStatus }

        const order = await prisma.stokisOrder.findUnique({
            where: { id },
            include: { stokis: { select: { id: true, name: true } } }
        })
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        // Permission check - PUSAT and FINANCE can approve PO directly from PENDING_PUSAT
        const allowedTransitions: Record<string, { roles: string[]; from: string[] }> = {
            PENDING_FINANCE: { roles: ["PUSAT"], from: ["PENDING_PUSAT"] },
            PO_ISSUED: { roles: ["FINANCE", "PUSAT"], from: ["PENDING_PUSAT", "PENDING_FINANCE"] },
            PROCESSING: { roles: ["GUDANG"], from: ["PO_ISSUED"] },
            SHIPPED: { roles: ["GUDANG"], from: ["PROCESSING"] },
            RECEIVED: { roles: ["STOKIS"], from: ["SHIPPED"] },
            CANCELLED: { roles: ["PUSAT", "FINANCE", "STOKIS"], from: ["PENDING_PUSAT", "PENDING_FINANCE"] },
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
        if (["PENDING_FINANCE"].includes(status)) updateData.pusatApproveAt = new Date()
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
            if (["PENDING_FINANCE"].includes(status)) {
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

