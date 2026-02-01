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

        const gudangs = await prisma.gudang.findMany({
            select: {
                id: true,
                name: true,
                code: true,
                address: true,
                _count: {
                    select: { products: true },
                },
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(gudangs)
    } catch (error) {
        console.error("Error fetching gudang:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const body = await request.json()
        const { name, code, address } = body

        if (!name || !code) {
            return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
        }

        // Check if code already exists
        const existing = await prisma.gudang.findUnique({ where: { code } })
        if (existing) {
            return NextResponse.json({ error: "Kode gudang sudah ada" }, { status: 400 })
        }

        const gudang = await prisma.gudang.create({
            data: { name, code, address: address || null },
        })

        return NextResponse.json(gudang, { status: 201 })
    } catch (error) {
        console.error("Error creating gudang:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
