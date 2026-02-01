import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET PO data for Mitra Order
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

        const order = await prisma.mitraOrder.findUnique({
            where: { id },
            include: {
                mitra: { select: { name: true, address: true, phone: true } },
                stokis: { select: { name: true, address: true, phone: true } },
                items: {
                    include: {
                        product: { select: { name: true, sku: true, unit: true } }
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
        }

        // Check access permission
        const { role, id: userId } = session.user
        if (role === "MITRA" && order.mitraId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        if (role === "STOKIS" && order.stokisId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const poData = {
            type: "mitra",
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            totalAmount: Number(order.totalAmount),
            notes: order.notes,
            from: {
                name: order.mitra.name,
                address: order.mitra.address,
                phone: order.mitra.phone
            },
            to: {
                name: order.stokis.name,
                address: order.stokis.address,
                phone: order.stokis.phone
            },
            items: order.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: Number(item.price),
                product: item.product
            })),
            approvedAt: order.approvedAt?.toISOString()
        }

        return NextResponse.json(poData)
    } catch (error) {
        console.error("Error fetching mitra PO:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
