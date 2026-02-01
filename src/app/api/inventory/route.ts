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

        const role = session.user.role
        const gudangId = session.user.gudangId

        // For GUDANG role, show products from their assigned gudang
        // For STOKIS role, show products available to order
        // For other roles, show all products

        let products

        if (role === "GUDANG" && gudangId) {
            // Gudang sees products assigned to their gudang
            products = await prisma.product.findMany({
                where: {
                    gudangId: gudangId,
                    isActive: true,
                },
                include: {
                    gudang: { select: { name: true } },
                    inventories: true,
                },
                orderBy: { name: "asc" },
            })
        } else if (role === "STOKIS") {
            // Stokis sees all active products
            products = await prisma.product.findMany({
                where: { isActive: true },
                include: {
                    gudang: { select: { name: true } },
                    inventories: true,
                },
                orderBy: { name: "asc" },
            })
        } else {
            // Pusat/Finance sees all products
            products = await prisma.product.findMany({
                where: { isActive: true },
                include: {
                    gudang: { select: { name: true } },
                    inventories: true,
                },
                orderBy: { name: "asc" },
            })
        }

        // Transform products to inventory format
        // If no inventory record exists, create virtual inventory with 0 quantity
        const inventory = products.map((product) => {
            const inv = product.inventories[0]
            return {
                id: inv?.id || `temp-${product.id}`,
                productId: product.id,
                quantity: inv?.quantity || 0,
                minStock: 10, // Default min stock
                product: {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    unit: product.unit,
                    gudang: product.gudang,
                },
            }
        })

        return NextResponse.json(inventory)
    } catch (error) {
        console.error("Error fetching inventory:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST - Create inventory record for a product
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { productId, quantity } = body

        if (!productId) {
            return NextResponse.json({ error: "Product ID required" }, { status: 400 })
        }

        // Check if inventory already exists
        const existing = await prisma.inventory.findFirst({
            where: {
                productId,
                userId: session.user.id,
            },
        })

        if (existing) {
            // Update existing
            const updated = await prisma.inventory.update({
                where: { id: existing.id },
                data: { quantity: quantity || 0 },
            })
            return NextResponse.json(updated)
        }

        // Create new
        const inventory = await prisma.inventory.create({
            data: {
                productId,
                userId: session.user.id,
                quantity: quantity || 0,
            },
        })

        return NextResponse.json(inventory, { status: 201 })
    } catch (error) {
        console.error("Error creating inventory:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
