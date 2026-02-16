import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== "STOKIS") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        // Verify this mitra belongs to the logged-in stokis
        const mitra = await prisma.user.findFirst({
            where: {
                id,
                role: "MITRA",
                stokisId: session.user.id,
            },
        })

        if (!mitra) {
            return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 })
        }

        const body = await request.json()
        const { name, email, password, phone, address, uniqueCode } = body

        if (!name || !email) {
            return NextResponse.json({ error: "Nama dan email wajib diisi" }, { status: 400 })
        }

        // Check if email is already used by another user
        if (email !== mitra.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email },
            })
            if (existingUser) {
                return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 })
            }
        }

        // Check if uniqueCode is already used by another user
        if (uniqueCode && uniqueCode !== mitra.uniqueCode) {
            const existingCode = await prisma.user.findFirst({
                where: { uniqueCode, id: { not: id } },
            })
            if (existingCode) {
                return NextResponse.json({ error: "Kode unik sudah digunakan" }, { status: 400 })
            }
        }

        // Validate password if provided
        if (password && password.length < 6) {
            return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            name,
            email,
            phone: phone || null,
            address: address || null,
            uniqueCode: uniqueCode || null,
        }

        // Only hash and update password if provided
        if (password) {
            updateData.password = await bcrypt.hash(password, 10)
        }

        const updatedMitra = await prisma.user.update({
            where: { id },
            data: updateData,
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

        return NextResponse.json(updatedMitra)
    } catch (error) {
        console.error("Error updating mitra:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
