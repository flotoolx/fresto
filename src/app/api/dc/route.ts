import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - List all DC users
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!["PUSAT", "FINANCE", "FINANCE_ALL", "MANAGER_PUSAT", "FINANCE_DC", "DC"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // For FINANCE_ALL / MANAGER_PUSAT: only return DCs that have stokis assigned (exclude pusat-area DCs)
        const dcWhere = (session.user.role === "FINANCE_ALL" || session.user.role === "MANAGER_PUSAT")
            ? { role: "DC" as const, isActive: true, dcMembers: { some: {} } }
            : { role: "DC" as const, isActive: true }

        const dcUsers = await prisma.user.findMany({
            where: dcWhere,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { name: "asc" }
        })

        return NextResponse.json(dcUsers)
    } catch (error) {
        console.error("Error fetching DC users:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST - Create new DC user (PUSAT only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== "PUSAT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { name, email, password, phone, address } = body

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json({ error: "Email already registered" }, { status: 400 })
        }

        // Hash password
        const bcrypt = await import("bcryptjs")
        const hashedPassword = await bcrypt.hash(password, 10)

        const dcUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                address,
                role: "DC",
            }
        })

        return NextResponse.json({
            id: dcUser.id,
            name: dcUser.name,
            email: dcUser.email,
            role: dcUser.role,
        }, { status: 201 })
    } catch (error) {
        console.error("Error creating DC user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
