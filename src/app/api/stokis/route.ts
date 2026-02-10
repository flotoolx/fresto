import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { role, dcId } = session.user

        let where: Record<string, unknown> = { role: { in: ["STOKIS", "DC"] } }

        // FINANCE_DC only sees Stokis/DC in their area
        if (role === "FINANCE_DC" && dcId) {
            where = {
                OR: [
                    { role: "STOKIS", dcId: dcId },
                    { role: "DC", id: dcId },
                ]
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
