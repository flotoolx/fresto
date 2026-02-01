import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const product = await prisma.product.findUnique({
            where: { id },
            include: { gudang: true },
        })

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        return NextResponse.json(product)
    } catch (error) {
        console.error("Error fetching product:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

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
        const { name, sku, unit, price, gudangId, isActive } = body

        const updateData: Record<string, unknown> = {}
        if (name) updateData.name = name
        if (sku) updateData.sku = sku
        if (unit) updateData.unit = unit
        if (price !== undefined) updateData.price = price
        if (gudangId) updateData.gudangId = gudangId
        if (isActive !== undefined) updateData.isActive = isActive

        const product = await prisma.product.update({
            where: { id },
            data: updateData,
            include: { gudang: true },
        })

        return NextResponse.json(product)
    } catch (error) {
        console.error("Error updating product:", error)
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

        // Soft delete - set isActive to false
        await prisma.product.update({
            where: { id },
            data: { isActive: false },
        })

        return NextResponse.json({ message: "Product deleted" })
    } catch (error) {
        console.error("Error deleting product:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
