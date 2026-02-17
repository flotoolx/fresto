import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { role, dcId } = session.user
        const { searchParams } = new URL(request.url)
        const dcFilter = searchParams.get("dcFilter")

        let where: Record<string, unknown> = { role: { in: ["STOKIS", "DC"] } }

        // FINANCE_DC only sees Stokis/DC in their area
        if (role === "FINANCE_DC" && dcId) {
            where = {
                OR: [
                    { role: "STOKIS", dcId: dcId },
                    { role: "DC", id: dcId },
                ]
            }
        } else if (role === "PUSAT" || role === "FINANCE") {
            // Pusat/Finance — only stokis without DC area
            where = { role: "STOKIS", dcId: null }
        } else if (role === "FINANCE_ALL") {
            // FINANCE_ALL — all DC branches, with optional dcFilter
            if (dcFilter) {
                where = {
                    OR: [
                        { role: "STOKIS", dcId: dcFilter },
                        { role: "DC", id: dcFilter },
                    ]
                }
            } else {
                where = {
                    OR: [
                        { role: "STOKIS", dcId: { not: null } },
                        { role: "DC" },
                    ]
                }
            }
        }

        const stokis = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                address: true,
                role: true,
                dcId: true,
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(stokis)
    } catch (error) {
        console.error("Error fetching stokis:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only DC can add stokis
        if (session.user.role !== "DC") {
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
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 })
        }

        // Hash password
        const bcrypt = await import("bcryptjs")
        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate unique code for stokis
        // Format: STK-[DC area code]-[Letter][Seq] e.g. STK-PLB-A03
        let uniqueCode: string | null = null
        try {
            const dcUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { uniqueCode: true }
            })

            if (dcUser?.uniqueCode) {
                // Extract area code from DC uniqueCode (e.g., "DC-PLB-001" → "PLB")
                const parts = dcUser.uniqueCode.split("-")
                const areaCode = parts[1] || "XXX"
                const prefix = `STK-${areaCode}`

                // Count existing stokis with this prefix to determine next sequence
                const existingCount = await prisma.user.count({
                    where: {
                        role: "STOKIS",
                        uniqueCode: { startsWith: prefix }
                    }
                })

                const letterIndex = Math.floor(existingCount / 99)
                const letter = String.fromCharCode(65 + letterIndex) // A, B, C...
                const seq = String((existingCount % 99) + 1).padStart(2, "0")
                uniqueCode = `${prefix}-${letter}${seq}`

                // Ensure uniqueness
                const exists = await prisma.user.findFirst({ where: { uniqueCode } })
                if (exists) {
                    const allCodes = await prisma.user.findMany({
                        where: { role: "STOKIS", uniqueCode: { startsWith: prefix } },
                        select: { uniqueCode: true },
                        orderBy: { uniqueCode: "desc" },
                        take: 1,
                    })
                    if (allCodes.length > 0 && allCodes[0].uniqueCode) {
                        const lastCode = allCodes[0].uniqueCode
                        const lastPart = lastCode.split("-").pop() || "A00"
                        const lastLetter = lastPart.charAt(0)
                        const lastNum = parseInt(lastPart.slice(1)) || 0
                        if (lastNum >= 99) {
                            const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1)
                            uniqueCode = `${prefix}-${nextLetter}01`
                        } else {
                            uniqueCode = `${prefix}-${lastLetter}${String(lastNum + 1).padStart(2, "0")}`
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error generating unique code:", e)
        }

        // Create new stokis linked to this DC
        const newStokis = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone: phone || null,
                address: address || null,
                role: "STOKIS",
                dcId: session.user.id,
                uniqueCode,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                uniqueCode: true,
                isActive: true,
                createdAt: true,
            },
        })

        return NextResponse.json(newStokis, { status: 201 })
    } catch (error) {
        console.error("Error creating stokis:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
