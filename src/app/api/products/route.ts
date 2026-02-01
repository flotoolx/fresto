import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET all products
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: { gudang: true },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(products)
    } catch (error) {
        console.error("Error fetching products:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST create product (Pusat only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { name, sku, unit, price, gudangId } = body

        const product = await prisma.product.create({
            data: { name, sku, unit, price, gudangId },
        })

        return NextResponse.json(product, { status: 201 })
    } catch (error) {
        console.error("Error creating product:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
