import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { role, dcId } = session.user
        const { searchParams } = new URL(request.url)
        const dcFilter = searchParams.get("dcFilter")

        let where: Record<string, unknown> = { role: { in: ["STOKIS", "DC"] } }

        // FINANCE_DC only sees Stokis/DC in their area
        if (role === "FINANCE_DC" && dcId) {
            where = {
                OR: [
                    { role: "STOKIS", dcId: dcId },
                    { role: "DC", id: dcId },
                ]
            }
        } else if (role === "PUSAT" || role === "FINANCE") {
            // Pusat/Finance — only stokis without DC area
            where = { role: "STOKIS", dcId: null }
        } else if (role === "FINANCE_ALL") {
            // FINANCE_ALL — all DC branches, with optional dcFilter
            if (dcFilter) {
                where = {
                    OR: [
                        { role: "STOKIS", dcId: dcFilter },
                        { role: "DC", id: dcFilter },
                    ]
                }
            } else {
                where = {
                    OR: [
                        { role: "STOKIS", dcId: { not: null } },
                        { role: "DC" },
                    ]
                }
            }
        }

        const stokis = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                address: true,
                role: true,
                dcId: true,
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(stokis)
    } catch (error) {
        console.error("Error fetching stokis:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
