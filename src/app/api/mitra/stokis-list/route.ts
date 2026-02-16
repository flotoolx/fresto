import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/mitra/stokis-list — Mitra gets their assigned Stokis list
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== "MITRA") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const mitraId = session.user.id

        // First check junction table
        const assignments = await prisma.mitraStokis.findMany({
            where: { mitraId },
            include: {
                stokis: {
                    select: { id: true, name: true, uniqueCode: true }
                }
            },
            orderBy: { isPrimary: "desc" }, // Primary first
        })

        if (assignments.length > 0) {
            return NextResponse.json(
                assignments.map(a => ({
                    stokisId: a.stokis.id,
                    stokisName: a.stokis.name,
                    stokisCode: a.stokis.uniqueCode,
                    isPrimary: a.isPrimary,
                }))
            )
        }

        // Fallback: use legacy stokisId on User
        const mitra = await prisma.user.findUnique({
            where: { id: mitraId },
            select: {
                stokis: {
                    select: { id: true, name: true, uniqueCode: true }
                }
            }
        })

        if (mitra?.stokis) {
            return NextResponse.json([{
                stokisId: mitra.stokis.id,
                stokisName: mitra.stokis.name,
                stokisCode: mitra.stokis.uniqueCode,
                isPrimary: true,
            }])
        }

        return NextResponse.json([])
    } catch (error) {
        console.error("Error fetching stokis list:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
