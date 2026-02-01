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

        // Get users with role STOKIS
        const stokis = await prisma.user.findMany({
            where: { role: "STOKIS" },
            select: {
                id: true,
                name: true,
                email: true,
                address: true,
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(stokis)
    } catch (error) {
        console.error("Error fetching stokis:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
