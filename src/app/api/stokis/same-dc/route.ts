import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/stokis/same-dc — Get other Stokis in the same DC area (for assigning secondary Stokis)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== "STOKIS") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Get current stokis DC
        const currentStokis = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { dcId: true }
        })

        if (!currentStokis?.dcId) {
            return NextResponse.json([])
        }

        // Find other Stokis in the same DC, excluding self
        const otherStokis = await prisma.user.findMany({
            where: {
                role: "STOKIS",
                dcId: currentStokis.dcId,
                id: { not: session.user.id },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                uniqueCode: true,
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(otherStokis)
    } catch (error) {
        console.error("Error fetching same-dc stokis:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
