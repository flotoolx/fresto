import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get DC detail
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

        const dc = await prisma.user.findUnique({
            where: { id, role: "DC" },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                isActive: true,
                createdAt: true,
            }
        })

        if (!dc) {
            return NextResponse.json({ error: "DC not found" }, { status: 404 })
        }

        return NextResponse.json(dc)
    } catch (error) {
        console.error("Error fetching DC:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// PATCH - Update DC
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, phone, address, isActive } = body

        const dc = await prisma.user.update({
            where: { id, role: "DC" },
            data: {
                ...(name && { name }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(isActive !== undefined && { isActive }),
            }
        })

        return NextResponse.json({
            id: dc.id,
            name: dc.name,
            email: dc.email,
            isActive: dc.isActive,
        })
    } catch (error) {
        console.error("Error updating DC:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE - Soft delete DC (deactivate)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        await prisma.user.update({
            where: { id, role: "DC" },
            data: { isActive: false }
        })

        return NextResponse.json({ message: "DC deactivated successfully" })
    } catch (error) {
        console.error("Error deleting DC:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
