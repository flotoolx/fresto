import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only Gudang and Stokis roles can adjust inventory
        if (!["GUDANG", "STOKIS", "PUSAT"].includes(session.user.role || "")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { adjustment, reason } = body

        if (typeof adjustment !== "number") {
            return NextResponse.json({ error: "Invalid adjustment" }, { status: 400 })
        }

        // Check if this is a temporary ID (no inventory record exists yet)
        if (id.startsWith("temp-")) {
            const productId = id.replace("temp-", "")

            // Create new inventory record
            if (adjustment < 0) {
                return NextResponse.json({ error: "Cannot subtract from 0 stock" }, { status: 400 })
            }

            const newInventory = await prisma.inventory.create({
                data: {
                    productId,
                    userId: session.user.id,
                    quantity: adjustment,
                },
                include: { product: true },
            })

            console.log(`Inventory created: ${newInventory.id}, quantity: ${adjustment}, reason: ${reason}`)
            return NextResponse.json(newInventory)
        }

        // Existing inventory record
        const inventory = await prisma.inventory.findUnique({ where: { id } })
        if (!inventory) {
            return NextResponse.json({ error: "Inventory not found" }, { status: 404 })
        }

        const newQuantity = inventory.quantity + adjustment
        if (newQuantity < 0) {
            return NextResponse.json({ error: "Stok tidak boleh negatif" }, { status: 400 })
        }

        const updated = await prisma.inventory.update({
            where: { id },
            data: { quantity: newQuantity },
            include: { product: true },
        })

        console.log(`Inventory adjusted: ${id}, adjustment: ${adjustment}, reason: ${reason}`)

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Error adjusting inventory:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
