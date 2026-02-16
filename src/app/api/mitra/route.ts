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
                uniqueCode: true,
                createdAt: true,
                _count: {
                    select: { mitraOrdersAsMitra: true },
                },
                mitraOrdersAsMitra: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    select: {
                        totalAmount: true,
                        createdAt: true,
                        items: {
                            select: { quantity: true },
                        },
                    },
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

        // Generate unique code for mitra
        // Format: [3-char DC area code]M-[4-digit sequence]
        let uniqueCode: string | null = null
        try {
            // Get stokis DC info to extract area code
            const stokis = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    dc: {
                        select: { uniqueCode: true }
                    }
                }
            })

            if (stokis?.dc?.uniqueCode) {
                // Extract area code from DC uniqueCode (e.g., "DC-PLB-001" → "PLB")
                const parts = stokis.dc.uniqueCode.split("-")
                const areaCode = parts[1] || "XXX"
                const prefix = `${areaCode}M`

                // Count existing mitras with this prefix to determine next sequence
                const existingCount = await prisma.user.count({
                    where: {
                        role: "MITRA",
                        uniqueCode: { startsWith: prefix }
                    }
                })

                const seq = String(existingCount + 1).padStart(4, "0")
                uniqueCode = `${prefix}-${seq}`

                // Ensure uniqueness
                const exists = await prisma.user.findFirst({ where: { uniqueCode } })
                if (exists) {
                    // Fallback: find max sequence
                    const allCodes = await prisma.user.findMany({
                        where: { role: "MITRA", uniqueCode: { startsWith: prefix } },
                        select: { uniqueCode: true },
                        orderBy: { uniqueCode: "desc" },
                        take: 1,
                    })
                    if (allCodes.length > 0 && allCodes[0].uniqueCode) {
                        const lastSeq = parseInt(allCodes[0].uniqueCode.split("-").pop() || "0")
                        uniqueCode = `${prefix}-${String(lastSeq + 1).padStart(4, "0")}`
                    }
                }
            }
        } catch (e) {
            console.error("Error generating unique code:", e)
        }

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
                uniqueCode,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                uniqueCode: true,
                createdAt: true,
            },
        })

        return NextResponse.json(newMitra, { status: 201 })
    } catch (error) {
        console.error("Error creating mitra:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
