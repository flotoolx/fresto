import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get orders created by the logged-in Stokis
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only Stokis can access their own orders
        if (session.user.role !== "STOKIS") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const orders = await prisma.stokisOrder.findMany({
            where: {
                stokisId: session.user.id,
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                gudang: { select: { name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(orders)
    } catch (error) {
        console.error("Error fetching stokis orders:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
