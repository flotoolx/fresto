import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET PO data for Stokis Order
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

        const order = await prisma.stokisOrder.findUnique({
            where: { id },
            include: {
                stokis: { select: { name: true, address: true, phone: true } },
                items: {
                    include: {
                        product: {
                            include: { gudang: { select: { name: true, address: true } } }
                        }
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
        }

        // Check access permission - allow Stokis owner, Pusat, Finance, Gudang
        const { role, id: userId } = session.user
        if (role === "STOKIS" && order.stokisId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        if (role === "MITRA") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const poData = {
            type: "stokis",
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            totalAmount: Number(order.totalAmount),
            notes: order.notes,
            from: {
                name: order.stokis.name,
                address: order.stokis.address,
                phone: order.stokis.phone
            },
            to: {
                name: "D'Fresto Pusat",
                address: "Jl. Pusat No. 1, Jakarta",
                phone: "021-88714564"
            },
            items: order.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: Number(item.price),
                product: {
                    name: item.product.name,
                    sku: item.product.sku,
                    unit: item.product.unit
                }
            })),
            poIssuedAt: order.poIssuedAt?.toISOString(),
            pusatApproveAt: order.pusatApproveAt?.toISOString(),
            financeApproveAt: order.financeApproveAt?.toISOString()
        }

        return NextResponse.json(poData)
    } catch (error) {
        console.error("Error fetching stokis PO:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
