import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET mitra analytics for Pusat
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const period = searchParams.get("period") || "30" // days
        const stokisId = searchParams.get("stokisId")

        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - parseInt(period))

        // Get all mitra orders within period
        const where: Record<string, unknown> = {
            createdAt: { gte: dateFrom },
        }
        if (stokisId) {
            where.stokisId = stokisId
        }

        const orders = await prisma.mitraOrder.findMany({
            where,
            include: {
                mitra: { select: { id: true, name: true, address: true } },
                stokis: { select: { id: true, name: true } },
            },
        })

        // Aggregate by mitra
        const mitraStats: Record<string, {
            mitraId: string
            mitraName: string
            mitraAddress: string | null
            stokisName: string
            orderCount: number
            totalAmount: number
        }> = {}

        for (const order of orders) {
            const key = order.mitraId
            if (!mitraStats[key]) {
                mitraStats[key] = {
                    mitraId: order.mitraId,
                    mitraName: order.mitra.name,
                    mitraAddress: order.mitra.address,
                    stokisName: order.stokis.name,
                    orderCount: 0,
                    totalAmount: 0,
                }
            }
            mitraStats[key].orderCount++
            mitraStats[key].totalAmount += Number(order.totalAmount)
        }

        // Sort by order count descending
        const rankings = Object.values(mitraStats).sort((a, b) => b.orderCount - a.orderCount)

        // Get total mitra count for inactive check
        const totalMitra = await prisma.user.count({ where: { role: "MITRA", isActive: true } })
        const activeMitra = rankings.length
        const inactiveMitra = totalMitra - activeMitra

        return NextResponse.json({
            period: parseInt(period),
            totalMitra,
            activeMitra,
            inactiveMitra,
            rankings,
        })
    } catch (error) {
        console.error("Error fetching analytics:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
