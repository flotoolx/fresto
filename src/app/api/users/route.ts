import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { generateUniqueCode } from "@/lib/unique-code"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                address: true,
                province: true,
                uniqueCode: true,
                stokis: {
                    select: { name: true },
                },
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error("Error fetching users:", error)
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
        const { name, email, password, role, phone, address, province, stokisId } = body

        // Validation
        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate unique code for MITRA, STOKIS, DC
        let uniqueCode: string | null = null
        if (["MITRA", "STOKIS", "DC"].includes(role) && province) {
            uniqueCode = await generateUniqueCode(role, province)
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                phone: phone || null,
                address: address || null,
                province: province || null,
                uniqueCode,
                stokisId: stokisId || null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                uniqueCode: true,
            },
        })

        return NextResponse.json(user, { status: 201 })
    } catch (error) {
        console.error("Error creating user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
