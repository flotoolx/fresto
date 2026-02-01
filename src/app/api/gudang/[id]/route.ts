import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, code, address } = body

        const gudang = await prisma.gudang.update({
            where: { id },
            data: {
                name: name || undefined,
                code: code || undefined,
                address: address !== undefined ? address : undefined,
            },
        })

        return NextResponse.json(gudang)
    } catch (error) {
        console.error("Error updating gudang:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { id } = await params

        // Check if gudang has products
        const productCount = await prisma.product.count({ where: { gudangId: id } })
        if (productCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete gudang with products" },
                { status: 400 }
            )
        }

        await prisma.gudang.delete({ where: { id } })

        return NextResponse.json({ message: "Gudang deleted" })
    } catch (error) {
        console.error("Error deleting gudang:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
