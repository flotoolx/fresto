import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user.role

        // Only Stokis can access this
        if (role !== "STOKIS") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Stokis uses their own ID to find their mitra
        const mitras = await prisma.user.findMany({
            where: {
                role: "MITRA",
                stokisId: session.user.id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                createdAt: true,
                _count: {
                    select: { mitraOrdersAsMitra: true },
                },
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(mitras)
    } catch (error) {
        console.error("Error fetching mitra:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user.role

        // Only Stokis can add mitra
        if (role !== "STOKIS") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { name, email, password, phone, address } = body

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create new mitra linked to this stokis
        const newMitra = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone: phone || null,
                address: address || null,
                role: "MITRA",
                stokisId: session.user.id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                createdAt: true,
            },
        })

        return NextResponse.json(newMitra, { status: 201 })
    } catch (error) {
        console.error("Error creating mitra:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
