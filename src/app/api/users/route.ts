import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { generateUniqueCode } from "@/lib/unique-code"

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { role: userRole, id: userId, dcId } = session.user
        const allowedRoles = ["PUSAT", "FINANCE", "DC", "FINANCE_DC", "FINANCE_ALL", "MANAGER_PUSAT"]

        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Parse query params
        const { searchParams } = new URL(request.url)
        const filterRole = searchParams.get("role")

        // Build where clause based on user's role
        let where: Record<string, unknown> = {}

        if (userRole === "DC") {
            // DC can only see Stokis in their area
            where = { dcId: userId }
            if (!filterRole) where.role = "STOKIS"
        } else if (userRole === "FINANCE_DC") {
            // Finance DC can only see users in their DC area
            where = { dcId: dcId }
        } else if (userRole === "FINANCE") {
            // Finance Pusat can only see Stokis in Pusat area (dcId = null)
            where = { role: "STOKIS", dcId: null }
        } else if (userRole === "PUSAT") {
            // PUSAT can only see FINANCE and GUDANG users
            where = { role: { in: ["FINANCE", "GUDANG"] } }
        }

        // Apply role filter from query param
        if (filterRole) {
            where.role = filterRole
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                address: true,
                province: true,
                uniqueCode: true,
                isActive: true,
                dcId: true,
                stokisId: true,
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

        if (!session?.user || (session.user.role !== "PUSAT" && session.user.role !== "FINANCE")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // FINANCE can only create STOKIS users
        const body = await request.json()
        const { name, email, password, role, phone, address, province, stokisId } = body

        if (session.user.role === "FINANCE" && role !== "STOKIS") {
            return NextResponse.json({ error: "Finance hanya bisa membuat user Stokis" }, { status: 403 })
        }

        if (session.user.role === "PUSAT" && !["FINANCE", "GUDANG"].includes(role)) {
            return NextResponse.json({ error: "Pusat hanya bisa membuat user Finance & Gudang" }, { status: 403 })
        }

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
